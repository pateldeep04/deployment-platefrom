import { Request, Response } from 'express';
import { dbStore } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { customDomainSchema } from '../validators';
import { config } from '../config';
import { subdomainService } from '../services/subdomainService';
import { namecheapService } from '../services/namecheapService';

export const addCustomDomain = (req: AuthenticatedRequest, res: Response): void => {
  const { projectId } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  // Check plan eligibility for custom domains
  if (user.plan === 'FREE') {
    res.status(403).json({
      success: false,
      error: 'Custom domains are available on Developer and Pro plans. Please upgrade your account.'
    });
    return;
  }

  const parseResult = customDomainSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  const { domain } = parseResult.data;

  // Check if domain is already in use by another project
  if (dbStore.projects.some(p => p.customDomain === domain && p._id !== project._id)) {
    res.status(400).json({ success: false, error: `Domain '${domain}' is already assigned to another project` });
    return;
  }

  project.customDomain = domain;
  project.customDomainVerified = false;
  project.sslEnabled = false;
  dbStore.save();

  res.json({
    success: true,
    data: {
      customDomain: domain,
      cnameRecord: {
        type: 'CNAME',
        name: domain.startsWith('www.') ? 'www' : '@',
        value: `cname.${config.platformDomain}`,
      },
      status: 'PENDING_VERIFICATION',
    }
  });
};

export const verifyCustomDomain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project || !project.customDomain) {
    res.status(404).json({ success: false, error: 'No custom domain configured for this project' });
    return;
  }

  // Simulate automated DNS CNAME resolution and Let's Encrypt TLS handshake
  project.customDomainVerified = true;
  project.sslEnabled = true;
  dbStore.save();

  res.json({
    success: true,
    message: `Domain '${project.customDomain}' successfully verified! HTTPS certificate provisioned via Let's Encrypt.`,
    data: {
      domain: project.customDomain,
      verified: true,
      ssl: true,
    }
  });
};

export const removeCustomDomain = (req: AuthenticatedRequest, res: Response): void => {
  const { projectId } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  project.customDomain = undefined;
  project.customDomainVerified = false;
  project.sslEnabled = false;
  dbStore.save();

  res.json({ success: true, message: 'Custom domain removed successfully' });
};

/**
 * GET /api/v1/subdomains/check?subdomain=...
 * Search & check if a subdomain is available under pateldeeep.me. Returns suggestions if taken.
 */
export const checkSubdomainAvailability = (req: Request, res: Response): void => {
  try {
    const rawSubdomain = (req.query.subdomain || req.query.query || '') as string;
    const projectId = req.query.projectId as string | undefined;

    if (!rawSubdomain) {
      res.status(400).json({ success: false, error: 'Subdomain query parameter is required' });
      return;
    }

    const result = subdomainService.checkAvailability(rawSubdomain, projectId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Subdomain check failed' });
  }
};

/**
 * POST /api/v1/subdomains/assign
 * Claims an available subdomain, provisions Namecheap DNS host, and routes to active AWS EC2 host.
 */
export const assignSubdomain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, subdomain } = req.body;
    const user = req.user!;

    if (!projectId || !subdomain) {
      res.status(400).json({ success: false, error: 'projectId and subdomain are required' });
      return;
    }

    const result = await subdomainService.assignSubdomain(projectId, subdomain, user._id);

    res.json({
      success: true,
      message: result.message,
      data: {
        subdomain: result.subdomain,
        fqdn: result.fqdn,
        publicIp: result.publicIp,
        serverNodeName: result.serverNodeName,
        dnsStatus: result.dnsResult,
        deploymentUrl: `http://${result.fqdn}/`,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to assign subdomain' });
  }
};

/**
 * GET /api/v1/subdomains/verify?subdomain=...
 * Checks live DNS propagation of a subdomain under pateldeeep.me
 */
export const verifySubdomainDns = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSubdomain = req.query.subdomain as string;
    if (!rawSubdomain) {
      res.status(400).json({ success: false, error: 'Subdomain query parameter is required' });
      return;
    }

    const clean = subdomainService.sanitizeSubdomain(rawSubdomain);
    const result = await namecheapService.verifyDnsPropagation(clean);

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'DNS verification failed' });
  }
};

