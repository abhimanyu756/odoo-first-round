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

// Per the PRD, the Asset Manager registers/allocates assets and approves returns;
// Department Heads approve transfer requests (see transfers.routes.js), not direct
// allocation. So allocate + return are Asset Manager / Admin only.
const ALLOCATORS = ['ADMIN', 'ASSET_MANAGER'];
const router = Router();

router.get('/', authenticate, validate(listAllocationsQuery, 'query'), ctrl.list);
router.post('/', authenticate, requireRole(...ALLOCATORS), validate(allocateSchema), ctrl.allocate);
router.post('/:id/return', authenticate, requireRole(...ALLOCATORS), validate(returnSchema), ctrl.returnAllocation);

module.exports = router;
