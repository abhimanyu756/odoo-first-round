const asyncHandler = require('../../utils/asyncHandler');
const service = require('./bookings.service');

const list = asyncHandler(async (req, res) => {
  res.json({ bookings: await service.list(req.query, req.user.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ booking: await service.create(req.body, req.user.id) });
});

const reschedule = asyncHandler(async (req, res) => {
  res.json({ booking: await service.reschedule(req.params.id, req.body, req.user.id) });
});

const cancel = asyncHandler(async (req, res) => {
  res.json({ booking: await service.cancel(req.params.id, req.user.id) });
});

module.exports = { list, create, reschedule, cancel };
