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
    const isAtlas = config.mongoUri.includes('mongodb+srv://') || config.mongoUri.includes('.mongodb.net');
    // Allow up to 10s for Atlas SSL handshake and DNS lookup, 3s for local
    const timeout = isAtlas ? 10000 : 3000;

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: timeout,
    });
    isConnected = true;
    console.log('[DeployHub Database] Connected to MongoDB at', config.mongoUri.replace(/:([^:@]+)@/, ':****@'));

    // Automatically sync data between local file store and global MongoDB Atlas
    const { syncOnStartup } = await import('./mongoSync');
    await syncOnStartup();

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

