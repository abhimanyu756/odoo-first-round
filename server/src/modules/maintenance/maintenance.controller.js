const asyncHandler = require('../../utils/asyncHandler');
const service = require('./maintenance.service');
const { publicUrl } = require('../../middlewares/upload');

const list = asyncHandler(async (req, res) => {
  res.json({ requests: await service.list(req.query) });
});

const create = asyncHandler(async (req, res) => {
  const photoUrl = req.file ? publicUrl(req.file.filename) : null;
  res.status(201).json({ request: await service.create(req.body, photoUrl, req.user.id) });
});

const transition = asyncHandler(async (req, res) => {
  res.json({ request: await service.transition(req.params.id, req.body, req.user.id) });
});

const remove = asyncHandler(async (req, res) => {
  res.json(await service.remove(req.params.id, req.user.id));
});

module.exports = { list, create, transition, remove };
