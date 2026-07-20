import { z } from 'zod';
import { ROLES } from '../rbac/permissions';

const roleEnum = z.enum(ROLES);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(120),
  /** New company name — when provided the user becomes that company's owner. */
  companyName: z.string().min(2).max(160).optional(),
  /** Join an existing company by id (e.g. invited driver/customer). */
  companyId: z.string().uuid().optional(),
  /** Requested role at signup. Defaults applied server-side. */
  role: roleEnum.optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const roleSchema = z.object({
  role: roleEnum,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(6),
});

export const registerStartSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(120),
  companyName: z.string().min(2).max(160),
});

export const registerVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const registerResendSchema = z.object({
  email: z.string().email(),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
