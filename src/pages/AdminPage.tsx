import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { 
  ShieldAlert, 
  Users, 
  Rocket, 
  HardDrive, 
  IndianRupee, 
  Activity, 
  Tag, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  Lock,
  Globe,
  Server,
  Layers,
  Cpu,
  Database,
  Key,
  X,
  ExternalLink,
  Search,
  Check,
  Zap,
  Terminal,
  ChevronRight,
  ShieldCheck,
  Pause,
  Play
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';

export const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'monitoring' | 'projects' | 'users' | 'deployments' | 'security' | 'ads'>('monitoring');

  // Telemetry & Data States
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);

  // UI / Action states
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filters
  const [projectSearch, setProjectSearch] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<'ALL' | 'STATIC' | 'PHP'>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [deploymentStatusFilter, setDeploymentStatusFilter] = useState<string>('ALL');

  // Modals
  const [resetPasswordModal, setResetPasswordModal] = useState<{ userId: string; email: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [viewLogsDeployment, setViewLogsDeployment] = useState<any | null>(null);

  // Ad Form
  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adImage, setAdImage] = useState('');
  const [adTarget, setAdTarget] = useState('');
  const [adPlacement, setAdPlacement] = useState<'DASHBOARD' | 'PROJECT_PAGE' | 'DOCUMENTATION'>('DASHBOARD');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [monRes, projRes, usersRes, depsRes, secRes, adsRes] = await Promise.all([
        api.get('/admin/monitoring'),
        api.get('/admin/projects'),
        api.get('/admin/users'),
        api.get('/admin/deployments'),
        api.get('/admin/security-logs'),
        api.get('/admin/ads'),
      ]);

      if (monRes.data.success) setMonitoringData(monRes.data.data);
      if (projRes.data.success) setAllProjects(projRes.data.data.projects);
      if (usersRes.data.success) setUsers(usersRes.data.data.users);
      if (depsRes.data.success) setDeployments(depsRes.data.data.deployments);
      if (secRes.data.success) setSecurityLogs(secRes.data.data.logs);
      if (adsRes.data.success) setAds(adsRes.data.data.ads);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin, fetchAllData]);

  // Real-time polling
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    const interval = setInterval(() => {
      // Background poll monitoring telemetry
      api.get('/admin/monitoring')
        .then(res => {
          if (res.data.success) setMonitoringData(res.data.data);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isAdmin, autoRefresh]);

  // Action: Prune temporary disk space
  const handlePruneStorage = async () => {
    if (!window.confirm('Clean old unpacked artifacts and temporary upload caches to free up server disk space?')) return;
    try {
      const res = await api.post('/admin/prune-storage');
      if (res.data.success) {
        showToast(res.data.message);
        fetchAllData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Storage cleanup failed', 'error');
    }
  };

  // Action: Toggle project status (ACTIVE <-> INACTIVE)
  const handleToggleProjectStatus = async (projectId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/admin/projects/${projectId}/status`, { status: nextStatus });
      if (res.data.success) {
        showToast(res.data.message);
        fetchAllData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update project status', 'error');
    }
  };

  // Action: Delete Project
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Permanently delete project '${projectName}' and all its files? This action cannot be undone.`)) return;
    try {
      const res = await api.delete(`/admin/projects/${projectId}`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchAllData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete project', 'error');
    }
  };

  // Action: Update User Plan or Role
  const handleUpdateUser = async (userId: string, plan?: string, role?: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}`, { plan, role });
      if (res.data.success) {
        showToast(`User updated successfully`);
        fetchAllData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update user', 'error');
    }
  };

  // Action: Reset User Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModal || !newPasswordInput.trim()) return;
    try {
      const res = await api.post(`/admin/users/${resetPasswordModal.userId}/reset-password`, {
        newPassword: newPasswordInput.trim()
      });
      if (res.data.success) {
        showToast(res.data.message);
        setResetPasswordModal(null);
        setNewPasswordInput('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to reset password', 'error');
    }
  };

  // Action: Delete User
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Permanently delete user '${email}' and ALL their deployed websites?`)) return;
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchAllData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  // Action: Clear Security Logs
  const handleClearSecurityLogs = async () => {
    if (!window.confirm('Clear all security audit logs?')) return;
    try {
      const res = await api.delete('/admin/security-logs');
      if (res.data.success) {
        showToast(res.data.message);
        fetchAllData();
      }
    } catch (err: any) {
      showToast('Failed to clear logs', 'error');
    }
  };

  // Action: Create Ad
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/ads', {
        title: adTitle,
        description: adDesc,
        imageUrl: adImage,
        targetUrl: adTarget,
        placement: adPlacement,
      });

      if (res.data.success) {
        showToast('Advertisement created successfully');
        setAdTitle('');
        setAdDesc('');
        setAdImage('');
        setAdTarget('');
        setShowNewAdModal(false);
        fetchAllData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create ad', 'error');
    }
  };

  // Action: Toggle Ad Status
  const handleToggleAd = async (adId: string) => {
    try {
      await api.patch(`/admin/ads/${adId}/toggle`);
      fetchAllData();
    } catch (e) {
      showToast('Failed to toggle ad status', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-deployText flex items-center justify-center p-4">
        <div className="text-center p-8 bg-card border border-deployBorder rounded-2xl max-w-md shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-error mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Administrator Access Required</h2>
          <p className="text-xs text-deployText-secondary mt-1 mb-6">
            You must be logged in with administrative credentials to access the Mission Control panel.
          </p>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Filtered projects
  const filteredProjects = allProjects.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.owner?.email.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesType = projectTypeFilter === 'ALL' || p.type === projectTypeFilter;
    return matchesSearch && matchesType;
  });

  // Filtered users
  const filteredUsers = users.filter((u) => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filtered deployments
  const filteredDeployments = deployments.filter((d) => 
    deploymentStatusFilter === 'ALL' || d.status === deploymentStatusFilter
  );

  const sys = monitoringData?.system;
  const summary = monitoringData?.summary;

  return (
    <div className="min-h-screen bg-[#070b14] text-deployText pb-20 font-sans">
      <Navbar />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-2xl border text-sm animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Mission Control Header */}
      <div className="bg-[#0b1120] border-b border-[#1e293b] px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400">
                Mission Control
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>DeployHub Admin & Telemetry</span>
              </h1>
              {autoRefresh && (
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE FEED</span>
                </span>
              )}
            </div>
            <p className="text-xs text-deployText-secondary mt-1">
              Host: <strong className="text-deployText font-mono">{sys?.hostname || 'localhost'}</strong> ({sys?.platform} • {sys?.arch}) | Node: <strong className="text-deployText font-mono">{sys?.nodeVersion}</strong> | Uptime: <strong className="text-deployText font-mono">{sys?.uptimeFormatted}</strong>
            </p>
          </div>

          {/* Quick Operations Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                autoRefresh
                  ? 'bg-surface border-deployBorder text-emerald-400'
                  : 'bg-surface border-deployBorder text-deployText-secondary'
              }`}
              title="Toggle 4s live auto-refresh"
            >
              {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoRefresh ? 'Pause Live' : 'Resume Live'}</span>
            </button>

            <button
              onClick={handlePruneStorage}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface hover:bg-deployBorder border border-deployBorder text-deployText hover:text-white transition-colors cursor-pointer"
              title="Clean unused temporary files and artifacts"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Prune Disk Cache</span>
            </button>

            <button
              onClick={() => fetchAllData()}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-glow-primary transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Now</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-[#1e293b] overflow-x-auto pb-1">
          {[
            { id: 'monitoring', label: 'Live Server Telemetry', icon: Activity },
            { id: 'projects', label: `Websites (${allProjects.length})`, icon: Globe },
            { id: 'users', label: `User Accounts (${users.length})`, icon: Users },
            { id: 'deployments', label: `Deployments (${deployments.length})`, icon: Rocket },
            { id: 'security', label: `Security Logs (${securityLogs.length})`, icon: ShieldCheck },
            { id: 'ads', label: `Ad Network (${ads.length})`, icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-primary text-white bg-[#0e1626]'
                    : 'border-transparent text-deployText-secondary hover:text-white hover:bg-card/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-deployText-secondary'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: LIVE SERVER MONITORING & TELEMETRY */}
        {/* ========================================================= */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            
            {/* Real-time Hardware Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* CPU Metric */}
              <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-deployText-secondary">CPU Processor</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-primary">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{sys?.cpu.cores || 0} Cores</div>
                  <div className="text-[11px] text-deployText-secondary truncate mt-0.5">{sys?.cpu.model}</div>
                </div>
                <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-deployText-secondary">Load Avg (1m, 5m):</span>
                  <span className="text-accent font-bold">{sys?.cpu.loadAvg1m}, {sys?.cpu.loadAvg5m}</span>
                </div>
              </div>

              {/* Memory RAM Metric */}
              <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-deployText-secondary">RAM Utilization</span>
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{sys?.memory.usagePercent}%</div>
                  <div className="text-[11px] text-deployText-secondary mt-0.5">
                    {sys?.memory.usedGB} GB used / {sys?.memory.totalGB} GB total
                  </div>
                </div>
                <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${sys?.memory.usagePercent || 0}%` }}
                  />
                </div>
                <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-deployText-secondary">Node Heap:</span>
                  <span className="text-indigo-400 font-bold">{sys?.memory.processHeapMB} MB</span>
                </div>
              </div>

              {/* Storage Metric */}
              <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-deployText-secondary">Storage Disk Usage</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{sys?.storage.totalUsedMB} MB</div>
                  <div className="text-[11px] text-deployText-secondary mt-0.5">
                    Live sites + staged uploads
                  </div>
                </div>
                <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-deployText-secondary">Sites: {sys?.storage.sitesMB} MB</span>
                  <span className="text-deployText-secondary">Uploads: {sys?.storage.uploadsMB} MB</span>
                </div>
              </div>

              {/* Deployment Queue Status */}
              <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-deployText-secondary">Worker Queue Pipeline</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-400 flex items-center space-x-2">
                    <span>{sys?.queue.isWorkerActive ? 'PROCESSING' : 'IDLE / READY'}</span>
                  </div>
                  <div className="text-[11px] text-deployText-secondary mt-0.5">
                    Mode: <strong className="text-deployText font-mono">{sys?.queue.mode}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-deployText-secondary">Pending Jobs:</span>
                  <span className="text-white font-bold">{sys?.queue.pendingJobs}</span>
                </div>
              </div>

            </div>

            {/* Platform Counters & Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Distribution & Totals */}
              <div className="md:col-span-2 bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Server className="w-4 h-4 text-primary" />
                  <span>Platform Distribution Overview</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e293b]">
                    <span className="text-xs text-deployText-secondary block">Total Websites</span>
                    <span className="text-2xl font-black text-white">{summary?.totalProjects || 0}</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">{summary?.activeProjects || 0} Active</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e293b]">
                    <span className="text-xs text-deployText-secondary block">Static Websites</span>
                    <span className="text-2xl font-black text-blue-400">{summary?.staticProjects || 0}</span>
                    <span className="text-[10px] text-deployText-secondary block mt-0.5">HTML/CSS/JS</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e293b]">
                    <span className="text-xs text-deployText-secondary block">PHP Websites</span>
                    <span className="text-2xl font-black text-indigo-400">{summary?.phpProjects || 0}</span>
                    <span className="text-[10px] text-deployText-secondary block mt-0.5">PHP + HTML</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e293b]">
                    <span className="text-xs text-deployText-secondary block">Deployments Today</span>
                    <span className="text-2xl font-black text-accent">{summary?.deploymentsToday || 0}</span>
                    <span className="text-[10px] text-deployText-secondary block mt-0.5">{summary?.totalDeployments || 0} all-time</span>
                  </div>
                </div>

                {/* System Environment Details */}
                <div className="p-4 rounded-xl bg-[#070b14] border border-[#1e293b] space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">Network & Domain Routing</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded bg-[#0c1322] border border-[#1e293b]/60">
                      <span className="text-deployText-secondary">Platform Domain:</span>
                      <span className="text-accent font-bold">*.{summary?.platformDomain}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0c1322] border border-[#1e293b]/60">
                      <span className="text-deployText-secondary">Edge Proxy Port:</span>
                      <span className="text-white font-bold">5000 (Internal) / 3000 (Vite)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0c1322] border border-[#1e293b]/60">
                      <span className="text-deployText-secondary">Storage Directory:</span>
                      <span className="text-deployText truncate">storage/sites/</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0c1322] border border-[#1e293b]/60">
                      <span className="text-deployText-secondary">Security Incident Count:</span>
                      <span className={summary?.recentSecurityAlerts > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {summary?.recentSecurityAlerts} in 24h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Monetization & Plans */}
              <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 flex flex-col justify-between space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 mb-4">
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <span>Monetization & Plans</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] mb-4">
                    <span className="text-xs text-deployText-secondary block">Estimated MRR</span>
                    <span className="text-3xl font-black text-emerald-400 mt-1 block">
                      ₹{summary?.monthlyRevenueINR || 0}
                    </span>
                    <span className="text-[11px] text-deployText-secondary mt-0.5 block">
                      Monthly Recurring Revenue from paid developer & pro subscriptions
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b14] border border-[#1e293b]">
                      <span className="text-deployText-secondary">Free Tier Users:</span>
                      <span className="font-bold text-white">{summary?.freeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b14] border border-[#1e293b]">
                      <span className="text-blue-400 font-semibold">Developer Tier (₹149):</span>
                      <span className="font-bold text-white">{summary?.devUsers}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b14] border border-[#1e293b]">
                      <span className="text-indigo-400 font-semibold">Pro Tier (₹399):</span>
                      <span className="font-bold text-white">{summary?.proUsers}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePruneStorage}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-deployBorder border border-deployBorder text-xs font-semibold text-deployText hover:text-white transition-colors flex items-center justify-center space-x-2"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Free Up Server Disk Space</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: GLOBAL WEBSITES & PROJECTS MANAGER */}
        {/* ========================================================= */}
        {activeTab === 'projects' && (
          <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-deployText-secondary absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search websites or owner email..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center space-x-2">
                {(['ALL', 'STATIC', 'PHP'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setProjectTypeFilter(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      projectTypeFilter === type
                        ? 'bg-primary text-white border-primary'
                        : 'bg-[#070b14] border-[#1e293b] text-deployText-secondary hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e293b] text-deployText-secondary font-mono">
                    <th className="py-2.5 px-3">WEBSITE / SLUG</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">OWNER</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">STORAGE</th>
                    <th className="py-2.5 px-3 text-right">ADMIN ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/40">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-deployText-secondary">
                        No websites match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => (
                      <tr key={p._id} className="hover:bg-[#0e1626] transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[11px] font-mono text-deployText-secondary">
                            {p.slug}.{summary?.platformDomain}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            p.type === 'PHP'
                              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                              : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-white">{p.owner?.name || 'Unknown'}</div>
                          <span className="text-[11px] text-deployText-secondary">{p.owner?.email || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-deployText-secondary">
                          {((p.storageUsed || 0) / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* cPanel Button */}
                            <Link
                              to={`/projects/${p._id}/cpanel`}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors"
                              title="Open in cPanel File Manager"
                            >
                              cPanel
                            </Link>

                            {/* Visit Button */}
                            <a
                              href={p.liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-surface hover:bg-deployBorder text-deployText-secondary hover:text-white"
                              title="Open Live Site"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Toggle Suspend */}
                            <button
                              onClick={() => handleToggleProjectStatus(p._id, p.status)}
                              className={`p-1.5 rounded-lg text-xs font-semibold ${
                                p.status === 'ACTIVE'
                                  ? 'hover:bg-amber-500/20 text-amber-400'
                                  : 'hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                              title={p.status === 'ACTIVE' ? 'Suspend Site' : 'Activate Site'}
                            >
                              {p.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteProject(p._id, p.name)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                              title="Admin Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: USER ACCOUNTS MANAGER */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-deployText-secondary absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <span className="text-xs text-deployText-secondary font-mono">
                {filteredUsers.length} total users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e293b] text-deployText-secondary font-mono">
                    <th className="py-2.5 px-3">USER</th>
                    <th className="py-2.5 px-3">ROLE</th>
                    <th className="py-2.5 px-3">PLAN TIER</th>
                    <th className="py-2.5 px-3">HOSTED SITES</th>
                    <th className="py-2.5 px-3">STORAGE USED</th>
                    <th className="py-2.5 px-3 text-right">ADMIN CONTROLS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/40">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-[#0e1626] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{u.name}</div>
                        <span className="text-[11px] font-mono text-deployText-secondary">{u.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u._id, undefined, e.target.value)}
                          className="bg-[#070b14] border border-[#1e293b] text-white text-[11px] rounded-lg px-2 py-1 font-semibold focus:outline-none"
                        >
                          <option value="USER">USER</option>
                          <option value="SUPPORT">SUPPORT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={u.plan}
                          onChange={(e) => handleUpdateUser(u._id, e.target.value, undefined)}
                          className={`text-[11px] rounded-lg px-2 py-1 font-semibold focus:outline-none border ${
                            u.plan === 'PRO'
                              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                              : u.plan === 'DEVELOPER'
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                              : 'bg-[#070b14] border-[#1e293b] text-deployText-secondary'
                          }`}
                        >
                          <option value="FREE">FREE</option>
                          <option value="DEVELOPER">DEVELOPER (₹149)</option>
                          <option value="PRO">PRO (₹399)</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 font-mono text-white font-bold">
                        {u.projectCount || 0}
                      </td>
                      <td className="py-3 px-3 font-mono text-deployText-secondary">
                        {((u.storageUsed || 0) / (1024 * 1024)).toFixed(1)} MB
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setResetPasswordModal({ userId: u._id, email: u.email });
                              setNewPasswordInput('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-deployBorder text-deployText hover:text-white font-semibold flex items-center space-x-1"
                            title="Reset Password"
                          >
                            <Key className="w-3 h-3 text-amber-400" />
                            <span>Reset Pwd</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u._id, u.email)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DEPLOYMENTS & QUEUE PIPELINE */}
        {/* ========================================================= */}
        {activeTab === 'deployments' && (
          <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-deployText-secondary">Filter Status:</span>
                {['ALL', 'LIVE', 'BUILDING', 'FAILED', 'QUEUED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDeploymentStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      deploymentStatusFilter === st
                        ? 'bg-primary text-white border-primary'
                        : 'bg-[#070b14] border-[#1e293b] text-deployText-secondary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <span className="text-xs text-deployText-secondary font-mono">
                {filteredDeployments.length} deployments
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e293b] text-deployText-secondary font-mono">
                    <th className="py-2.5 px-3">DEPLOYMENT ID</th>
                    <th className="py-2.5 px-3">PROJECT</th>
                    <th className="py-2.5 px-3">SOURCE</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">CREATED AT</th>
                    <th className="py-2.5 px-3 text-right">LOGS & ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/40">
                  {filteredDeployments.map((d) => (
                    <tr key={d._id} className="hover:bg-[#0e1626] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {d._id}
                        <span className="block text-[10px] text-deployText-secondary font-normal">v{d.version}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{d.projectName}</div>
                        <span className="text-[11px] font-mono text-deployText-secondary">{d.projectSlug}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-accent">
                        {d.source}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.status === 'LIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : d.status === 'BUILDING'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          <span>{d.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-deployText-secondary">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewLogsDeployment(d)}
                            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-deployBorder text-deployText hover:text-white font-semibold flex items-center space-x-1"
                          >
                            <Terminal className="w-3 h-3 text-primary" />
                            <span>View Logs ({d.logs?.length || 0})</span>
                          </button>

                          {d.deploymentUrl && (
                            <a
                              href={d.deploymentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg hover:bg-surface text-deployText-secondary hover:text-white"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SECURITY AUDIT LOGS */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="bg-[#0c1322] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Security & Intrusion Audit Trail</span>
                </h3>
                <p className="text-xs text-deployText-secondary mt-0.5">
                  Logs all zip traversal guards, executable blocks, auth events, and administrative deletions.
                </p>
              </div>

              <button
                onClick={handleClearSecurityLogs}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-colors"
              >
                Clear Audit Trail
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e293b] text-deployText-secondary font-mono">
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">SECURITY EVENT / ACTION</th>
                    <th className="py-2.5 px-3">IP ADDRESS</th>
                    <th className="py-2.5 px-3">TRIGGERED BY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/40 font-mono">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-deployText-secondary">
                        No security alerts recorded. System boundary verified secure.
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-[#0e1626] transition-colors">
                        <td className="py-2.5 px-3 text-deployText-secondary">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-white font-semibold">
                          <span className={log.action.includes('DELETE') ? 'text-amber-400' : 'text-emerald-400'}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-deployText-secondary">
                          {log.ip}
                        </td>
                        <td className="py-2.5 px-3 text-deployText-secondary">
                          {log.userId || 'system'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: INFINITYFREE-STYLE AD NETWORK */}
        {/* ========================================================= */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">InfinityFree-Style Ad Network</h3>
                <p className="text-xs text-deployText-secondary">
                  Manage sponsored ads across dashboard, project headers, and public pages.
                </p>
              </div>

              <button
                onClick={() => setShowNewAdModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Ad Banner</span>
              </button>
            </div>

            {/* Ads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ads.map((ad) => {
                const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
                return (
                  <div key={ad._id} className="bg-[#0c1322] border border-[#1e293b] rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface border border-deployBorder text-accent uppercase">
                        {ad.placement}
                      </span>
                      <button
                        onClick={() => handleToggleAd(ad._id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                          ad.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-deployBorder text-deployText-secondary border-deployBorder'
                        }`}
                      >
                        {ad.status}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ad.title}</h4>
                      <p className="text-xs text-deployText-secondary line-clamp-2 mt-1">{ad.description}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] flex items-center justify-between text-xs font-mono">
                      <span>👁️ {ad.impressions} Views</span>
                      <span>🖱️ {ad.clicks} Clicks</span>
                      <span className="text-emerald-400 font-bold">{ctr}% CTR</span>
                    </div>

                    <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between">
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline flex items-center space-x-1"
                      >
                        <span>Target Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </main>

      {/* MODAL: RESET PASSWORD */}
      {resetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Reset User Password</span>
              </h3>
              <button onClick={() => setResetPasswordModal(null)} className="text-deployText-secondary hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-deployText-secondary">
              Set a new password for <strong className="text-white">{resetPasswordModal.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                  New Password (minimum 6 characters)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter secure new password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModal(null)}
                  className="px-4 py-2 rounded-xl bg-surface text-xs text-deployText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DEPLOYMENT LOGS */}
      {viewLogsDeployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0b1120] border border-[#1e293b] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0e1626]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span>Deployment Logs: {viewLogsDeployment._id}</span>
                </h3>
                <span className="text-[11px] font-mono text-deployText-secondary">
                  {viewLogsDeployment.projectName} • {viewLogsDeployment.status}
                </span>
              </div>
              <button onClick={() => setViewLogsDeployment(null)} className="text-deployText-secondary hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-[#070b14] font-mono text-xs space-y-1.5">
              {viewLogsDeployment.logs?.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-deployText-secondary shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-accent shrink-0">[{log.stage}]</span>
                  <span className={log.level === 'error' ? 'text-rose-400 font-bold' : log.level === 'success' ? 'text-emerald-400' : 'text-deployText'}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-[#1e293b] bg-[#0e1626] flex justify-end">
              <button
                onClick={() => setViewLogsDeployment(null)}
                className="px-4 py-1.5 rounded-lg bg-surface text-xs text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE AD */}
      {showNewAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Tag className="w-4 h-4 text-primary" />
                <span>Create Sponsored Ad</span>
              </h3>
              <button onClick={() => setShowNewAdModal(false)} className="text-deployText-secondary hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1">Ad Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Cloud Hosting Tools"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Brief advertising copy..."
                  value={adDesc}
                  onChange={(e) => setAdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1">Target Click URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/promo"
                  value={adTarget}
                  onChange={(e) => setAdTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1">Placement Spot</label>
                <select
                  value={adPlacement}
                  onChange={(e: any) => setAdPlacement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-xs focus:outline-none"
                >
                  <option value="DASHBOARD">Dashboard Header</option>
                  <option value="PROJECT_PAGE">Project Overview</option>
                  <option value="DOCUMENTATION">Documentation Pages</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewAdModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface text-xs text-deployText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary"
                >
                  Create Ad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;
