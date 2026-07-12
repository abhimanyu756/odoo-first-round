const asyncHandler = require('../../utils/asyncHandler');
const service = require('./audits.service');

const list = asyncHandler(async (req, res) => {
  res.json({ cycles: await service.list() });
});

const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ cycle: await service.create(req.body, req.user.id) });
});

const verifyItem = asyncHandler(async (req, res) => {
  const item = await service.verifyItem(req.params.id, req.params.itemId, req.body, req.user);
  res.json({ item });
});

const close = asyncHandler(async (req, res) => {
  res.json({ cycle: await service.close(req.params.id, req.user.id) });
});

module.exports = { list, getOne, create, verifyItem, close };
