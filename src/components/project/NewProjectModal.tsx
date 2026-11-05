import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { IProject } from '../../types';
import { 
  X, 
  UploadCloud, 
  FileCode, 
  Server, 
  Layers, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  FileArchive,
  ArrowRight,
  Globe,
  ShieldCheck,
  Check,
  Loader2
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: IProject) => void;
  initialName?: string;
  initialSlug?: string;
  initialType?: 'STATIC' | 'PHP' | 'REACT' | 'VITE';
}

export interface PlatformDomain {
  domain: string;
  label: string;
  provider: 'SSL' | 'DuckDNS' | 'FreeDNS';
  isSsl: boolean;
  isDefault?: boolean;
}

const DEFAULT_PLATFORM_DOMAINS: PlatformDomain[] = [
  { domain: 'deployeai.duckdns.org', label: 'deployeai.duckdns.org (DuckDNS • SSL)', provider: 'DuckDNS', isSsl: true, isDefault: true },
  { domain: 'deploye-ai.duckdns.org', label: 'deploye-ai.duckdns.org (DuckDNS • SSL)', provider: 'DuckDNS', isSsl: true },
  { domain: 'ml-ai.duckdns.org', label: 'ml-ai.duckdns.org (DuckDNS • SSL)', provider: 'DuckDNS', isSsl: true },
  { domain: 'ai-ml.mooo.com', label: 'ai-ml.mooo.com (FreeDNS • SSL)', provider: 'FreeDNS', isSsl: true },
  { domain: 'ml-ai.mooo.com', label: 'ml-ai.mooo.com (FreeDNS • SSL)', provider: 'FreeDNS', isSsl: true },
  { domain: 'ai-ml.chickenkiller.com', label: 'ai-ml.chickenkiller.com (FreeDNS • SSL)', provider: 'FreeDNS', isSsl: true },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialName = '',
  initialSlug = '',
  initialType = 'STATIC'
}) => {
  const [name, setName] = useState(initialName);
  const [subdomain, setSubdomain] = useState(initialSlug);
  const [selectedDomain, setSelectedDomain] = useState<string>('deployeai.duckdns.org');
  const [availableDomains, setAvailableDomains] = useState<PlatformDomain[]>(DEFAULT_PLATFORM_DOMAINS);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainAvailability, setDomainAvailability] = useState<{
    isAvailable: boolean;
    message?: string;
    checkedFqdn?: string;
    suggestions?: string[];
  } | null>(null);

  const [type, setType] = useState<'STATIC' | 'PHP' | 'REACT' | 'VITE'>(initialType);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch registered platform domains from backend if available
  useEffect(() => {
    if (isOpen) {
      api.get('/domains/available')
        .then((res) => {
          if (res.data?.success && res.data?.data?.domains) {
            setAvailableDomains(res.data.data.domains);
          }
        })
        .catch(() => {
          // Fall back gracefully to DEFAULT_PLATFORM_DOMAINS
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialName) setName(initialName);
      if (initialSlug) setSubdomain(initialSlug);
      if (initialType) setType(initialType);
    }
  }, [isOpen, initialName, initialSlug, initialType]);

  // Real-time domain availability check with debouncing
  useEffect(() => {
    const cleanSub = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
    if (!cleanSub || cleanSub.length < 2) {
      setDomainAvailability(null);
      return;
    }

    setIsCheckingDomain(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/subdomains/check?subdomain=${encodeURIComponent(cleanSub)}&domain=${encodeURIComponent(selectedDomain)}`);
        if (res.data.success) {
          setDomainAvailability({
            isAvailable: res.data.data.isAvailable,
            message: res.data.data.reason || (res.data.data.isAvailable ? 'Available for instant hosting!' : 'Taken'),
            checkedFqdn: res.data.data.fqdn,
            suggestions: res.data.data.suggestions || [],
          });
        }
      } catch (e: any) {
        setDomainAvailability({
          isAvailable: false,
          message: e.response?.data?.error || 'Failed to verify availability',
          suggestions: e.response?.data?.suggestions || [],
        });
      } finally {
        setIsCheckingDomain(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [subdomain, selectedDomain]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setSubdomain(autoSlug);
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(clean);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const lower = selectedFile.name.toLowerCase();
    const validExtensions = ['.zip', '.html', '.htm', '.css', '.js', '.php'];
    const hasValidExt = validExtensions.some(ext => lower.endsWith(ext));
    if (!hasValidExt) {
      setError('Please upload a .zip archive or individual file (.html, .css, .js, .php)');
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size exceeds maximum allowed upload limit (100 MB)');
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (domainAvailability && !domainAvailability.isAvailable) {
      setError(`The chosen domain '${domainAvailability.checkedFqdn || subdomain}' is already taken or unavailable. Please choose another.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(15);

      // 1. Create project with chosen subdomain and platformDomain
      const createRes = await api.post('/projects', {
        name,
        slug: subdomain || undefined,
        subdomain: subdomain || undefined,
        platformDomain: selectedDomain,
        type,
      });

      if (!createRes.data.success) {
        throw new Error(createRes.data.error || 'Failed to create project');
      }

      const createdProject: IProject = createRes.data.data.project;
      setUploadProgress(50);

      // 2. If file uploaded, deploy it immediately
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        await api.post(`/projects/${createdProject._id}/deploy`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round(50 + (progressEvent.loaded * 50) / progressEvent.total);
              setUploadProgress(pct);
            }
          },
        });
      }

      setUploadProgress(100);
      onSuccess(createdProject);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.suggestions) {
        setDomainAvailability({
          isAvailable: false,
          message: err.response.data.error || 'Subdomain was claimed by another user.',
          suggestions: err.response.data.suggestions,
        });
        setError('Domain Conflict: Someone claimed this subdomain right at this moment. Please choose one of the available suggestions below.');
      } else {
        setError(err.response?.data?.error || err.message || 'Error creating project');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deploymentTypes = [
    {
      id: 'STATIC',
      title: 'Static Website',
      desc: 'HTML, CSS & JavaScript combination with instant edge serving',
      icon: FileCode,
      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    },
    {
      id: 'PHP',
      title: 'PHP Website',
      desc: 'PHP backend scripts combined with HTML, CSS & JavaScript',
      icon: Server,
      color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        
        {/* Header - Pinned at top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Create New Project</h3>
            <p className="text-xs text-slate-500">Configure your deployment runtime and source archive</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
            {error && (
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. my-portfolio"
                required
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
              />
            </div>

            {/* Domain & Subdomain Configuration */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Select Platform Domain & Subdomain</span>
                </label>
                {availableDomains.find(d => d.domain === selectedDomain)?.isSsl && (
                  <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Wildcard SSL Active</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Domain Dropdown */}
                <div>
                  <span className="block text-[11px] font-medium text-slate-600 mb-1">
                    Choose Base Domain
                  </span>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none cursor-pointer"
                  >
                    {availableDomains.map((d) => (
                      <option key={d.domain} value={d.domain} className="bg-white text-slate-900">
                        {d.label || d.domain}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subdomain Input */}
                <div>
                  <span className="block text-[11px] font-medium text-slate-600 mb-1">
                    Desired Subdomain
                  </span>
                  <div className="flex items-center bg-white border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 rounded-xl px-3 py-2 transition-all">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={handleSubdomainChange}
                      placeholder="my-subdomain"
                      required
                      className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 font-mono outline-none placeholder-slate-400"
                    />
                    <span className="text-xs text-blue-600 font-mono font-medium shrink-0 pl-2 border-l border-slate-200 ml-2 whitespace-nowrap">
                      .{selectedDomain}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Subdomain Availability Status Badge */}
              {subdomain && subdomain.length >= 2 && (
                <div className="pt-0.5">
                  {isCheckingDomain ? (
                    <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Checking availability for <code className="text-blue-700">{subdomain}.{selectedDomain}</code>...</span>
                    </div>
                  ) : domainAvailability?.isAvailable ? (
                    <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">
                          <strong>Available!</strong> Live at: <code className="text-slate-900 font-mono font-semibold">{domainAvailability.checkedFqdn || `${subdomain}.${selectedDomain}`}</code>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shrink-0 ml-2">Ready</span>
                    </div>
                  ) : domainAvailability && !domainAvailability.isAvailable ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>
                          <strong>Unavailable:</strong> {domainAvailability.message || 'This subdomain is already taken.'}
                        </span>
                      </div>
                      {domainAvailability.suggestions && domainAvailability.suggestions.length > 0 && (
                        <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs space-y-1.5">
                          <span className="font-semibold text-slate-700 block">Available suggestions (click to use):</span>
                          <div className="flex flex-wrap gap-1.5">
                            {domainAvailability.suggestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => setSubdomain(sug)}
                                className="px-2 py-0.5 rounded border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-mono text-[11px] font-medium transition-colors cursor-pointer"
                                title={`Click to use ${sug}.${selectedDomain}`}
                              >
                                + {sug}.{selectedDomain}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Deployment Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Deployment Runtime
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {deploymentTypes.map((dt) => {
                  const Icon = dt.icon;
                  const isSelected = type === dt.id;
                  return (
                    <div
                      key={dt.id}
                      onClick={() => setType(dt.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600 text-blue-950'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900">{dt.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{dt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ZIP or Web Files Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Project Archive or Web Files (.zip, .html, .css, .js, .php)
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-slate-100/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.html,.htm,.css,.js,.php"
                  onChange={(e) => e.target.files && validateAndSetFile(e.target.files[0])}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center space-y-1 text-emerald-600 py-1">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-xs font-semibold text-slate-900">{file.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to deploy
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1.5 py-1">
                    <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Drag & drop your ZIP or web files</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Supports .zip archives or individual .html, .css, .js, .php files (Max 100 MB)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {isSubmitting && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Deploying to worker pipeline...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions - Pinned at bottom */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <span>{isSubmitting ? 'Deploying...' : 'Create & Deploy'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
