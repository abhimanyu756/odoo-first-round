const asyncHandler = require('../../utils/asyncHandler');
const service = require('./departments.service');

const list = asyncHandler(async (req, res) => {
  const departments = await service.list({ status: req.query.status });
  res.json({ departments });
});

const getOne = asyncHandler(async (req, res) => {
  const department = await service.getById(req.params.id);
  res.json({ department });
});

const create = asyncHandler(async (req, res) => {
  const department = await service.create(req.body, req.user.id);
  res.status(201).json({ department });
});

const update = asyncHandler(async (req, res) => {
  const department = await service.update(req.params.id, req.body, req.user.id);
  res.json({ department });
});

const deactivate = asyncHandler(async (req, res) => {
  const department = await service.deactivate(req.params.id, req.user.id);
  res.json({ department });
});

module.exports = { list, getOne, create, update, deactivate };
