const { z } = require('zod');

const createAuditSchema = z
  .object({
    name: z.string().trim().min(3, 'Name is required').max(120),
    scopeType: z.enum(['DEPARTMENT', 'LOCATION']),
    scopeDepartmentId: z.string().cuid().nullish(),
    scopeLocation: z.string().trim().max(120).nullish(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    auditorIds: z.array(z.string().cuid()).min(1, 'Assign at least one auditor'),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })
  .refine((d) => (d.scopeType === 'DEPARTMENT' ? !!d.scopeDepartmentId : !!d.scopeLocation), {
    message: 'Provide the scope (department or location)',
    path: ['scopeDepartmentId'],
  });

const verifyItemSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'MISSING', 'DAMAGED', 'PENDING']),
  notes: z.string().trim().max(500).optional(),
});

module.exports = { createAuditSchema, verifyItemSchema };
