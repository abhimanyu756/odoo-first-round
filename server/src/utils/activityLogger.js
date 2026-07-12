const prisma = require('../config/prisma');

// Records an audit-trail entry. Accepts an optional tx client so it can run
// inside a transaction; otherwise uses the shared prisma instance.
async function logActivity(
  { actorId, action, entityType, entityId, metadata },
  client = prisma
) {
  return client.activityLog.create({
    data: { actorId: actorId || null, action, entityType, entityId, metadata },
  });
}

// Creates one notification for a single user.
async function notify(
  { userId, type, title, message, relatedEntityType, relatedEntityId },
  client = prisma
) {
  if (!userId) return null;
  return client.notification.create({
    data: { userId, type, title, message, relatedEntityType, relatedEntityId },
  });
}

// Creates the same notification for many users (deduped, skips falsy ids).
async function notifyMany(userIds, payload, client = prisma) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { count: 0 };
  return client.notification.createMany({
    data: unique.map((userId) => ({ userId, ...payload })),
  });
}

module.exports = { logActivity, notify, notifyMany };
