const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken, ACCESS_COOKIE } = require('../utils/tokens');

// Verifies the access-token cookie and attaches the current user to req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) throw ApiError.unauthorized('Not authenticated');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, name: true, email: true, role: true, status: true, departmentId: true },
  });

  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.status === 'INACTIVE') throw ApiError.forbidden('Account is inactive');

  req.user = user;
  next();
});

module.exports = { authenticate };
