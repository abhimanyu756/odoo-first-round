const { Router } = require('express');
const ctrl = require('./departments.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { createDepartmentSchema, updateDepartmentSchema } = require('./departments.schema');

const router = Router();

// All authenticated users can read departments (needed for pickers across screens).
router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);

// Mutations are Admin-only (Organization Setup).
router.post('/', authenticate, requireRole('ADMIN'), validate(createDepartmentSchema), ctrl.create);
router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateDepartmentSchema), ctrl.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), ctrl.deactivate);

module.exports = router;
