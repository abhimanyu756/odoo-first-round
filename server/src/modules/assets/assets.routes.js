const { Router } = require('express');
const ctrl = require('./assets.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { upload } = require('../../middlewares/upload');
const { createAssetSchema, updateAssetSchema, listQuerySchema } = require('./assets.schema');

const router = Router();

// Reads: any authenticated user.
router.get('/', authenticate, validate(listQuerySchema, 'query'), ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);
router.get('/:id/profile', authenticate, ctrl.getProfile);

// Registration & edits: Asset Manager / Admin. `upload.array` parses multipart first.
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'ASSET_MANAGER'),
  upload.array('files', 8),
  validate(createAssetSchema),
  ctrl.create
);
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'ASSET_MANAGER'),
  upload.array('files', 8),
  validate(updateAssetSchema),
  ctrl.update
);

module.exports = router;
