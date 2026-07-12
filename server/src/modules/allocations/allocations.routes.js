const { Router } = require('express');
const ctrl = require('./allocations.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const {
  allocateSchema,
  returnSchema,
  listAllocationsQuery,
} = require('./allocations.schema');

const MANAGERS = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'];
const router = Router();

router.get('/', authenticate, validate(listAllocationsQuery, 'query'), ctrl.list);
router.post('/', authenticate, requireRole(...MANAGERS), validate(allocateSchema), ctrl.allocate);
router.post('/:id/return', authenticate, requireRole(...MANAGERS), validate(returnSchema), ctrl.returnAllocation);

module.exports = router;
