const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { logActivity } = require('../../utils/activityLogger');
const { sendMail } = require('../../utils/mailer');

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

// Issues a short-lived reset token and emails a reset link to the user.
async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always report success to avoid leaking which emails exist.
  if (!user) return { emailed: false, resetToken: null, previewUrl: null };

  const resetToken = jwt.sign({ sub: user.id, kind: 'reset' }, env.jwt.accessSecret, {
    expiresIn: '30m',
  });
  const resetUrl = `${env.clientOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;

  let previewUrl = null;
  try {
    const result = await sendMail({
      to: user.email,
      subject: 'Reset your AssetFlow password',
      text: `Reset your password using this link (valid 30 min): ${resetUrl}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#10b981">AssetFlow</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. This link is valid for 30 minutes:</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#10b981;color:#04120c;
             padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
             Reset password</a></p>
          <p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email.</p>
        </div>`,
    });
    previewUrl = result.previewUrl;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[forgotPassword] email send failed:', err.message);
  }

  await logActivity({ actorId: user.id, action: 'PASSWORD_RESET_REQUESTED', entityType: 'User', entityId: user.id });

  // previewUrl (Ethereal) is returned only in dev so the tester can open the email.
  return { emailed: true, previewUrl: env.isProd ? null : previewUrl, resetToken: env.isProd ? null : resetToken };
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
