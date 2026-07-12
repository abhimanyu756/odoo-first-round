const { Router } = require('express');
const ctrl = require('./audits.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { createAuditSchema, verifyItemSchema } = require('./audits.schema');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);

// Admin creates and closes audit cycles.
router.post('/', authenticate, requireRole('ADMIN'), validate(createAuditSchema), ctrl.create);
router.post('/:id/close', authenticate, requireRole('ADMIN'), ctrl.close);

// Assigned auditors (checked in service) mark each item.
router.patch('/:id/items/:itemId', authenticate, validate(verifyItemSchema), ctrl.verifyItem);

module.exports = router;
