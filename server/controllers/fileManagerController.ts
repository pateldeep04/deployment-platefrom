import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { dbStore, IDeployment } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { SecurityValidator } from '../middleware/securityValidator';

/**
 * Safely resolves and checks that a requested relative path stays strictly within the project's site directory.
 */
function resolveSafePath(siteDir: string, relativeSubPath: string = ''): string {
  const resolvedBase = path.resolve(siteDir);
  const cleanRelative = relativeSubPath.replace(/^[/\\]+/, '');
  const normalized = path.normalize(cleanRelative).replace(/^(\.\.[/\\])+/, '');
  const target = path.resolve(resolvedBase, normalized);

  if (!target.startsWith(resolvedBase)) {
    throw new Error('Access denied: Path traversal detected outside site root');
  }

  return target;
}

/**
 * Ensures the site directory exists for a given project
 */
function ensureSiteDir(slug: string): string {
  const siteDir = path.join(config.storageDir, 'sites', slug);
  if (!fs.existsSync(siteDir)) {
    fs.mkdirSync(siteDir, { recursive: true });
  }
  return siteDir;
}

/**
 * Helper to auto-flatten nested single directory if archive had a wrapping folder
 */
function autoPromoteIfNested(targetDir: string): boolean {
  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.') && e.name !== '__MACOSX');

    if (entries.length === 1 && entries[0].isDirectory()) {
      const singleDir = path.join(targetDir, entries[0].name);
      const subEntries = fs.readdirSync(singleDir);
      for (const sub of subEntries) {
        const src = path.join(singleDir, sub);
        const dest = path.join(targetDir, sub);
        fs.cpSync(src, dest, { recursive: true });
      }
      fs.rmSync(singleDir, { recursive: true, force: true });
      return true;
    }
  } catch (err) {
    console.error('[DeployHub] Auto-promote check error:', err);
  }
  return false;
}

/**
 * Helper to calculate total directory byte size recursively
 */
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

const EDITABLE_EXTENSIONS = new Set([
  'html', 'htm', 'css', 'js', 'mjs', 'php', 'json', 'txt', 'md', 'svg', 'xml'
]);

export const ARCHIVE_EXTENSIONS = new Set([
  'zip', 'rar', 'tar', 'gz', 'tgz', '7z'
]);


/**
 * GET /api/v1/projects/:projectId/files?dir=
 * Lists files and directories within the project
 */
export const listFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const subDir = (req.query.dir as string) || '';
    const targetDir = resolveSafePath(siteDir, subDir);

    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
      res.status(404).json({ success: false, error: 'Requested directory does not exist' });
      return;
    }

    const dirEntries = fs.readdirSync(targetDir, { withFileTypes: true });
    let totalSize = 0;

    const files = dirEntries
      .filter(entry => !entry.name.startsWith('.git') && entry.name !== '__MACOSX')
      .map(entry => {
        const fullPath = path.join(targetDir, entry.name);
        const relativePath = path.relative(siteDir, fullPath).replace(/\\/g, '/');
        const isDirectory = entry.isDirectory();
        let size = 0;
        let modifiedAt = new Date().toISOString();

        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          modifiedAt = stat.mtime.toISOString();
          if (!isDirectory) totalSize += size;
        } catch {
          // ignore stat error
        }

        const ext = isDirectory ? '' : path.extname(entry.name).toLowerCase().replace(/^\./, '');
        const isEditable = isDirectory ? false : EDITABLE_EXTENSIONS.has(ext);
        const isArchive = isDirectory ? false : ARCHIVE_EXTENSIONS.has(ext);
        const archiveType = isArchive ? (ext === 'zip' ? 'zip' : ext === 'rar' ? 'rar' : 'archive') : undefined;

        return {
          name: entry.name,
          path: relativePath,
          isDirectory,
          size,
          modifiedAt,
          extension: ext,
          isEditable,
          isArchive,
          archiveType,
        };
      })
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    res.json({
      success: true,
      data: {
        project: {
          id: project._id,
          name: project.name,
          slug: project.slug,
          type: project.type,
          status: project.status,
          deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
        },
        currentDir: subDir.replace(/\\/g, '/'),
        files,
        totalFiles: files.filter(f => !f.isDirectory).length,
        totalFolders: files.filter(f => f.isDirectory).length,
        totalSize,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list files' });
  }
};

/**
 * GET /api/v1/projects/:projectId/files/content?file=
 * Reads file text content for code editor
 */
export const getFileContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const filePathParam = req.query.file as string;
    if (!filePathParam) {
      res.status(400).json({ success: false, error: 'File path is required' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const targetFile = resolveSafePath(siteDir, filePathParam);

    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const stat = fs.statSync(targetFile);
    if (stat.size > 5 * 1024 * 1024) { // 5MB limit for editor
      res.status(400).json({ success: false, error: 'File is too large to open in browser editor (>5MB)' });
      return;
    }

    const content = fs.readFileSync(targetFile, 'utf-8');
    const ext = path.extname(targetFile).toLowerCase().replace(/^\./, '');

    res.json({
      success: true,
      data: {
        path: filePathParam.replace(/\\/g, '/'),
        name: path.basename(targetFile),
        extension: ext,
        content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to read file content' });
  }
};

/**
 * PUT /api/v1/projects/:projectId/files/content
 * Saves edited file content to disk
 */
export const saveFileContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { file, content } = req.body;
    const user = req.user!;

    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (!file || typeof content !== 'string') {
      res.status(400).json({ success: false, error: 'File path and content are required' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const targetFile = resolveSafePath(siteDir, file);

    const ext = path.extname(targetFile).toLowerCase().replace(/^\./, '');
    const forbiddenExtensions = ['exe', 'bat', 'cmd', 'sh', 'msi', 'vbs', 'dll'];
    if (forbiddenExtensions.includes(ext)) {
      res.status(400).json({ success: false, error: `Writing executable '${ext}' files is blocked for security.` });
      return;
    }

    const parentDir = path.dirname(targetFile);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(targetFile, content, 'utf-8');

    // Ensure project is active and live
    if (project.status !== 'ACTIVE') {
      project.status = 'ACTIVE';
      dbStore.save();
    }

    res.json({
      success: true,
      message: `File '${path.basename(targetFile)}' saved successfully`,
      data: {
        path: file.replace(/\\/g, '/'),
        size: Buffer.byteLength(content, 'utf-8'),
        modifiedAt: new Date().toISOString(),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save file' });
  }
};

/**
 * POST /api/v1/projects/:projectId/files/create
 * Creates a new file or directory with starter code
 */
export const createFileOrFolder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { type, targetDir = '', name } = req.body;
    const user = req.user!;

    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    // Sanitize name: prevent path separators
    const sanitizedName = name.replace(/[/\\]/g, '').trim();
    if (!sanitizedName) {
      res.status(400).json({ success: false, error: 'Invalid file or folder name' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const parentFolder = resolveSafePath(siteDir, targetDir);
    const fullTarget = path.join(parentFolder, sanitizedName);

    // Verify it stays inside site root
    resolveSafePath(siteDir, path.relative(siteDir, fullTarget));

    if (fs.existsSync(fullTarget)) {
      res.status(409).json({ success: false, error: `'${sanitizedName}' already exists` });
      return;
    }

    if (type === 'folder') {
      fs.mkdirSync(fullTarget, { recursive: true });
      res.status(201).json({
        success: true,
        message: `Folder '${sanitizedName}' created`,
        data: { path: path.relative(siteDir, fullTarget).replace(/\\/g, '/') }
      });
      return;
    }

    // File creation with sensible starter template
    const ext = path.extname(sanitizedName).toLowerCase();
    let starterContent = '';

    if (ext === '.html' || ext === '.htm') {
      starterContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Welcome to ${project.name}</h1>
  <p>Static deployment hosted on DeployHub.</p>
  <script src="script.js"></script>
</body>
</html>
`;
    } else if (ext === '.css') {
      starterContent = `/* Stylesheet for ${project.name} */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  padding: 2rem;
  line-height: 1.6;
}

h1 {
  color: #38bdf8;
  margin-bottom: 1rem;
}
`;
    } else if (ext === '.js') {
      starterContent = `// JavaScript for ${project.name}
document.addEventListener('DOMContentLoaded', () => {
  console.log('${project.name} is running smoothly on DeployHub!');
});
`;
    } else if (ext === '.php') {
      starterContent = `<?php
// PHP Script on DeployHub
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.name} - PHP</title>
  <style>
    body { font-family: system-ui; background: #0b1120; color: #f8fafc; padding: 40px; }
    .card { background: #111827; padding: 24px; border-radius: 12px; border: 1px solid #1e293b; max-width: 600px; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="color: #6366f1;">🚀 DeployHub PHP Runtime</h2>
    <p>Project: <strong>${project.name}</strong></p>
    <p>Current Server Timestamp: <code><?php echo date('Y-m-d H:i:s'); ?></code></p>
  </div>
</body>
</html>
`;
    }

    fs.writeFileSync(fullTarget, starterContent, 'utf-8');

    if (project.status !== 'ACTIVE') {
      project.status = 'ACTIVE';
      dbStore.save();
    }

    res.status(201).json({
      success: true,
      message: `File '${sanitizedName}' created`,
      data: {
        path: path.relative(siteDir, fullTarget).replace(/\\/g, '/'),
        content: starterContent,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create file or folder' });
  }
};

/**
 * DELETE /api/v1/projects/:projectId/files?path=
 * Deletes a file or directory
 */
export const deleteFileOrFolder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const targetPath = req.query.path as string;
    const user = req.user!;

    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (!targetPath) {
      res.status(400).json({ success: false, error: 'Path is required' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const fullTarget = resolveSafePath(siteDir, targetPath);

    // Prevent deleting the site root directory itself
    if (fullTarget === path.resolve(siteDir)) {
      res.status(400).json({ success: false, error: 'Cannot delete the project root directory' });
      return;
    }

    if (!fs.existsSync(fullTarget)) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    fs.rmSync(fullTarget, { recursive: true, force: true });

    res.json({
      success: true,
      message: `Deleted '${path.basename(fullTarget)}' successfully`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete' });
  }
};

/**
 * POST /api/v1/projects/:projectId/files/rename
 * Renames a file or folder
 */
export const renameFileOrFolder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { oldPath, newName } = req.body;
    const user = req.user!;

    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (!oldPath || !newName) {
      res.status(400).json({ success: false, error: 'Current path and new name are required' });
      return;
    }

    const sanitizedNewName = newName.replace(/[/\\]/g, '').trim();
    if (!sanitizedNewName) {
      res.status(400).json({ success: false, error: 'Invalid new name' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const fullOldPath = resolveSafePath(siteDir, oldPath);

    if (!fs.existsSync(fullOldPath)) {
      res.status(404).json({ success: false, error: 'Item to rename not found' });
      return;
    }

    const parentDir = path.dirname(fullOldPath);
    const fullNewPath = path.join(parentDir, sanitizedNewName);

    // Security check
    resolveSafePath(siteDir, path.relative(siteDir, fullNewPath));

    if (fs.existsSync(fullNewPath)) {
      res.status(409).json({ success: false, error: `An item named '${sanitizedNewName}' already exists` });
      return;
    }

    fs.renameSync(fullOldPath, fullNewPath);

    res.json({
      success: true,
      message: `Renamed to '${sanitizedNewName}'`,
      data: {
        newPath: path.relative(siteDir, fullNewPath).replace(/\\/g, '/')
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to rename' });
  }
};

/**
 * POST /api/v1/projects/:projectId/files/upload
 * Directly uploads one or multiple individual files (HTML, CSS, JS, PHP, images) into a folder
 */
export const uploadIndividualFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files provided for upload' });
      return;
    }

    const targetDirParam = (req.body.targetDir as string) || '';
    const siteDir = ensureSiteDir(project.slug);
    const destinationDir = resolveSafePath(siteDir, targetDirParam);

    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    const uploadedNames: string[] = [];
    let uploadedBytes = 0;

    for (const file of files) {
      const originalName = path.basename(file.originalname);
      const targetFilePath = path.join(destinationDir, originalName);

      // Copy from temporary staging to target
      fs.copyFileSync(file.path, targetFilePath);
      uploadedNames.push(originalName);
      uploadedBytes += file.size;

      // Clean up multer temp file
      try {
        fs.unlinkSync(file.path);
      } catch {}
    }

    // Activate project if it was inactive
    project.status = 'ACTIVE';
    project.storageUsed += uploadedBytes;
    user.storageUsed += uploadedBytes;
    dbStore.save();

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadedNames.length} file(s) to ${targetDirParam || 'root'}`,
      data: {
        uploadedFiles: uploadedNames,
        targetDir: targetDirParam,
        deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'File upload failed' });
  }
};

/**
 * POST /api/v1/projects/:projectId/files/initialize-template
 * Seeds starter HTML/CSS/JS or PHP files if project is empty
 */
export const initializeTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { template = 'STATIC' } = req.body;
    const user = req.user!;

    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);

    if (template === 'PHP') {
      fs.writeFileSync(
        path.join(siteDir, 'index.php'),
        `<?php
$title = "${project.name}";
$serverTime = date("Y-m-d H:i:s");
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title><?= $title ?> - PHP</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>🐘 <?= $title ?></h1>
    <p>PHP runtime active on DeployHub.</p>
    <div class="timestamp">Server Time: <?= $serverTime ?></div>
    <button onclick="testJs()">Click Me</button>
  </div>
  <script src="script.js"></script>
</body>
</html>
`,
        'utf-8'
      );
    } else {
      fs.writeFileSync(
        path.join(siteDir, 'index.html'),
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>🚀 ${project.name}</h1>
    <p>Static HTML, CSS & JavaScript website running on DeployHub.</p>
    <button id="btn" onclick="testJs()">Interactive Test</button>
    <p id="msg"></p>
  </div>
  <script src="script.js"></script>
</body>
</html>
`,
        'utf-8'
      );
    }

    fs.writeFileSync(
      path.join(siteDir, 'style.css'),
      `body {
  margin: 0;
  padding: 40px;
  background-color: #0b1120;
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.container {
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

h1 {
  color: #38bdf8;
  margin-top: 0;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

button:hover {
  background: #1d4ed8;
}

.timestamp {
  background: #1e293b;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: monospace;
  margin: 12px 0;
  color: #a7f3d0;
}
`,
      'utf-8'
    );

    fs.writeFileSync(
      path.join(siteDir, 'script.js'),
      `function testJs() {
  const msg = document.getElementById('msg') || document.querySelector('p');
  alert('${project.name} JavaScript is working perfectly!');
}
console.log('${project.name} initialized successfully.');
`,
      'utf-8'
    );

    project.status = 'ACTIVE';
    dbStore.save();

    res.json({
      success: true,
      message: `Initialized ${template} website template (HTML, CSS, JS${template === 'PHP' ? ', PHP' : ''})`,
      data: {
        deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Template initialization failed' });
  }
};

/**
 * POST /api/v1/projects/:projectId/files/extract
 * Extracts an existing .zip or .rar archive located inside the project files
 */
export const extractArchive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { archivePath, targetDir = '', autoPromote = true, deleteArchiveAfter = false } = req.body;
    const user = req.user!;

    if (!archivePath) {
      res.status(400).json({ success: false, error: 'archivePath is required' });
      return;
    }

    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const siteDir = ensureSiteDir(project.slug);
    const fullArchivePath = resolveSafePath(siteDir, archivePath);

    if (!fs.existsSync(fullArchivePath) || fs.statSync(fullArchivePath).isDirectory()) {
      res.status(404).json({ success: false, error: `Archive file '${archivePath}' not found` });
      return;
    }

    const ext = path.extname(fullArchivePath).toLowerCase().replace(/^\./, '');
    if (!ARCHIVE_EXTENSIONS.has(ext)) {
      res.status(400).json({ success: false, error: `File '${archivePath}' is not a supported archive format (.zip, .rar)` });
      return;
    }

    const fullTargetDir = resolveSafePath(siteDir, targetDir);
    if (!fs.existsSync(fullTargetDir)) {
      fs.mkdirSync(fullTargetDir, { recursive: true });
    }

    // Security validation (covers decompression bomb, path traversal, dangerous executables)
    const validation = await SecurityValidator.validateArchive(fullArchivePath, user);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error || 'Archive failed security validation' });
      return;
    }

    // Safe extraction for ZIP and RAR
    const { extractedCount } = await SecurityValidator.safeExtract(fullArchivePath, fullTargetDir);

    let wasFlattened = false;
    if (autoPromote) {
      wasFlattened = autoPromoteIfNested(fullTargetDir);
    }

    // Check entrypoint in siteDir
    const hasIndex = fs.existsSync(path.join(siteDir, 'index.html')) ||
                     fs.existsSync(path.join(siteDir, 'index.htm')) ||
                     fs.existsSync(path.join(siteDir, 'index.php'));
    if (hasIndex) {
      project.status = 'ACTIVE';
    }

    // If requested, delete the archive file after successful extraction
    if (deleteArchiveAfter) {
      try {
        fs.unlinkSync(fullArchivePath);
      } catch (e) {
        console.warn('Failed to delete archive after extraction:', e);
      }
    }

    // Recalculate storage metrics
    const totalSiteSize = calculateDirSize(siteDir);
    const prevProjectStorage = project.storageUsed || 0;
    project.storageUsed = totalSiteSize;
    user.storageUsed = Math.max(0, (user.storageUsed || 0) - prevProjectStorage + totalSiteSize);
    dbStore.save();

    res.json({
      success: true,
      message: `Extracted ${extractedCount} file(s) from ${path.basename(archivePath)} successfully!${wasFlattened ? ' (Auto-flattened nested folder)' : ''}`,
      data: {
        extractedCount,
        archiveFormat: validation.archiveFormat,
        targetDir: targetDir || '/',
        flattened: wasFlattened,
        archiveDeleted: !!deleteArchiveAfter,
        deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Archive extraction failed' });
  }
};

/**
 * POST /api/v1/projects/:projectId/files/upload-and-extract
 * Uploads a .zip or .rar archive and unpacks it directly into the project/target folder
 */
export const uploadAndExtractArchive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const user = req.user!;
    const project = dbStore.projects.find(p => p._id === projectId && (p.userId === user._id || user.role === 'ADMIN'));

    if (!project) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No archive file uploaded. Please upload a .zip or .rar file.' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace(/^\./, '');
    if (!ARCHIVE_EXTENSIONS.has(ext)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, error: `Invalid file format '.${ext}'. Please upload a .zip or .rar archive.` });
      return;
    }

    const targetDirParam = (req.body.targetDir as string) || '';
    const autoPromote = req.body.autoPromote !== 'false' && req.body.autoPromote !== false;

    const siteDir = ensureSiteDir(project.slug);
    const fullTargetDir = resolveSafePath(siteDir, targetDirParam);

    if (!fs.existsSync(fullTargetDir)) {
      fs.mkdirSync(fullTargetDir, { recursive: true });
    }

    // Security check
    const validation = await SecurityValidator.validateArchive(req.file.path, user);
    if (!validation.valid) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, error: validation.error || 'Archive failed security validation' });
      return;
    }

    // Safe extraction
    const { extractedCount } = await SecurityValidator.safeExtract(req.file.path, fullTargetDir);

    // Clean up temporary uploaded file
    try { fs.unlinkSync(req.file.path); } catch {}

    let wasFlattened = false;
    if (autoPromote) {
      wasFlattened = autoPromoteIfNested(fullTargetDir);
    }

    const hasIndex = fs.existsSync(path.join(siteDir, 'index.html')) ||
                     fs.existsSync(path.join(siteDir, 'index.htm')) ||
                     fs.existsSync(path.join(siteDir, 'index.php'));
    if (hasIndex) {
      project.status = 'ACTIVE';
    }

    // Update storage metrics
    const totalSiteSize = calculateDirSize(siteDir);
    const prevProjectStorage = project.storageUsed || 0;
    project.storageUsed = totalSiteSize;
    user.storageUsed = Math.max(0, (user.storageUsed || 0) - prevProjectStorage + totalSiteSize);
    dbStore.save();

    res.json({
      success: true,
      message: `Uploaded & unpacked ${extractedCount} file(s) from ${req.file.originalname} successfully!${wasFlattened ? ' (Auto-flattened nested folder)' : ''}`,
      data: {
        extractedCount,
        archiveFormat: validation.archiveFormat,
        targetDir: targetDirParam || '/',
        flattened: wasFlattened,
        deploymentUrl: `http://localhost:${config.port}/sites/${project.slug}/`,
      }
    });
  } catch (err: any) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ success: false, error: err.message || 'Archive upload and extraction failed' });
  }
};

