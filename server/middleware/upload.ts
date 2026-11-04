import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

import { ALLOWED_STATIC_EXTENSIONS } from './securityValidator';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(config.storageDir, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.uploadMaxSizeMb * 1024 * 1024, // 100MB
    files: 100,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Explicitly reject high-risk executable and script extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.py', '.rb', '.pl',
      '.msi', '.vbs', '.scr', '.pif', '.dll', '.so', '.dylib', '.bin', '.com',
      '.c', '.cpp', '.h', '.jar', '.war', '.apk', '.iso', '.dmg', '.deb', '.rpm'
    ];
    if (dangerousExtensions.includes(ext)) {
      return cb(new Error(`Malicious or dangerous executable file extension rejected: ${ext}`));
    }

    // Explicitly reject unsupported archive formats
    const unsupportedArchives = ['.rar', '.tar', '.gz', '.tgz', '.7z', '.bz2', '.xz'];
    if (unsupportedArchives.includes(ext)) {
      return cb(new Error(`Unsupported archive format '${ext}'. DeployHub operates exclusively on standard .zip archives.`));
    }

    if (ext !== '.zip' && !ALLOWED_STATIC_EXTENSIONS.has(ext)) {
      return cb(new Error(`File extension '${ext}' is not permitted under the platform security policy. Please upload a .zip archive or allowed web assets.`));
    }

    cb(null, true);
  },
});
