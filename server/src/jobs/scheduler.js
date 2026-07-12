const cron = require('node-cron');
const prisma = require('../config/prisma');
const { notify } = require('../utils/activityLogger');

let started = false;

/**
 * Flag active allocations past their expected return date as OVERDUE and
 * notify the holder. Runs frequently so the dashboard/notifications stay fresh.
 */
async function flagOverdueAllocations() {
  const now = new Date();
  const overdue = await prisma.allocation.findMany({
    where: { status: 'ACTIVE', expectedReturnDate: { lt: now } },
    include: { asset: { select: { assetTag: true, name: true } } },
  });

  for (const alloc of overdue) {
    await prisma.allocation.update({ where: { id: alloc.id }, data: { status: 'OVERDUE' } });
    if (alloc.toUserId) {
      await notify({
        userId: alloc.toUserId,
        type: 'OVERDUE_RETURN',
        title: 'Overdue return',
        message: `${alloc.asset.assetTag} — ${alloc.asset.name} is past its expected return date.`,
        relatedEntityType: 'Asset',
        relatedEntityId: alloc.assetId,
      });
    }
  }
  return overdue.length;
}

/** Roll booking statuses forward: UPCOMING→ONGOING→COMPLETED based on the clock. */
async function rolloverBookingStatuses() {
  const now = new Date();
  await prisma.booking.updateMany({
    where: { status: 'UPCOMING', startTime: { lte: now }, endTime: { gt: now } },
    data: { status: 'ONGOING' },
  });
  await prisma.booking.updateMany({
    where: { status: { in: ['UPCOMING', 'ONGOING'] }, endTime: { lte: now } },
    data: { status: 'COMPLETED' },
  });
}

/** Send a one-time reminder ~30 min before a booking starts. */
async function sendBookingReminders() {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 60 * 1000);
  const upcoming = await prisma.booking.findMany({
    where: { status: 'UPCOMING', reminderSent: false, startTime: { gt: now, lte: soon } },
    include: { asset: { select: { assetTag: true, name: true } } },
  });

  for (const b of upcoming) {
    await notify({
      userId: b.bookedById,
      type: 'BOOKING_REMINDER',
      title: 'Booking starting soon',
      message: `${b.asset.assetTag} — ${b.asset.name} booking starts at ${new Date(b.startTime).toLocaleTimeString()}.`,
      relatedEntityType: 'Booking',
      relatedEntityId: b.id,
    });
    await prisma.booking.update({ where: { id: b.id }, data: { reminderSent: true } });
  }
}

async function tick() {
  try {
    await flagOverdueAllocations();
    await rolloverBookingStatuses();
    await sendBookingReminders();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[scheduler] tick failed:', err.message);
  }
}

function startScheduler() {
  if (started) return;
  started = true;

  // Every minute — cheap queries, keeps overdue/booking state fresh for the demo.
  cron.schedule('* * * * *', tick);

  // Run once shortly after boot so state is correct immediately.
  setTimeout(tick, 3000);

  // eslint-disable-next-line no-console
  console.log('⏰ Scheduler started (overdue flagging, booking rollover, reminders)');
}

// Exported for manual triggering (tests/dev).
module.exports = { startScheduler, tick, flagOverdueAllocations, rolloverBookingStatuses };
