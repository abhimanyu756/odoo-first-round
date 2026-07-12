const asyncHandler = require('../../utils/asyncHandler');
const service = require('./allocations.service');

// Allocations
const list = asyncHandler(async (req, res) => {
  res.json({ allocations: await service.list(req.query) });
});

const allocate = asyncHandler(async (req, res) => {
  res.status(201).json({ allocation: await service.allocate(req.body, req.user.id) });
});

const returnAllocation = asyncHandler(async (req, res) => {
  res.json({ allocation: await service.returnAllocation(req.params.id, req.body, req.user.id) });
});

// Transfers
const listTransfers = asyncHandler(async (req, res) => {
  res.json({ transfers: await service.listTransfers(req.query) });
});

const createTransfer = asyncHandler(async (req, res) => {
  res.status(201).json({ transfer: await service.createTransfer(req.body, req.user.id) });
});

const decideTransfer = asyncHandler(async (req, res) => {
  res.json({ transfer: await service.decideTransfer(req.params.id, req.body.decision, req.user.id) });
});

module.exports = { list, allocate, returnAllocation, listTransfers, createTransfer, decideTransfer };
