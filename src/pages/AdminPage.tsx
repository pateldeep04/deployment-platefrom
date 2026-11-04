import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { 
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
  Trash2, 
  Globe, 
  Server, 
  Cpu, 
  Key, 
  X, 
  ExternalLink, 
  Search, 
  Check, 
  Zap, 
  Terminal, 
  ShieldCheck, 
  Pause, 
  Play,
  Link2,
  Unlink,
  AlertCircle,
  Shield,
  CreditCard,
  Ban
} from 'lucide-react';

interface PlatformDomainItem {
  domain: string;
  label: string;
  provider: 'SSL' | 'DuckDNS' | 'FreeDNS' | 'Custom';
  isSsl: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

interface ProjectDomainBinding {
  projectId: string;
  name: string;
  slug: string;
  status: string;
  ownerEmail: string;
  assignedSubdomain: string;
  platformDomain: string;
  fullSubdomainUrl: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  sslEnabled: boolean;
  createdAt: string;
}

export const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'monitoring' | 'domains' | 'projects' | 'users' | 'deployments' | 'security' | 'ads' | 'payments'>('monitoring');

  // Telemetry & Data States
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [settings, setSettings] = useState<{
    developerPriceINR: number;
    proPriceINR: number;
    freeTierAdsEnabled: boolean;
    adBannerTitle: string;
    adBannerText: string;
    adBannerLink: string;
    customAdScript: string;
  }>({
    developerPriceINR: 30,
    proPriceINR: 399,
    freeTierAdsEnabled: true,
    adBannerTitle: '',
    adBannerText: '',
    adBannerLink: '',
    customAdScript: '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Domains State
  const [domainsData, setDomainsData] = useState<{
    platformDomains: PlatformDomainItem[];
    projectDomains: ProjectDomainBinding[];
    defaultPlatformDomain: string;
  } | null>(null);
  const [domainSearch, setDomainSearch] = useState('');
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainLabelInput, setNewDomainLabelInput] = useState('');
  const [newDomainProviderInput, setNewDomainProviderInput] = useState<'DuckDNS' | 'FreeDNS' | 'Custom' | 'SSL'>('DuckDNS');
  const [newDomainIsSslInput, setNewDomainIsSslInput] = useState(false);
  const [newDomainIsDefaultInput, setNewDomainIsDefaultInput] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  // Unlink Confirm Modal
  const [unlinkModal, setUnlinkModal] = useState<{
    type: 'subdomain' | 'custom';
    projectId: string;
    projectName: string;
    domainName: string;
  } | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Admin Edit Subdomain / Custom Domain Modals
  const [editSubdomainModal, setEditSubdomainModal] = useState<{
    projectId: string;
    projectName: string;
    subdomain: string;
    baseDomain: string;
  } | null>(null);
  const [isSavingSubdomain, setIsSavingSubdomain] = useState(false);

  const [editCustomDomainModal, setEditCustomDomainModal] = useState<{
    projectId: string;
    projectName: string;
    domain: string;
    verified: boolean;
  } | null>(null);
  const [isSavingCustomDomain, setIsSavingCustomDomain] = useState(false);

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
  const [adTarget, setAdTarget] = useState('');
  const [adPlacement, setAdPlacement] = useState<'DASHBOARD' | 'PROJECT_PAGE' | 'DOCUMENTATION'>('DASHBOARD');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDomains = async () => {
    try {
      const res = await api.get('/admin/domains');
      if (res.data?.success) {
        setDomainsData(res.data.data);
      }
    } catch (e: any) {
      console.error('Failed to fetch admin domains:', e);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [monRes, projRes, usersRes, depsRes, secRes, adsRes, setRes, domRes, payRes] = await Promise.all([
        api.get('/admin/monitoring'),
        api.get('/admin/projects'),
        api.get('/admin/users'),
        api.get('/admin/deployments'),
        api.get('/admin/security-logs'),
        api.get('/admin/ads'),
        api.get('/admin/settings'),
        api.get('/admin/domains').catch(() => ({ data: { success: false } })),
        api.get('/admin/payments').catch(() => ({ data: { success: false } })),
      ]);

      if (monRes.data.success) setMonitoringData(monRes.data.data);
      if (projRes.data.success) setAllProjects(projRes.data.data.projects);
      if (usersRes.data.success) setUsers(usersRes.data.data.users);
      if (depsRes.data.success) setDeployments(depsRes.data.data.deployments);
      if (secRes.data.success) setSecurityLogs(secRes.data.data.logs);
      if (adsRes.data.success) setAds(adsRes.data.data.ads);
      if (setRes.data.success && setRes.data.data?.settings) setSettings(setRes.data.data.settings);
      if (domRes.data?.success) setDomainsData(domRes.data.data);
      if (payRes.data?.success) setAdminPayments(payRes.data.data.payments || []);
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
      api.get('/admin/monitoring')
        .then(res => {
          if (res.data.success) setMonitoringData(res.data.data);
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [isAdmin, autoRefresh]);

  // Handlers
  const handlePruneStorage = async () => {
    try {
      const res = await api.post('/admin/prune-storage');
      showToast(res.data.message || 'Storage pruned successfully', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to prune storage', 'error');
    }
  };

  const handleToggleProjectStatus = async (projectId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/admin/projects/${projectId}/status`, { status: nextStatus });
      showToast(res.data.message || 'Status updated', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete project "${name}" and all its hosted files?`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/projects/${projectId}`);
      showToast(res.data.message || 'Project deleted', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete project', 'error');
    }
  };

  const handleUpdateUser = async (userId: string, plan?: string, role?: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}`, { plan, role });
      showToast(res.data.message || 'User updated', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update user', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModal) return;
    if (newPasswordInput.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    try {
      const res = await api.post(`/admin/users/${resetPasswordModal.userId}/reset-password`, {
        newPassword: newPasswordInput,
      });
      showToast(res.data.message || 'Password reset successfully', 'success');
      setResetPasswordModal(null);
      setNewPasswordInput('');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to reset password', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${email}" and all their hosted sites?`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      showToast(res.data.message || 'User deleted', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const handleClearSecurityLogs = async () => {
    if (!window.confirm('Clear all security audit logs?')) return;
    try {
      const res = await api.delete('/admin/security-logs');
      showToast(res.data.message || 'Security logs cleared', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to clear security logs', 'error');
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/ads', {
        title: adTitle,
        description: adDesc,
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
        targetUrl: adTarget,
        placement: adPlacement,
      });
      showToast(res.data.message || 'Ad banner created', 'success');
      setShowNewAdModal(false);
      setAdTitle('');
      setAdDesc('');
      setAdTarget('');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create ad', 'error');
    }
  };

  const handleToggleAd = async (adId: string) => {
    try {
      await api.patch(`/admin/ads/${adId}/toggle`);
      showToast('Ad status updated', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to toggle ad', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await api.patch('/admin/settings', settings);
      showToast(res.data.message || 'Settings saved successfully', 'success');
      if (res.data?.data?.settings) {
        setSettings(res.data.data.settings);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleReviewPayment = async (paymentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await api.patch(`/admin/payments/${paymentId}`, { status });
      showToast(res.data.message || `Payment ${status.toLowerCase()} successfully`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || `Failed to review payment`, 'error');
    }
  };

  const handleBanUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to ban user '${email}'? All their hosted websites will be suspended immediately.`)) return;
    try {
      const res = await api.post(`/admin/users/${userId}/ban`, { reason: 'Terms of Service Violation / Administrative takedown' });
      showToast(res.data.message || `User '${email}' has been banned`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to ban user', 'error');
    }
  };

  const handleUnbanUser = async (userId: string, email: string) => {
    try {
      const res = await api.post(`/admin/users/${userId}/unban`);
      showToast(res.data.message || `User '${email}' unbanned`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to unban user', 'error');
    }
  };

  // Domain Management Handlers
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    try {
      setIsAddingDomain(true);
      const res = await api.post('/admin/domains', {
        domain: newDomainInput.trim(),
        label: newDomainLabelInput.trim() || undefined,
        provider: newDomainProviderInput,
        isSsl: newDomainIsSslInput,
        isDefault: newDomainIsDefaultInput,
      });
      if (res.data?.success) {
        showToast(res.data.message || 'Platform domain added successfully', 'success');
        setShowAddDomainModal(false);
        setNewDomainInput('');
        setNewDomainLabelInput('');
        setNewDomainProviderInput('DuckDNS');
        setNewDomainIsSslInput(false);
        setNewDomainIsDefaultInput(false);
        await fetchDomains();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to add platform domain', 'error');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!window.confirm(`Are you sure you want to remove '${domain}' from available platform domains?`)) return;
    try {
      const res = await api.delete(`/admin/domains/${encodeURIComponent(domain)}`);
      if (res.data?.success) {
        showToast(res.data.message || 'Domain removed successfully', 'success');
        await fetchDomains();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove domain', 'error');
    }
  };

  const handleSetDefaultDomain = async (domain: string) => {
    try {
      const res = await api.patch(`/admin/domains/${encodeURIComponent(domain)}/default`);
      if (res.data?.success) {
        showToast(res.data.message || 'Default domain updated', 'success');
        await fetchDomains();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update default domain', 'error');
    }
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkModal) return;
    try {
      setIsUnlinking(true);
      if (unlinkModal.type === 'subdomain') {
        const res = await api.delete(`/admin/domains/projects/${unlinkModal.projectId}/subdomain`);
        showToast(res.data.message || 'Subdomain unlinked successfully', 'success');
      } else {
        const res = await api.delete(`/admin/domains/projects/${unlinkModal.projectId}/custom`);
        showToast(res.data.message || 'Custom domain unlinked successfully', 'success');
      }
      setUnlinkModal(null);
      await fetchDomains();
      await fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to unlink domain', 'error');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleSaveSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubdomainModal) return;
    try {
      setIsSavingSubdomain(true);
      const res = await api.post(`/admin/domains/projects/${editSubdomainModal.projectId}/subdomain`, {
        subdomain: editSubdomainModal.subdomain,
        baseDomain: editSubdomainModal.baseDomain,
      });
      showToast(res.data.message || 'Subdomain assigned successfully', 'success');
      setEditSubdomainModal(null);
      await fetchDomains();
      await fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update subdomain', 'error');
    } finally {
      setIsSavingSubdomain(false);
    }
  };

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomDomainModal) return;
    try {
      setIsSavingCustomDomain(true);
      const res = await api.post(`/admin/domains/projects/${editCustomDomainModal.projectId}/custom`, {
        domain: editCustomDomainModal.domain,
        verified: editCustomDomainModal.verified,
      });
      showToast(res.data.message || 'Custom domain saved successfully', 'success');
      setEditCustomDomainModal(null);
      await fetchDomains();
      await fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save custom domain', 'error');
    } finally {
      setIsSavingCustomDomain(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Administrator Privileges Required</h2>
          <p className="text-sm text-slate-600">
            You do not have administrative permission to access the server telemetry, operational telemetry, and infrastructure controls.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Filtered lists
  const filteredProjects = allProjects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.owner?.email || '').toLowerCase().includes(projectSearch.toLowerCase());
    const matchType = projectTypeFilter === 'ALL' || p.type === projectTypeFilter;
    return matchSearch && matchType;
  });

  const filteredUsers = users.filter((u) => {
    return (
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  });

  const filteredDeployments = deployments.filter((d) => {
    return deploymentStatusFilter === 'ALL' || d.status === deploymentStatusFilter;
  });

  const filteredProjectDomains = (domainsData?.projectDomains || []).filter((pd) => {
    const q = domainSearch.toLowerCase();
    return (
      pd.name.toLowerCase().includes(q) ||
      pd.slug.toLowerCase().includes(q) ||
      pd.ownerEmail.toLowerCase().includes(q) ||
      pd.assignedSubdomain.toLowerCase().includes(q) ||
      (pd.customDomain && pd.customDomain.toLowerCase().includes(q))
    );
  });

  const sys = monitoringData?.system;
  const summary = monitoringData?.summary;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20 font-sans">
      <Navbar />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-2xl border text-sm animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Mission Control Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                Mission Control
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>DeployHub Admin & Telemetry</span>
              </h1>
              {autoRefresh && (
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE FEED</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Host: <strong className="text-slate-800 font-mono">{sys?.hostname || 'localhost'}</strong> ({sys?.platform} • {sys?.arch}) | Node: <strong className="text-slate-800 font-mono">{sys?.nodeVersion}</strong> | Uptime: <strong className="text-slate-800 font-mono">{sys?.uptimeFormatted}</strong>
            </p>
          </div>

          {/* Quick Operations Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle 4s live auto-refresh"
            >
              {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoRefresh ? 'Pause Live' : 'Resume Live'}</span>
            </button>

            <button
              onClick={handlePruneStorage}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-sm"
              title="Clean unused temporary files and artifacts"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              <span>Prune Disk Cache</span>
            </button>

            <button
              onClick={() => fetchAllData()}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Now</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
          {[
            { id: 'monitoring', label: 'Live Server Telemetry', icon: Activity },
            { id: 'domains', label: `Domains & Routing (${domainsData?.platformDomains?.length || 0})`, icon: Globe },
            { id: 'projects', label: `Websites (${allProjects.length})`, icon: Server },
            { id: 'users', label: `User Accounts (${users.length})`, icon: Users },
            { id: 'deployments', label: `Deployments (${deployments.length})`, icon: Rocket },
            { id: 'security', label: `Security Logs (${securityLogs.length})`, icon: ShieldCheck },
            { id: 'ads', label: `Plan Pricing & Ads (${ads.length})`, icon: IndianRupee },
            { id: 'payments', label: `Payments & UTR (${adminPayments.filter(p => p.status === 'PENDING').length} pending)`, icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-blue-600 text-blue-700 bg-blue-50/80 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
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
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU Processor</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{sys?.cpu.cores || 0} Cores</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{sys?.cpu.model}</div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Load Avg (1m, 5m):</span>
                  <span className="text-blue-600 font-bold">{sys?.cpu.loadAvg1m}, {sys?.cpu.loadAvg5m}</span>
                </div>
              </div>

              {/* Memory RAM Metric */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RAM Utilization</span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{sys?.memory.usagePercent}%</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sys?.memory.usedGB} GB used / {sys?.memory.totalGB} GB total
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${sys?.memory.usagePercent || 0}%` }}
                  />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Node Heap:</span>
                  <span className="text-indigo-600 font-bold">{sys?.memory.processHeapMB} MB</span>
                </div>
              </div>

              {/* Storage Metric */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Disk Usage</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <HardDrive className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{sys?.storage.totalUsedMB} MB</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Live sites + staged uploads
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Sites: {sys?.storage.sitesMB} MB</span>
                  <span className="text-slate-500">Uploads: {sys?.storage.uploadsMB} MB</span>
                </div>
              </div>

              {/* Deployment Queue Status */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Worker Queue Pipeline</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600 flex items-center space-x-2">
                    <span>{sys?.queue.isWorkerActive ? 'PROCESSING' : 'IDLE / READY'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Mode: <strong className="text-slate-800 font-mono">{sys?.queue.mode}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Pending Jobs:</span>
                  <span className="text-slate-900 font-bold">{sys?.queue.pendingJobs}</span>
                </div>
              </div>

            </div>

            {/* Platform Counters & Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Distribution & Totals */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span>Platform Distribution Overview</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block">Total Websites</span>
                    <span className="text-2xl font-black text-slate-900">{summary?.totalProjects || 0}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">{summary?.activeProjects || 0} Active</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block">Static Websites</span>
                    <span className="text-2xl font-black text-blue-600">{summary?.staticProjects || 0}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">HTML/CSS/JS</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block">PHP Websites</span>
                    <span className="text-2xl font-black text-indigo-600">{summary?.phpProjects || 0}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">PHP + HTML</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block">Deployments Today</span>
                    <span className="text-2xl font-black text-cyan-600">{summary?.deploymentsToday || 0}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{summary?.totalDeployments || 0} all-time</span>
                  </div>
                </div>

                {/* System Environment Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">Network & Domain Routing</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                      <span className="text-slate-500">Platform Domain:</span>
                      <span className="text-blue-600 font-bold">*.{summary?.platformDomain}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                      <span className="text-slate-500">Edge Proxy Port:</span>
                      <span className="text-slate-800 font-bold">5000 (Internal) / 3000 (Vite)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                      <span className="text-slate-500">Storage Directory:</span>
                      <span className="text-slate-700 truncate">storage/sites/</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                      <span className="text-slate-500">Security Incident Count:</span>
                      <span className={summary?.recentSecurityAlerts > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-semibold'}>
                        {summary?.recentSecurityAlerts} in 24h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Monetization & Plans */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 mb-4">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <span>Monetization & Plans</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 mb-4">
                    <span className="text-xs text-emerald-800 font-medium block">Estimated MRR</span>
                    <span className="text-3xl font-black text-emerald-700 mt-1 block">
                      ₹{summary?.monthlyRevenueINR || 0}
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-0.5 block">
                      Monthly Recurring Revenue from paid developer & pro subscriptions
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Free Tier Users:</span>
                      <span className="font-bold text-slate-900">{summary?.freeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-blue-600 font-semibold">Developer Tier (₹{settings?.developerPriceINR ?? 30}):</span>
                      <span className="font-bold text-slate-900">{summary?.devUsers}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-indigo-600 font-semibold">Pro Tier (₹{settings?.proPriceINR ?? 399}):</span>
                      <span className="font-bold text-slate-900">{summary?.proUsers}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePruneStorage}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Execute Storage Garbage Collection</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DOMAINS & ROUTING MANAGER (NEW ADMIN CAPABILITY) */}
        {/* ========================================================= */}
        {activeTab === 'domains' && (
          <div className="space-y-6">
            
            {/* Platform Domains Overview Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span>Platform Routing Domains ({domainsData?.platformDomains?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage base domains provided to users for project subdomains (DuckDNS, FreeDNS, Custom Apex).
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDomainModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Platform Domain</span>
                </button>
              </div>

              {/* Grid of Platform Domains */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(domainsData?.platformDomains || []).map((dom) => {
                  const assignedCount = (domainsData?.projectDomains || []).filter(
                    pd => pd.platformDomain.toLowerCase() === dom.domain.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={dom.domain}
                      className={`p-4 rounded-xl border transition-all ${
                        dom.isDefault
                          ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-300'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                          dom.provider === 'DuckDNS'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : dom.provider === 'FreeDNS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {dom.provider}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {dom.isDefault ? (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                              Primary Default
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultDomain(dom.domain)}
                              className="text-[10px] font-medium text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 px-2 py-0.5 rounded bg-white cursor-pointer"
                              title="Set as primary default platform domain"
                            >
                              Make Default
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveDomain(dom.domain)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Remove platform domain"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-sm text-slate-900 truncate">
                        {dom.domain}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {dom.label || dom.domain}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Live Sites:</span>
                        <span className="font-bold font-mono text-slate-800">{assignedCount} assigned</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Project Subdomains & Custom Domains Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Link2 className="w-4 h-4 text-blue-600" />
                    <span>Project Subdomain & Custom Domain Bindings</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View, search, and unlink active project domains and edge routing endpoints.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search subdomain, domain, or project..."
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">PROJECT</th>
                      <th className="py-2.5 px-3">OWNER</th>
                      <th className="py-2.5 px-3">ASSIGNED SUBDOMAIN</th>
                      <th className="py-2.5 px-3">CUSTOM APEX DOMAIN</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">DOMAIN ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjectDomains.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">
                          No project domain bindings match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProjectDomains.map((pd) => (
                        <tr key={pd.projectId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{pd.name}</div>
                            <span className="text-[11px] font-mono text-slate-500">{pd.slug}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-600 font-mono text-[11px]">{pd.ownerEmail}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1.5">
                              <a
                                href={pd.fullSubdomainUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-blue-600 hover:underline flex items-center space-x-1 font-semibold"
                              >
                                <span>{pd.assignedSubdomain}.{pd.platformDomain}</span>
                                <ExternalLink className="w-3 h-3 text-blue-400" />
                              </a>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {pd.customDomain ? (
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-slate-800 font-medium">{pd.customDomain}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                                  pd.customDomainVerified
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {pd.customDomainVerified ? 'Verified' : 'Pending DNS'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              pd.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${pd.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{pd.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Open cPanel */}
                              <Link
                                to={`/projects/${pd.projectId}/cpanel`}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                              >
                                cPanel
                              </Link>

                              {/* Edit Subdomain */}
                              <button
                                onClick={() => setEditSubdomainModal({
                                  projectId: pd.projectId,
                                  projectName: pd.name,
                                  subdomain: pd.assignedSubdomain,
                                  baseDomain: pd.platformDomain,
                                })}
                                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Edit or assign project subdomain"
                              >
                                Edit Subdomain
                              </button>

                              {/* Bind / Edit Custom Domain */}
                              <button
                                onClick={() => setEditCustomDomainModal({
                                  projectId: pd.projectId,
                                  projectName: pd.name,
                                  domain: pd.customDomain || '',
                                  verified: pd.customDomainVerified || false,
                                })}
                                className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Bind or update custom domain"
                              >
                                {pd.customDomain ? 'Edit Custom' : '+ Custom'}
                              </button>

                              {/* Unlink Subdomain */}
                              <button
                                onClick={() => setUnlinkModal({
                                  type: 'subdomain',
                                  projectId: pd.projectId,
                                  projectName: pd.name,
                                  domainName: `${pd.assignedSubdomain}.${pd.platformDomain}`,
                                })}
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Unlink assigned subdomain"
                              >
                                Unlink Subdomain
                              </button>

                              {/* Unlink Custom Domain */}
                              {pd.customDomain && (
                                <button
                                  onClick={() => setUnlinkModal({
                                    type: 'custom',
                                    projectId: pd.projectId,
                                    projectName: pd.name,
                                    domainName: pd.customDomain!,
                                  })}
                                  className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Unlink custom domain"
                                >
                                  Unlink Custom
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GLOBAL WEBSITES & PROJECTS MANAGER */}
        {/* ========================================================= */}
        {activeTab === 'projects' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search websites or owner email..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center space-x-2">
                {(['ALL', 'STATIC', 'PHP'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setProjectTypeFilter(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      projectTypeFilter === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
                  <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                    <th className="py-2.5 px-3">WEBSITE / SLUG</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">OWNER</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">STORAGE</th>
                    <th className="py-2.5 px-3 text-right">ADMIN ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No websites match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {p.slug}.{summary?.platformDomain}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            p.type === 'PHP'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">{p.owner?.name || 'Unknown'}</div>
                          <span className="text-[11px] text-slate-500">{p.owner?.email || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {((p.storageUsed || 0) / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* cPanel Button */}
                            <Link
                              to={`/projects/${p._id}/cpanel`}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-colors"
                              title="Open in cPanel File Manager"
                            >
                              cPanel
                            </Link>

                            {/* Visit Button */}
                            <a
                              href={p.liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                              title="Open Live Site"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Toggle Suspend */}
                            <button
                              onClick={() => handleToggleProjectStatus(p._id, p.status)}
                              className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                p.status === 'ACTIVE'
                                  ? 'hover:bg-amber-50 text-amber-600'
                                  : 'hover:bg-emerald-50 text-emerald-600'
                              }`}
                              title={p.status === 'ACTIVE' ? 'Suspend Site' : 'Activate Site'}
                            >
                              {p.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteProject(p._id, p.name)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                              title="Delete Project"
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
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: USER ACCOUNTS MANAGER */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {filteredUsers.length} total users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                    <th className="py-2.5 px-3">USER</th>
                    <th className="py-2.5 px-3">ROLE</th>
                    <th className="py-2.5 px-3">PLAN TIER</th>
                    <th className="py-2.5 px-3">HOSTED SITES</th>
                    <th className="py-2.5 px-3">STORAGE USED</th>
                    <th className="py-2.5 px-3 text-right">ADMIN CONTROLS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900">{u.name}</span>
                          {u.isBanned && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">BANNED</span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">{u.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u._id, undefined, e.target.value)}
                          className="bg-white border border-slate-300 text-slate-900 text-[11px] rounded-lg px-2 py-1 font-semibold focus:outline-none"
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
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : u.plan === 'DEVELOPER'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="FREE">FREE (Ad-Supported)</option>
                          <option value="DEVELOPER">DEVELOPER (₹{settings?.developerPriceINR ?? 30})</option>
                          <option value="PRO">PRO (₹{settings?.proPriceINR ?? 399})</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-900 font-bold">
                        {u.projectCount || 0}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {((u.storageUsed || 0) / (1024 * 1024)).toFixed(1)} MB
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {u.isBanned ? (
                            <button
                              onClick={() => handleUnbanUser(u._id, u.email)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Unban User Account"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Unban</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanUser(u._id, u.email)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Ban User Account & Suspend Sites"
                            >
                              <Ban className="w-3 h-3 text-rose-600" />
                              <span>Ban</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setResetPasswordModal({ userId: u._id, email: u.email });
                              setNewPasswordInput('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <Key className="w-3 h-3 text-amber-500" />
                            <span>Reset Pwd</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u._id, u.email)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
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
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DEPLOYMENTS & QUEUE PIPELINE */}
        {/* ========================================================= */}
        {activeTab === 'deployments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Filter Status:</span>
                {['ALL', 'LIVE', 'BUILDING', 'FAILED', 'QUEUED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDeploymentStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      deploymentStatusFilter === st
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-mono">
                {filteredDeployments.length} deployments
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                    <th className="py-2.5 px-3">DEPLOYMENT ID</th>
                    <th className="py-2.5 px-3">PROJECT</th>
                    <th className="py-2.5 px-3">SOURCE</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">CREATED AT</th>
                    <th className="py-2.5 px-3 text-right">LOGS & ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeployments.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {d._id}
                        <span className="block text-[10px] text-slate-500 font-normal">v{d.version}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{d.projectName}</div>
                        <span className="text-[11px] font-mono text-slate-500">{d.projectSlug}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-600 font-semibold">
                        {d.source}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.status === 'LIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : d.status === 'BUILDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span>{d.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewLogsDeployment(d)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <Terminal className="w-3 h-3 text-blue-600" />
                            <span>View Logs ({d.logs?.length || 0})</span>
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
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: SECURITY AUDIT LOGS */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Security & Intrusion Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logs all zip traversal guards, executable blocks, auth events, and administrative deletions.
                </p>
              </div>

              <button
                onClick={handleClearSecurityLogs}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Audit Trail
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">SECURITY EVENT / ACTION</th>
                    <th className="py-2.5 px-3">IP ADDRESS</th>
                    <th className="py-2.5 px-3">TRIGGERED BY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">
                        No security alerts recorded. System boundary verified secure.
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-semibold">
                          <span className={log.action.includes('DELETE') ? 'text-amber-600' : 'text-emerald-700'}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.ip}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
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
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: PLAN PRICING & MONETIZATION AD NETWORK */}
        {/* ========================================================= */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            
            {/* PLAN PRICING & REVENUE CONTROLS (ADMIN CONTROL) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                    <span>Plan Pricing & Ad Monetization Controls</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure Developer plan price, Pro plan price, and manage Free tier ad display.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                    settings.freeTierAdsEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {settings.freeTierAdsEnabled ? '● Free Tier Ads Active' : '○ Free Tier Ads Paused'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Developer Plan Price */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">
                      Developer Plan Monthly Price (₹)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Current price charged to users for Developer subscription (Zero ads, 20 sites).
                    </p>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={settings.developerPriceINR}
                        onChange={(e) => setSettings({ ...settings, developerPriceINR: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Pro Plan Price */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">
                      Pro Cloud Plan Monthly Price (₹)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Unlimited sites, dedicated PHP runtime pool, and 50 GB SSD storage.
                    </p>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={settings.proPriceINR}
                        onChange={(e) => setSettings({ ...settings, proPriceINR: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Free Tier Ad Monetization Toggle */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800">
                        Free Tier Visitor Ad Ribbon
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inject sponsored banner onto visitor sites hosted by Free Tier users. Developer sites remain 100% ad-free.
                      </p>
                    </div>
                    <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={settings.freeTierAdsEnabled}
                        onChange={(e) => setSettings({ ...settings, freeTierAdsEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {settings.freeTierAdsEnabled ? 'Enabled (Earning Ad Revenue)' : 'Disabled (No Ads)'}
                      </span>
                    </label>
                  </div>

                </div>

                {/* Banner Customization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Sponsored Banner Title
                    </label>
                    <input
                      type="text"
                      value={settings.adBannerTitle || ''}
                      placeholder="e.g. Hosting Sponsored by DeployHub"
                      onChange={(e) => setSettings({ ...settings, adBannerTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sponsor Target Link URL
                    </label>
                    <input
                      type="url"
                      value={settings.adBannerLink || ''}
                      placeholder="https://example.com/sponsor"
                      onChange={(e) => setSettings({ ...settings, adBannerLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Sponsored Banner Description (displayed to visitors on free sites)
                  </label>
                  <input
                    type="text"
                    value={settings.adBannerText || ''}
                    placeholder="e.g. Fast free web hosting with SSL. Upgrade to Developer (₹30/mo) for 100% ad-free sites."
                    onChange={(e) => setSettings({ ...settings, adBannerText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Ad Script / Tag (Google AdSense, Adsterra, Popads, or Analytics tag)
                  </label>
                  <textarea
                    rows={2}
                    value={settings.customAdScript || ''}
                    placeholder="<!-- Paste your Google AdSense code or affiliate script here (optional) -->"
                    onChange={(e) => setSettings({ ...settings, customAdScript: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSettings ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isSavingSettings ? 'Saving Settings...' : 'Save Plan Pricing & Ad Settings'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ad Banners & Placements</h3>
                <p className="text-xs text-slate-500">
                  Manage individual banner campaigns across dashboards and public sites.
                </p>
              </div>

              <button
                onClick={() => setShowNewAdModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
                  <div key={ad._id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 uppercase">
                        {ad.placement}
                      </span>
                      <button
                        onClick={() => handleToggleAd(ad._id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                          ad.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {ad.status}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{ad.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{ad.description}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span>👁️ {ad.impressions} Views</span>
                      <span>🖱️ {ad.clicks} Clicks</span>
                      <span className="text-emerald-700 font-bold">{ctr}% CTR</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center space-x-1 font-semibold"
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

              {/* ========================================================= */}
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: MANUAL UPI BILLING & UTR AUDIT */}
        {/* ========================================================= */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Manual UPI Payments & UTR Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted 12-digit bank UTR numbers. Approving activates the plan for 30 days immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  {adminPayments.filter(p => p.status === 'PENDING').length} Pending Review
                </span>
                <button
                  onClick={() => fetchAllData()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {adminPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No UPI payments submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono bg-slate-50/70">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">USER</th>
                      <th className="py-2.5 px-3">PLAN & AMOUNT</th>
                      <th className="py-2.5 px-3">12-DIGIT UTR / SENDER UPI</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.userName || 'User'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{p.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {p.plan} PLAN
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold">
                            ₹{p.amountINR} INR
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {p.utr}
                          </div>
                          {p.senderUpiId && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              From: {p.senderUpiId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewPayment(p._id, 'APPROVED')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Approve payment & activate plan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewPayment(p._id, 'REJECTED')}
                                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer text-[11px]"
                                title="Reject payment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              Reviewed {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL: ADD PLATFORM DOMAIN */}
      {showAddDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Add Platform Routing Domain</span>
              </h3>
              <button
                onClick={() => setShowAddDomainModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDomain} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Domain Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. deployeai.duckdns.org or yourdomain.com"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Projects will be able to claim subdomains like <code>app.{newDomainInput || 'domain.com'}</code>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DuckDNS Free Cloud Domain"
                  value={newDomainLabelInput}
                  onChange={(e) => setNewDomainLabelInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DNS Provider
                </label>
                <select
                  value={newDomainProviderInput}
                  onChange={(e: any) => setNewDomainProviderInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                >
                  <option value="DuckDNS">DuckDNS (Dynamic DNS)</option>
                  <option value="FreeDNS">FreeDNS (mooo.com / chickenkiller.com)</option>
                  <option value="Custom">Custom Apex / Commercial DNS (Namecheap, Cloudflare)</option>
                  <option value="SSL">SSL Wildcard Domain</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDomainIsSslInput}
                    onChange={(e) => setNewDomainIsSslInput(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-700 font-medium">Domain has Wildcard SSL configured</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDomainIsDefaultInput}
                    onChange={(e) => setNewDomainIsDefaultInput(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-700 font-medium">Set as primary default platform domain</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDomainModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDomain}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isAddingDomain ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UNLINK DOMAIN CONFIRMATION */}
      {unlinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Unlink className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Unlink {unlinkModal.type === 'subdomain' ? 'Subdomain' : 'Custom Domain'}
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <code className="font-bold text-slate-900 font-mono">{unlinkModal.domainName}</code> from project <strong className="text-slate-900">{unlinkModal.projectName}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setUnlinkModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnlinking}
                onClick={handleConfirmUnlink}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUnlinking ? 'Unlinking...' : 'Confirm Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ASSIGN SUBDOMAIN */}
      {editSubdomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Assign / Edit Subdomain</span>
              </h3>
              <button onClick={() => setEditSubdomainModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Configure platform subdomain routing for <strong className="text-slate-900">{editSubdomainModal.projectName}</strong>.
            </p>

            <form onSubmit={handleSaveSubdomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subdomain Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. myapp"
                  value={editSubdomainModal.subdomain}
                  onChange={(e) => setEditSubdomainModal({
                    ...editSubdomainModal,
                    subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Base Domain</label>
                <select
                  value={editSubdomainModal.baseDomain}
                  onChange={(e) => setEditSubdomainModal({
                    ...editSubdomainModal,
                    baseDomain: e.target.value,
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none"
                >
                  {(domainsData?.platformDomains || []).map((dom) => (
                    <option key={dom.domain} value={dom.domain}>
                      {dom.domain} ({dom.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-800 font-mono">
                Route: {editSubdomainModal.subdomain || '...'}.{editSubdomainModal.baseDomain}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditSubdomainModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubdomain}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingSubdomain ? 'Saving...' : 'Save & Route Subdomain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / BIND CUSTOM DOMAIN */}
      {editCustomDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Link2 className="w-4 h-4 text-indigo-600" />
                <span>Bind / Edit Custom Domain</span>
              </h3>
              <button onClick={() => setEditCustomDomainModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Bind apex or custom CNAME domain for <strong className="text-slate-900">{editCustomDomainModal.projectName}</strong>.
            </p>

            <form onSubmit={handleSaveCustomDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Domain FQDN</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. example.com or app.example.com"
                  value={editCustomDomainModal.domain}
                  onChange={(e) => setEditCustomDomainModal({
                    ...editCustomDomainModal,
                    domain: e.target.value.toLowerCase().trim(),
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCustomDomainModal.verified}
                    onChange={(e) => setEditCustomDomainModal({
                      ...editCustomDomainModal,
                      verified: e.target.checked,
                    })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Instantly verify domain and activate SSL certificate
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCustomDomainModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomDomain}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingCustomDomain ? 'Saving...' : 'Bind Custom Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Reset User Password</span>
              </h3>
              <button onClick={() => setResetPasswordModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Set a new password for <strong className="text-slate-900">{resetPasswordModal.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (minimum 6 characters)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter secure new password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span>Deployment Logs: {viewLogsDeployment._id}</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {viewLogsDeployment.projectName} • {viewLogsDeployment.status}
                </span>
              </div>
              <button onClick={() => setViewLogsDeployment(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs space-y-1.5">
              {viewLogsDeployment.logs?.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-cyan-400 shrink-0">[{log.stage}]</span>
                  <span className={log.level === 'error' ? 'text-rose-400 font-bold' : log.level === 'success' ? 'text-emerald-400' : 'text-slate-200'}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewLogsDeployment(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE AD */}
      {showNewAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Create Sponsored Ad</span>
              </h3>
              <button onClick={() => setShowNewAdModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ad Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Cloud Hosting Tools"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Brief advertising copy..."
                  value={adDesc}
                  onChange={(e) => setAdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Click URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/promo"
                  value={adTarget}
                  onChange={(e) => setAdTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Placement Spot</label>
                <select
                  value={adPlacement}
                  onChange={(e: any) => setAdPlacement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                >
                  <option value="DASHBOARD">Dashboard Header</option>
                  <option value="PROJECT_PAGE">Project Overview</option>
                  <option value="DOCUMENTATION">Documentation Pages</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAdModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
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
