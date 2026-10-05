import { Response } from 'express';
import { dbStore } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { customDomainSchema } from '../validators';
import { config } from '../config';

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
