// Transaction-safe generator for human-readable asset tags: AF-0001, AF-0002, ...
// Pass the Prisma transaction client (tx) so the counter increment and the asset
// insert commit atomically.
const ASSET_TAG_KEY = 'asset_tag';

async function nextAssetTag(tx) {
  const counter = await tx.counter.upsert({
    where: { key: ASSET_TAG_KEY },
    create: { key: ASSET_TAG_KEY, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `AF-${String(counter.value).padStart(4, '0')}`;
}

module.exports = { nextAssetTag, ASSET_TAG_KEY };
