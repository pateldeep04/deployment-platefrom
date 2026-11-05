import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { config, AVAILABLE_PLATFORM_DOMAINS } from '../config';
import { dbStore } from '../database/store';
import { redisCacheService } from '../services/redisCacheService';
import { defaultSiteService } from '../services/defaultSiteService';

export const handleSiteRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let slug: string = (req.params.slug as string) || '';

  // Support host-based routing (e.g. my-project.deployeai.duckdns.org or custom domain)
  const host: string = (req.headers.host || '').split(':')[0].toLowerCase();
  const platformDomain = (config.platformDomain || 'deployeai.duckdns.org').toLowerCase();

  // pateldeeep.me is strictly the main platform, not for project subdomains
  if (host === 'pateldeeep.me' || host.endsWith('.pateldeeep.me')) {
    next();
    return;
  }

  // 1. Fast Redis / RAM Cache Lookup by host or explicit slug
  const cacheKey: string = host || slug;
  let matchedBaseDomain: string | undefined = undefined;

  let project: any = null;
  const cachedRoute = await redisCacheService.getRoute(cacheKey);
  if (cachedRoute) {
    project = dbStore.projects.find(p => p._id === cachedRoute!.projectId);
  }

  // 2. Fallback to Store if not in cache
  if (!project) {
    // Priority A: Exact verified Custom Domain match
    if (host) {
      project = dbStore.projects.find(p => p.customDomain && p.customDomain.toLowerCase() === host);
    }

    // Priority B: Platform domain subdomain match
    if (!project && host) {
      const customDomains = (dbStore.settings.platformDomains || []).map(d => d.domain.toLowerCase());
      const recognizedDomains = Array.from(new Set([
        platformDomain,
        ...AVAILABLE_PLATFORM_DOMAINS.map(d => d.domain.toLowerCase()),
        ...customDomains,
      ])).filter(Boolean);

      for (const domain of recognizedDomains) {
        if (host.endsWith('.' + domain)) {
          const extractedSub = host.slice(0, -(domain.length + 1)).toLowerCase();
          matchedBaseDomain = domain;
          project = dbStore.projects.find(p => 
            (p.assignedSubdomain?.toLowerCase() === extractedSub || p.slug.toLowerCase() === extractedSub) &&
            (!p.platformDomain || p.platformDomain.toLowerCase() === domain)
          );
          if (project) break;
        }
      }
    }

    // Priority C: Direct path routing (/sites/:slug) or localhost testing
    if (!project && slug) {
      project = dbStore.projects.find(p => p.slug.toLowerCase() === slug.toLowerCase() || p.assignedSubdomain?.toLowerCase() === slug.toLowerCase());
    }

    if (project) {
      // Populate Redis Cache (TTL: 10 mins)
      await redisCacheService.setRoute(cacheKey, {
        projectId: project._id,
        slug: project.slug,
        customDomain: project.customDomain,
        assignedSubdomain: project.assignedSubdomain,
        status: project.status,
      }, 600);
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

  // 3. Domain Expiry Guard: Check if 3-month free domain cycle expired / deactivated
  const isDomainExpired = project.isDomainExpired || (project.domainExpiresAt && new Date() > new Date(project.domainExpiresAt));
  if (isDomainExpired || project.domainStatus === 'DEACTIVATED') {
    const domainFqdn = project.customDomain || `${project.assignedSubdomain || project.slug}.${project.platformDomain || config.platformDomain || 'deployeai.duckdns.org'}`;
    res.status(503).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Domain Deactivated | DeployHub</title>
          <style>
            body { background: #070b14; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
            .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 44px 36px; max-width: 540px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 22px; }
            h1 { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 12px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
            .domain-box { background: #020617; border: 1px dashed #334155; border-radius: 12px; padding: 14px; font-family: monospace; font-size: 15px; color: #38bdf8; margin-bottom: 24px; word-break: break-all; font-weight: bold; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
            .btn:hover { background: #1d4ed8; }
            .footer-note { font-size: 11px; color: #64748b; margin-top: 26px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">🔴 3-Month Period Concluded</div>
            <h1>Domain Deactivated</h1>
            <div class="domain-box">${escapeHtml(domainFqdn)}</div>
            <p>
              The 3-month free domain validity period for this website has ended and the domain is temporarily inactive.
              <br><br>
              <strong>Are you the site owner?</strong> You can reactivate this domain immediately for <strong>FREE</strong> with 1 click in your DeployHub dashboard to extend validity for another 3 months.
            </p>
            <a href="https://${config.platformDomain || 'deployeai.duckdns.org'}/dashboard" class="btn">Reactivate Domain Free →</a>
            <div class="footer-note">DeployHub Cloud Edge • Zero-Cost Developer Hosting</div>
          </div>
        </body>
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

  // Security Check: Tenant Suspended or Banned Guard
  if (project.status === 'INACTIVE' || projectOwner?.isBanned) {
    res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>403 - Site Suspended | DeployHub</title>
          <style>
            body { background: #F8FAFC; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.06); }
            .icon { font-size: 40px; margin-bottom: 12px; }
            h1 { font-size: 22px; font-weight: 800; color: #DC2626; margin: 0 0 12px; }
            p { font-size: 14px; line-height: 1.6; color: #64748B; margin: 0 0 24px; }
            .btn { display: inline-block; background: #2563EB; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 22px; border-radius: 8px; }
            .footer { margin-top: 24px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">🛡️</div>
            <h1>Website Suspended</h1>
            <p>This hosted project has been temporarily deactivated or suspended in compliance with the DeployHub Security & Abuse Takedown Policy.</p>
            <a href="/support/request?type=SUPPORT_QUERY" class="btn">Contact Trust & Safety Team &rarr;</a>
            <div class="footer">DeployHub Cloud Security Enforcement</div>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Tenant Response Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const siteDir = path.join(config.storageDir, 'sites', project.slug);
  const rootIndexHtml = path.join(siteDir, 'index.html');
  const rootIndexPhp = path.join(siteDir, 'index.php');

  // If domain is occupied but user has not hosted custom code yet, scaffold & serve default DeployHub website
  if (!fs.existsSync(siteDir) || (!fs.existsSync(rootIndexHtml) && !fs.existsSync(rootIndexPhp))) {
    defaultSiteService.scaffoldDefaultSite(project);
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

  // 1. Dotfile Security Guard: Strictly deny .env, .git, .htaccess, .DS_Store, etc.
  const pathSegments = subPath.split(/[/\\]/);
  if (pathSegments.some(seg => seg.startsWith('.'))) {
    res.status(404).type('text/plain').send('404: Not Found');
    return;
  }

  // 2. Security Guard: Prevent Path Traversal Outside Project Site Directory
  const resolvedSiteDir = path.resolve(siteDir);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedTarget !== resolvedSiteDir && !resolvedTarget.startsWith(resolvedSiteDir + path.sep)) {
    res.status(403).send(`
      <!DOCTYPE html>
      <html><head><title>403 - Forbidden | DeployHub</title></head>
      <body style="font-family:system-ui;text-align:center;padding:50px;background:#0F172A;color:#F8FAFC;">
        <h2>403: Forbidden</h2>
        <p>Access denied: Path traversal detected outside site root.</p>
      </body></html>
    `);
    return;
  }

  // 3. Symlink Jail Escape Verification
  try {
    const realSiteDir = fs.realpathSync(siteDir);
    if (fs.existsSync(targetPath)) {
      const realTarget = fs.realpathSync(targetPath);
      if (realTarget !== realSiteDir && !realTarget.startsWith(realSiteDir + path.sep)) {
        res.status(403).type('text/plain').send('403: Forbidden - Symlink target outside site root');
        return;
      }
    }
  } catch {
    res.status(404).type('text/plain').send('404: File Not Found');
    return;
  }

  const filePath = targetPath;

  // 4. PHP Execution & Sandboxing
  if (subPath.endsWith('.php') && fs.existsSync(filePath)) {
    // If PHP execution is disabled by security policy (Phase 4 isolation requirement)
    if (!dbStore.settings?.enablePhpExecution) {
      res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>403 - PHP Execution Restricted | DeployHub</title>
            <style>
              body { background: #F8FAFC; color: #0F172A; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 36px; max-width: 520px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
              h1 { font-size: 20px; font-weight: 800; color: #B45309; margin: 0 0 10px; }
              p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px; }
              code { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #0F172A; }
              .info { font-size: 12px; color: #94A3B8; margin-top: 20px; border-top: 1px solid #F1F5F9; padding-top: 12px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>PHP Execution Sandboxed</h1>
              <p>Under <strong>DeployHub Security Policy (v2 - Phase 4)</strong>, tenant PHP execution requires containerization and isolated resource pools.</p>
              <p>Static websites (HTML, CSS, JavaScript, React, Vite) are fully active and unrestricted. Administrators can enable sandboxed PHP in Mission Control Settings.</p>
              <div class="info">DeployHub Security Architecture v2 &bull; Tenant Isolation Standard</div>
            </div>
          </body>
        </html>
      `);
      return;
    }

    let responded = false;
    try {
      // Clean, sanitized CGI environment - NEVER leak platform secrets (...process.env is strictly blocked!)
      const safeCgiEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH || '',
        SystemRoot: process.env.SystemRoot || '',
        COMSPEC: process.env.COMSPEC || '',
        REQUEST_METHOD: req.method,
        QUERY_STRING: req.url.split('?')[1] || '',
        SCRIPT_FILENAME: filePath,
        REMOTE_ADDR: req.ip || '127.0.0.1',
        SERVER_SOFTWARE: 'DeployHub-Edge/2.0',
        GATEWAY_INTERFACE: 'CGI/1.1',
        SERVER_PROTOCOL: 'HTTP/1.1',
      };

      const phpArgs = [
        '-d', 'disable_functions=exec,system,shell_exec,passthru,proc_open,popen,pcntl_exec,curl_multi_exec,parse_ini_file,show_source,dl',
        '-d', 'allow_url_fopen=Off',
        '-d', 'allow_url_include=Off',
        '-d', 'expose_php=Off',
        '-d', 'memory_limit=64M',
        '-d', 'max_execution_time=10',
        '-d', `open_basedir=${siteDir}`,
        filePath
      ];

      const phpProcess = spawn('php', phpArgs, {
        cwd: siteDir,
        env: safeCgiEnv,
      });

      // Strict 10-second timeout to kill runaway processes
      const killTimer = setTimeout(() => {
        if (!responded) {
          responded = true;
          try { phpProcess.kill('SIGKILL'); } catch {}
          res.status(504).send('<h3>504 Gateway Timeout: PHP execution exceeded maximum allowed 10-second limit.</h3>');
        }
      }, 10000);

      let output = '';
      let errOutput = '';

      phpProcess.stdout.on('data', (d) => { output += d.toString(); });
      phpProcess.stderr.on('data', (d) => { errOutput += d.toString(); });

      phpProcess.on('error', () => {
        clearTimeout(killTimer);
        if (responded) return;
        responded = true;
        
        // Smart PHP Runtime Simulator when native PHP CLI is not in system PATH
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        
        let renderedHtml = rawContent
          .replace(/<\?php\s+echo\s+date\(['"]([^'"]+)['"]\);\s*\?>/gi, () => new Date().toISOString())
          .replace(/<\?php\s+echo\s+['"]([^'"]*)['"];?\s*\?>/gi, '$1')
          .replace(/<\?=\s*['"]([^'"]*)['"]\s*;?\s*\?>/gi, '$1')
          .replace(/<\?php[\s\S]*?\?>/gi, '');

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
                    <span class="badge">PHP Sandbox Engine</span>
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
        clearTimeout(killTimer);
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
    const fileExt = path.extname(filePath).toLowerCase();
    if (fileExt === '.html' || fileExt === '.htm') {
      const rawHtml = fs.readFileSync(filePath, 'utf-8');
      const finalHtml = injectAdIfNeeded(rawHtml, projectOwner, platformDomain);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(finalHtml);
      return;
    }
    res.sendFile(filePath);
    return;
  }

  // Check if static asset with an extension was requested
  const ext = path.extname(subPath).toLowerCase();
  const isStaticAsset = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.webp', '.json', '.map'].includes(ext);

  if (isStaticAsset) {
    // Smart fuzzy fallback for common naming conventions (e.g. style.css vs styles.css)
    const baseName = path.basename(subPath);
    const altNames = [
      baseName,
      baseName === 'styles.css' ? 'style.css' : (baseName === 'style.css' ? 'styles.css' : null),
    ].filter(Boolean) as string[];

    for (const name of altNames) {
      const candidates = [
        path.join(siteDir, name),
        path.join(siteDir, 'css', name),
        path.join(siteDir, 'assets', name),
        path.join(siteDir, 'static', name),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          res.sendFile(cand);
          return;
        }
      }
    }

    // Never return index.html for missing static assets to prevent browser stylesheet MIME errors
    res.status(404).type('text/plain').send(`404: Asset '${subPath}' not found`);
    return;
  }

  // SPA fallback for HTML client-side routing
  const indexHtml = path.join(siteDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const rawHtml = fs.readFileSync(indexHtml, 'utf-8');
    const finalHtml = injectAdIfNeeded(rawHtml, projectOwner, platformDomain);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);
    return;
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head><title>404 - Not Found | DeployHub</title><style>body{background:#0B1120;color:#F8FAFC;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.box{text-align:center;border:1px solid #1E293B;padding:40px;border-radius:12px;background:#111827;}h1{color:#F43F5E;margin:0 0 10px;}.abuse-link{margin-top:24px;font-size:12px;color:#94A3B8;}.abuse-link a{color:#60A5FA;text-decoration:none;}</style></head>
      <body>
        <div class="box">
          <h1>404: File Not Found</h1>
          <p>The requested path <code>${escapeHtml(subPath)}</code> was not found in project <code>${escapeHtml(project.name)}</code>.</p>
          <div class="abuse-link">Suspect phishing or abuse on this domain? <a href="/support/request?type=BUG_REPORT">Report Abuse &rarr;</a></div>
        </div>
      </body>
    </html>
  `);
};

function injectAdIfNeeded(htmlContent: string, projectOwner: any, platformDomain: string): string {
  // If owner is on DEVELOPER or PRO plan, return clean HTML with ZERO ads!
  if (projectOwner && (projectOwner.plan === 'DEVELOPER' || projectOwner.plan === 'PRO')) {
    return htmlContent;
  }

  // Check if admin has free tier ads enabled
  if (dbStore.settings?.freeTierAdsEnabled === false) {
    return htmlContent;
  }

  // Find active public ad if available, or fall back to system settings
  const publicAds = (dbStore.ads || []).filter(a => a.status === 'ACTIVE' && (a.placement === 'PUBLIC_WEBSITE' || a.placement === 'DASHBOARD'));
  const activeAd = publicAds.length > 0 ? publicAds[Math.floor(Math.random() * publicAds.length)] : null;

  if (activeAd) {
    activeAd.impressions = (activeAd.impressions || 0) + 1;
    dbStore.save();
  }

  const devPrice = dbStore.settings?.developerPriceINR ?? 30;
  const adTitle = escapeHtml(activeAd?.title || dbStore.settings?.adBannerTitle || 'Hosting Sponsored by DeployHub');
  const adDesc = escapeHtml(activeAd?.description || dbStore.settings?.adBannerText || `Fast free web hosting with SSL. Upgrade to Developer (₹${devPrice}/mo) for zero ads.`);
  const adTargetUrl = activeAd?.targetUrl || dbStore.settings?.adBannerLink || 'https://deployhub.com';
  const customScript = dbStore.settings?.customAdScript || '';

  const adBannerHtml = `
<!-- DeployHub Sponsored Ad Banner for Free Tier Hosting -->
<div id="deployhub-ad-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#0F172A;color:#F8FAFC;border-top:2px solid #2563EB;box-shadow:0 -4px 20px rgba(0,0,0,0.35);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;line-height:1.4;">
  <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
    <span style="background:#2563EB;color:#FFF;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">Ad</span>
    <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
      <strong style="color:#60A5FA;">${adTitle}</strong>:
      <span style="color:#CBD5E1;margin-left:4px;">${adDesc}</span>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
    <a href="${adTargetUrl}" target="_blank" rel="noopener noreferrer" style="background:#2563EB;color:#FFF;padding:5px 12px;border-radius:6px;font-weight:600;text-decoration:none;font-size:11px;transition:background 0.2s;white-space:nowrap;">Visit Sponsor →</a>
    <a href="https://${platformDomain}/billing" target="_blank" style="color:#94A3B8;text-decoration:none;font-size:10px;padding:4px 8px;border-radius:4px;border:1px solid #334155;white-space:nowrap;" title="Upgrade to Developer for ₹${devPrice}/mo to remove ads">Remove Ads (₹${devPrice}/mo)</a>
    <button onclick="document.getElementById('deployhub-ad-banner').style.display='none'" style="background:transparent;border:none;color:#94A3B8;font-size:16px;cursor:pointer;padding:0 4px;line-height:1;" title="Dismiss">✕</button>
  </div>
</div>
${customScript}
`;

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${adBannerHtml}\n</body>`);
  }
  return htmlContent + adBannerHtml;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
