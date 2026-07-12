const { z } = require('zod');

const allocateSchema = z
  .object({
    assetId: z.string().cuid(),
    toUserId: z.string().cuid().nullish(),
    toDepartmentId: z.string().cuid().nullish(),
    expectedReturnDate: z.coerce.date().nullish(),
  })
  .refine((d) => d.toUserId || d.toDepartmentId, {
    message: 'Allocate to an employee or a department',
    path: ['toUserId'],
  });

const returnSchema = z.object({
  returnCondition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).optional(),
  checkInNotes: z.string().trim().max(500).optional(),
});

const createTransferSchema = z
  .object({
    assetId: z.string().cuid(),
    toUserId: z.string().cuid().nullish(),
    toDepartmentId: z.string().cuid().nullish(),
    reason: z.string().trim().max(500).nullish(),
  })
  .refine((d) => d.toUserId || d.toDepartmentId, {
    message: 'Choose a destination employee or department',
    path: ['toUserId'],
  });

const decideTransferSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
});

const listAllocationsQuery = z.object({
  status: z.enum(['ACTIVE', 'RETURNED', 'OVERDUE']).optional(),
  assetId: z.string().cuid().optional(),
  toUserId: z.string().cuid().optional(),
  overdue: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

module.exports = {
  allocateSchema,
  returnSchema,
  createTransferSchema,
  decideTransferSchema,
  listAllocationsQuery,
};
