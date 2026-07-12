const { z } = require('zod');

// A category can declare optional custom fields (e.g. warranty period for Electronics).
const customFieldSchema = z.object({
  key: z.string().trim().min(1).max(50),
  label: z.string().trim().min(1).max(80),
  type: z.enum(['text', 'number', 'date', 'boolean']).default('text'),
  required: z.boolean().default(false),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().max(300).nullish(),
  customFields: z.array(customFieldSchema).max(20).default([]),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = { createCategorySchema, updateCategorySchema };
