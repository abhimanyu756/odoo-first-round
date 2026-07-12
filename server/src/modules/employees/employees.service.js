const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { logActivity, notify } = require('../../utils/activityLogger');

const PUBLIC = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  createdAt: true,
};

async function list({ search, role, status, departmentId } = {}) {
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.user.findMany({ where, select: PUBLIC, orderBy: { name: 'asc' } });
}

async function getById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC });
  if (!user) throw ApiError.notFound('Employee not found');
  return user;
}

async function create(data, actorId) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      departmentId: data.departmentId || null,
    },
    select: PUBLIC,
  });
  await logActivity({
    actorId,
    action: 'EMPLOYEE_CREATED',
    entityType: 'User',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });
  return user;
}

async function update(id, data, actorId) {
  await getById(id);
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId || null }),
    },
    select: PUBLIC,
  });
  await logActivity({
    actorId,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'User',
    entityId: id,
  });
  return user;
}

// The single authorized path for changing a user's role.
async function updateRole(id, role, actorId) {
  const target = await getById(id);
  if (target.role === role) return target;

  const user = await prisma.user.update({ where: { id }, data: { role }, select: PUBLIC });

  await logActivity({
    actorId,
    action: 'ROLE_CHANGED',
    entityType: 'User',
    entityId: id,
    metadata: { from: target.role, to: role },
  });
  await notify({
    userId: id,
    type: 'ROLE_CHANGED',
    title: 'Your role was updated',
    message: `You are now ${role.replace('_', ' ').toLowerCase()}.`,
    relatedEntityType: 'User',
    relatedEntityId: id,
  });
  return user;
}

module.exports = { list, getById, create, update, updateRole, PUBLIC };
