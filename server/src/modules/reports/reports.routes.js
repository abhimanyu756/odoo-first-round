const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const service = require('./reports.service');

const MANAGERS = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'];
const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await service.getAll());
  })
);

router.get(
  '/export/assets.csv',
  authenticate,
  requireRole(...MANAGERS),
  asyncHandler(async (req, res) => {
    const csv = await service.assetsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assetflow-assets.csv"');
    res.send(csv);
  })
);

module.exports = router;
