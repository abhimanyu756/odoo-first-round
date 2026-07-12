const { Router } = require('express');
const ctrl = require('./employees.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const {
  listQuerySchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  updateRoleSchema,
} = require('./employees.schema');

const router = Router();

// Directory is readable by any authenticated user (needed for pickers: allocate-to,
// auditors, technicians). Sensitive fields are never selected.
router.get('/', authenticate, validate(listQuerySchema, 'query'), ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);

// Directory management + role promotion are Admin-only.
router.post('/', authenticate, requireRole('ADMIN'), validate(createEmployeeSchema), ctrl.create);
router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateEmployeeSchema), ctrl.update);
router.patch(
  '/:id/role',
  authenticate,
  requireRole('ADMIN'),
  validate(updateRoleSchema),
  ctrl.updateRole
);

module.exports = router;
