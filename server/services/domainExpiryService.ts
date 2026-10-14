import { dbStore, IProject } from '../database/store';
import { emailAuthService } from './emailAuthService';
import { redisCacheService } from './redisCacheService';
import { config } from '../config';

export interface IDomainExpiryStatus {
  projectId: string;
  projectName: string;
  domainName: string;
  domainExpiresAt: string;
  daysRemaining: number;
  domainStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'DEACTIVATED';
  isDomainExpired: boolean;
  canReactivateFree: boolean;
  warningSentAt?: string;
  deactivationSentAt?: string;
  reactivatedAt?: string;
}

class DomainExpiryService {
  /**
   * Scans all projects across the platform, marks expiries, and sends automated email notices:
   * 1. 1 month (30 days) before deactivation warning email
   * 2. Deactivation notification email upon 3-month expiry
   */
  public async checkAndProcessDomainExpiries(): Promise<{ warningsSent: number; deactivationsSent: number }> {
    let warningsSent = 0;
    let deactivationsSent = 0;
    let stateChanged = false;

    const now = Date.now();

    for (const project of dbStore.projects) {
      // 1. Ensure domainExpiresAt exists (default 3 months from creation)
      if (!project.domainExpiresAt) {
        const createdMs = project.createdAt ? new Date(project.createdAt).getTime() : now;
        project.domainExpiresAt = new Date(createdMs + 90 * 24 * 60 * 60 * 1000).toISOString();
        stateChanged = true;
      }

      const expiresMs = new Date(project.domainExpiresAt).getTime();
      const msRemaining = expiresMs - now;
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const owner = dbStore.users.find(u => u._id === project.userId);
      const domainName = project.customDomain || `${project.assignedSubdomain || project.slug}.${project.platformDomain || config.platformDomain || 'deployeai.duckdns.org'}`;

      // 2. Case A: Domain Expired / Deactivated (3-month cycle finished)
      if (daysRemaining <= 0 || now >= expiresMs) {
        if (!project.isDomainExpired || project.domainStatus !== 'DEACTIVATED') {
          project.isDomainExpired = true;
          project.domainStatus = 'DEACTIVATED';
          project.status = 'INACTIVE';
          stateChanged = true;
        }

        // Send deactivation email if not sent yet
        if (!project.deactivationEmailSentAt && owner?.email) {
          try {
            const dashboardUrl = `https://${config.platformDomain || 'deployeai.duckdns.org'}/dashboard`;
            await emailAuthService.sendDomainDeactivatedNotification(owner.email, domainName, dashboardUrl);
            project.deactivationEmailSentAt = new Date().toISOString();
            deactivationsSent++;
            stateChanged = true;

            dbStore.auditLogs.push({
              _id: `log_${Date.now()}`,
              userId: owner._id,
              action: 'DOMAIN_DEACTIVATED_EMAIL_SENT',
              ip: '127.0.0.1',
              details: { projectId: project._id, domainName, email: owner.email },
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`[DomainExpiryService] Failed to send deactivation email for ${domainName}:`, err);
          }
        }
      }
      // 3. Case B: Warning 1 month (30 days) before deactivation
      else if (daysRemaining <= 30 && daysRemaining > 0) {
        if (project.domainStatus !== 'EXPIRING_SOON') {
          project.domainStatus = 'EXPIRING_SOON';
          stateChanged = true;
        }

        // Send 1-month warning email if not sent yet
        if (!project.deactivationWarningSentAt && owner?.email) {
          try {
            await emailAuthService.sendDomainExpiryWarning(owner.email, domainName, project.domainExpiresAt, daysRemaining);
            project.deactivationWarningSentAt = new Date().toISOString();
            warningsSent++;
            stateChanged = true;

            dbStore.auditLogs.push({
              _id: `log_${Date.now()}`,
              userId: owner._id,
              action: 'DOMAIN_EXPIRY_WARNING_EMAIL_SENT',
              ip: '127.0.0.1',
              details: { projectId: project._id, domainName, email: owner.email, daysRemaining },
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`[DomainExpiryService] Failed to send warning email for ${domainName}:`, err);
          }
        }
      }
      // 4. Case C: Active (> 30 days remaining)
      else {
        if (project.domainStatus !== 'ACTIVE' && !project.isDomainExpired) {
          project.domainStatus = 'ACTIVE';
          stateChanged = true;
        }
      }
    }

    if (stateChanged) {
      dbStore.save();
    }

    return { warningsSent, deactivationsSent };
  }

  /**
   * Reactivates an expired or expiring domain for 100% FREE for another 3 months
   */
  public async reactivateDomain(projectId: string, userId: string, isAdmin = false): Promise<IProject> {
    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === userId || isAdmin));
    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    // Extend expiry by 3 months (90 days) from right now for free
    const newExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    project.domainExpiresAt = newExpiresAt;
    project.domainStatus = 'ACTIVE';
    project.isDomainExpired = false;
    project.status = 'ACTIVE';
    project.deactivationWarningSentAt = undefined;
    project.deactivationEmailSentAt = undefined;
    project.reactivatedAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();

    // Invalidate edge proxy caches so traffic routes immediately
    const keysToInvalidate = [project.slug, project.assignedSubdomain, project.customDomain].filter(Boolean) as string[];
    await redisCacheService.invalidateRoute(keysToInvalidate);

    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId,
      action: 'DOMAIN_FREE_REACTIVATION',
      ip: '127.0.0.1',
      details: {
        projectId: project._id,
        name: project.name,
        slug: project.slug,
        newExpiresAt,
      },
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    console.log(`[Domain Reactivated Free] Project '${project.name}' domain renewed until ${newExpiresAt}`);

    return project;
  }

  /**
   * Computes clean domain status and remaining time for a given project
   */
  public getProjectExpiryStatus(project: IProject): IDomainExpiryStatus {
    const now = Date.now();
    const expiresMs = project.domainExpiresAt
      ? new Date(project.domainExpiresAt).getTime()
      : now + 90 * 24 * 60 * 60 * 1000;
    const daysRemaining = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
    const domainName = project.customDomain || `${project.assignedSubdomain || project.slug}.${project.platformDomain || config.platformDomain || 'deployeai.duckdns.org'}`;

    return {
      projectId: project._id,
      projectName: project.name,
      domainName,
      domainExpiresAt: project.domainExpiresAt || new Date(expiresMs).toISOString(),
      daysRemaining,
      domainStatus: project.domainStatus || (daysRemaining <= 0 ? 'DEACTIVATED' : (daysRemaining <= 30 ? 'EXPIRING_SOON' : 'ACTIVE')),
      isDomainExpired: !!project.isDomainExpired || daysRemaining <= 0,
      canReactivateFree: true,
      warningSentAt: project.deactivationWarningSentAt,
      deactivationSentAt: project.deactivationEmailSentAt,
      reactivatedAt: project.reactivatedAt,
    };
  }
}

export const domainExpiryService = new DomainExpiryService();
