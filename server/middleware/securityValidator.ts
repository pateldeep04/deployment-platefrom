import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { IUser } from '../database/store';
import { MalwareScanner } from '../services/malwareScanner';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  totalSize: number;
  fileCount: number;
  hasIndexHtml: boolean;
  hasIndexPhp: boolean;
  hasPackageJson: boolean;
  archiveFormat?: 'ZIP' | 'RAR';
}

export class SecurityValidator {
  /**
   * Safely inspects a ZIP or RAR archive file without extracting to dangerous paths.
   * Defends against:
   * 1. Path traversal attacks (e.g. ../../etc/passwd or absolute paths)
   * 2. Archive decompression explosions (ratios > 100:1)
   * 3. Malicious executable files embedded in archives
   * 4. Excessive file counts or total byte quotas
   */
  public static async validateArchive(
    archiveFilePath: string,
    user: IUser,
    maxAllowedUncompressedBytes: number = 300 * 1024 * 1024 // 300MB
  ): Promise<ValidationResult> {
    if (!fs.existsSync(archiveFilePath)) {
      return { valid: false, error: 'Uploaded archive not found', totalSize: 0, fileCount: 0, hasIndexHtml: false, hasIndexPhp: false, hasPackageJson: false };
    }

    const ext = path.extname(archiveFilePath).toLowerCase();
    if (ext !== '.zip') {
      return {
        valid: false,
        error: 'Unsupported archive format. DeployHub v2 operates exclusively on standard .zip archives (RAR/TAR are not supported).',
        totalSize: 0,
        fileCount: 0,
        hasIndexHtml: false,
        hasIndexPhp: false,
        hasPackageJson: false,
        archiveFormat: 'ZIP',
      };
    }
    const archiveFormat: 'ZIP' = 'ZIP';

    // 0. Antivirus, Corruption & Webshell Heuristic Inspection
    const malwareScan = await MalwareScanner.scanFile(archiveFilePath);
    if (!malwareScan.isClean) {
      return {
        valid: false,
        error: malwareScan.threats.join('; ') || malwareScan.errorMessage || 'Archive failed antivirus and integrity scan',
        totalSize: 0,
        fileCount: 0,
        hasIndexHtml: false,
        hasIndexPhp: false,
        hasPackageJson: false,
        archiveFormat,
      };
    }

    // Section 5.1 Rules: Max 5,000 files, allowlist verification
    const maxFiles = 5000;
    const maxSingleFileBytes = 25 * 1024 * 1024; // 25 MB max single file
    const allowedExtensions = new Set([
      '.html', '.htm', '.css', '.js', '.mjs', '.json', '.map', '.txt', '.xml',
      '.svg', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif',
      '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.mp4', '.webm',
      '.pdf', '.md', '.webmanifest', '.php', '.inc'
    ]);

    let totalUncompressedSize = 0;
    let fileCount = 0;
    let hasIndexHtml = false;
    let hasIndexPhp = false;
    let hasPackageJson = false;

      // Standard ZIP handling via AdmZip
      let zip: AdmZip;
      try {
        zip = new AdmZip(archiveFilePath);
      } catch (err: any) {
        return { valid: false, error: `Invalid or corrupt ZIP archive: ${err.message}`, totalSize: 0, fileCount: 0, hasIndexHtml: false, hasIndexPhp: false, hasPackageJson: false, archiveFormat };
      }

      const zipEntries = zip.getEntries();
      if (zipEntries.length > maxFiles) {
        return {
          valid: false,
          error: `Archive contains too many files (${zipEntries.length}). Maximum permitted is ${maxFiles}.`,
          totalSize: 0,
          fileCount: zipEntries.length,
          hasIndexHtml: false,
          hasIndexPhp: false,
          hasPackageJson: false,
          archiveFormat,
        };
      }

      for (const entry of zipEntries) {
        const entryName = entry.entryName;
        const cleanName = entryName.replace(/^[/\\]+/, '');

        // Null byte injection guard
        if (entryName.includes('\0') || cleanName.includes('\0')) {
          return {
            valid: false,
            error: `Security Violation: Null byte detected in file '${entryName}'`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        // Unix file attribute check for symbolic link: S_IFLNK is 0120000 (0xA000 in top 16 bits)
        const mode = (entry.header as any)?.attr ? ((entry.header as any).attr >>> 16) : 0;
        const isSymlink = (mode & 0o170000) === 0o120000;
        if (isSymlink) {
          return {
            valid: false,
            error: `Security Violation: Symbolic link detected in archive entry '${entryName}'. Symlinks and hardlinks are strictly prohibited.`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        if (entryName.includes('../') || entryName.includes('..\\') || cleanName.includes('../') || cleanName.includes('..\\')) {
          return {
            valid: false,
            error: `Security Violation: Directory traversal sequence detected in file '${entryName}'`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        if (/^[a-zA-Z]:[/\\]/.test(cleanName) || path.isAbsolute(cleanName)) {
          return {
            valid: false,
            error: `Security Violation: Absolute drive path detected in archive '${entryName}'`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        const fileExt = path.extname(entryName).toLowerCase();
        const baseName = path.basename(entryName).toLowerCase();

        // Dotfile guard (Section 5.1): reject .env, .git, .htaccess, etc.
        if (baseName.startsWith('.') || cleanName.startsWith('.')) {
          return {
            valid: false,
            error: `Security Violation: Hidden dotfile or configuration '${entryName}' detected in archive. Dotfiles are prohibited.`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        // Section 5.1 Strict Extension Allowlist verification
        if (!entry.isDirectory && fileExt && !allowedExtensions.has(fileExt)) {
          return {
            valid: false,
            error: `Security Violation: File extension '${fileExt}' in '${entryName}' is not permitted under the platform allowlist.`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        if (!entry.isDirectory) {
          // Single file limit check (max 25MB)
          if (entry.header.size > maxSingleFileBytes) {
            return {
              valid: false,
              error: `Security Violation: File '${entryName}' (${(entry.header.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum single-file limit of 25MB.`,
              totalSize: 0,
              fileCount,
              hasIndexHtml,
              hasIndexPhp,
              hasPackageJson,
              archiveFormat,
            };
          }

          fileCount++;
          totalUncompressedSize += entry.header.size;

          if (baseName === 'index.html' || baseName === 'index.htm') hasIndexHtml = true;
          if (baseName === 'index.php') hasIndexPhp = true;
          if (baseName === 'package.json') hasPackageJson = true;
        }
      }

    // Zip Bomb Defense: Check compression ratio (max 100:1)
    try {
      const archiveStats = fs.statSync(archiveFilePath);
      const compressedSize = Math.max(archiveStats.size, 1);
      const compressionRatio = totalUncompressedSize / compressedSize;
      if (compressionRatio > 100) {
        return {
          valid: false,
          error: `Security Violation: Archive compression ratio exceeds 100:1 (${Math.round(compressionRatio)}:1). Upload rejected as potential decompression bomb.`,
          totalSize: totalUncompressedSize,
          fileCount,
          hasIndexHtml,
          hasIndexPhp,
          hasPackageJson,
          archiveFormat,
        };
      }
    } catch {}

    if (totalUncompressedSize > maxAllowedUncompressedBytes) {
      return {
        valid: false,
        error: `Decompressed archive size (${Math.round(totalUncompressedSize / 1024 / 1024)}MB) exceeds platform limit of ${Math.round(maxAllowedUncompressedBytes / 1024 / 1024)}MB.`,
        totalSize: totalUncompressedSize,
        fileCount,
        hasIndexHtml,
        hasIndexPhp,
        hasPackageJson,
        archiveFormat,
      };
    }

    // Storage Quota Guard
    const userPlanLimits: Record<string, number> = {
      FREE: 1024 * 1024 * 1024,      // 1 GB
      DEVELOPER: 10 * 1024 * 1024 * 1024, // 10 GB
      PRO: 50 * 1024 * 1024 * 1024,  // 50 GB
    };

    const quota = userPlanLimits[user.plan] || userPlanLimits.FREE;
    if (user.storageUsed + totalUncompressedSize > quota) {
      return {
        valid: false,
        error: `Storage quota exceeded for ${user.plan} plan. Used: ${Math.round(user.storageUsed / 1024 / 1024)}MB. Needed: ${Math.round(totalUncompressedSize / 1024 / 1024)}MB. Max: ${Math.round(quota / 1024 / 1024)}MB. Please upgrade your plan.`,
        totalSize: totalUncompressedSize,
        fileCount,
        hasIndexHtml,
        hasIndexPhp,
        hasPackageJson,
        archiveFormat,
      };
    }

    return {
      valid: true,
      totalSize: totalUncompressedSize,
      fileCount,
      hasIndexHtml,
      hasIndexPhp,
      hasPackageJson,
      archiveFormat,
    };
  }

  /**
   * Scans a single uploaded file (e.g. index.html, index.php, image, script) for malware, webshells, and corruption
   */
  public static async validateSingleFile(filePath: string, user: IUser): Promise<{ valid: boolean; error?: string }> {
    const scan = await MalwareScanner.scanFile(filePath);
    if (!scan.isClean) {
      return {
        valid: false,
        error: scan.threats.join('; ') || scan.errorMessage || 'File failed security validation',
      };
    }

    try {
      const stats = fs.statSync(filePath);
      const userPlanLimits: Record<string, number> = {
        FREE: 1024 * 1024 * 1024,
        DEVELOPER: 10 * 1024 * 1024 * 1024,
        PRO: 50 * 1024 * 1024 * 1024,
      };
      const quota = userPlanLimits[user.plan] || userPlanLimits.FREE;
      if (user.storageUsed + stats.size > quota) {
        return {
          valid: false,
          error: `Storage quota exceeded for ${user.plan} plan.`,
        };
      }
    } catch {}

    return { valid: true };
  }

  /**
   * Backwards compatible helper for validateZipArchive
   */
  public static async validateZipArchive(
    zipFilePath: string,
    user: IUser,
    maxAllowedUncompressedBytes: number = 300 * 1024 * 1024
  ): Promise<ValidationResult> {
    return this.validateArchive(zipFilePath, user, maxAllowedUncompressedBytes);
  }

  /**
   * Safely extract ZIP or RAR archive entries strictly within the target destination directory
   */
  public static async safeExtract(archiveFilePath: string, destDir: string): Promise<{ extractedCount: number }> {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const resolvedDest = path.resolve(destDir);
    const ext = path.extname(archiveFilePath).toLowerCase();
    let extractedCount = 0;

      // ZIP extraction
      const zip = new AdmZip(archiveFilePath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (entry.entryName.startsWith('__MACOSX') || entry.entryName.includes('/__MACOSX') || entry.entryName.endsWith('.DS_Store')) {
          continue;
        }

        const cleanEntryName = entry.entryName.replace(/^[/\\]+/, '');
        const safeEntryPath = path.normalize(cleanEntryName).replace(/^(\.\.[/\\])+/, '');
        const fullTarget = path.resolve(resolvedDest, safeEntryPath);

        if (!fullTarget.startsWith(resolvedDest + path.sep) && fullTarget !== resolvedDest) {
          throw new Error(`Path traversal attempt blocked: ${entry.entryName}`);
        }

        if (entry.isDirectory) {
          fs.mkdirSync(fullTarget, { recursive: true });
        } else {
          const parent = path.dirname(fullTarget);
          if (!fs.existsSync(parent)) {
            fs.mkdirSync(parent, { recursive: true });
          }
          fs.writeFileSync(fullTarget, entry.getData());
          extractedCount++;
        }
      }

    // Post-Extraction Defense: verify realpath of every file stays strictly inside destDir
    const verifyDirectoryJail = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullItemPath = path.join(dir, item.name);
        if (item.isSymbolicLink()) {
          throw new Error(`Security Violation: Extracted entry '${item.name}' is a symbolic link. Symlinks are strictly prohibited.`);
        }
        const real = fs.realpathSync(fullItemPath);
        if (real !== resolvedDest && !real.startsWith(resolvedDest + path.sep)) {
          throw new Error(`Security Violation: File '${item.name}' resolves outside target jail directory.`);
        }
        if (item.isDirectory()) {
          verifyDirectoryJail(fullItemPath);
        }
      }
    };

    try {
      verifyDirectoryJail(resolvedDest);
    } catch (err) {
      // Abort & delete destination directory immediately on jail escape violation
      try { fs.rmSync(resolvedDest, { recursive: true, force: true }); } catch {}
      throw err;
    }

    return { extractedCount };
  }
}
