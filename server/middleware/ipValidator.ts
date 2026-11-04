import { Request, Response, NextFunction } from 'express';
import net from 'net';
import { dbStore } from '../database/store';

// Extend Express Request interface to include validated clientIp
declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
    }
  }
}

// Known malicious vulnerability scanners and attack bot User-Agents
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /zgrab/i,
  /nmap/i,
  /nessus/i,
  /openvas/i,
  /wpscan/i,
  /acunetix/i,
  /havij/i,
  /dirbuster/i,
  /gobuster/i,
  /hydra/i,
  /burpcollaborator/i,
];

// Known exploit and credential probing URLs
const EXPLOIT_PROBE_PATTERNS = [
  /\/\.env(\.|$)/i,
  /\/\.git(\/|$)/i,
  /\/\.aws(\/|$)/i,
  /\/\.ssh(\/|$)/i,
  /\/\.htaccess/i,
  /\/wp-admin/i,
  /\/wp-login\.php/i,
  /\/phpmyadmin/i,
  /\/xmlrpc\.php/i,
  /\/cgi-bin\//i,
  /\/etc\/passwd/i,
  /\/win\.ini/i,
];

// Sliding window tracker for suspicious request anomalies
interface IpViolationRecord {
  count: number;
  firstSeen: number;
}
const suspiciousIpTracker = new Map<string, IpViolationRecord>();

// Cleanup old violations periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of suspiciousIpTracker.entries()) {
    if (now - record.firstSeen > 15 * 60 * 1000) {
      suspiciousIpTracker.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/**
 * Extracts and sanitizes the true client IP from request headers or socket
 */
export function extractClientIp(req: Request): string {
  // 1. Cloudflare header
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cleanIp(cfIp);
  }

  // 2. Standard X-Forwarded-For header (leftmost IP is the original client)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return cleanIp(firstIp);
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return cleanIp(forwardedFor[0].split(',')[0].trim());
  }

  // 3. X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return cleanIp(realIp);
  }

  // 4. Direct socket address
  const socketIp = req.socket.remoteAddress || req.ip || '127.0.0.1';
  return cleanIp(socketIp);
}

function cleanIp(ip: string): string {
  let cleaned = ip.replace(/^::ffff:/, '').trim();
  // Strip port number if IPv4:port
  if (cleaned.includes(':') && !cleaned.includes('::')) {
    const parts = cleaned.split(':');
    if (parts.length === 2 && net.isIP(parts[0]) === 4) {
      cleaned = parts[0];
    }
  }
  return cleaned;
}

/**
 * Global IP Validation and Malicious Threat Detection Middleware
 */
export const ipValidator = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = extractClientIp(req);
  req.clientIp = clientIp;

  // 1. Check IP address structural validity
  const ipVersion = net.isIP(clientIp);
  if (ipVersion === 0 && clientIp !== 'localhost') {
    res.status(400).json({
      success: false,
      error: 'Security Error: Malformed client IP address header rejected.',
    });
    return;
  }

  // 2. Check if IP is permanently banned
  if (dbStore.isIpBanned(clientIp)) {
    res.status(403).json({
      success: false,
      error: 'Access Denied: Your IP address has been suspended due to security policy violations.',
    });
    return;
  }

  // 3. Scanner & Exploit User-Agent Detection
  const userAgent = (req.headers['user-agent'] || '').trim();
  if (userAgent) {
    const isMaliciousBot = MALICIOUS_USER_AGENTS.some(regex => regex.test(userAgent));
    if (isMaliciousBot) {
      console.warn(`🚨 [SECURITY SHIELD] Blocked malicious attack scanner User-Agent from ${clientIp}: "${userAgent}"`);
      dbStore.banIp(clientIp, `Automated scanner detected: ${userAgent}`);
      res.status(403).json({
        success: false,
        error: 'Security Violation: Automated vulnerability scanner detected. IP has been blacklisted.',
      });
      return;
    }
  }

  // 4. Probing for sensitive internal endpoints / credentials
  const rawUrl = req.originalUrl || req.url;
  const isExploitProbe = EXPLOIT_PROBE_PATTERNS.some(regex => regex.test(rawUrl));
  if (isExploitProbe) {
    console.warn(`🚨 [SECURITY SHIELD] Blocked exploit probe attempt from ${clientIp} for: ${rawUrl}`);
    
    // Track violations
    const record = suspiciousIpTracker.get(clientIp) || { count: 0, firstSeen: Date.now() };
    record.count++;
    suspiciousIpTracker.set(clientIp, record);

    if (record.count >= 5) {
      dbStore.banIp(clientIp, `Repeated exploit probe attempts: ${rawUrl}`);
    }

    res.status(403).json({
      success: false,
      error: 'Access Denied: Probing of internal/restricted system files is strictly forbidden.',
    });
    return;
  }

  next();
};

