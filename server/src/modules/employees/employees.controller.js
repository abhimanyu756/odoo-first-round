const asyncHandler = require('../../utils/asyncHandler');
const service = require('./employees.service');

const list = asyncHandler(async (req, res) => {
  res.json({ employees: await service.list(req.query) });
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ employee: await service.getById(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ employee: await service.create(req.body, req.user.id) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ employee: await service.update(req.params.id, req.body, req.user.id) });
});

const updateRole = asyncHandler(async (req, res) => {
  res.json({ employee: await service.updateRole(req.params.id, req.body.role, req.user.id) });
});

module.exports = { list, getOne, create, update, updateRole };
