import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Locate root storage directory reliably regardless of execution working dir
let baseStorage = path.resolve(process.cwd(), 'storage');
if (!fs.existsSync(baseStorage)) {
  baseStorage = path.resolve(__dirname, '../../storage');
}
if (!fs.existsSync(baseStorage)) {
  fs.mkdirSync(baseStorage, { recursive: true });
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-deployhub-jwt-token-key-change-in-production-32chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-deployhub-refresh-token-key-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/deployhub',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  storageDir: baseStorage,
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '100', 10),
  storageQuotaFreeMb: parseInt(process.env.STORAGE_QUOTA_FREE_MB || '500', 10),
  platformDomain: process.env.PLATFORM_DOMAIN || 'deployhub.local',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_deployhub_sandbox_key',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_deployhub_sandbox_secret',
};
