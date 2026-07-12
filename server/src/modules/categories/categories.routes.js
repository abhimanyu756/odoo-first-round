const { Router } = require('express');
const ctrl = require('./categories.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { validate } = require('../../middlewares/validate');
const { createCategorySchema, updateCategorySchema } = require('./categories.schema');

const router = Router();

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);

router.post('/', authenticate, requireRole('ADMIN'), validate(createCategorySchema), ctrl.create);
router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateCategorySchema), ctrl.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), ctrl.remove);

module.exports = router;
