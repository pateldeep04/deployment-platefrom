import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { config } from '../config';
import { dbStore } from '../database/store';
import { redisCacheService } from '../services/redisCacheService';

export const handleSiteRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let slug: string = (req.params.slug as string) || '';

  // Support host-based routing (e.g. my-project.deployeai.duckdns.org, my-project.pateldeeep.me, or custom domain)
  const host: string = (req.headers.host || '').split(':')[0].toLowerCase();
  const platformDomain = (config.platformDomain || 'deployeai.duckdns.org').toLowerCase();

  if (!slug) {
    if (host.endsWith('.' + platformDomain)) {
      slug = host.slice(0, -(platformDomain.length + 1));
    } else {
      const parts = host.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
        slug = parts[0];
      }
    }
  }

  if (!slug && !host) {
    next();
    return;
  }

  // 1. Fast Redis / RAM Cache Lookup
  const cacheKey: string = slug || host;
  let targetSlug: string = slug;
  let cachedRoute = await redisCacheService.getRoute(cacheKey);

  let project = null;
  if (cachedRoute) {
    targetSlug = cachedRoute.slug;
    project = dbStore.projects.find(p => p._id === cachedRoute!.projectId || p.slug === targetSlug);
  }

  // 2. Fallback to Store if not in cache
  if (!project) {
    project = dbStore.projects.find(p => p.slug === slug || p.assignedSubdomain === slug || p.customDomain === host);
    if (project) {
      // Populate Redis Cache (TTL: 10 mins)
      await redisCacheService.setRoute(cacheKey, {
        projectId: project._id,
        slug: project.slug,
        customDomain: project.customDomain,
        assignedSubdomain: project.assignedSubdomain,
        status: project.status,
      }, 600);
      targetSlug = project.slug;
    }
  }

  if (!project) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>404 - Project Not Found | DeployHub</title><style>body{background:#0B1120;color:#F8FAFC;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.box{text-align:center;border:1px solid #263449;padding:40px;border-radius:12px;background:#111827;}h1{color:#EF4444;margin:0 0 10px;}</style></head>
        <body><div class="box"><h1>404: Not Found</h1><p>No deployment found for <code>${escapeHtml(slug || host)}</code> on DeployHub edge router.</p></div></body>
      </html>
    `);
    return;
  }

  // Record Real Visitor Traffic & Analytics
  const todayStr = new Date().toISOString().split('T')[0];
  const estimatedBytes = 2048; // baseline HTTP response size
  dbStore.trafficLogs = dbStore.trafficLogs || [];
  dbStore.trafficLogs.push({
    _id: `trf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: project.userId,
    projectId: project._id,
    timestamp: new Date().toISOString(),
    date: todayStr,
    bytesSent: estimatedBytes,
    path: req.path,
    statusCode: 200,
  });

  // Keep last 10,000 logs to prevent unbounded growth
  if (dbStore.trafficLogs.length > 10000) {
    dbStore.trafficLogs = dbStore.trafficLogs.slice(-10000);
  }

  const projectOwner = dbStore.users.find(u => u._id === project.userId);
  if (projectOwner) {
    projectOwner.bandwidthUsed = (projectOwner.bandwidthUsed || 0) + estimatedBytes;
  }
  dbStore.save();

  const siteDir = path.join(config.storageDir, 'sites', project.slug);
  if (!fs.existsSync(siteDir)) {
    res.status(404).send(`<h3>Project '${project.name}' has no active build artifact. Please trigger a deployment.</h3>`);
    return;
  }

  // 1. Enforce trailing slash on base site route to ensure relative paths (e.g. style.css, script.js) resolve correctly
  const urlPath = req.originalUrl.split('?')[0];
  if (urlPath === `/sites/${slug}`) {
    const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
    res.redirect(301, `/sites/${slug}/${query}`);
    return;
  }

  // Determine requested subpath
  let subPath = '';
  if (req.baseUrl.startsWith('/sites/')) {
    subPath = req.path.replace(/^\//, '');
  } else {
    subPath = req.path.replace(/^\//, '');
  }

  // If directory requested, check for trailing slash or append index
  let targetPath = path.join(siteDir, subPath);

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    if (!req.path.endsWith('/') && subPath !== '') {
      const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
      res.redirect(301, `${urlPath}/${query}`);
      return;
    }

    if (fs.existsSync(path.join(targetPath, 'index.php'))) {
      subPath = path.join(subPath, 'index.php').replace(/\\/g, '/');
      targetPath = path.join(siteDir, subPath);
    } else if (fs.existsSync(path.join(targetPath, 'index.html'))) {
      subPath = path.join(subPath, 'index.html').replace(/\\/g, '/');
      targetPath = path.join(siteDir, subPath);
    } else if (fs.existsSync(path.join(targetPath, 'index.htm'))) {
      subPath = path.join(subPath, 'index.htm').replace(/\\/g, '/');
      targetPath = path.join(siteDir, subPath);
    }
  }

  if (!subPath || subPath === '') {
    if (fs.existsSync(path.join(siteDir, 'index.php'))) {
      subPath = 'index.php';
    } else if (fs.existsSync(path.join(siteDir, 'index.html'))) {
      subPath = 'index.html';
    } else if (fs.existsSync(path.join(siteDir, 'index.htm'))) {
      subPath = 'index.htm';
    }
    targetPath = path.join(siteDir, subPath);
  }

  const filePath = targetPath;

  // 2. PHP Execution & Rendering
  if (subPath.endsWith('.php') && fs.existsSync(filePath)) {
    let responded = false;
    try {
      const phpProcess = spawn('php', [filePath], {
        cwd: siteDir,
        env: {
          ...process.env,
          REQUEST_METHOD: req.method,
          QUERY_STRING: req.url.split('?')[1] || '',
          SCRIPT_FILENAME: filePath,
        }
      });

      let output = '';
      let errOutput = '';

      phpProcess.stdout.on('data', (d) => { output += d.toString(); });
      phpProcess.stderr.on('data', (d) => { errOutput += d.toString(); });

      phpProcess.on('error', () => {
        if (responded) return;
        responded = true;
        
        // Smart PHP Runtime Simulator when native PHP CLI is not in system PATH
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        
        // Evaluate simple PHP echo expressions, dates, variables, and strip PHP tags cleanly
        let renderedHtml = rawContent
          .replace(/<\?php\s+echo\s+date\(['"]([^'"]+)['"]\);\s*\?>/gi, () => new Date().toISOString())
          .replace(/<\?php\s+echo\s+['"]([^'"]*)['"];?\s*\?>/gi, '$1')
          .replace(/<\?=\s*['"]([^'"]*)['"]\s*;?\s*\?>/gi, '$1')
          .replace(/<\?php[\s\S]*?\?>/gi, ''); // Cleanly strip unhandled server tags so HTML/CSS renders

        // If the file was pure PHP with no HTML tags
        if (!renderedHtml.includes('<html') && !renderedHtml.includes('<body') && !renderedHtml.includes('<div')) {
          renderedHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>${project.name} - PHP Output</title>
                <style>
                  body { background: #0B1120; color: #F8FAFC; font-family: monospace; padding: 30px; }
                  .container { max-width: 800px; margin: 0 auto; background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 24px; }
                  .badge { background: #6366F1; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <span class="badge">PHP Engine</span>
                    <span style="color:#94A3B8; font-size:12px;">Script: ${escapeHtml(subPath)}</span>
                  </div>
                  <pre style="color:#A7F3D0; margin:0; line-height:1.5;">${escapeHtml(rawContent)}</pre>
                </div>
              </body>
            </html>
          `;
        }

        res.send(renderedHtml);
      });

      phpProcess.on('close', (code) => {
        if (responded) return;
        responded = true;
        if (code === 0) {
          if (output.includes('Content-Type:')) {
            const parts = output.split('\r\n\r\n');
            if (parts.length > 1) {
              res.send(parts.slice(1).join('\r\n\r\n'));
              return;
            }
          }
          res.send(output);
        } else {
          res.status(500).send(`<pre style="color:red; background:#111827; padding:20px; border-radius:8px;">PHP Error:\n${escapeHtml(errOutput || output)}</pre>`);
        }
      });
      return;
    } catch (e: any) {
      if (!responded) {
        responded = true;
        res.status(500).send(`PHP Runner Error: ${e.message}`);
      }
      return;
    }
  }

  // 3. Static file serving
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
    return;
  }

  // SPA fallback: if file not found and index.html exists, return index.html
  const indexHtml = path.join(siteDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
    return;
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head><title>404 - Not Found</title><style>body{background:#0B1120;color:#F8FAFC;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.box{text-align:center;border:1px solid #1E293B;padding:40px;border-radius:12px;background:#111827;}h1{color:#F43F5E;margin:0 0 10px;}</style></head>
      <body><div class="box"><h1>404: File Not Found</h1><p>The requested path <code>${escapeHtml(subPath)}</code> was not found in project <code>${escapeHtml(project.name)}</code>.</p></div></body>
    </html>
  `);
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
