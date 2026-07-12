const asyncHandler = require('../../utils/asyncHandler');
const service = require('./categories.service');

const list = asyncHandler(async (req, res) => {
  res.json({ categories: await service.list() });
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ category: await service.getById(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ category: await service.create(req.body, req.user.id) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ category: await service.update(req.params.id, req.body, req.user.id) });
});

const remove = asyncHandler(async (req, res) => {
  res.json(await service.remove(req.params.id, req.user.id));
});

module.exports = { list, getOne, create, update, remove };
