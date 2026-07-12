const prisma = require('../../config/prisma');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

async function getKpis() {
  const now = new Date();
  const [
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns,
  ] = await Promise.all([
    prisma.asset.count({ where: { status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { status: 'ALLOCATED' } }),
    prisma.maintenanceRequest.count({
      where: { createdAt: { gte: startOfToday(), lte: endOfToday() } },
    }),
    prisma.booking.count({ where: { status: { in: ['UPCOMING', 'ONGOING'] } } }),
    prisma.transferRequest.count({ where: { status: 'REQUESTED' } }),
    prisma.allocation.count({
      where: {
        status: 'ACTIVE',
        expectedReturnDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 3600 * 1000) },
      },
    }),
    prisma.allocation.count({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] }, expectedReturnDate: { lt: now } },
    }),
  ]);

  return {
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns,
  };
}

async function getOverdue() {
  return prisma.allocation.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] }, expectedReturnDate: { lt: new Date() } },
    include: {
      asset: { select: { assetTag: true, name: true } },
      toUser: { select: { name: true } },
      toDepartment: { select: { name: true } },
    },
    orderBy: { expectedReturnDate: 'asc' },
    take: 20,
  });
}

async function getUpcomingReturns() {
  const now = new Date();
  return prisma.allocation.findMany({
    where: {
      status: 'ACTIVE',
      expectedReturnDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 3600 * 1000) },
    },
    include: {
      asset: { select: { assetTag: true, name: true } },
      toUser: { select: { name: true } },
      toDepartment: { select: { name: true } },
    },
    orderBy: { expectedReturnDate: 'asc' },
    take: 20,
  });
}

async function getRecentActivity() {
  return prisma.activityLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
}

async function getDashboard() {
  const [kpis, overdue, upcoming, recentActivity] = await Promise.all([
    getKpis(),
    getOverdue(),
    getUpcomingReturns(),
    getRecentActivity(),
  ]);
  return { kpis, overdue, upcoming, recentActivity };
}

module.exports = { getDashboard, getKpis };
