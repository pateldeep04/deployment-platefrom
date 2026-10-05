import { Response } from 'express';
import { dbStore, IEnvironmentVariable } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { setEnvVarSchema } from '../validators';

export const listEnvVars = (req: AuthenticatedRequest, res: Response): void => {
  const { projectId } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  // Mask secrets in response for security
  const vars = dbStore.envVars
    .filter(v => v.projectId === projectId)
    .map(v => ({
      _id: v._id,
      key: v.key,
      maskedValue: '••••••••••••••••',
      valueLength: v.value.length,
      createdAt: v.createdAt,
    }));

  res.json({ success: true, data: { variables: vars } });
};

export const setEnvVar = (req: AuthenticatedRequest, res: Response): void => {
  const projectId = String(req.params.projectId);
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const parseResult = setEnvVarSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  const { key, value } = parseResult.data;
  let existing = dbStore.envVars.find(v => v.projectId === projectId && v.key === key);

  if (existing) {
    existing.value = value;
    existing.updatedAt = new Date().toISOString();
  } else {
    const newVar: IEnvironmentVariable = {
      _id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      key,
      value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbStore.envVars.push(newVar);
  }

  dbStore.save();
  res.json({ success: true, message: `Environment variable '${key}' set successfully` });
};

export const deleteEnvVar = (req: AuthenticatedRequest, res: Response): void => {
  const { projectId } = req.params;
  const key = String(req.params.key);
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === projectId && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const index = dbStore.envVars.findIndex(v => v.projectId === projectId && v.key === key);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Variable not found' });
    return;
  }

  dbStore.envVars.splice(index, 1);
  dbStore.save();
  res.json({ success: true, message: `Variable '${key}' removed` });
};
