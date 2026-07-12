const { z } = require('zod');

const createMaintenanceSchema = z.object({
  assetId: z.string().cuid(),
  description: z.string().trim().min(5, 'Describe the issue').max(1000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

// Workflow transitions. `decision` for approve/reject; others move the card forward.
const transitionSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'ASSIGN', 'START', 'RESOLVE']),
    technicianId: z.string().cuid().nullish(),
    resolutionNotes: z.string().trim().max(1000).optional(),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.action !== 'ASSIGN' || !!d.technicianId, {
    message: 'A technician is required to assign',
    path: ['technicianId'],
  });

const listQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'])
    .optional(),
  assetId: z.string().cuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

module.exports = { createMaintenanceSchema, transitionSchema, listQuerySchema };
