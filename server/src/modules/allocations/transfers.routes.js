const { Router } = require('express');
const ctrl = require('./allocations.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { createTransferSchema, decideTransferSchema } = require('./allocations.schema');

const MANAGERS = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'];
const router = Router();

router.get('/', authenticate, ctrl.listTransfers);
// Any authenticated user (incl. Employee) can initiate a transfer request.
router.post('/', authenticate, validate(createTransferSchema), ctrl.createTransfer);
// Approval/rejection is a manager action.
router.post('/:id/decide', authenticate, requireRole(...MANAGERS), validate(decideTransferSchema), ctrl.decideTransfer);

module.exports = router;
