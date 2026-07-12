const { Router } = require('express');
const ctrl = require('./maintenance.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { upload } = require('../../middlewares/upload');
const { createMaintenanceSchema, transitionSchema, listQuerySchema } = require('./maintenance.schema');

const APPROVERS = ['ADMIN', 'ASSET_MANAGER'];
const router = Router();

router.get('/', authenticate, validate(listQuerySchema, 'query'), ctrl.list);

// Any authenticated user (asset holder) can raise a request, optionally with a photo.
router.post('/', authenticate, upload.single('photo'), validate(createMaintenanceSchema), ctrl.create);

// Approval/assignment/resolution transitions are Asset Manager / Admin.
router.post(
  '/:id/transition',
  authenticate,
  requireRole(...APPROVERS),
  validate(transitionSchema),
  ctrl.transition
);

module.exports = router;
