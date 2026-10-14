import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { config, AVAILABLE_PLATFORM_DOMAINS } from '../config';
import { dbStore } from '../database/store';
import { redisCacheService } from '../services/redisCacheService';

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

  if (!slug) {
    const recognizedDomains = Array.from(new Set([
      platformDomain,
      ...AVAILABLE_PLATFORM_DOMAINS.map(d => d.domain.toLowerCase()),
    ])).filter(Boolean);

    for (const domain of recognizedDomains) {
      if (host.endsWith('.' + domain)) {
        slug = host.slice(0, -(domain.length + 1));
        break;
      }
    }

    if (!slug) {
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
      <head><title>404 - Not Found</title><style>body{background:#0B1120;color:#F8FAFC;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.box{text-align:center;border:1px solid #1E293B;padding:40px;border-radius:12px;background:#111827;}h1{color:#F43F5E;margin:0 0 10px;}</style></head>
      <body><div class="box"><h1>404: File Not Found</h1><p>The requested path <code>${escapeHtml(subPath)}</code> was not found in project <code>${escapeHtml(project.name)}</code>.</p></div></body>
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
