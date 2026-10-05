import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { dbStore, IProject } from '../database/store';
import { createProjectSchema, updateProjectSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth';

export const listProjects = (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!._id;
  const userProjects = dbStore.projects.filter(p => p.userId === userId);
  res.json({ success: true, data: { projects: userProjects } });
};

export const getProject = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const userId = req.user!._id;
  const project = dbStore.projects.find(p => (p._id === id || p.slug === id) && p.userId === userId);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const latestDeployment = dbStore.deployments.find(d => d._id === project.currentDeploymentId);
  res.json({
    success: true,
    data: {
      project,
      latestDeployment,
    }
  });
};

export const createProject = (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const parseResult = createProjectSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  // Check project limit based on plan
  const planLimits: Record<string, number> = {
    FREE: 3,
    DEVELOPER: 20,
    PRO: 1000,
  };
  const maxProjects = planLimits[user.plan] || 3;
  const existingCount = dbStore.projects.filter(p => p.userId === user._id).length;

  if (existingCount >= maxProjects) {
    res.status(403).json({
      success: false,
      error: `Project limit reached for ${user.plan} plan (${existingCount}/${maxProjects}). Please upgrade your plan to create more projects.`
    });
    return;
  }

  const { name, type, buildCommand, outputDirectory } = parseResult.data;
  let slug = parseResult.data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Ensure unique slug
  if (dbStore.projects.some(p => p.slug === slug)) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const newProject: IProject = {
    _id: `prj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user._id,
    name,
    slug,
    type,
    status: 'INACTIVE',
    storageUsed: 0,
    buildCommand: buildCommand || (type === 'VITE' ? 'npm run build' : undefined),
    outputDirectory: outputDirectory || (type === 'VITE' ? 'dist' : undefined),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbStore.projects.push(newProject);
  dbStore.auditLogs.push({
    _id: `log_${Date.now()}`,
    userId: user._id,
    action: 'PROJECT_CREATE',
    ip: req.ip || '127.0.0.1',
    details: { projectId: newProject._id, name, slug, type },
    createdAt: new Date().toISOString(),
  });
  dbStore.save();

  res.status(201).json({ success: true, data: { project: newProject } });
};

export const updateProject = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === id && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const parseResult = updateProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  const data = parseResult.data;
  if (data.name) project.name = data.name;
  if (data.buildCommand !== undefined) project.buildCommand = data.buildCommand;
  if (data.outputDirectory !== undefined) project.outputDirectory = data.outputDirectory;
  if (data.customDomain !== undefined) project.customDomain = data.customDomain;
  project.updatedAt = new Date().toISOString();

  dbStore.save();
  res.json({ success: true, data: { project } });
};

export const deleteProject = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = req.user!;
  const index = dbStore.projects.findIndex(p => p._id === id && p.userId === user._id);

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const project = dbStore.projects[index];
  
  // Clean up directory on disk
  try {
    const siteDir = path.join(config.storageDir, 'sites', project.slug);
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Failed to remove site directory on deletion:', e);
  }

  dbStore.projects.splice(index, 1);
  dbStore.save();

  res.json({ success: true, message: `Project '${project.name}' deleted successfully` });
};
