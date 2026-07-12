const asyncHandler = require('../../utils/asyncHandler');
const service = require('./assets.service');
const { publicUrl } = require('../../middlewares/upload');

// Map uploaded files (multer) to document records.
function filesToDocuments(files = []) {
  return files.map((f) => ({
    url: publicUrl(f.filename),
    kind: f.mimetype === 'application/pdf' ? 'DOC' : 'PHOTO',
  }));
}

const list = asyncHandler(async (req, res) => {
  res.json({ assets: await service.list(req.query, req.user) });
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ asset: await service.getById(req.params.id) });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json(await service.getProfile(req.params.id));
});

const create = asyncHandler(async (req, res) => {
  const documents = filesToDocuments(req.files);
  const asset = await service.create(req.body, documents, req.user.id);
  res.status(201).json({ asset });
});

const update = asyncHandler(async (req, res) => {
  const documents = filesToDocuments(req.files);
  const asset = await service.update(req.params.id, req.body, documents, req.user.id);
  res.json({ asset });
});

module.exports = { list, getOne, getProfile, create, update };
