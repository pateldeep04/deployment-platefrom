import { dbStore, IProject } from '../database/store';
import { namecheapService, IDnsSyncResult } from './namecheapService';
import { awsFleetService } from './awsFleetService';
import { config } from '../config';

const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'www',
  'cpanel',
  'mail',
  'smtp',
  'pop',
  'imap',
  'ftp',
  'ns1',
  'ns2',
  'deployhub',
  'billing',
  'auth',
  'root',
  'status',
  'login',
  'register',
  'edge',
  'proxy',
  'dashboard',
]);

export interface ISubdomainCheckResult {
  subdomain: string;
  fqdn: string;
  isAvailable: boolean;
  reason?: string;
  suggestions: string[];
}

export interface ISubdomainAssignmentResult {
  success: boolean;
  subdomain: string;
  fqdn: string;
  publicIp: string;
  serverNodeId: string;
  serverNodeName: string;
  dnsResult: IDnsSyncResult;
  project: IProject;
  message: string;
}

/**
 * Service to search, check availability, generate suggestions, and automatically assign subdomains.
 * Coordinates with Namecheap DNS and AWS EC2 server fleet.
 */
class SubdomainService {
  /**
   * Sanitizes a requested subdomain string
   */
  public sanitizeSubdomain(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Checks if a subdomain is available under pateldeeep.me
   */
  public checkAvailability(rawSubdomain: string, excludeProjectId?: string): ISubdomainCheckResult {
    const subdomain = this.sanitizeSubdomain(rawSubdomain);
    const fqdn = namecheapService.getFqdn(subdomain);

    if (!subdomain || subdomain.length < 3) {
      return {
        subdomain,
        fqdn,
        isAvailable: false,
        reason: 'Subdomain must be at least 3 characters long',
        suggestions: this.generateSuggestions(subdomain || 'app'),
      };
    }

    if (subdomain.length > 63) {
      return {
        subdomain,
        fqdn,
        isAvailable: false,
        reason: 'Subdomain cannot exceed 63 characters',
        suggestions: [],
      };
    }

    // Reserved keywords guard
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return {
        subdomain,
        fqdn,
        isAvailable: false,
        reason: `Subdomain '${subdomain}' is reserved by system infrastructure`,
        suggestions: this.generateSuggestions(subdomain),
      };
    }

    // Check existing projects
    const existing = dbStore.projects.find(
      (p) => (p.slug === subdomain || p.assignedSubdomain === subdomain) && p._id !== excludeProjectId
    );

    if (existing) {
      return {
        subdomain,
        fqdn,
        isAvailable: false,
        reason: `Subdomain '${subdomain}' is already claimed by another project`,
        suggestions: this.generateSuggestions(subdomain),
      };
    }

    return {
      subdomain,
      fqdn,
      isAvailable: true,
      suggestions: [],
    };
  }

  /**
   * Generates smart alternative available suggestions when a subdomain is taken
   */
  public generateSuggestions(base: string): string[] {
    const clean = this.sanitizeSubdomain(base) || 'app';
    const candidates = [
      `${clean}-app`,
      `${clean}-live`,
      `${clean}-cloud`,
      `${clean}-web`,
      `${clean}-${new Date().getFullYear()}`,
      `get-${clean}`,
      `try-${clean}`,
    ];

    return candidates
      .filter((candidate) => !RESERVED_SUBDOMAINS.has(candidate))
      .filter((candidate) => !dbStore.projects.some((p) => p.slug === candidate || p.assignedSubdomain === candidate))
      .slice(0, 4);
  }

  /**
   * Automatically claims the subdomain, provisions Namecheap DNS, and routes to active AWS EC2 host
   */
  public async assignSubdomain(
    projectId: string,
    rawSubdomain: string,
    userId: string
  ): Promise<ISubdomainAssignmentResult> {
    const subdomain = this.sanitizeSubdomain(rawSubdomain);
    const project = dbStore.projects.find((p) => p._id === projectId && (p.userId === userId || userId === 'ADMIN'));

    if (!project) {
      throw new Error('Project not found');
    }

    // 1. Verify availability
    const check = this.checkAvailability(subdomain, projectId);
    if (!check.isAvailable) {
      throw new Error(check.reason || `Subdomain '${subdomain}' is not available`);
    }

    // 2. Select active AWS EC2 server node (or auto-spin up if storage full)
    const activeNode = await awsFleetService.getActiveNodeForDeployment();

    // 3. Automatically create/update host record in Namecheap DNS
    const dnsResult = await namecheapService.createOrUpdateSubdomainHost(subdomain, activeNode.publicIp, 'A');

    // 4. Update Project metadata
    project.assignedSubdomain = subdomain;
    project.assignedServerNodeId = activeNode._id;
    project.namecheapDnsConfigured = dnsResult.success;
    project.updatedAt = new Date().toISOString();

    // Update node assigned projects metric
    activeNode.assignedProjectsCount += 1;
    activeNode.lastHeartbeatAt = new Date().toISOString();

    dbStore.auditLogs.push({
      _id: `audit_${Date.now()}`,
      userId,
      action: 'SUBDOMAIN_AUTOMATIC_ASSIGNMENT',
      ip: '127.0.0.1',
      details: {
        projectId: project._id,
        subdomain,
        fqdn: dnsResult.fqdn,
        targetIp: activeNode.publicIp,
        nodeName: activeNode.name,
      },
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    console.log(`[Subdomain Assigned] ${dnsResult.fqdn} -> EC2 ${activeNode.publicIp} (${activeNode.name})`);

    return {
      success: true,
      subdomain,
      fqdn: dnsResult.fqdn,
      publicIp: activeNode.publicIp,
      serverNodeId: activeNode._id,
      serverNodeName: activeNode.name,
      dnsResult,
      project,
      message: `Subdomain '${dnsResult.fqdn}' successfully assigned and mapped to AWS EC2 instance ${activeNode.name}`,
    };
  }
}

export const subdomainService = new SubdomainService();
