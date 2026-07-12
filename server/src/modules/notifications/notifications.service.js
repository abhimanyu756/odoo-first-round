const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');

async function list(userId, { unreadOnly } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

async function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

async function markRead(userId, id) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw ApiError.notFound('Notification not found');
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { success: true };
}

module.exports = { list, unreadCount, markRead, markAllRead };
