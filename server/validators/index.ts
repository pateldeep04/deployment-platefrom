import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be 2 to 50 characters').max(50)
    .regex(/^[a-zA-Z0-9-_\s]+$/, 'Only letters, numbers, hyphens, underscores and spaces allowed'),
  slug: z.string().min(2).max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
    .optional(),
  subdomain: z.string().min(2).max(63).optional(),
  platformDomain: z.string().optional(),
  type: z.enum(['STATIC', 'PHP', 'REACT', 'VITE', 'NODE']),
  buildCommand: z.string().optional(),
  outputDirectory: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  buildCommand: z.string().optional(),
  outputDirectory: z.string().optional(),
  customDomain: z.string().optional(),
});

export const setEnvVarSchema = z.object({
  key: z.string().min(1).regex(/^[A-Z0-9_]+$/, 'Key must be uppercase alphanumeric and underscores (e.g. API_KEY)'),
  value: z.string(),
});

export const createAdSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(5).max(300),
  imageUrl: z.string().url('Must be a valid URL'),
  targetUrl: z.string().url('Must be a valid URL'),
  placement: z.enum(['DASHBOARD', 'PROJECT_PAGE', 'DOCUMENTATION', 'PUBLIC_WEBSITE']),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
});

export const customDomainSchema = z.object({
  domain: z.string().min(3).max(100).regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/, 'Invalid domain format'),
});
