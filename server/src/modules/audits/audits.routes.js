const { Router } = require('express');
const ctrl = require('./audits.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { createAuditSchema, verifyItemSchema } = require('./audits.schema');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);

// Admin creates audit cycles (Organization Setup). Closing a cycle resolves
// discrepancies, which the PRD also assigns to the Asset Manager.
router.post('/', authenticate, requireRole('ADMIN'), validate(createAuditSchema), ctrl.create);
router.post('/:id/close', authenticate, requireRole('ADMIN', 'ASSET_MANAGER'), ctrl.close);

// Assigned auditors (checked in service) mark each item.
router.patch('/:id/items/:itemId', authenticate, validate(verifyItemSchema), ctrl.verifyItem);

module.exports = router;
