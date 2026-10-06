import rateLimit from 'express-rate-limit';

/**
 * Strict Auth Rate Limiter
 * Protects against credential stuffing, brute force, and account enumeration
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Access temporarily throttled for security. Please try again after 15 minutes.',
  },
});

/**
 * Upload & Deployment Rate Limiter
 * Protects against disk exhaustion, DDoS via large uploads, and worker queue starvation
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 upload/deploy jobs per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Upload rate limit exceeded. You have reached the maximum allowed file uploads within this time window. Please wait a few minutes before deploying again.',
  },
});

/**
 * cPanel File Manager Operations Limiter
 * Protects against automated script spamming file creates/deletes/renames
 */
export const cpanelActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 120, // Max 120 operations per 10 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many file manager operations requested. Please slow down.',
  },
});

/**
 * Subdomain Availability Check Limiter
 * Protects against automated subdomain scraping / dictionary attacks
 */
export const subdomainCheckLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60, // Max 60 checks per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many domain availability inquiries. Please wait before checking more subdomains.',
  },
});

/**
 * Ad Interaction Limiter
 * Protects against impression/click fraud and flooding
 */
export const adInteractionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // Max 60 per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many ad interaction events. Please slow down.',
  },
});

/**
 * General Public API Rate Limiter
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // 600 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many API requests from this IP. Please try again later.',
  },
});
