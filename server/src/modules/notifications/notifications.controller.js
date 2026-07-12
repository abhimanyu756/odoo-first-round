const asyncHandler = require('../../utils/asyncHandler');
const service = require('./notifications.service');

const list = asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  res.json({ notifications: await service.list(req.user.id, { unreadOnly }) });
});

const unreadCount = asyncHandler(async (req, res) => {
  res.json({ count: await service.unreadCount(req.user.id) });
});

const markRead = asyncHandler(async (req, res) => {
  res.json({ notification: await service.markRead(req.user.id, req.params.id) });
});

const markAllRead = asyncHandler(async (req, res) => {
  res.json(await service.markAllRead(req.user.id));
});

module.exports = { list, unreadCount, markRead, markAllRead };
