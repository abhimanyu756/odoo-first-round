const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { logActivity } = require('../../utils/activityLogger');

const INCLUDE = { _count: { select: { assets: true } } };

async function list() {
  return prisma.assetCategory.findMany({ include: INCLUDE, orderBy: { name: 'asc' } });
}

async function getById(id) {
  const cat = await prisma.assetCategory.findUnique({ where: { id }, include: INCLUDE });
  if (!cat) throw ApiError.notFound('Category not found');
  return cat;
}

async function create(data, actorId) {
  const cat = await prisma.assetCategory.create({ data, include: INCLUDE });
  await logActivity({
    actorId,
    action: 'CATEGORY_CREATED',
    entityType: 'AssetCategory',
    entityId: cat.id,
    metadata: { name: cat.name },
  });
  return cat;
}

async function update(id, data, actorId) {
  await getById(id);
  const cat = await prisma.assetCategory.update({ where: { id }, data, include: INCLUDE });
  await logActivity({
    actorId,
    action: 'CATEGORY_UPDATED',
    entityType: 'AssetCategory',
    entityId: id,
    metadata: { name: cat.name },
  });
  return cat;
}

async function remove(id, actorId) {
  const cat = await getById(id);
  if (cat._count.assets > 0) {
    throw ApiError.conflict('Cannot delete a category that still has assets. Reassign them first.');
  }
  await prisma.assetCategory.delete({ where: { id } });
  await logActivity({
    actorId,
    action: 'CATEGORY_DELETED',
    entityType: 'AssetCategory',
    entityId: id,
    metadata: { name: cat.name },
  });
  return { success: true };
}

module.exports = { list, getById, create, update, remove };
