import { Response } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { dbStore, IProject, IUser } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { config, getDeploymentUrl } from '../config';
import { deploymentEngine } from '../queue/deploymentQueue';

function getDirectorySize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        try {
          size += fs.statSync(fullPath).size;
        } catch {}
      }
    }
  } catch {}
  return size;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * GET /api/v1/admin/monitoring
 * Comprehensive real-time server telemetry and operational metrics
 */
export const getLiveMonitoringData = (req: AuthenticatedRequest, res: Response): void => {
  try {
    // 1. Memory Metrics
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const memUsagePct = ((usedMemBytes / totalMemBytes) * 100).toFixed(1);

    const procMem = process.memoryUsage();
    const procHeapUsedMB = (procMem.heapUsed / (1024 * 1024)).toFixed(1);
    const procRssMB = (procMem.rss / (1024 * 1024)).toFixed(1);

    // 2. CPU Metrics
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
    const cpuCores = cpus.length;
    const loadAvg = os.loadavg(); // [1m, 5m, 15m]

    // 3. Storage Breakdown
    const sitesDir = path.join(config.storageDir, 'sites');
    const artifactsDir = path.join(config.storageDir, 'artifacts');
    const uploadsDir = path.join(config.storageDir, 'uploads');
    const dataFile = path.join(config.storageDir, 'data', 'deployhub_state.json');

    const sitesBytes = getDirectorySize(sitesDir);
    const artifactsBytes = getDirectorySize(artifactsDir);
    const uploadsBytes = getDirectorySize(uploadsDir);
    let stateBytes = 0;
    try {
      if (fs.existsSync(dataFile)) stateBytes = fs.statSync(dataFile).size;
    } catch {}

    const totalStorageBytes = sitesBytes + artifactsBytes + uploadsBytes + stateBytes;

    // 4. Platform Counters
    const totalUsers = dbStore.users.length;
    const freeUsers = dbStore.users.filter(u => u.plan === 'FREE').length;
    const devUsers = dbStore.users.filter(u => u.plan === 'DEVELOPER').length;
    const proUsers = dbStore.users.filter(u => u.plan === 'PRO').length;

    const totalProjects = dbStore.projects.length;
    const activeProjects = dbStore.projects.filter(p => p.status === 'ACTIVE').length;
    const buildingProjects = dbStore.projects.filter(p => p.status === 'BUILDING').length;
    const inactiveProjects = dbStore.projects.filter(p => p.status === 'INACTIVE').length;

    const staticProjects = dbStore.projects.filter(p => p.type === 'STATIC').length;
    const phpProjects = dbStore.projects.filter(p => p.type === 'PHP').length;

    const totalDeployments = dbStore.deployments.length;
    const liveDeployments = dbStore.deployments.filter(d => d.status === 'LIVE').length;
    const failedDeployments = dbStore.deployments.filter(d => d.status === 'FAILED').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const deploymentsToday = dbStore.deployments.filter(d => d.createdAt.startsWith(todayStr)).length;

    // 5. Worker Queue Telemetry
    const queueStats = (deploymentEngine as any).getQueueStats?.() || {
      mode: 'IN_MEMORY',
      isRedisConnected: false,
      pendingJobs: 0,
      isWorkerActive: false,
    };

    // 6. Security incident count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recentSecurityAlerts = dbStore.auditLogs.filter(
      l => l.createdAt >= yesterday && (l.action.includes('SECURITY') || l.action.includes('BLOCK') || l.action.includes('REJECT'))
    ).length;

    // 7. Estimated Monthly Recurring Revenue (MRR)
    const monthlyRevenueINR = (devUsers * 149) + (proUsers * 399);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          pid: process.pid,
          uptimeSeconds: Math.floor(process.uptime()),
          uptimeFormatted: formatUptime(process.uptime()),
          cpu: {
            model: cpuModel,
            cores: cpuCores,
            loadAvg1m: loadAvg[0].toFixed(2),
            loadAvg5m: loadAvg[1].toFixed(2),
            loadAvg15m: loadAvg[2].toFixed(2),
          },
          memory: {
            totalGB: (totalMemBytes / (1024 * 1024 * 1024)).toFixed(2),
            usedGB: (usedMemBytes / (1024 * 1024 * 1024)).toFixed(2),
            freeGB: (freeMemBytes / (1024 * 1024 * 1024)).toFixed(2),
            usagePercent: memUsagePct,
            processHeapMB: procHeapUsedMB,
            processRssMB: procRssMB,
          },
          storage: {
            sitesMB: (sitesBytes / (1024 * 1024)).toFixed(2),
            artifactsMB: (artifactsBytes / (1024 * 1024)).toFixed(2),
            uploadsMB: (uploadsBytes / (1024 * 1024)).toFixed(2),
            stateKB: (stateBytes / 1024).toFixed(1),
            totalUsedMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
          },
          queue: queueStats,
        },
        summary: {
          totalUsers,
          freeUsers,
          devUsers,
          proUsers,
          totalProjects,
          activeProjects,
          buildingProjects,
          inactiveProjects,
          staticProjects,
          phpProjects,
          totalDeployments,
          liveDeployments,
          failedDeployments,
          deploymentsToday,
          recentSecurityAlerts,
          monthlyRevenueINR,
          platformDomain: config.platformDomain,
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch monitoring telemetry' });
  }
};

/**
 * GET /api/v1/admin/stats (Legacy endpoint kept for backwards compatibility)
 */
export const getSystemStats = (req: AuthenticatedRequest, res: Response): void => {
  const totalUsers = dbStore.users.length;
  const totalProjects = dbStore.projects.length;
  const activeProjects = dbStore.projects.filter(p => p.status === 'ACTIVE').length;
  const totalDeployments = dbStore.deployments.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const deploymentsToday = dbStore.deployments.filter(d => d.createdAt.startsWith(todayStr)).length;

  const totalStorageBytes = dbStore.projects.reduce((acc, p) => acc + (p.storageUsed || 0), 0);
  const totalBandwidthBytes = dbStore.users.reduce((acc, u) => acc + (u.bandwidthUsed || 0), 0);

  const developerPlans = dbStore.users.filter(u => u.plan === 'DEVELOPER').length;
  const proPlans = dbStore.users.filter(u => u.plan === 'PRO').length;
  const monthlyRevenueINR = (developerPlans * 149) + (proPlans * 399);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalProjects,
        activeProjects,
        totalDeployments,
        deploymentsToday,
        totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(1),
        totalBandwidthGB: (totalBandwidthBytes / (1024 * 1024 * 1024)).toFixed(2),
        monthlyRevenueINR,
      }
    }
  });
};

/**
 * GET /api/v1/admin/projects
 * Lists all projects across the platform with owner details & actions
 */
export const listAllProjects = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const projectsWithDetails = dbStore.projects.map((p) => {
      const owner = dbStore.users.find(u => u._id === p.userId);
      const projectDeployments = dbStore.deployments.filter(d => d.projectId === p._id);
      return {
        ...p,
        owner: owner ? { id: owner._id, name: owner.name, email: owner.email, plan: owner.plan } : null,
        deploymentCount: projectDeployments.length,
        liveUrl: getDeploymentUrl(p),
      };
    });

    res.json({
      success: true,
      data: { projects: projectsWithDetails }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list projects' });
  }
};

/**
 * DELETE /api/v1/admin/projects/:projectId
 * Administrative deletion of any project
 */
export const adminDeleteProject = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { projectId } = req.params;
    const projectIndex = dbStore.projects.findIndex(p => p._id === projectId);

    if (projectIndex === -1) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const project = dbStore.projects[projectIndex];

    // Remove site directory
    const siteDir = path.join(config.storageDir, 'sites', project.slug);
    if (fs.existsSync(siteDir)) {
      try {
        fs.rmSync(siteDir, { recursive: true, force: true });
      } catch {}
    }

    // Remove from database
    dbStore.projects.splice(projectIndex, 1);
    dbStore.deployments = dbStore.deployments.filter(d => d.projectId !== projectId);
    dbStore.envVars = dbStore.envVars.filter(e => e.projectId !== projectId);

    // Audit log
    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_DELETE_PROJECT: ${project.name} (${project.slug})`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
      details: { projectId, slug: project.slug },
    });

    dbStore.save();

    res.json({
      success: true,
      message: `Project '${project.name}' and all associated files deleted by administrator.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete project' });
  }
};

/**
 * PATCH /api/v1/admin/projects/:projectId/status
 * Toggle project status (ACTIVE <-> INACTIVE)
 */
export const adminToggleProjectStatus = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    const project = dbStore.projects.find(p => p._id === projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (status && ['ACTIVE', 'INACTIVE', 'BUILDING'].includes(status)) {
      project.status = status;
      project.updatedAt = new Date().toISOString();
      dbStore.save();
    }

    res.json({
      success: true,
      message: `Project '${project.name}' status updated to ${project.status}`,
      data: { project }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update project status' });
  }
};

/**
 * GET /api/v1/admin/users
 */
export const listAllUsers = (req: AuthenticatedRequest, res: Response): void => {
  const users = dbStore.users.map(({ passwordHash, ...u }) => ({
    ...u,
    projectCount: dbStore.projects.filter(p => p.userId === u._id).length,
  }));
  res.json({ success: true, data: { users } });
};

/**
 * PATCH /api/v1/admin/users/:userId
 */
export const updateUserPlanOrRole = (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.params;
  const { plan, role } = req.body;

  const user = dbStore.users.find(u => u._id === userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  if (plan && ['FREE', 'DEVELOPER', 'PRO'].includes(plan)) {
    user.plan = plan;
  }
  if (role && ['USER', 'ADMIN', 'SUPPORT'].includes(role)) {
    user.role = role;
  }

  user.updatedAt = new Date().toISOString();
  dbStore.save();

  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser } });
};

/**
 * POST /api/v1/admin/users/:userId/reset-password
 * Allows administrator to reset a user's password directly
 */
export const adminResetUserPassword = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
      return;
    }

    const user = dbStore.users.find(u => u._id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    dbStore.save();

    res.json({
      success: true,
      message: `Password reset successfully for user '${user.email}'`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reset password' });
  }
};

/**
 * DELETE /api/v1/admin/users/:userId
 * Deletes user and cascades cleanup of all their hosted sites
 */
export const adminDeleteUser = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { userId } = req.params;

    if (userId === req.user!._id) {
      res.status(400).json({ success: false, error: 'Cannot delete your own administrative account' });
      return;
    }

    const userIndex = dbStore.users.findIndex(u => u._id === userId);
    if (userIndex === -1) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const user = dbStore.users[userIndex];

    // Delete user's hosted site folders
    const userProjects = dbStore.projects.filter(p => p.userId === userId);
    for (const proj of userProjects) {
      const siteDir = path.join(config.storageDir, 'sites', proj.slug);
      if (fs.existsSync(siteDir)) {
        try { fs.rmSync(siteDir, { recursive: true, force: true }); } catch {}
      }
    }

    // Cascade remove database entries
    dbStore.projects = dbStore.projects.filter(p => p.userId !== userId);
    dbStore.deployments = dbStore.deployments.filter(d => d.userId !== userId);
    dbStore.users.splice(userIndex, 1);

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_DELETE_USER: ${user.email}`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `User '${user.email}' and all associated websites deleted.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete user' });
  }
};

/**
 * POST /api/v1/admin/prune-storage
 * Cleans old temporary artifacts and upload caches to free up server disk space
 */
export const adminPruneStorage = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const artifactsDir = path.join(config.storageDir, 'artifacts');
    const uploadsDir = path.join(config.storageDir, 'uploads');
    let freedBytes = 0;

    if (fs.existsSync(artifactsDir)) {
      freedBytes += getDirectorySize(artifactsDir);
      try {
        fs.rmSync(artifactsDir, { recursive: true, force: true });
        fs.mkdirSync(artifactsDir, { recursive: true });
      } catch {}
    }

    if (fs.existsSync(uploadsDir)) {
      freedBytes += getDirectorySize(uploadsDir);
      try {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch {}
    }

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `PRUNED_STORAGE: ${(freedBytes / (1024 * 1024)).toFixed(1)} MB reclaimed`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    res.json({
      success: true,
      message: `Successfully reclaimed ${(freedBytes / (1024 * 1024)).toFixed(2)} MB of disk space.`,
      freedMB: (freedBytes / (1024 * 1024)).toFixed(2),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Storage prune failed' });
  }
};

/**
 * GET /api/v1/admin/deployments
 */
export const listAllDeployments = (req: AuthenticatedRequest, res: Response): void => {
  const deployments = dbStore.deployments
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(d => {
      const proj = dbStore.projects.find(p => p._id === d.projectId);
      const user = dbStore.users.find(u => u._id === d.userId);
      return {
        ...d,
        projectName: proj?.name || 'Unknown',
        projectSlug: proj?.slug || 'unknown',
        userEmail: user?.email || 'Unknown',
      };
    });

  res.json({ success: true, data: { deployments } });
};

/**
 * GET /api/v1/admin/security-logs
 */
export const getSecurityLogs = (req: AuthenticatedRequest, res: Response): void => {
  const logs = dbStore.auditLogs
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);

  res.json({ success: true, data: { logs } });
};

/**
 * DELETE /api/v1/admin/security-logs
 * Clears security audit logs
 */
export const clearSecurityLogs = (req: AuthenticatedRequest, res: Response): void => {
  dbStore.auditLogs = [];
  dbStore.save();
  res.json({ success: true, message: 'Audit logs cleared successfully' });
};
