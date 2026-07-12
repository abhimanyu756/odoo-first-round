const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { logActivity, notify } = require('../../utils/activityLogger');

const INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  raisedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true } },
};

async function list({ status, assetId, priority } = {}) {
  const where = {};
  if (status) where.status = status;
  if (assetId) where.assetId = assetId;
  if (priority) where.priority = priority;
  return prisma.maintenanceRequest.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ createdAt: 'desc' }],
  });
}

async function create({ assetId, description, priority }, photoUrl, actorId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw ApiError.notFound('Asset not found');

  const request = await prisma.maintenanceRequest.create({
    data: { assetId, raisedById: actorId, description, priority, photoUrl: photoUrl || null },
    include: INCLUDE,
  });
  await logActivity({
    actorId,
    action: 'MAINTENANCE_RAISED',
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    metadata: { assetTag: asset.assetTag, priority },
  });
  return request;
}

// Allowed source states for each action.
const ALLOWED = {
  APPROVE: ['PENDING'],
  REJECT: ['PENDING'],
  ASSIGN: ['APPROVED', 'TECHNICIAN_ASSIGNED'],
  START: ['APPROVED', 'TECHNICIAN_ASSIGNED'],
  RESOLVE: ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'],
};

async function transition(id, payload, actorId) {
  const { action, technicianId, resolutionNotes } = payload;

  return prisma.$transaction(async (tx) => {
    const req = await tx.maintenanceRequest.findUnique({ where: { id }, include: { asset: true } });
    if (!req) throw ApiError.notFound('Maintenance request not found');

    if (!ALLOWED[action].includes(req.status)) {
      throw ApiError.badRequest(`Cannot ${action.toLowerCase()} a request that is ${req.status}`);
    }

    const data = {};
    let assetStatus = null;
    let notifyPayload = null;

    switch (action) {
      case 'APPROVE':
        data.status = 'APPROVED';
        data.approvedById = actorId;
        assetStatus = 'UNDER_MAINTENANCE'; // asset flips on approval
        notifyPayload = {
          userId: req.raisedById,
          type: 'MAINTENANCE_APPROVED',
          title: 'Maintenance approved',
          message: `Your request for ${req.asset.assetTag} was approved.`,
        };
        break;
      case 'REJECT':
        data.status = 'REJECTED';
        data.approvedById = actorId;
        notifyPayload = {
          userId: req.raisedById,
          type: 'MAINTENANCE_REJECTED',
          title: 'Maintenance rejected',
          message: `Your request for ${req.asset.assetTag} was rejected.`,
        };
        break;
      case 'ASSIGN':
        data.status = 'TECHNICIAN_ASSIGNED';
        data.technicianId = technicianId;
        notifyPayload = {
          userId: technicianId,
          type: 'MAINTENANCE_ASSIGNED',
          title: 'Maintenance assigned to you',
          message: `You were assigned to repair ${req.asset.assetTag}.`,
        };
        break;
      case 'START':
        data.status = 'IN_PROGRESS';
        if (technicianId) data.technicianId = technicianId;
        break;
      case 'RESOLVE':
        data.status = 'RESOLVED';
        data.resolvedAt = new Date();
        if (resolutionNotes) data.resolutionNotes = resolutionNotes;
        assetStatus = 'AVAILABLE'; // asset returns to available on resolution
        notifyPayload = {
          userId: req.raisedById,
          type: 'MAINTENANCE_RESOLVED',
          title: 'Maintenance resolved',
          message: `${req.asset.assetTag} — ${req.asset.name} is back in service.`,
        };
        break;
      default:
        throw ApiError.badRequest('Unknown action');
    }

    const updated = await tx.maintenanceRequest.update({ where: { id }, data, include: INCLUDE });

    if (assetStatus) {
      await tx.asset.update({ where: { id: req.assetId }, data: { status: assetStatus } });
    }

    await logActivity(
      {
        actorId,
        action: `MAINTENANCE_${action}`,
        entityType: 'MaintenanceRequest',
        entityId: id,
        metadata: { assetTag: req.asset.assetTag },
      },
      tx
    );

    if (notifyPayload) {
      await notify(
        { ...notifyPayload, relatedEntityType: 'MaintenanceRequest', relatedEntityId: id },
        tx
      );
    }

    return updated;
  });
}

// Remove a maintenance request from the board. If it currently holds the asset
// Under Maintenance, revert the asset to Available so it isn't left stuck.
async function remove(id, actorId) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.maintenanceRequest.findUnique({ where: { id }, include: { asset: true } });
    if (!req) throw ApiError.notFound('Maintenance request not found');

    const activeStatuses = ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'];
    if (activeStatuses.includes(req.status) && req.asset.status === 'UNDER_MAINTENANCE') {
      await tx.asset.update({ where: { id: req.assetId }, data: { status: 'AVAILABLE' } });
    }

    await tx.maintenanceRequest.delete({ where: { id } });
    await logActivity(
      { actorId, action: 'MAINTENANCE_DELETED', entityType: 'MaintenanceRequest', entityId: id, metadata: { assetTag: req.asset.assetTag } },
      tx
    );
    return { success: true };
  });
}

module.exports = { list, create, transition, remove };
