const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { nextAssetTag } = require('../../utils/assetTag');
const { logActivity } = require('../../utils/activityLogger');

const LIST_INCLUDE = {
  category: { select: { id: true, name: true } },
  currentHolder: { select: { id: true, name: true } },
  currentDepartment: { select: { id: true, name: true } },
};

async function list(filters = {}) {
  const { search, categoryId, status, departmentId, location, isBookable } = filters;
  const where = {};
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (departmentId) where.currentDepartmentId = departmentId;
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (isBookable !== undefined) where.isBookable = isBookable;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { assetTag: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { qrCode: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.asset.findMany({ where, include: LIST_INCLUDE, orderBy: { createdAt: 'desc' } });
}

async function getById(id) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      ...LIST_INCLUDE,
      documents: true,
      category: true,
    },
  });
  if (!asset) throw ApiError.notFound('Asset not found');
  return asset;
}

// Full profile: asset + allocation history + maintenance history.
async function getProfile(id) {
  const asset = await getById(id);
  const [allocations, maintenance] = await Promise.all([
    prisma.allocation.findMany({
      where: { assetId: id },
      include: {
        toUser: { select: { id: true, name: true } },
        toDepartment: { select: { id: true, name: true } },
        allocatedBy: { select: { id: true, name: true } },
      },
      orderBy: { allocatedAt: 'desc' },
    }),
    prisma.maintenanceRequest.findMany({
      where: { assetId: id },
      include: {
        raisedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { asset, allocations, maintenance };
}

async function create(data, documents, actorId) {
  // Validate category exists (nicer error than FK violation).
  const category = await prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw ApiError.badRequest('Selected category does not exist');

  const asset = await prisma.$transaction(async (tx) => {
    const assetTag = await nextAssetTag(tx);
    return tx.asset.create({
      data: {
        assetTag,
        qrCode: assetTag, // QR encodes the tag; scannable in search.
        name: data.name,
        categoryId: data.categoryId,
        serialNumber: data.serialNumber || null,
        acquisitionDate: data.acquisitionDate || null,
        acquisitionCost: data.acquisitionCost ?? null,
        condition: data.condition,
        location: data.location || null,
        isBookable: data.isBookable,
        currentDepartmentId: data.currentDepartmentId || null,
        customFieldValues: data.customFieldValues || undefined,
        documents: documents?.length
          ? { create: documents.map((d) => ({ url: d.url, kind: d.kind })) }
          : undefined,
      },
      include: { ...LIST_INCLUDE, documents: true },
    });
  });

  await logActivity({
    actorId,
    action: 'ASSET_REGISTERED',
    entityType: 'Asset',
    entityId: asset.id,
    metadata: { assetTag: asset.assetTag, name: asset.name },
  });
  return asset;
}

async function update(id, data, documents, actorId) {
  await getById(id);
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber || null }),
      ...(data.acquisitionDate !== undefined && { acquisitionDate: data.acquisitionDate || null }),
      ...(data.acquisitionCost !== undefined && { acquisitionCost: data.acquisitionCost ?? null }),
      ...(data.condition !== undefined && { condition: data.condition }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.isBookable !== undefined && { isBookable: data.isBookable }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.currentDepartmentId !== undefined && {
        currentDepartmentId: data.currentDepartmentId || null,
      }),
      ...(data.customFieldValues !== undefined && { customFieldValues: data.customFieldValues }),
      ...(documents?.length && { documents: { create: documents.map((d) => ({ url: d.url, kind: d.kind })) } }),
    },
    include: { ...LIST_INCLUDE, documents: true },
  });
  await logActivity({
    actorId,
    action: 'ASSET_UPDATED',
    entityType: 'Asset',
    entityId: id,
    metadata: { assetTag: asset.assetTag },
  });
  return asset;
}

module.exports = { list, getById, getProfile, create, update, LIST_INCLUDE };
