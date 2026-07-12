const { Router } = require('express');
const prisma = require('../../config/prisma');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');

const router = Router();

// Full activity/audit trail — managers & admins only (who did what, when).
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'),
  asyncHandler(async (req, res) => {
    const { entityType, entityId, actorId } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorId) where.actorId = actorId;

    const logs = await prisma.activityLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ logs });
  })
);

module.exports = router;
