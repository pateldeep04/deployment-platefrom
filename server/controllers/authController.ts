import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { dbStore, IUser } from '../database/store';
import { registerSchema, loginSchema, verifyEmailSchema, requestOtpSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth';
import { emailAuthService } from '../services/emailAuthService';

function calculateDirSize(dirPath: string): number {
  let size = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += calculateDirSize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch {}
  return size;
}

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

/**
 * POST /api/v1/auth/register
 * Creates account and dispatches 6-digit email verification OTP
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = dbStore.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = emailAuthService.generateNumericOtp();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const newUser: IUser = {
      _id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
      plan: 'FREE',
      emailVerified: false,
      verificationCode: otp,
      verificationCodeExpires: otpExpiry,
      storageUsed: 0,
      bandwidthUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.users.push(newUser);
    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: newUser._id,
      action: 'USER_REGISTER_PENDING_VERIFICATION',
      ip: req.ip || '127.0.0.1',
      details: { email: newUser.email },
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    // Send verification email
    await emailAuthService.sendVerificationCode(newUser.email, otp, 'REGISTER');

    res.status(201).json({
      success: true,
      message: 'Account created! Please enter the 6-digit verification code sent to your email to activate your account.',
      data: {
        requiresVerification: true,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
};

/**
 * POST /api/v1/auth/verify-email
 * Verifies the 6-digit OTP code and issues authenticated JWT tokens
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = verifyEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email, code } = parseResult.data;
    const user = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    if (user.emailVerified) {
      const tokens = generateTokens(user);
      const { passwordHash: _, ...safeUser } = user;
      res.json({
        success: true,
        message: 'Email is already verified.',
        data: { user: safeUser, tokens },
      });
      return;
    }

    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      res.status(400).json({ success: false, error: 'Invalid verification code. Please check your email and try again.' });
      return;
    }

    if (user.verificationCodeExpires && new Date() > new Date(user.verificationCodeExpires)) {
      res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    // Mark as verified and clear temporary OTP
    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    user.updatedAt = new Date().toISOString();

    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: user._id,
      action: 'EMAIL_VERIFIED_SUCCESS',
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    const { accessToken, refreshToken } = generateTokens(user);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to DeployHub.',
      data: {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Verification failed' });
  }
};

/**
 * POST /api/v1/auth/resend-verification
 * Generates and resends a fresh 6-digit OTP code
 */
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = requestOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email } = parseResult.data;
    const user = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    const otp = emailAuthService.generateNumericOtp();
    user.verificationCode = otp;
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    user.updatedAt = new Date().toISOString();
    dbStore.save();

    await emailAuthService.sendVerificationCode(user.email, otp, 'REGISTER');

    res.json({
      success: true,
      message: `A fresh 6-digit verification code has been dispatched to ${user.email}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Resend failed' });
  }
};

/**
 * POST /api/v1/auth/login
 * Standard credentials login with email verification enforcement
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const user = dbStore.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Guard: Enforce verified email
    if (!user.emailVerified) {
      const otp = emailAuthService.generateNumericOtp();
      user.verificationCode = otp;
      user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      dbStore.save();

      await emailAuthService.sendVerificationCode(user.email, otp, 'REGISTER');

      res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        error: 'Your email address is not verified yet. We have sent a new 6-digit verification code to your email.',
      });
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
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
};

/**
 * POST /api/v1/auth/send-login-otp
 * Dispatches a passwordless 1-time secure login code to user's email
 */
export const sendLoginOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = requestOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email } = parseResult.data;
    const user = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      // Don't leak user existence for anti-enumeration security
      res.json({
        success: true,
        message: 'If an account exists with this email, a 6-digit login code has been sent.',
      });
      return;
    }

    const otp = emailAuthService.generateNumericOtp();
    user.loginOtpCode = otp;
    user.loginOtpExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    dbStore.save();

    await emailAuthService.sendVerificationCode(user.email, otp, 'LOGIN');

    res.json({
      success: true,
      message: `A 6-digit secure login code has been sent to ${user.email}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'OTP dispatch failed' });
  }
};

/**
 * POST /api/v1/auth/verify-login-otp
 * Verifies email login OTP and grants session tokens
 */
export const verifyLoginOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = verifyEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email, code } = parseResult.data;
    const user = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user || !user.loginOtpCode) {
      res.status(400).json({ success: false, error: 'Invalid or expired login code' });
      return;
    }

    if (user.loginOtpCode !== code.trim()) {
      res.status(400).json({ success: false, error: 'Incorrect 6-digit login code' });
      return;
    }

    if (user.loginOtpExpires && new Date() > new Date(user.loginOtpExpires)) {
      res.status(400).json({ success: false, error: 'Login code has expired. Please request a new one.' });
      return;
    }

    // Clear login OTP and activate verification
    user.loginOtpCode = undefined;
    user.loginOtpExpires = undefined;
    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();

    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: user._id,
      action: 'USER_LOGIN_OTP_VERIFIED',
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    const { accessToken, refreshToken } = generateTokens(user);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Authenticated successfully via Email Verification.',
      data: {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'OTP login verification failed' });
  }
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  // Calculate real live SSD storage used across all user's projects on disk
  const userProjects = dbStore.projects.filter(p => p.userId === req.user!._id);
  let realStorageBytes = 0;
  for (const p of userProjects) {
    const siteDir = path.join(config.storageDir, 'sites', p.slug);
    if (fs.existsSync(siteDir)) {
      const siteSize = calculateDirSize(siteDir);
      p.storageUsed = siteSize;
      realStorageBytes += siteSize;
    }
  }

  const user = dbStore.users.find(u => u._id === req.user!._id);
  if (user) {
    user.storageUsed = realStorageBytes;
    dbStore.save();
  }

  const { passwordHash: _, ...safeUser } = req.user;
  safeUser.storageUsed = realStorageBytes;
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
