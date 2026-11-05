import fs from 'fs';
import path from 'path';
import { config, AVAILABLE_PLATFORM_DOMAINS } from '../config';
import { IProject } from '../database/store';

export class DefaultSiteService {
  /**
   * Resolves the fully-qualified domain name (FQDN) for a project
   */
  public getProjectFqdn(project: IProject): string {
    if (project.customDomain && project.customDomain.trim()) {
      return project.customDomain.trim().toLowerCase();
    }
    const sub = (project.assignedSubdomain || project.slug).toLowerCase();
    const base = (project.platformDomain || config.platformDomain || 'deployeai.duckdns.org').toLowerCase();
    return `${sub}.${base}`;
  }

  /**
   * Scaffolds the default "Domain Occupied & Reserved" website template
   * if no user deployment or index file exists yet.
   */
  public scaffoldDefaultSite(project: IProject): void {
    try {
      const siteDir = path.join(config.storageDir, 'sites', project.slug);
      if (!fs.existsSync(siteDir)) {
        fs.mkdirSync(siteDir, { recursive: true });
      }

      const indexHtmlPath = path.join(siteDir, 'index.html');
      const indexPhpPath = path.join(siteDir, 'index.php');

      // If user has already uploaded their own index.html or index.php, preserve their site
      if (fs.existsSync(indexHtmlPath) || fs.existsSync(indexPhpPath)) {
        return;
      }

      const fqdn = this.getProjectFqdn(project);
      const httpsUrl = `https://${fqdn}`;
      const platformHost = config.platformDomain || 'deployeai.duckdns.org';
      const dashboardUrl = `https://${platformHost}/dashboard`;

      // 1. Generate index.html
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(project.name)} • Reserved & Hosted on DeployHub Cloud</title>
  <meta name="description" content="This domain (${fqdn}) is officially reserved and hosted on DeployHub Cloud with automatic 256-bit SSL encryption.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563EB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m12 3-1.9 5.8a2 2 0 0 1-1.28 1.28L3 12l5.8 1.9a2 2 0 0 1 1.28 1.28L12 21l1.9-5.8a2 2 0 0 1 1.28-1.28L21 12l-5.8-1.9a2 2 0 0 1-1.28-1.28L12 3z'/></svg>">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="glow-bg"></div>

  <header class="site-header">
    <div class="header-inner">
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
          </svg>
        </div>
        <span class="brand-name">Deploy<span>Hub</span> <small class="brand-badge">Cloud Edge</small></span>
      </div>

      <div class="ssl-status-pill">
        <span class="pulse-dot"></span>
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>SSL / HTTPS Secured</span>
      </div>
    </div>
  </header>

  <main class="main-container">
    <div class="hero-card">
      <div class="domain-pill">
        <span class="domain-protocol">https://</span><span class="domain-text">${escapeXml(fqdn)}</span>
        <button id="copy-btn" class="copy-pill-btn" title="Copy domain URL" onclick="copyDomain()">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          <span id="copy-text">Copy</span>
        </button>
      </div>

      <h1 class="hero-title">This Domain is Reserved & Live</h1>
      <p class="hero-subtitle">
        The domain <strong class="highlight-text">${escapeXml(fqdn)}</strong> has been successfully occupied and provisioned with automated on-demand <strong>256-Bit SSL/TLS certificate</strong> on the DeployHub Cloud Edge network.
      </p>

      <div class="specs-grid">
        <div class="spec-card">
          <div class="spec-icon ssl-icon">🔒</div>
          <div class="spec-info">
            <span class="spec-label">SSL Certificate</span>
            <span class="spec-value text-green">Active (HTTPS)</span>
          </div>
        </div>

        <div class="spec-card">
          <div class="spec-icon status-icon">⚡</div>
          <div class="spec-info">
            <span class="spec-label">Domain Status</span>
            <span class="spec-value text-blue">Occupied & Routed</span>
          </div>
        </div>

        <div class="spec-card">
          <div class="spec-icon stack-icon">🚀</div>
          <div class="spec-info">
            <span class="spec-label">Supported Stack</span>
            <span class="spec-value text-indigo">HTML, CSS, JS & PHP</span>
          </div>
        </div>

        <div class="spec-card">
          <div class="spec-icon edge-icon">🌐</div>
          <div class="spec-info">
            <span class="spec-label">Edge CDN Proxy</span>
            <span class="spec-value text-cyan">Zero-Downtime</span>
          </div>
        </div>
      </div>

      <div class="owner-box">
        <div class="owner-box-header">
          <span class="owner-icon">🛠️</span>
          <div>
            <h3 class="owner-title">Are you the owner of this domain?</h3>
            <p class="owner-desc">Ready to replace this page with your custom website? You can deploy instantly in 3 simple steps:</p>
          </div>
        </div>

        <div class="steps-row">
          <div class="step-item">
            <span class="step-num">1</span>
            <span class="step-text">Sign in to your DeployHub dashboard</span>
          </div>
          <div class="step-item">
            <span class="step-num">2</span>
            <span class="step-text">Open Project <strong>${escapeXml(project.name)}</strong></span>
          </div>
          <div class="step-item">
            <span class="step-num">3</span>
            <span class="step-text">Upload your ZIP, HTML or PHP code</span>
          </div>
        </div>

        <div class="action-buttons">
          <a href="${dashboardUrl}" class="btn-primary" target="_blank" rel="noopener">
            <span>Open DeployHub Dashboard</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
          <a href="${httpsUrl}/index.php" class="btn-secondary">
            <span>Test PHP Engine Output</span>
          </a>
        </div>
      </div>

      <div class="live-clock-bar">
        <span class="clock-label">Edge Node Status:</span>
        <span class="clock-value" id="live-clock">Loading live time...</span>
        <span class="clock-sep">•</span>
        <span class="clock-protocol">Protocol: <strong id="protocol-text">HTTPS</strong></span>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <p>© 2026 <strong>DeployHub Cloud Platform</strong>. Automated Web Hosting & On-Demand TLS Infrastructure.</p>
      <p class="footer-sub">Fast, secure hosting for HTML, CSS, JavaScript, JSON & PHP web applications.</p>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;

      // 2. Generate style.css
      const cssContent = `/* ==============================================================================
   DeployHub Default Occupied Domain Landing Page
   Clean, high-contrast, modern responsive SaaS design
   ============================================================================== */

:root {
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-light: #EFF6FF;
  --slate-900: #0F172A;
  --slate-800: #1E293B;
  --slate-600: #475569;
  --slate-500: #64748B;
  --slate-400: #94A3B8;
  --slate-200: #E2E8F0;
  --slate-100: #F1F5F9;
  --slate-50: #F8FAFC;
  --emerald-600: #059669;
  --emerald-50: #ECFDF5;
  --emerald-200: #A7F3D0;
  --radius-lg: 16px;
  --radius-md: 12px;
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--slate-50);
  color: var(--slate-900);
  line-height: 1.5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}

.glow-bg {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 400px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(248, 250, 252, 0) 70%);
  pointer-events: none;
  z-index: 0;
}

/* Header */
.site-header {
  position: relative;
  z-index: 10;
  width: 100%;
  border-bottom: 1px solid var(--slate-200);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
}

.header-inner {
  max-width: 920px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand-logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #2563EB, #4F46E5);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.brand-name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--slate-900);
}

.brand-name span {
  color: var(--primary);
}

.brand-badge {
  font-size: 10px;
  font-weight: 700;
  background: var(--slate-100);
  color: var(--slate-600);
  padding: 2px 7px;
  border-radius: 20px;
  margin-left: 6px;
  vertical-align: middle;
}

.ssl-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--emerald-600);
  background: var(--emerald-50);
  border: 1px solid var(--emerald-200);
  padding: 5px 12px;
  border-radius: 20px;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  background: var(--emerald-600);
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.7);
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.6); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(5, 150, 105, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
}

/* Main Container */
.main-container {
  position: relative;
  z-index: 1;
  flex: 1;
  max-width: 920px;
  width: 100%;
  margin: 32px auto;
  padding: 0 20px;
}

.hero-card {
  background: #FFFFFF;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-lg);
  padding: 36px 32px;
  box-shadow: var(--shadow-md);
  text-align: center;
}

/* Domain Pill */
.domain-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--slate-100);
  border: 1px solid var(--slate-200);
  padding: 6px 14px;
  border-radius: 30px;
  margin-bottom: 20px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}

.domain-protocol {
  color: var(--emerald-600);
  font-weight: 700;
}

.domain-text {
  font-weight: 700;
  color: var(--slate-900);
}

.copy-pill-btn {
  background: white;
  border: 1px solid var(--slate-200);
  border-radius: 14px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  color: var(--slate-600);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.copy-pill-btn:hover {
  background: var(--slate-50);
  color: var(--primary);
  border-color: var(--primary);
}

.hero-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.8px;
  color: var(--slate-900);
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 15px;
  color: var(--slate-600);
  max-width: 660px;
  margin: 0 auto 30px;
  line-height: 1.6;
}

.highlight-text {
  color: var(--slate-900);
}

/* Specs Grid */
.specs-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 30px;
  text-align: left;
}

@media (max-width: 720px) {
  .specs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.spec-card {
  background: var(--slate-50);
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.spec-card:hover {
  transform: translateY(-2px);
  border-color: #CBD5E1;
}

.spec-icon {
  font-size: 22px;
}

.spec-info {
  display: flex;
  flex-direction: column;
}

.spec-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--slate-500);
}

.spec-value {
  font-size: 12px;
  font-weight: 700;
  margin-top: 1px;
}

.text-green { color: #059669; }
.text-blue { color: #2563EB; }
.text-indigo { color: #4F46E5; }
.text-cyan { color: #0891B2; }

/* Owner Box */
.owner-box {
  background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  padding: 24px;
  text-align: left;
  margin-bottom: 24px;
}

.owner-box-header {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.owner-icon {
  font-size: 26px;
  line-height: 1;
}

.owner-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--slate-900);
  margin-bottom: 3px;
}

.owner-desc {
  font-size: 13px;
  color: var(--slate-600);
}

.steps-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 640px) {
  .steps-row {
    grid-template-columns: 1fr;
  }
}

.step-item {
  background: white;
  border: 1px solid var(--slate-200);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-num {
  width: 22px;
  height: 22px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}

.step-text {
  font-size: 12px;
  color: var(--slate-700);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: white;
  color: var(--slate-700);
  border: 1px solid var(--slate-200);
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--slate-50);
  color: var(--slate-900);
  border-color: #CBD5E1;
}

/* Live Clock Bar */
.live-clock-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: var(--slate-500);
  padding-top: 14px;
  border-top: 1px dashed var(--slate-200);
}

.clock-label {
  font-weight: 600;
}

.clock-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--slate-700);
}

.clock-protocol strong {
  color: var(--emerald-600);
}

/* Footer */
.site-footer {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 24px 20px;
  text-align: center;
  border-top: 1px solid var(--slate-200);
  background: white;
  font-size: 12px;
  color: var(--slate-500);
}

.footer-inner {
  max-width: 920px;
  margin: 0 auto;
}

.footer-sub {
  font-size: 11px;
  color: var(--slate-400);
  margin-top: 4px;
}
`;

      // 3. Generate script.js
      const jsContent = `/**
 * DeployHub Reserved Domain Dynamic Client Script
 */

function copyDomain() {
  const domainText = window.location.host;
  const fullUrl = window.location.origin;

  navigator.clipboard.writeText(fullUrl).then(function() {
    const copyText = document.getElementById('copy-text');
    if (copyText) {
      copyText.innerText = 'Copied!';
      setTimeout(function() {
        copyText.innerText = 'Copy';
      }, 2000);
    }
  }).catch(function() {
    prompt('Copy your domain URL:', fullUrl);
  });
}

function updateLiveClock() {
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.innerText = now.toUTCString();
  }
}

function checkProtocolSecurity() {
  const protoEl = document.getElementById('protocol-text');
  if (protoEl) {
    const isHttps = window.location.protocol === 'https:';
    protoEl.innerText = isHttps ? 'HTTPS (SSL Active)' : 'HTTP (Redirecting to HTTPS)';
    if (!isHttps && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      window.location.protocol = 'https:';
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
  checkProtocolSecurity();
});
`;

      // 4. Generate index.php (Dynamic PHP Edge Execution)
      const phpContent = `<?php
/**
 * DeployHub Cloud - Default Occupied Domain Edge Script
 * Provides dynamic server-side runtime telemetry alongside HTML/CSS
 */

$domain = isset($_SERVER['HTTP_HOST']) ? htmlspecialchars($_SERVER['HTTP_HOST']) : '${escapeXml(fqdn)}';
$clientIp = isset($_SERVER['REMOTE_ADDR']) ? htmlspecialchars($_SERVER['REMOTE_ADDR']) : 'Unknown';
$phpVer = phpversion();
$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$protocol = $isHttps ? 'HTTPS' : 'HTTP';
$serverTime = gmdate('Y-m-d H:i:s') . ' UTC';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $domain ?> • PHP Engine Active | DeployHub Cloud</title>
  <link rel="stylesheet" href="style.css">
  <style>
    .php-runtime-banner {
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .php-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #4338CA;
      font-size: 13px;
    }
    .php-meta-tags {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #475569;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="glow-bg"></div>

  <header class="site-header">
    <div class="header-inner">
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
          </svg>
        </div>
        <span class="brand-name">Deploy<span>Hub</span> <small class="brand-badge">PHP 8.x Active</small></span>
      </div>

      <div class="ssl-status-pill">
        <span class="pulse-dot"></span>
        <span><?= $protocol ?> SSL Active</span>
      </div>
    </div>
  </header>

  <main class="main-container">
    <div class="hero-card">
      <div class="php-runtime-banner">
        <div class="php-badge">
          <span>🐘 PHP Engine Ready</span>
          <span style="font-weight: normal; color: #6366F1;">(v<?= $phpVer ?>)</span>
        </div>
        <div class="php-meta-tags">
          <span>Client IP: <?= $clientIp ?></span>
          <span>•</span>
          <span>Time: <?= $serverTime ?></span>
        </div>
      </div>

      <div class="domain-pill">
        <span class="domain-protocol">https://</span><span class="domain-text"><?= $domain ?></span>
      </div>

      <h1 class="hero-title">Domain Occupied & PHP Server Active</h1>
      <p class="hero-subtitle">
        This domain is hosted on <strong>DeployHub Cloud</strong> with instant zero-downtime execution for HTML, CSS, JavaScript, JSON, and sandboxed PHP 8.x.
      </p>

      <div class="action-buttons" style="justify-content: center; margin-top: 20px;">
        <a href="index.html" class="btn-primary">View HTML Landing Page</a>
        <a href="${dashboardUrl}" class="btn-secondary" target="_blank">Deploy Code in Dashboard →</a>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <p>© 2026 DeployHub Cloud • PHP Serverless Engine</p>
    </div>
  </footer>
</body>
</html>`;

      // 5. Generate robots.txt
      const robotsContent = `User-agent: *
Allow: /
`;

      fs.writeFileSync(indexHtmlPath, htmlContent, 'utf-8');
      fs.writeFileSync(path.join(siteDir, 'style.css'), cssContent, 'utf-8');
      fs.writeFileSync(path.join(siteDir, 'script.js'), jsContent, 'utf-8');
      fs.writeFileSync(indexPhpPath, phpContent, 'utf-8');
      fs.writeFileSync(path.join(siteDir, 'robots.txt'), robotsContent, 'utf-8');

      console.log(`[DefaultSiteService] Scaffolded default website for occupied domain '${fqdn}' in '${siteDir}'`);
    } catch (err: any) {
      console.warn(`[DefaultSiteService] Could not scaffold default site for '${project.slug}':`, err.message);
    }
  }
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const defaultSiteService = new DefaultSiteService();

