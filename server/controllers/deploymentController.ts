import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { dbStore, IDeployment } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { deploymentEngine } from '../queue/deploymentQueue';

export const uploadAndDeploy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded. Please upload a .zip archive or web files.' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isArchive = ['.zip', '.rar', '.tar', '.gz', '.tgz', '.7z'].includes(ext);
    const projectDeployments = dbStore.deployments.filter(d => d.projectId === project._id);
    const version = projectDeployments.length + 1;
    const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Handle single file upload (.html, .php, .css, .js)
    if (!isArchive) {
      const siteDir = path.join(config.storageDir, 'sites', project.slug);
      if (!fs.existsSync(siteDir)) {
        fs.mkdirSync(siteDir, { recursive: true });
      }

      const originalName = path.basename(req.file.originalname);
      const destPath = path.join(siteDir, originalName);
      fs.copyFileSync(req.file.path, destPath);

      // If it's an HTML file and index.html doesn't exist, alias it
      if ((ext === '.html' || ext === '.htm') && !fs.existsSync(path.join(siteDir, 'index.html'))) {
        fs.copyFileSync(destPath, path.join(siteDir, 'index.html'));
      }
      if (ext === '.php' && !fs.existsSync(path.join(siteDir, 'index.php'))) {
        fs.copyFileSync(destPath, path.join(siteDir, 'index.php'));
      }

      try {
        fs.unlinkSync(req.file.path);
      } catch {}

      const newDeployment: IDeployment = {
        _id: deploymentId,
        projectId: project._id,
        userId: user._id,
        version,
        source: 'FILE_UPLOAD',
        status: 'LIVE',
        buildCommand: project.buildCommand,
        outputDirectory: project.outputDirectory,
        deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
        logs: [
          {
            timestamp: new Date().toISOString(),
            message: `Single file uploaded: ${originalName} (${(req.file.size / 1024).toFixed(1)} KB)`,
            stage: 'UPLOAD',
            level: 'info'
          },
          {
            timestamp: new Date().toISOString(),
            message: `File deployed directly to edge runtime: ${originalName}`,
            stage: 'EDGE',
            level: 'success'
          },
          {
            timestamp: new Date().toISOString(),
            message: `🎉 Deployment LIVE: http://localhost:${config.port}/sites/${project.slug}/`,
            stage: 'LIVE',
            level: 'success'
          }
        ],
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      dbStore.deployments.push(newDeployment);
      project.status = 'ACTIVE';
      project.currentDeploymentId = newDeployment._id;
      project.storageUsed += req.file.size;
      user.storageUsed += req.file.size;
      dbStore.save();

      res.status(200).json({
        success: true,
        message: 'File deployed and site is LIVE!',
        data: {
          deployment: newDeployment,
        }
      });
      return;
    }

    // ZIP Archive Flow: Enqueue to isolated worker pipeline
    const newDeployment: IDeployment = {
      _id: deploymentId,
      projectId: project._id,
      userId: user._id,
      version,
      source: 'ZIP_UPLOAD',
      status: 'QUEUED',
      buildCommand: project.buildCommand,
      outputDirectory: project.outputDirectory,
      deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
      logs: [
        {
          timestamp: new Date().toISOString(),
          message: `Archive uploaded: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`,
          stage: 'UPLOAD',
          level: 'info'
        },
        {
          timestamp: new Date().toISOString(),
          message: `Job enqueued to deployment worker queue (Version ${version})`,
          stage: 'QUEUE',
          level: 'info'
        }
      ],
      createdAt: new Date().toISOString(),
    };

    dbStore.deployments.push(newDeployment);
    project.status = 'BUILDING';
    dbStore.save();

    await deploymentEngine.enqueue({
      deploymentId: newDeployment._id,
      projectId: project._id,
      userId: user._id,
      zipFilePath: req.file.path,
      projectSlug: project.slug,
      projectType: project.type,
      buildCommand: project.buildCommand,
      outputDirectory: project.outputDirectory,
    });

    res.status(202).json({
      success: true,
      message: 'Deployment enqueued successfully',
      data: {
        deployment: newDeployment,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const listProjectDeployments = (req: AuthenticatedRequest, res: Response): void => {
  const { projectId } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const deployments = dbStore.deployments
    .filter(d => d.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, data: { deployments } });
};

export const getDeployment = (req: AuthenticatedRequest, res: Response): void => {
  const { deploymentId } = req.params;
  const user = req.user!;
  const deployment = dbStore.deployments.find(d => d._id === deploymentId && (d.userId === user._id || user.role === 'ADMIN'));

  if (!deployment) {
    res.status(404).json({ success: false, error: 'Deployment not found' });
    return;
  }

  res.json({ success: true, data: { deployment } });
};

export const getDeploymentLogs = (req: AuthenticatedRequest, res: Response): void => {
  const { deploymentId } = req.params;
  const user = req.user!;
  const deployment = dbStore.deployments.find(d => d._id === deploymentId && (d.userId === user._id || user.role === 'ADMIN'));

  if (!deployment) {
    res.status(404).json({ success: false, error: 'Deployment not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      status: deployment.status,
      logs: deployment.logs,
      startedAt: deployment.startedAt,
      completedAt: deployment.completedAt,
    }
  });
};

export const rollbackDeployment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { deploymentId } = req.params;
  const user = req.user!;
  const targetDeployment = dbStore.deployments.find(d => d._id === deploymentId && d.userId === user._id);

  if (!targetDeployment) {
    res.status(404).json({ success: false, error: 'Target deployment not found' });
    return;
  }

  const project = dbStore.projects.find(p => p._id === targetDeployment.projectId);
  if (!project) {
    res.status(404).json({ success: false, error: 'Associated project not found' });
    return;
  }

  const previousArtifactDir = path.join(config.storageDir, 'artifacts', `${project.slug}-v${targetDeployment.version}`);
  const liveSiteDir = path.join(config.storageDir, 'sites', project.slug);

  if (!fs.existsSync(previousArtifactDir)) {
    res.status(400).json({ success: false, error: 'Artifact for this version is no longer cached in storage' });
    return;
  }

  // Restore previous build artifact to live serving
  if (fs.existsSync(liveSiteDir)) {
    fs.rmSync(liveSiteDir, { recursive: true, force: true });
  }
  fs.cpSync(previousArtifactDir, liveSiteDir, { recursive: true });

  project.currentDeploymentId = targetDeployment._id;
  project.status = 'ACTIVE';

  targetDeployment.logs.push({
    timestamp: new Date().toISOString(),
    message: `Project rolled back to Version ${targetDeployment.version} by user`,
    stage: 'ROLLBACK',
    level: 'warn'
  });

  dbStore.save();

  res.json({
    success: true,
    message: `Successfully rolled back to Version ${targetDeployment.version}`,
    data: { project, deployment: targetDeployment }
  });
};
