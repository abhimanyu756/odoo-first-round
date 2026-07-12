const ApiError = require('../utils/ApiError');

// Guard factory: allow only the given roles. Must run after `authenticate`.
// Usage: router.post('/', authenticate, requireRole('ADMIN', 'ASSET_MANAGER'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { requireRole };
