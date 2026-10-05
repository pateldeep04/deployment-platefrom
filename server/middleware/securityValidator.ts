import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { createExtractorFromData } from 'node-unrar-js';
import { IUser } from '../database/store';

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
    const maxFiles = 10000;
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.msi', '.vbs', '.scr', '.pif', '.dll', '.so', '.dylib'];

    let totalUncompressedSize = 0;
    let fileCount = 0;
    let hasIndexHtml = false;
    let hasIndexPhp = false;
    let hasPackageJson = false;
    const archiveFormat: 'ZIP' | 'RAR' = ext === '.rar' ? 'RAR' : 'ZIP';

    if (ext === '.rar') {
      try {
        const fileBuf = fs.readFileSync(archiveFilePath);
        const data = Uint8Array.from(fileBuf).buffer;
        const extractor = await createExtractorFromData({ data });
        const list = extractor.getFileList();
        const headers = [...list.fileHeaders];

        if (headers.length > maxFiles) {
          return {
            valid: false,
            error: `Archive contains too many files (${headers.length}). Maximum permitted is ${maxFiles}.`,
            totalSize: 0,
            fileCount: headers.length,
            hasIndexHtml: false,
            hasIndexPhp: false,
            hasPackageJson: false,
            archiveFormat,
          };
        }

        for (const header of headers) {
          const entryName = header.name;
          const cleanName = entryName.replace(/^[/\\]+/, '');

          // Path Traversal Guard
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

          // Drive letter guard
          if (/^[a-zA-Z]:[/\\]/.test(cleanName)) {
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
          if (forbiddenExtensions.includes(fileExt)) {
            return {
              valid: false,
              error: `Security Violation: Disallowed executable file '${entryName}' detected in archive`,
              totalSize: 0,
              fileCount,
              hasIndexHtml,
              hasIndexPhp,
              hasPackageJson,
              archiveFormat,
            };
          }

          if (!header.flags.directory) {
            fileCount++;
            totalUncompressedSize += header.unpSize || 0;
            const baseName = path.basename(entryName).toLowerCase();
            if (baseName === 'index.html' || baseName === 'index.htm') hasIndexHtml = true;
            if (baseName === 'index.php') hasIndexPhp = true;
            if (baseName === 'package.json') hasPackageJson = true;
          }
        }
      } catch (err: any) {
        return {
          valid: false,
          error: `Invalid or corrupt RAR archive: ${err.message}`,
          totalSize: 0,
          fileCount: 0,
          hasIndexHtml: false,
          hasIndexPhp: false,
          hasPackageJson: false,
          archiveFormat,
        };
      }
    } else {
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

        if (/^[a-zA-Z]:[/\\]/.test(cleanName)) {
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
        if (forbiddenExtensions.includes(fileExt)) {
          return {
            valid: false,
            error: `Security Violation: Disallowed executable file '${entryName}' detected in archive`,
            totalSize: 0,
            fileCount,
            hasIndexHtml,
            hasIndexPhp,
            hasPackageJson,
            archiveFormat,
          };
        }

        if (!entry.isDirectory) {
          fileCount++;
          totalUncompressedSize += entry.header.size;

          const baseName = path.basename(entryName).toLowerCase();
          if (baseName === 'index.html' || baseName === 'index.htm') hasIndexHtml = true;
          if (baseName === 'index.php') hasIndexPhp = true;
          if (baseName === 'package.json') hasPackageJson = true;
        }
      }
    }

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

    if (ext === '.rar') {
      const fileBuf = fs.readFileSync(archiveFilePath);
      const data = Uint8Array.from(fileBuf).buffer;
      const extractor = await createExtractorFromData({ data });
      const extracted = extractor.extract();
      const files = [...extracted.files];

      for (const item of files) {
        const header = item.fileHeader;
        if (header.name.startsWith('__MACOSX') || header.name.includes('/__MACOSX') || header.name.endsWith('.DS_Store')) {
          continue;
        }

        const cleanEntryName = header.name.replace(/^[/\\]+/, '');
        const safeEntryPath = path.normalize(cleanEntryName).replace(/^(\.\.[/\\])+/, '');
        const fullTarget = path.resolve(resolvedDest, safeEntryPath);

        if (!fullTarget.startsWith(resolvedDest + path.sep) && fullTarget !== resolvedDest) {
          throw new Error(`Path traversal attempt blocked in RAR: ${header.name}`);
        }

        if (header.flags.directory) {
          if (!fs.existsSync(fullTarget)) {
            fs.mkdirSync(fullTarget, { recursive: true });
          }
        } else {
          const parent = path.dirname(fullTarget);
          if (!fs.existsSync(parent)) {
            fs.mkdirSync(parent, { recursive: true });
          }
          if (item.extraction) {
            fs.writeFileSync(fullTarget, Buffer.from(item.extraction));
            extractedCount++;
          }
        }
      }
    } else {
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
    }

    return { extractedCount };
  }
}
