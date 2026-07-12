const { z } = require('zod');

const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR'];
const STATUSES = [
  'AVAILABLE',
  'ALLOCATED',
  'RESERVED',
  'UNDER_MAINTENANCE',
  'LOST',
  'RETIRED',
  'DISPOSED',
];

// Coerce is used because multipart/form-data sends everything as strings.
const createAssetSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  categoryId: z.string().cuid('Select a category'),
  serialNumber: z.string().trim().max(120).nullish(),
  acquisitionDate: z.coerce.date().nullish(),
  acquisitionCost: z.coerce.number().nonnegative().nullish(),
  condition: z.enum(CONDITIONS).default('GOOD'),
  location: z.string().trim().max(120).nullish(),
  isBookable: z.coerce.boolean().default(false),
  currentDepartmentId: z.string().cuid().nullish(),
  customFieldValues: z
    .union([z.string(), z.record(z.string(), z.any())])
    .optional()
    .transform((v) => {
      if (v == null || v === '') return undefined;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return undefined;
        }
      }
      return v;
    }),
});

const updateAssetSchema = createAssetSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().cuid().optional(),
  status: z.enum(STATUSES).optional(),
  departmentId: z.string().cuid().optional(),
  location: z.string().trim().optional(),
  isBookable: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

module.exports = { createAssetSchema, updateAssetSchema, listQuerySchema, CONDITIONS, STATUSES };
