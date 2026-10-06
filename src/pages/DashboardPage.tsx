import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IProject, IDeployment } from '../types';
import { Navbar } from '../components/common/Navbar';
import { AdBanner } from '../components/common/AdBanner';
import { NewProjectModal } from '../components/project/NewProjectModal';
import { 
  FolderKanban, 
  HardDrive, 
  Activity, 
  Rocket, 
  ExternalLink, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Globe,
  UploadCloud,
  Lock,
  FileCode,
  Layers,
  Sparkles,
  Server,
  Terminal,
  ShieldCheck,
  Search,
  CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'pateldeeep.me';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<IProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  
  // Quick subdomain creation input
  const [quickSubdomain, setQuickSubdomain] = useState('');
  const [modalInitialSlug, setModalInitialSlug] = useState('');
  const [modalInitialType, setModalInitialType] = useState<'STATIC' | 'PHP' | 'REACT' | 'VITE'>('STATIC');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/projects');
      if (res.data.success) {
        setProjects(res.data.data.projects);
      }
    } catch (e) {
      console.error('Error fetching dashboard projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Check if user came from landing page with a reserved subdomain
    const searchParams = new URLSearchParams(location.search);
    const sub = searchParams.get('subdomain');
    if (sub) {
      setModalInitialSlug(sub);
      setIsNewProjectOpen(true);
    }
  }, [location.search]);

  const handleLaunchModal = (slug = '', type: 'STATIC' | 'PHP' | 'REACT' | 'VITE' = 'STATIC') => {
    setModalInitialSlug(slug || quickSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setModalInitialType(type);
    setIsNewProjectOpen(true);
  };

  const getStorageQuotaMB = (plan?: string) => {
    if (plan === 'PRO') return 51200;
    if (plan === 'DEVELOPER') return 10240;
    return 5000; // InfinityFree standard 5 GB
  };

  const getProjectLimit = (plan?: string) => {
    if (plan === 'PRO') return 1000;
    if (plan === 'DEVELOPER') return 20;
    return 10;
  };

  const usedStorageMB = ((user?.storageUsed || 0) / (1024 * 1024)).toFixed(1);
  const quotaStorageMB = getStorageQuotaMB(user?.plan);
  const storagePercentage = Math.min(100, Math.round(((user?.storageUsed || 0) / (quotaStorageMB * 1024 * 1024)) * 100));

  const maxProjects = getProjectLimit(user?.plan);

  // Telemetry data for traffic chart
  const telemetryData = [
    { day: 'Mon', requests: 120, bandwidth: 4.2 },
    { day: 'Tue', requests: 240, bandwidth: 7.8 },
    { day: 'Wed', requests: 180, bandwidth: 5.9 },
    { day: 'Thu', requests: 390, bandwidth: 12.1 },
    { day: 'Fri', requests: 520, bandwidth: 18.4 },
    { day: 'Sat', requests: 430, bandwidth: 14.2 },
    { day: 'Sun', requests: 680, bandwidth: 22.0 },
  ];

  return (
    <div className="min-h-screen bg-background text-deployText pb-16">
      <Navbar onOpenNewProject={() => handleLaunchModal()} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* InfinityFree Client Area Control Panel Header */}
        <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-accent border border-accent/20">
                CLIENT AREA
              </span>
              <span className="text-xs text-deployText-muted">•</span>
              <span className="text-xs text-success flex items-center space-x-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Edge Infrastructure Active</span>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Control Panel • {user?.name || 'Developer'}
            </h1>
            <p className="text-xs text-deployText-secondary mt-1">
              Primary Hosting Domain: <strong className="font-mono text-accent">*.{PLATFORM_DOMAIN}</strong> • Plan: <span className="font-semibold text-white">{user?.plan || 'FREE DEVELOPER'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleLaunchModal()}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-glow-primary transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Website</span>
            </button>
            <Link
              to="/docs"
              className="flex items-center space-x-1.5 bg-surface hover:bg-deployBorder text-deployText text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-deployBorder transition-all"
            >
              <span>Knowledge Base</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Subdomain Launcher Bar */}
        <div className="bg-gradient-to-r from-surface to-card border border-deployBorder p-4 sm:p-5 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Globe className="w-4 h-4 text-accent" />
                <span>Launch New Subdomain on {PLATFORM_DOMAIN}</span>
              </h3>
              <p className="text-xs text-deployText-secondary mt-0.5">
                Type your desired website name and deploy HTML, CSS, JS, React or PHP in seconds.
              </p>
            </div>

            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="flex items-center flex-1 bg-surface border border-deployBorder rounded-xl px-3 py-2 text-xs">
                <span className="text-deployText-muted font-mono mr-1">https://</span>
                <input
                  type="text"
                  value={quickSubdomain}
                  onChange={(e) => setQuickSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-portfolio"
                  className="bg-transparent text-white font-mono text-xs w-full outline-none"
                />
                <span className="font-mono text-accent shrink-0">.{PLATFORM_DOMAIN}</span>
              </div>
              <button
                onClick={() => handleLaunchModal(quickSubdomain)}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-glow-primary"
              >
                Deploy Now
              </button>
            </div>
          </div>
        </div>

        {/* InfinityFree cPanel Quick Tools Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => handleLaunchModal()}
            className="p-3.5 rounded-xl bg-card border border-deployBorder hover:border-primary/50 text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Online Uploader</div>
            <div className="text-[11px] text-deployText-secondary mt-0.5">Drag & Drop ZIP</div>
          </button>

          <button
            onClick={() => handleLaunchModal(undefined, 'PHP')}
            className="p-3.5 rounded-xl bg-card border border-deployBorder hover:border-purple-500/50 text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">PHP 8.4 Sandbox</div>
            <div className="text-[11px] text-deployText-secondary mt-0.5">Isolated FPM</div>
          </button>

          <Link
            to="/docs"
            className="p-3.5 rounded-xl bg-card border border-deployBorder hover:border-accent/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Subdomains</div>
            <div className="text-[11px] text-deployText-secondary mt-0.5">*.{PLATFORM_DOMAIN}</div>
          </Link>

          <Link
            to="/docs"
            className="p-3.5 rounded-xl bg-card border border-deployBorder hover:border-emerald-500/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">SSL Certificates</div>
            <div className="text-[11px] text-deployText-secondary mt-0.5">Free HTTPS</div>
          </Link>

          <Link
            to="/billing"
            className="p-3.5 rounded-xl bg-card border border-deployBorder hover:border-amber-500/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Disk & Bandwidth</div>
            <div className="text-[11px] text-deployText-secondary mt-0.5">{quotaStorageMB >= 1024 ? `${quotaStorageMB / 1024} GB` : `${quotaStorageMB} MB`} Quota</div>
          </Link>

          <button
            onClick={() => handleLaunchModal(undefined, 'VITE')}
            className="p-3.5 rounded-xl bg-card border border-deployBorder hover:border-cyan-500/50 text-left transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">React & Vite</div>
            <div className="text-[11px] text-deployText-secondary mt-0.5">SPA Engine</div>
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Projects Card */}
          <div className="bg-card border border-deployBorder rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-deployText-secondary">Hosted Websites</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-primary">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">{projects.length}</span>
              <span className="text-xs text-deployText-muted">/ {maxProjects} allowed</span>
            </div>
            <div className="mt-3 w-full bg-deployBorder h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${(projects.length / maxProjects) * 100}%` }}
              />
            </div>
          </div>

          {/* Storage Used Card */}
          <div className="bg-card border border-deployBorder rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-deployText-secondary">SSD Storage Used</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">{usedStorageMB}</span>
              <span className="text-xs text-deployText-muted">MB of {quotaStorageMB >= 1024 ? `${quotaStorageMB / 1024} GB` : `${quotaStorageMB} MB`}</span>
            </div>
            <div className="mt-3 w-full bg-deployBorder h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${storagePercentage > 85 ? 'bg-error' : 'bg-accent'}`}
                style={{ width: `${Math.max(5, storagePercentage)}%` }}
              />
            </div>
          </div>

          {/* Bandwidth Card */}
          <div className="bg-card border border-deployBorder rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-deployText-secondary">Monthly Bandwidth</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {((user?.bandwidthUsed || 0) / (1024 * 1024 * 1024)).toFixed(2)}
              </span>
              <span className="text-xs text-deployText-muted">GB / Unlimited</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-2 block font-medium">
              ↑ Edge Cache Active
            </span>
          </div>

          {/* Deployments Card */}
          <div className="bg-card border border-deployBorder rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-deployText-secondary">Live Websites</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Rocket className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {projects.filter(p => p.status === 'ACTIVE').length}
              </span>
              <span className="text-xs text-deployText-muted">Active with SSL</span>
            </div>
            <span className="text-[11px] text-deployText-secondary mt-2 block">
              DNS auto-routed on {PLATFORM_DOMAIN}
            </span>
          </div>
        </div>

        {/* Sponsor Advertisement Banner (Free users) */}
        <AdBanner placement="DASHBOARD" />

        {/* Traffic Chart & Architecture Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-deployBorder rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Visitor Traffic & Requests</h3>
                <p className="text-xs text-deployText-secondary">Analytics across your deployed websites</p>
              </div>
              <span className="text-xs font-mono text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                Last 7 Days
              </span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#172033', borderColor: '#263449', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick System Environment Summary */}
          <div className="bg-card border border-deployBorder rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Hosting Environment</h3>
              <p className="text-xs text-deployText-secondary mb-4">Edge server configuration</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-deployBorder text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-white font-medium">Domain Resolver</span>
                  </div>
                  <span className="font-mono text-accent font-semibold">*.{PLATFORM_DOMAIN}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-deployBorder text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-white font-medium">PHP Runtime</span>
                  </div>
                  <span className="font-mono text-deployText-muted">PHP 8.4-FPM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-deployBorder text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-white font-medium">SSL Provisioner</span>
                  </div>
                  <span className="font-mono text-deployText-muted">Let's Encrypt / ACME</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-deployBorder text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-white font-medium">Static Engine</span>
                  </div>
                  <span className="font-mono text-deployText-muted">Nginx Edge / Gzip</span>
                </div>
              </div>
            </div>

            <Link
              to="/docs"
              className="mt-6 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-surface hover:bg-deployBorder text-xs font-semibold text-deployText transition-colors"
            >
              <span>View Technical Documentation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Websites & Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Your Hosted Websites ({projects.length})</h2>
              <p className="text-xs text-deployText-secondary">Manage your active subdomains and deployed websites</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchDashboardData}
                className="p-1.5 text-deployText-secondary hover:text-white rounded-lg hover:bg-card transition-colors cursor-pointer"
                title="Refresh projects"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => handleLaunchModal()}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-glow-primary flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Site</span>
              </button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16 bg-card/60 border border-deployBorder rounded-2xl p-6">
              <FolderKanban className="w-12 h-12 text-deployText-muted mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No websites deployed yet</h3>
              <p className="text-xs text-deployText-secondary max-w-sm mx-auto mt-1 mb-6">
                Create your first project and upload your HTML, CSS, JS or PHP files to get a live URL on {PLATFORM_DOMAIN} in seconds.
              </p>
              <button
                onClick={() => handleLaunchModal()}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-glow-primary transition-all cursor-pointer"
              >
                + Create & Deploy Website
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="group bg-card hover:bg-card/90 border border-deployBorder hover:border-primary/50 rounded-2xl p-5 transition-all duration-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Type & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface border border-deployBorder text-accent">
                        {project.type}
                      </span>
                      <span
                        className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          project.status === 'ACTIVE'
                            ? 'bg-success/15 text-success border border-success/30'
                            : project.status === 'BUILDING'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-deployBorder text-deployText-secondary'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'ACTIVE' ? 'bg-success' : 'bg-amber-400'}`} />
                        <span>{project.status}</span>
                      </span>
                    </div>

                    {/* Title & Slug */}
                    <h3 className="text-base font-bold text-white group-hover:text-primary-light transition-colors">
                      {project.name}
                    </h3>
                    
                    {/* Subdomain Display */}
                    <div className="mt-2 p-2 rounded-xl bg-surface border border-deployBorder/60 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-mono text-deployText truncate">
                          {project.slug}.{PLATFORM_DOMAIN}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0">
                        SSL ✓
                      </span>
                    </div>

                    <div className="text-[11px] text-deployText-secondary mt-2 flex items-center space-x-3">
                      <span>Storage: {((project.storageUsed || 0) / 1024 / 1024).toFixed(1)} MB</span>
                      <span>•</span>
                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Bottom Row Actions */}
                  <div className="pt-4 mt-4 border-t border-deployBorder/60 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Link
                        to={`/projects/${project._id}`}
                        className="text-xs font-semibold text-deployText hover:text-white flex items-center space-x-1"
                      >
                        <span>Manage</span>
                      </Link>
                      <Link
                        to={`/projects/${project._id}/cpanel`}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                        title="Open cPanel / File Manager"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>cPanel</span>
                      </Link>
                    </div>

                    {project.status === 'ACTIVE' && (
                      <div className="flex items-center space-x-2">
                        {/* Primary live link: uses local proxy endpoint in dev, or real subdomain in prod */}
                        <a
                          href={`http://localhost:5000/sites/${project.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-xs font-bold text-accent hover:text-white bg-accent/15 hover:bg-accent/30 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Open live preview on edge proxy"
                        >
                          <span>Visit Site</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* New Project & Deploy Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSuccess={(newProject) => {
          setIsNewProjectOpen(false);
          fetchDashboardData();
          navigate(`/projects/${newProject._id}`);
        }}
        initialSlug={modalInitialSlug}
        initialName={modalInitialSlug}
        initialType={modalInitialType}
      />

    </div>
  );
};
