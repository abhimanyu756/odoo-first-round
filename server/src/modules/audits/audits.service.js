const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { logActivity, notifyMany, notify } = require('../../utils/activityLogger');

const CYCLE_INCLUDE = {
  scopeDepartment: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  assignments: { include: { auditor: { select: { id: true, name: true } } } },
  _count: { select: { items: true } },
};

// Resolve which assets fall within an audit's scope.
async function assetsInScope({ scopeType, scopeDepartmentId, scopeLocation }) {
  const where = { status: { notIn: ['DISPOSED', 'RETIRED'] } };
  if (scopeType === 'DEPARTMENT') where.currentDepartmentId = scopeDepartmentId;
  else where.location = { contains: scopeLocation, mode: 'insensitive' };
  return prisma.asset.findMany({ where, select: { id: true } });
}

async function list() {
  return prisma.auditCycle.findMany({ include: CYCLE_INCLUDE, orderBy: { createdAt: 'desc' } });
}

async function getById(id) {
  const cycle = await prisma.auditCycle.findUnique({
    where: { id },
    include: {
      ...CYCLE_INCLUDE,
      items: {
        include: {
          asset: { select: { id: true, assetTag: true, name: true, location: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
        orderBy: { asset: { assetTag: 'asc' } },
      },
    },
  });
  if (!cycle) throw ApiError.notFound('Audit cycle not found');

  const discrepancies = cycle.items.filter((i) =>
    ['MISSING', 'DAMAGED'].includes(i.verificationStatus)
  );
  const summary = {
    total: cycle.items.length,
    verified: cycle.items.filter((i) => i.verificationStatus === 'VERIFIED').length,
    missing: cycle.items.filter((i) => i.verificationStatus === 'MISSING').length,
    damaged: cycle.items.filter((i) => i.verificationStatus === 'DAMAGED').length,
    pending: cycle.items.filter((i) => i.verificationStatus === 'PENDING').length,
  };
  return { cycle, discrepancies, summary };
}

async function create(data, actorId) {
  const assets = await assetsInScope(data);
  if (assets.length === 0) {
    throw ApiError.badRequest('No assets found in the selected scope');
  }

  const cycle = await prisma.$transaction(async (tx) => {
    const created = await tx.auditCycle.create({
      data: {
        name: data.name,
        scopeType: data.scopeType,
        scopeDepartmentId: data.scopeType === 'DEPARTMENT' ? data.scopeDepartmentId : null,
        scopeLocation: data.scopeType === 'LOCATION' ? data.scopeLocation : null,
        startDate: data.startDate,
        endDate: data.endDate,
        createdById: actorId,
        assignments: { create: data.auditorIds.map((auditorId) => ({ auditorId })) },
        items: { create: assets.map((a) => ({ assetId: a.id })) },
      },
      include: CYCLE_INCLUDE,
    });
    await logActivity(
      { actorId, action: 'AUDIT_CREATED', entityType: 'AuditCycle', entityId: created.id, metadata: { name: created.name, assets: assets.length } },
      tx
    );
    return created;
  });

  await notifyMany(data.auditorIds, {
    type: 'AUDIT_ASSIGNED',
    title: 'You were assigned to an audit',
    message: `Audit cycle "${cycle.name}" — ${assets.length} assets to verify.`,
    relatedEntityType: 'AuditCycle',
    relatedEntityId: cycle.id,
  });

  return cycle;
}

// Verify/mark a single audit item. Only allowed while the cycle is OPEN.
async function verifyItem(cycleId, itemId, { verificationStatus, notes }, user) {
  const cycle = await prisma.auditCycle.findUnique({
    where: { id: cycleId },
    include: { assignments: true },
  });
  if (!cycle) throw ApiError.notFound('Audit cycle not found');
  if (cycle.status === 'CLOSED') throw ApiError.badRequest('This audit cycle is closed');

  // Assigned auditors, plus Admin/Asset Manager, may verify.
  const isAuditor = cycle.assignments.some((a) => a.auditorId === user.id);
  const isManager = ['ADMIN', 'ASSET_MANAGER'].includes(user.role);
  if (!isAuditor && !isManager) throw ApiError.forbidden('You are not an auditor on this cycle');

  const item = await prisma.auditItem.findFirst({ where: { id: itemId, auditCycleId: cycleId } });
  if (!item) throw ApiError.notFound('Audit item not found');

  return prisma.auditItem.update({
    where: { id: itemId },
    data: {
      verificationStatus,
      notes: notes || null,
      verifiedById: user.id,
      verifiedAt: new Date(),
    },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
    },
  });
}

// Close the cycle: lock it and flip confirmed-missing assets to LOST.
async function close(cycleId, actorId) {
  return prisma.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.findUnique({
      where: { id: cycleId },
      include: { items: true },
    });
    if (!cycle) throw ApiError.notFound('Audit cycle not found');
    if (cycle.status === 'CLOSED') throw ApiError.badRequest('Audit cycle already closed');

    const missing = cycle.items.filter((i) => i.verificationStatus === 'MISSING');

    // Mark confirmed-missing assets as LOST.
    for (const item of missing) {
      await tx.asset.update({ where: { id: item.assetId }, data: { status: 'LOST' } });
    }

    const closed = await tx.auditCycle.update({
      where: { id: cycleId },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: CYCLE_INCLUDE,
    });

    await logActivity(
      {
        actorId,
        action: 'AUDIT_CLOSED',
        entityType: 'AuditCycle',
        entityId: cycleId,
        metadata: { missing: missing.length },
      },
      tx
    );

    return closed;
  });
}

module.exports = { list, getById, create, verifyItem, close };
