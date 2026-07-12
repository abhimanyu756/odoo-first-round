const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { rangesOverlap } = require('../../utils/overlap');
const { logActivity, notify } = require('../../utils/activityLogger');

const INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true } },
  bookedBy: { select: { id: true, name: true } },
  forDepartment: { select: { id: true, name: true } },
};

async function list({ assetId, status, from, to, mine } = {}, userId) {
  const where = {};
  if (assetId) where.assetId = assetId;
  if (status) where.status = status;
  if (mine) where.bookedById = userId;
  if (from || to) {
    where.startTime = {};
    if (from) where.startTime.gte = from;
    if (to) where.startTime.lte = to;
  }
  return prisma.booking.findMany({ where, include: INCLUDE, orderBy: { startTime: 'asc' } });
}

// Find any active (non-cancelled) booking on the asset overlapping [start, end).
async function findConflict(assetId, startTime, endTime, excludeId) {
  const candidates = await prisma.booking.findMany({
    where: {
      assetId,
      status: { not: 'CANCELLED' },
      ...(excludeId && { id: { not: excludeId } }),
      // Cheap pre-filter: any booking that could possibly overlap.
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    include: { bookedBy: { select: { name: true } } },
  });
  return candidates.find((b) => rangesOverlap(startTime, endTime, b.startTime, b.endTime)) || null;
}

async function create({ assetId, startTime, endTime, forDepartmentId, purpose }, actorId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw ApiError.notFound('Asset not found');
  if (!asset.isBookable) throw ApiError.badRequest('This asset is not marked as bookable');

  const conflict = await findConflict(assetId, startTime, endTime);
  if (conflict) {
    throw ApiError.conflict('This time slot overlaps an existing booking', {
      code: 'BOOKING_OVERLAP',
      conflict: {
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        bookedBy: conflict.bookedBy?.name,
      },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      assetId,
      bookedById: actorId,
      forDepartmentId: forDepartmentId || null,
      startTime,
      endTime,
      purpose: purpose || null,
      status: 'UPCOMING',
    },
    include: INCLUDE,
  });

  await logActivity({
    actorId,
    action: 'BOOKING_CREATED',
    entityType: 'Booking',
    entityId: booking.id,
    metadata: { assetTag: asset.assetTag },
  });
  await notify({
    userId: actorId,
    type: 'BOOKING_CONFIRMED',
    title: 'Booking confirmed',
    message: `${asset.assetTag} — ${asset.name} booked.`,
    relatedEntityType: 'Booking',
    relatedEntityId: booking.id,
  });
  return booking;
}

async function reschedule(id, { startTime, endTime }, actorId) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { asset: true } });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status === 'CANCELLED') throw ApiError.badRequest('Cannot reschedule a cancelled booking');

  const conflict = await findConflict(booking.assetId, startTime, endTime, id);
  if (conflict) {
    throw ApiError.conflict('This time slot overlaps an existing booking', {
      code: 'BOOKING_OVERLAP',
      conflict: {
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        bookedBy: conflict.bookedBy?.name,
      },
    });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { startTime, endTime, status: 'UPCOMING', reminderSent: false },
    include: INCLUDE,
  });
  await logActivity({ actorId, action: 'BOOKING_RESCHEDULED', entityType: 'Booking', entityId: id });
  return updated;
}

async function cancel(id, actorId) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { asset: true } });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status === 'CANCELLED') throw ApiError.badRequest('Booking already cancelled');

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: INCLUDE,
  });
  await logActivity({ actorId, action: 'BOOKING_CANCELLED', entityType: 'Booking', entityId: id });
  await notify({
    userId: booking.bookedById,
    type: 'BOOKING_CANCELLED',
    title: 'Booking cancelled',
    message: `${booking.asset.assetTag} booking was cancelled.`,
    relatedEntityType: 'Booking',
    relatedEntityId: id,
  });
  return updated;
}

module.exports = { list, create, reschedule, cancel, findConflict };
