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

async function list({ status, assetId, toUserId, overdue } = {}) {
  const where = {};
  if (status) where.status = status;
  if (assetId) where.assetId = assetId;
  if (toUserId) where.toUserId = toUserId;
  if (overdue) {
    where.status = 'ACTIVE';
    where.expectedReturnDate = { lt: new Date() };
  }
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

async function listTransfers({ status } = {}) {
  return prisma.transferRequest.findMany({
    where: status ? { status } : undefined,
    include: TRANSFER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
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
async function decideTransfer(transferId, decision, actorId) {
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
