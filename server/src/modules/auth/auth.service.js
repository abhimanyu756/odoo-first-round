const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { logActivity } = require('../../utils/activityLogger');

const PUBLIC_USER = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  createdAt: true,
};

async function signup({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  // Signup ALWAYS creates an EMPLOYEE. Roles are only assigned by an admin later.
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'EMPLOYEE' },
    select: PUBLIC_USER,
  });

  await logActivity({
    actorId: user.id,
    action: 'USER_SIGNUP',
    entityType: 'User',
    entityId: user.id,
  });

  return user;
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  if (user.status === 'INACTIVE') throw ApiError.forbidden('Account is inactive. Contact your admin.');

  return getProfile(user.id);
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

// Dev-friendly forgot-password: issues a short-lived reset token.
// In production this token would be emailed, never returned in the response.
async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always report success to avoid leaking which emails exist.
  if (!user) return { emailed: false, resetToken: null };

  const resetToken = jwt.sign({ sub: user.id, kind: 'reset' }, env.jwt.accessSecret, {
    expiresIn: '30m',
  });

  return { emailed: false, resetToken: env.isProd ? null : resetToken };
}

async function resetPassword({ token, password }) {
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }
  if (decoded.kind !== 'reset') throw ApiError.badRequest('Invalid reset token');

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: decoded.sub }, data: { passwordHash } });

  await logActivity({
    actorId: decoded.sub,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: decoded.sub,
  });

  return { success: true };
}

module.exports = { signup, login, getProfile, forgotPassword, resetPassword, PUBLIC_USER };
