import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

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
    const allowedExtensions = [
      '.zip', '.rar', '.tar', '.gz', '.tgz', '.7z',
      '.html', '.htm', '.css', '.js', '.mjs', '.php',
      '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp',
      '.ico', '.woff', '.woff2', '.ttf', '.txt', '.md'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Explicitly reject high-risk executable extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.scr', '.pif'];
    if (dangerousExtensions.includes(ext)) {
      return cb(new Error(`Malicious or dangerous executable file extension rejected: ${ext}`));
    }

    if (!allowedExtensions.includes(ext) && ext !== '') {
      return cb(new Error(`File extension '${ext}' is not supported. Please upload a ZIP archive or web assets.`));
    }

    cb(null, true);
  },
});
