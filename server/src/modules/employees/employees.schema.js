const { z } = require('zod');

const ROLES = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'];

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  departmentId: z.string().cuid().optional(),
});

// Admin can create an employee account directly from the directory.
const createEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  departmentId: z.string().cuid().nullish(),
  role: z.enum(ROLES).default('EMPLOYEE'),
});

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  departmentId: z.string().cuid().nullish(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// The ONLY place a role is assigned/changed.
const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

module.exports = {
  listQuerySchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  updateRoleSchema,
};
