import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { dbStore, IUser } from '../database/store';
import { registerSchema, loginSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth';

const generateTokens = (user: IUser) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '1d' }
  );
  const refreshToken = jwt.sign(
    { userId: user._id },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { name, email, password } = parseResult.data;

    const existingUser = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      res.status(400).json({ success: false, error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: IUser = {
      _id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'USER',
      plan: 'FREE',
      emailVerified: true,
      storageUsed: 0,
      bandwidthUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.users.push(newUser);
    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: newUser._id,
      action: 'USER_REGISTER',
      ip: req.ip || '127.0.0.1',
      details: { email: newUser.email },
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    const { accessToken, refreshToken } = generateTokens(newUser);

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      data: {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parseResult.data;
    const user = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user);

    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: user._id,
      action: 'USER_LOGIN',
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    const { passwordHash: _, ...safeUser } = user;
    res.json({
      success: true,
      data: {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ success: true, data: { user: safeUser } });
};

export const refreshToken = (req: Request, res: Response): void => {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, error: 'Refresh token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtRefreshSecret) as { userId: string };
    const user = dbStore.users.find(u => u._id === payload.userId);
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const tokens = generateTokens(user);
    res.json({ success: true, data: { tokens } });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};
