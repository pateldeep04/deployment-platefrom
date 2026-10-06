import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { IProject, IDeployment, IEnvironmentVariable } from '../types';
import { Navbar } from '../components/common/Navbar';
import { TerminalLogs } from '../components/common/TerminalLogs';
import { 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  RotateCcw, 
  UploadCloud, 
  FileCode, 
  Key, 
  ShieldCheck, 
  BarChart2, 
  Settings as SettingsIcon, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check
} from 'lucide-react';
import { getLiveProjectUrl } from '../utils/url';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'pateldeeep.me';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<IProject | null>(null);
  const [deployments, setDeployments] = useState<IDeployment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'upload' | 'logs' | 'env' | 'domains' | 'analytics' | 'settings'>('overview');
  const [selectedDeployment, setSelectedDeployment] = useState<IDeployment | null>(null);
  const [envVars, setEnvVars] = useState<IEnvironmentVariable[]>([]);

  // State for env vars modal
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  // State for custom domain
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainSuccessMsg, setDomainSuccessMsg] = useState<string | null>(null);

  // State for upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);

  const fetchProjectData = async () => {
    try {
      if (!id) return;
      setIsLoading(true);
      const [projRes, depRes, envRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/deployments`),
        api.get(`/projects/${id}/env`),
      ]);

      if (projRes.data.success) {
        setProject(projRes.data.data.project);
        if (projRes.data.data.latestDeployment) {
          setSelectedDeployment(projRes.data.data.latestDeployment);
        }
      }

      if (depRes.data.success) {
        setDeployments(depRes.data.data.deployments);
        if (!selectedDeployment && depRes.data.data.deployments.length > 0) {
          setSelectedDeployment(depRes.data.data.deployments[0]);
        }
      }

      if (envRes.data.success) {
        setEnvVars(envRes.data.data.variables);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Polling for live deployment logs if building or deploying
  useEffect(() => {
    let interval: any;
    if (selectedDeployment && (selectedDeployment.status === 'BUILDING' || selectedDeployment.status === 'QUEUED' || selectedDeployment.status === 'DEPLOYING')) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/deployments/${selectedDeployment._id}/logs`);
          if (res.data.success) {
            setSelectedDeployment((prev) => prev ? {
              ...prev,
              status: res.data.data.status,
              logs: res.data.data.logs,
              completedAt: res.data.data.completedAt,
            } : null);

            if (res.data.data.status === 'LIVE' || res.data.data.status === 'FAILED') {
              clearInterval(interval);
              fetchProjectData();
            }
          }
        } catch (e) {
          // ignore
        }
      }, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDeployment]);

  const handleUploadDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !project) return;

    try {
      setIsDeploying(true);
      setDeployError(null);
      setUploadProgress(20);

      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await api.post(`/projects/${project._id}/deploy`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          if (p.total) {
            setUploadProgress(Math.round((p.loaded * 100) / p.total));
          }
        },
      });

      if (res.data.success) {
        setUploadFile(null);
        setSelectedDeployment(res.data.data.deployment);
        setActiveTab('logs');
        fetchProjectData();
      }
    } catch (err: any) {
      setDeployError(err.response?.data?.error || err.message || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async (depId: string) => {
    try {
      const res = await api.post(`/deployments/${depId}/rollback`);
      if (res.data.success) {
        alert(res.data.message);
        fetchProjectData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Rollback failed');
    }
  };

  const handleAddEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newEnvKey.trim() || !newEnvVal.trim()) return;

    try {
      const res = await api.post(`/projects/${project._id}/env`, {
        key: newEnvKey.toUpperCase().trim(),
        value: newEnvVal.trim(),
      });
      if (res.data.success) {
        setNewEnvKey('');
        setNewEnvVal('');
        const envRes = await api.get(`/projects/${project._id}/env`);
        if (envRes.data.success) setEnvVars(envRes.data.data.variables);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save variable');
    }
  };

  const handleDeleteEnv = async (key: string) => {
    if (!project) return;
    try {
      await api.delete(`/projects/${project._id}/env/${key}`);
      setEnvVars((prev) => prev.filter((v) => v.key !== key));
    } catch (e) {
      alert('Failed to remove environment variable');
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !customDomainInput.trim()) return;

    try {
      const res = await api.post(`/projects/${project._id}/domains`, { domain: customDomainInput.trim() });
      if (res.data.success) {
        setProject((prev) => prev ? { ...prev, customDomain: customDomainInput.trim(), customDomainVerified: false } : null);
        setDomainSuccessMsg(`Domain added! Please add a CNAME record pointing to cname.${PLATFORM_DOMAIN}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add custom domain');
    }
  };

  const handleVerifyDomain = async () => {
    if (!project) return;
    try {
      const res = await api.post(`/projects/${project._id}/domains/verify`);
      if (res.data.success) {
        setProject((prev) => prev ? { ...prev, customDomainVerified: true, sslEnabled: true } : null);
        setDomainSuccessMsg(res.data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Verification failed');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (window.confirm(`Are you sure you want to permanently delete project '${project.name}'? This cannot be undone.`)) {
      try {
        await api.delete(`/projects/${project._id}`);
        navigate('/dashboard');
      } catch (e: any) {
        alert(e.response?.data?.error || 'Failed to delete project');
      }
    }
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-background text-deployText flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const liveUrl = getLiveProjectUrl(project);

  return (
    <div className="min-h-screen bg-background text-deployText pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Project Header */}
        <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{project.name}</h1>
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-deployBorder text-accent">
                {project.type}
              </span>
              <span
                className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  project.status === 'ACTIVE'
                    ? 'bg-success/15 text-success border border-success/30'
                    : project.status === 'BUILDING'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-deployBorder text-deployText-secondary'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${project.status === 'ACTIVE' ? 'bg-success' : 'bg-amber-400'}`} />
                <span>{project.status}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-deployText-secondary">
              <div className="flex items-center space-x-1 font-mono text-deployText">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>{project.slug}.{PLATFORM_DOMAIN}</span>
              </div>
              <span>•</span>
              <span>Storage: {((project.storageUsed || 0) / 1024 / 1024).toFixed(1)} MB</span>
              <span>•</span>
              <span>Deployments: {deployments.length}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/projects/${project._id}/cpanel`)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-glow-primary cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-indigo-200" />
              <span>cPanel / File Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className="flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-glow-primary transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Deploy New Version</span>
            </button>

            {project.status === 'ACTIVE' && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-surface hover:bg-deployBorder border border-deployBorder text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <span>Visit Site</span>
                <ExternalLink className="w-3.5 h-3.5 text-accent" />
              </a>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-deployBorder overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'cpanel', label: 'cPanel (File Manager)' },
            { id: 'deployments', label: `Deployments (${deployments.length})` },
            { id: 'upload', label: 'Upload & Deploy' },
            { id: 'logs', label: 'Live Logs' },
            { id: 'env', label: `Environment (${envVars.length})` },
            { id: 'domains', label: 'Domains' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'cpanel') {
                  navigate(`/projects/${project._id}/cpanel`);
                } else {
                  setActiveTab(tab.id as any);
                }
              }}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-white bg-card/60'
                  : 'border-transparent text-deployText-secondary hover:text-white hover:bg-card/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Latest Deployment Summary */}
              <div className="md:col-span-2 bg-card border border-deployBorder rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Latest Deployment</h3>
                  {selectedDeployment && (
                    <span className="font-mono text-xs text-deployText-secondary">
                      Version {selectedDeployment.version}
                    </span>
                  )}
                </div>

                {selectedDeployment ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-surface border border-deployBorder flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">
                            Deployment #{selectedDeployment._id.substring(4, 10)}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 font-semibold">
                            {selectedDeployment.status}
                          </span>
                        </div>
                        <p className="text-xs text-deployText-secondary mt-1">
                          Source: {selectedDeployment.source} • Created: {new Date(selectedDeployment.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-accent hover:underline flex items-center space-x-1"
                      >
                        <span>Open Preview</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between text-xs text-deployText-secondary pt-2">
                      <button
                        onClick={() => setActiveTab('logs')}
                        className="text-primary hover:underline font-semibold flex items-center space-x-1"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>View Real-Time Terminal Logs</span>
                      </button>
                      <button
                        onClick={() => handleRollback(selectedDeployment._id)}
                        className="text-deployText-secondary hover:text-white flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-publish this version</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-deployText-secondary">No deployments recorded yet.</p>
                )}
              </div>

              {/* Edge Domain Card */}
              <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-2">Domains & Routing</h3>
                  <p className="text-xs text-deployText-secondary mb-4">Edge proxy endpoints configured for this app</p>
                  
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-surface border border-deployBorder">
                      <span className="text-[10px] uppercase font-bold text-deployText-muted block">Platform Subdomain</span>
                      <span className="text-xs font-mono text-white select-all">{project.slug}.{PLATFORM_DOMAIN}</span>
                    </div>

                    {project.customDomain && (
                      <div className="p-3 rounded-xl bg-surface border border-deployBorder">
                        <span className="text-[10px] uppercase font-bold text-deployText-muted block">Custom Domain</span>
                        <span className="text-xs font-mono text-accent select-all">{project.customDomain}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('domains')}
                  className="mt-4 text-xs font-semibold text-primary hover:underline text-left"
                >
                  Configure Custom Domains →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPLOYMENTS HISTORY */}
        {activeTab === 'deployments' && (
          <div className="bg-card border border-deployBorder rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-deployBorder flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Deployment Pipeline History</h3>
                <p className="text-xs text-deployText-secondary">Every version is immutable and can be rolled back with zero downtime</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-deployBorder text-deployText-secondary uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Version</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deployBorder">
                  {deployments.map((dep) => (
                    <tr key={dep._id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-white">
                        v{dep.version}
                        {project.currentDeploymentId === dep._id && (
                          <span className="ml-2 text-[10px] bg-primary/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded font-bold">
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                            dep.status === 'LIVE'
                              ? 'bg-success/15 text-success'
                              : dep.status === 'BUILDING'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-error'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dep.status === 'LIVE' ? 'bg-success' : 'bg-amber-400'}`} />
                          <span>{dep.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-deployText-secondary">{dep.source}</td>
                      <td className="px-6 py-4 text-deployText-secondary">
                        {new Date(dep.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => {
                            setSelectedDeployment(dep);
                            setActiveTab('logs');
                          }}
                          className="text-accent hover:underline font-semibold cursor-pointer"
                        >
                          View Logs
                        </button>
                        {project.currentDeploymentId !== dep._id && (
                          <button
                            onClick={() => handleRollback(dep._id)}
                            className="text-deployText hover:text-white font-semibold cursor-pointer"
                          >
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: UPLOAD & DEPLOY */}
        {activeTab === 'upload' && (
          <div className="bg-card border border-deployBorder rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Upload New Project Version</h3>
              <p className="text-xs text-deployText-secondary mt-1">
                Upload your updated files or project ZIP archive. The isolated worker will validate and deploy.
              </p>
            </div>

            {deployError && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deployError}</span>
              </div>
            )}

            <form onSubmit={handleUploadDeploy} className="space-y-5">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                  uploadFile ? 'border-success/60 bg-success/5' : 'border-deployBorder hover:border-primary/60 bg-surface'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.html,.htm,.css,.js,.php"
                  onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center space-y-2 text-success">
                    <CheckCircle2 className="w-10 h-10" />
                    <span className="text-sm font-semibold text-white">{uploadFile.name}</span>
                    <span className="text-xs text-deployText-secondary">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to deploy
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">Drag & drop your new project ZIP</span>
                      <span className="text-xs text-deployText-secondary">or click to browse from computer (Max 100 MB)</span>
                    </div>
                  </div>
                )}
              </div>

              {isDeploying && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-deployText-secondary">
                    <span>Uploading and enqueuing to worker...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-deployBorder h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!uploadFile || isDeploying}
                className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl shadow-glow-primary transition-all cursor-pointer"
              >
                <span>{isDeploying ? 'Deploying to Isolated Worker...' : 'Deploy Now'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: LIVE TERMINAL LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Terminal Log Stream</h3>
                <p className="text-xs text-deployText-secondary">
                  Showing logs for {selectedDeployment ? `Version ${selectedDeployment.version}` : 'latest deployment'}
                </p>
              </div>

              {deployments.length > 1 && (
                <select
                  value={selectedDeployment?._id || ''}
                  onChange={(e) => {
                    const dep = deployments.find((d) => d._id === e.target.value);
                    if (dep) setSelectedDeployment(dep);
                  }}
                  className="bg-card border border-deployBorder rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                >
                  {deployments.map((d) => (
                    <option key={d._id} value={d._id}>
                      v{d.version} ({d.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <TerminalLogs
              logs={selectedDeployment?.logs || []}
              status={selectedDeployment?.status}
              onRefresh={fetchProjectData}
              isPolling={selectedDeployment?.status === 'BUILDING'}
            />
          </div>
        )}

        {/* TAB 5: ENVIRONMENT VARIABLES */}
        {activeTab === 'env' && (
          <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Environment Variables</h3>
              <p className="text-xs text-deployText-secondary mt-1">
                Configure runtime secrets and API keys. Values are masked and encrypted at rest.
              </p>
            </div>

            {/* Add form */}
            <form onSubmit={handleAddEnv} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="KEY_NAME (e.g. API_URL)"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  className="w-full bg-surface border border-deployBorder rounded-lg px-3 py-2 text-xs font-mono text-white outline-none uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="password"
                  placeholder="Secret value"
                  value={newEnvVal}
                  onChange={(e) => setNewEnvVal(e.target.value)}
                  className="w-full bg-surface border border-deployBorder rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center space-x-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variable</span>
              </button>
            </form>

            {/* Variables table */}
            <div className="divide-y divide-deployBorder border border-deployBorder rounded-xl overflow-hidden">
              {envVars.length === 0 ? (
                <div className="p-6 text-center text-xs text-deployText-muted">
                  No environment variables defined yet.
                </div>
              ) : (
                envVars.map((v) => (
                  <div key={v._id} className="p-3.5 flex items-center justify-between bg-surface/50 text-xs">
                    <div className="flex items-center space-x-3 font-mono">
                      <Key className="w-3.5 h-3.5 text-accent" />
                      <span className="font-bold text-white">{v.key}</span>
                      <span className="text-deployText-muted">••••••••••••••••</span>
                    </div>
                    <button
                      onClick={() => handleDeleteEnv(v.key)}
                      className="text-deployText-muted hover:text-error transition-colors p-1"
                      title="Delete variable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOM DOMAINS */}
        {activeTab === 'domains' && (
          <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Custom Domain Configuration</h3>
              <p className="text-xs text-deployText-secondary mt-1">
                Attach your apex or subdomain to this deployment with automated HTTPS certificates.
              </p>
            </div>

            {domainSuccessMsg && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{domainSuccessMsg}</span>
              </div>
            )}

            {project.customDomain ? (
              <div className="p-5 rounded-xl bg-surface border border-deployBorder space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{project.customDomain}</span>
                      {project.customDomainVerified ? (
                        <span className="text-xs bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Active & Verified</span>
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                          Pending DNS Verification
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-deployText-secondary mt-1">
                      Target CNAME: <code>cname.{PLATFORM_DOMAIN}</code>
                    </p>
                  </div>

                  {!project.customDomainVerified && (
                    <button
                      onClick={handleVerifyDomain}
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                    >
                      Verify DNS & SSL
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddDomain} className="flex gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="www.myportfolio.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  className="flex-1 bg-surface border border-deployBorder rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Connect Domain
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 7: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-white mb-1">Storage Allocation</h3>
              <p className="text-xs text-deployText-secondary mb-4">Disk footprint across immutable artifact releases</p>
              <div className="text-3xl font-extrabold text-white">
                {((project.storageUsed || 0) / 1024 / 1024).toFixed(2)} MB
              </div>
              <span className="text-xs text-deployText-muted mt-1 block">Live sandboxed artifact</span>
            </div>

            <div className="bg-card border border-deployBorder rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-white mb-1">Subdomain Health</h3>
              <p className="text-xs text-deployText-secondary mb-4">Edge routing availability</p>
              <div className="text-3xl font-extrabold text-success">99.98%</div>
              <span className="text-xs text-deployText-muted mt-1 block">Zero downtime proxy</span>
            </div>
          </div>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-card border border-error/30 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-error">Danger Zone</h3>
              <p className="text-xs text-deployText-secondary">
                Permanently delete this project, all deployments, artifacts, and routing records.
              </p>
              <button
                onClick={handleDeleteProject}
                className="bg-error hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
              >
                Delete Project
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
