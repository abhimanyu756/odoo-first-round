const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middlewares/auth');
const service = require('./dashboard.service');

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await service.getDashboard());
  })
);

module.exports = router;
