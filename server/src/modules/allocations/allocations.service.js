const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { logActivity, notify } = require('../../utils/activityLogger');

const ALLOC_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  toUser: { select: { id: true, name: true } },
  toDepartment: { select: { id: true, name: true } },
  allocatedBy: { select: { id: true, name: true } },
};

const TRANSFER_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true } },
  fromUser: { select: { id: true, name: true } },
  toUser: { select: { id: true, name: true } },
  toDepartment: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
};

// ─── Allocations ───────────────────────────────────────────────

// Scope allocations to what a user may see (Employee: theirs; Dept Head: dept).
function allocationScopeForUser(user) {
  if (!user || user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') return null;
  if (user.role === 'DEPARTMENT_HEAD') {
    const dept = user.departmentId ?? '__none__';
    return { OR: [{ toDepartmentId: dept }, { toUser: { departmentId: dept } }] };
  }
  return { toUserId: user.id }; // Employee
}

async function list({ status, assetId, toUserId, overdue } = {}, user) {
  const base = {};
  if (status) base.status = status;
  if (assetId) base.assetId = assetId;
  if (toUserId) base.toUserId = toUserId;
  if (overdue) {
    // Include rows already flagged OVERDUE by the scheduler, plus any active
    // ones already past their expected return date.
    base.status = { in: ['ACTIVE', 'OVERDUE'] };
    base.expectedReturnDate = { lt: new Date() };
  }
  const scope = allocationScopeForUser(user);
  const where = scope ? { AND: [base, scope] } : base;

  return prisma.allocation.findMany({
    where,
    include: ALLOC_INCLUDE,
    orderBy: { allocatedAt: 'desc' },
  });
}

/**
 * Allocate an asset. Enforces the double-allocation rule:
 * if the asset is already ALLOCATED, throw 409 with the current holder so
 * the client can offer a Transfer Request instead.
 */
async function allocate({ assetId, toUserId, toDepartmentId, expectedReturnDate }, actorId) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      include: { currentHolder: { select: { id: true, name: true } }, currentDepartment: { select: { id: true, name: true } } },
    });
    if (!asset) throw ApiError.notFound('Asset not found');

    if (asset.status === 'ALLOCATED') {
      throw ApiError.conflict('Asset is already allocated', {
        code: 'ALREADY_ALLOCATED',
        currentHolder: asset.currentHolder,
        currentDepartment: asset.currentDepartment,
        assetTag: asset.assetTag,
      });
    }
    if (!['AVAILABLE', 'RESERVED'].includes(asset.status)) {
      throw ApiError.badRequest(`Asset cannot be allocated while ${asset.status.replace('_', ' ').toLowerCase()}`);
    }

    const allocation = await tx.allocation.create({
      data: {
        assetId,
        toUserId: toUserId || null,
        toDepartmentId: toDepartmentId || null,
        allocatedById: actorId,
        expectedReturnDate: expectedReturnDate || null,
        status: 'ACTIVE',
      },
      include: ALLOC_INCLUDE,
    });

    await tx.asset.update({
      where: { id: assetId },
      data: {
        status: 'ALLOCATED',
        currentHolderId: toUserId || null,
        currentDepartmentId: toDepartmentId || asset.currentDepartmentId,
      },
    });

    await logActivity(
      { actorId, action: 'ASSET_ALLOCATED', entityType: 'Asset', entityId: assetId, metadata: { assetTag: asset.assetTag } },
      tx
    );
    if (toUserId) {
      await notify(
        {
          userId: toUserId,
          type: 'ASSET_ASSIGNED',
          title: 'Asset assigned to you',
          message: `${asset.assetTag} — ${asset.name} was allocated to you.`,
          relatedEntityType: 'Asset',
          relatedEntityId: assetId,
        },
        tx
      );
    }

    return allocation;
  });
}

/** Return an active allocation; reverts the asset to AVAILABLE. */
async function returnAllocation(allocationId, { returnCondition, checkInNotes }, actorId) {
  return prisma.$transaction(async (tx) => {
    const allocation = await tx.allocation.findUnique({
      where: { id: allocationId },
      include: { asset: true },
    });
    if (!allocation) throw ApiError.notFound('Allocation not found');
    if (allocation.status === 'RETURNED') throw ApiError.badRequest('Allocation already returned');

    const updated = await tx.allocation.update({
      where: { id: allocationId },
      data: {
        status: 'RETURNED',
        returnedAt: new Date(),
        returnCondition: returnCondition || undefined,
        checkInNotes: checkInNotes || undefined,
      },
      include: ALLOC_INCLUDE,
    });

    await tx.asset.update({
      where: { id: allocation.assetId },
      data: {
        status: 'AVAILABLE',
        currentHolderId: null,
        ...(returnCondition && { condition: returnCondition }),
      },
    });

    await logActivity(
      { actorId, action: 'ASSET_RETURNED', entityType: 'Asset', entityId: allocation.assetId, metadata: { assetTag: allocation.asset.assetTag } },
      tx
    );

    return updated;
  });
}

// ─── Transfers ─────────────────────────────────────────────────

// Scope transfers a user may see. Employee: ones they're involved in.
// Dept Head: ones involving their department (from/to user or dept).
function transferScopeForUser(user) {
  if (!user || user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') return null;
  if (user.role === 'DEPARTMENT_HEAD') {
    const dept = user.departmentId ?? '__none__';
    return {
      OR: [
        { toDepartmentId: dept },
        { fromUser: { departmentId: dept } },
        { toUser: { departmentId: dept } },
      ],
    };
  }
  return {
    OR: [{ requestedById: user.id }, { fromUserId: user.id }, { toUserId: user.id }],
  };
}

async function listTransfers({ status } = {}, user) {
  const base = status ? { status } : {};
  const scope = transferScopeForUser(user);
  const where = scope ? { AND: [base, scope] } : base;
  return prisma.transferRequest.findMany({
    where,
    include: TRANSFER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

// Does a transfer involve the given department? (for Dept Head approval scope)
async function transferInvolvesDepartment(transfer, deptId) {
  if (!deptId) return false;
  if (transfer.toDepartmentId === deptId) return true;
  const userIds = [transfer.fromUserId, transfer.toUserId].filter(Boolean);
  if (userIds.length === 0) return false;
  const count = await prisma.user.count({
    where: { id: { in: userIds }, departmentId: deptId },
  });
  return count > 0;
}

async function createTransfer({ assetId, toUserId, toDepartmentId, reason }, actorId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw ApiError.notFound('Asset not found');

  const existing = await prisma.transferRequest.findFirst({
    where: { assetId, status: { in: ['REQUESTED', 'APPROVED'] } },
  });
  if (existing) throw ApiError.conflict('A transfer request for this asset is already pending');

  const transfer = await prisma.transferRequest.create({
    data: {
      assetId,
      fromUserId: asset.currentHolderId || null,
      toUserId: toUserId || null,
      toDepartmentId: toDepartmentId || null,
      requestedById: actorId,
      reason: reason || null,
      status: 'REQUESTED',
    },
    include: TRANSFER_INCLUDE,
  });

  await logActivity({ actorId, action: 'TRANSFER_REQUESTED', entityType: 'Asset', entityId: assetId });
  return transfer;
}

/** Approve → close old allocation, open new one, move the asset. Reject → mark rejected. */
async function decideTransfer(transferId, decision, actor) {
  const actorId = actor.id;
  // Department Heads may only decide transfers involving their own department.
  if (actor.role === 'DEPARTMENT_HEAD') {
    const transfer = await prisma.transferRequest.findUnique({ where: { id: transferId } });
    if (!transfer) throw ApiError.notFound('Transfer request not found');
    const inScope = await transferInvolvesDepartment(transfer, actor.departmentId);
    if (!inScope) {
      throw ApiError.forbidden('You can only approve transfers involving your department');
    }
  }

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transferRequest.findUnique({
      where: { id: transferId },
      include: { asset: true },
    });
    if (!transfer) throw ApiError.notFound('Transfer request not found');
    if (transfer.status !== 'REQUESTED') throw ApiError.badRequest('Transfer is no longer pending');

    if (decision === 'REJECT') {
      const rejected = await tx.transferRequest.update({
        where: { id: transferId },
        data: { status: 'REJECTED', approvedById: actorId },
        include: TRANSFER_INCLUDE,
      });
      await notify(
        {
          userId: transfer.requestedById,
          type: 'TRANSFER_REJECTED',
          title: 'Transfer rejected',
          message: `Your transfer request for ${transfer.asset.assetTag} was rejected.`,
          relatedEntityType: 'Asset',
          relatedEntityId: transfer.assetId,
        },
        tx
      );
      return rejected;
    }

    // APPROVE: close any active allocation, create the new one, move the asset.
    await tx.allocation.updateMany({
      where: { assetId: transfer.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } },
      data: { status: 'RETURNED', returnedAt: new Date() },
    });

    await tx.allocation.create({
      data: {
        assetId: transfer.assetId,
        toUserId: transfer.toUserId,
        toDepartmentId: transfer.toDepartmentId,
        allocatedById: actorId,
        status: 'ACTIVE',
      },
    });

    await tx.asset.update({
      where: { id: transfer.assetId },
      data: {
        status: 'ALLOCATED',
        currentHolderId: transfer.toUserId || null,
        currentDepartmentId: transfer.toDepartmentId || transfer.asset.currentDepartmentId,
      },
    });

    const completed = await tx.transferRequest.update({
      where: { id: transferId },
      data: { status: 'COMPLETED', approvedById: actorId },
      include: TRANSFER_INCLUDE,
    });

    await logActivity(
      { actorId, action: 'TRANSFER_APPROVED', entityType: 'Asset', entityId: transfer.assetId, metadata: { assetTag: transfer.asset.assetTag } },
      tx
    );
    // Notify both the requester and the new holder.
    const recipients = [transfer.requestedById, transfer.toUserId].filter(Boolean);
    for (const userId of [...new Set(recipients)]) {
      await notify(
        {
          userId,
          type: 'TRANSFER_APPROVED',
          title: 'Transfer approved',
          message: `${transfer.asset.assetTag} — ${transfer.asset.name} transfer approved.`,
          relatedEntityType: 'Asset',
          relatedEntityId: transfer.assetId,
        },
        tx
      );
    }

    return completed;
  });
}

module.exports = {
  list,
  allocate,
  returnAllocation,
  listTransfers,
  createTransfer,
  decideTransfer,
};
