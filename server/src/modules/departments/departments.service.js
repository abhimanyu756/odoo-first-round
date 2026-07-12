const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { logActivity } = require('../../utils/activityLogger');

const INCLUDE = {
  head: { select: { id: true, name: true, email: true } },
  parentDepartment: { select: { id: true, name: true } },
  _count: { select: { members: true, assets: true, childDepartments: true } },
};

async function list({ status } = {}) {
  return prisma.department.findMany({
    where: status ? { status } : undefined,
    include: INCLUDE,
    orderBy: { name: 'asc' },
  });
}

async function getById(id) {
  const dept = await prisma.department.findUnique({ where: { id }, include: INCLUDE });
  if (!dept) throw ApiError.notFound('Department not found');
  return dept;
}

// Guard against pointing a department at itself as its own parent.
function assertNotSelfParent(id, parentDepartmentId) {
  if (parentDepartmentId && id && parentDepartmentId === id) {
    throw ApiError.badRequest('A department cannot be its own parent');
  }
}

async function create(data, actorId) {
  assertNotSelfParent(null, data.parentDepartmentId);
  const dept = await prisma.department.create({ data, include: INCLUDE });
  await logActivity({
    actorId,
    action: 'DEPARTMENT_CREATED',
    entityType: 'Department',
    entityId: dept.id,
    metadata: { name: dept.name },
  });
  return dept;
}

async function update(id, data, actorId) {
  await getById(id);
  assertNotSelfParent(id, data.parentDepartmentId);
  const dept = await prisma.department.update({ where: { id }, data, include: INCLUDE });
  await logActivity({
    actorId,
    action: 'DEPARTMENT_UPDATED',
    entityType: 'Department',
    entityId: id,
    metadata: { name: dept.name },
  });
  return dept;
}

async function deactivate(id, actorId) {
  await getById(id);
  const dept = await prisma.department.update({
    where: { id },
    data: { status: 'INACTIVE' },
    include: INCLUDE,
  });
  await logActivity({
    actorId,
    action: 'DEPARTMENT_DEACTIVATED',
    entityType: 'Department',
    entityId: id,
  });
  return dept;
}

module.exports = { list, getById, create, update, deactivate };
