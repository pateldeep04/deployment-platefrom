import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// Ensure storage directories exist
export const ensureStorageDirectories = () => {
  const dirs = [
    config.storageDir,
    path.join(config.storageDir, 'uploads'),
    path.join(config.storageDir, 'artifacts'),
    path.join(config.storageDir, 'sites'),
    path.join(config.storageDir, 'data')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

let isConnected = false;
let isStandaloneFallback = false;

export const connectDatabase = async (): Promise<boolean> => {
  ensureStorageDirectories();
  try {
    // Attempt Mongoose connection with short timeout to not hang if Mongo is offline
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log('[DeployHub Database] Connected to MongoDB at', config.mongoUri);
    return true;
  } catch (err: any) {
    console.warn('[DeployHub Database] MongoDB not accessible, using built-in file-backed store for local execution:', err.message);
    isStandaloneFallback = true;
    return false;
  }
};

export const getDbStatus = () => ({
  connected: isConnected,
  type: isStandaloneFallback ? 'standalone_filestore' : 'mongodb',
});
