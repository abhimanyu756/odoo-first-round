const prisma = require('../../config/prisma');

// Utilization: allocated vs total assets per department.
async function utilizationByDepartment() {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { assets: true } },
    },
  });
  const allocatedByDept = await prisma.asset.groupBy({
    by: ['currentDepartmentId'],
    where: { status: 'ALLOCATED' },
    _count: { _all: true },
  });
  const allocatedMap = Object.fromEntries(
    allocatedByDept.map((r) => [r.currentDepartmentId, r._count._all])
  );
  return departments.map((d) => ({
    department: d.name,
    total: d._count.assets,
    allocated: allocatedMap[d.id] || 0,
  }));
}

// Maintenance frequency by month (last 6 months).
async function maintenanceFrequency() {
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);

  const requests = await prisma.maintenanceRequest.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, asset: { select: { category: { select: { name: true } } } } },
  });

  const buckets = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    buckets[d.toLocaleString('en-US', { month: 'short', year: '2-digit' })] = 0;
  }
  for (const r of requests) {
    const key = r.createdAt.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    if (key in buckets) buckets[key] += 1;
  }
  return Object.entries(buckets).map(([month, count]) => ({ month, count }));
}

// Most-used (by allocation count) and idle assets.
async function usageRanking() {
  const grouped = await prisma.allocation.groupBy({
    by: ['assetId'],
    _count: { _all: true },
    _max: { allocatedAt: true },
  });
  const countMap = Object.fromEntries(grouped.map((g) => [g.assetId, g._count._all]));
  const lastMap = Object.fromEntries(grouped.map((g) => [g.assetId, g._max.allocatedAt]));

  const assets = await prisma.asset.findMany({
    select: { id: true, assetTag: true, name: true, status: true },
  });

  const withUsage = assets.map((a) => ({
    ...a,
    uses: countMap[a.id] || 0,
    lastAllocatedAt: lastMap[a.id] || null,
  }));

  const mostUsed = [...withUsage].sort((a, b) => b.uses - a.uses).slice(0, 5);
  const idle = [...withUsage]
    .filter((a) => a.status === 'AVAILABLE')
    .sort((a, b) => {
      const at = a.lastAllocatedAt ? new Date(a.lastAllocatedAt).getTime() : 0;
      const bt = b.lastAllocatedAt ? new Date(b.lastAllocatedAt).getTime() : 0;
      return at - bt;
    })
    .slice(0, 5);

  return { mostUsed, idle };
}

// Assets flagged for attention: poor condition or nearing retirement (>4 years old).
async function attention() {
  const fourYearsAgo = new Date();
  fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);

  const [poorCondition, aging] = await Promise.all([
    prisma.asset.findMany({
      where: { condition: { in: ['FAIR', 'POOR'] }, status: { notIn: ['RETIRED', 'DISPOSED'] } },
      select: { id: true, assetTag: true, name: true, condition: true },
      take: 10,
    }),
    prisma.asset.findMany({
      where: { acquisitionDate: { lt: fourYearsAgo }, status: { notIn: ['RETIRED', 'DISPOSED'] } },
      select: { id: true, assetTag: true, name: true, acquisitionDate: true },
      take: 10,
    }),
  ]);
  return { poorCondition, aging };
}

// Department-wise allocation summary.
async function departmentAllocationSummary() {
  return utilizationByDepartment();
}

// Booking heatmap: weekday (0-6) x hour occurrence counts.
async function bookingHeatmap() {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { startTime: true },
  });
  // grid[weekday][hour] = count
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const b of bookings) {
    const d = new Date(b.startTime);
    grid[d.getDay()][d.getHours()] += 1;
  }
  return grid;
}

async function getAll() {
  const [utilization, maintenance, ranking, attn, deptSummary, heatmap] = await Promise.all([
    utilizationByDepartment(),
    maintenanceFrequency(),
    usageRanking(),
    attention(),
    departmentAllocationSummary(),
    bookingHeatmap(),
  ]);
  return {
    utilizationByDepartment: utilization,
    maintenanceFrequency: maintenance,
    mostUsed: ranking.mostUsed,
    idle: ranking.idle,
    attention: attn,
    departmentSummary: deptSummary,
    bookingHeatmap: heatmap,
  };
}

// Build a CSV of the full asset register for export.
async function assetsCsv() {
  const assets = await prisma.asset.findMany({
    include: {
      category: { select: { name: true } },
      currentHolder: { select: { name: true } },
      currentDepartment: { select: { name: true } },
    },
    orderBy: { assetTag: 'asc' },
  });

  const headers = [
    'Asset Tag',
    'Name',
    'Category',
    'Status',
    'Condition',
    'Location',
    'Holder',
    'Department',
    'Serial Number',
    'Acquisition Date',
    'Acquisition Cost',
    'Bookable',
  ];
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = assets.map((a) =>
    [
      a.assetTag,
      a.name,
      a.category?.name,
      a.status,
      a.condition,
      a.location,
      a.currentHolder?.name,
      a.currentDepartment?.name,
      a.serialNumber,
      a.acquisitionDate ? a.acquisitionDate.toISOString().slice(0, 10) : '',
      a.acquisitionCost ?? '',
      a.isBookable ? 'Yes' : 'No',
    ]
      .map(escape)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

module.exports = { getAll, assetsCsv };
