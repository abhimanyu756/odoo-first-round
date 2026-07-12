const { z } = require('zod');

// 8+ chars, at least one lowercase, uppercase, number, and special character.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be 8+ chars with uppercase, lowercase, number & special character';
const strongPassword = z.string().max(72).regex(PASSWORD_REGEX, PASSWORD_MESSAGE);

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: strongPassword,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: strongPassword,
});

module.exports = { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
