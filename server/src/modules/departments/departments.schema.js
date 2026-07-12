const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  headId: z.string().cuid().nullish(),
  parentDepartmentId: z.string().cuid().nullish(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

module.exports = { createDepartmentSchema, updateDepartmentSchema };
