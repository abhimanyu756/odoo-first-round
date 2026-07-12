const { z } = require('zod');

const createBookingSchema = z
  .object({
    assetId: z.string().cuid(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    forDepartmentId: z.string().cuid().nullish(),
    purpose: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

const rescheduleSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

const listBookingsQuery = z.object({
  assetId: z.string().cuid().optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

module.exports = { createBookingSchema, rescheduleSchema, listBookingsQuery };
