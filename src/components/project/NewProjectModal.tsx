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
  { domain: 'deployeai.duckdns.org', label: 'deployeai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false, isDefault: true },
  { domain: 'deploye-ai.duckdns.org', label: 'deploye-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
  { domain: 'ml-ai.duckdns.org', label: 'ml-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
  { domain: 'ai-ml.mooo.com', label: 'ai-ml.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
  { domain: 'ml-ai.mooo.com', label: 'ml-ai.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
  { domain: 'ai-ml.chickenkiller.com', label: 'ai-ml.chickenkiller.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
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
          });
        }
      } catch (e: any) {
        setDomainAvailability({
          isAvailable: false,
          message: e.response?.data?.error || 'Failed to verify availability',
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
      setError(err.response?.data?.error || err.message || 'Error creating project');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#0e1626] border border-deployBorder rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header - Pinned at top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-deployBorder bg-card/70 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Create New Project</h3>
            <p className="text-xs text-deployText-secondary">Configure your deployment runtime and source archive</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-deployText-secondary hover:text-white rounded-lg hover:bg-deployBorder transition-colors cursor-pointer"
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
              <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. my-portfolio"
                required
                className="w-full bg-card border border-deployBorder focus:border-primary rounded-xl px-3.5 py-2 text-sm text-white placeholder-deployText-muted outline-none transition-colors"
              />
            </div>

            {/* Domain & Subdomain Configuration */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-deployBorder space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-accent" />
                  <span>1. Select Platform Domain & Subdomain</span>
                </label>
                {availableDomains.find(d => d.domain === selectedDomain)?.isSsl && (
                  <span className="flex items-center space-x-1 text-[10px] font-semibold text-success bg-success/15 border border-success/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Wildcard SSL Active</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Domain Dropdown */}
                <div>
                  <span className="block text-[11px] font-medium text-deployText-secondary mb-1">
                    Choose Base Domain
                  </span>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full bg-surface border border-deployBorder focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    {availableDomains.map((d) => (
                      <option key={d.domain} value={d.domain} className="bg-surface text-white">
                        {d.label || d.domain}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subdomain Input */}
                <div>
                  <span className="block text-[11px] font-medium text-deployText-secondary mb-1">
                    Desired Subdomain
                  </span>
                  <div className="flex items-center bg-surface border border-deployBorder focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-xl px-3 py-2 transition-all">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={handleSubdomainChange}
                      placeholder="my-subdomain"
                      required
                      className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono outline-none"
                    />
                    <span className="text-xs text-accent font-mono font-medium shrink-0 pl-2 border-l border-deployBorder/60 ml-2 whitespace-nowrap">
                      .{selectedDomain}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Subdomain Availability Status Badge */}
              {subdomain && subdomain.length >= 2 && (
                <div className="pt-0.5">
                  {isCheckingDomain ? (
                    <div className="flex items-center space-x-2 text-xs text-deployText-secondary bg-surface/50 border border-deployBorder rounded-lg px-2.5 py-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                      <span>Checking availability for <code className="text-accent">{subdomain}.{selectedDomain}</code>...</span>
                    </div>
                  ) : domainAvailability?.isAvailable ? (
                    <div className="flex items-center justify-between text-xs text-success bg-success/10 border border-success/30 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
                        <span className="truncate">
                          <strong>Available!</strong> Live at: <code className="text-white font-mono">{domainAvailability.checkedFqdn || `${subdomain}.${selectedDomain}`}</code>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-success/20 px-2 py-0.5 rounded shrink-0 ml-2">Ready</span>
                    </div>
                  ) : domainAvailability && !domainAvailability.isAvailable ? (
                    <div className="flex items-center space-x-2 text-xs text-error bg-error/10 border border-error/30 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-error" />
                      <span>
                        <strong>Unavailable:</strong> {domainAvailability.message || 'This subdomain is already taken under this domain. Please choose another.'}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Deployment Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
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
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-glow-primary'
                          : 'border-deployBorder bg-card/60 hover:border-deployBorder-light'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-0.5">
                        <Icon className="w-3.5 h-3.5 text-accent" />
                        <span className="text-xs font-bold text-white">{dt.title}</span>
                      </div>
                      <p className="text-[10px] text-deployText-secondary leading-tight">{dt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ZIP or Web Files Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                Project Archive or Web Files (.zip, .html, .css, .js, .php)
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-success/50 bg-success/5'
                    : 'border-deployBorder hover:border-primary/60 bg-card/40 hover:bg-card/70'
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
                  <div className="flex flex-col items-center space-y-1 text-success py-1">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-xs font-semibold text-white">{file.name}</span>
                    <span className="text-[10px] text-deployText-secondary">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to deploy
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1.5 py-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">Drag & drop your ZIP or web files</span>
                      <span className="text-[10px] text-deployText-secondary block">Supports .zip archives or individual .html, .css, .js, .php files (Max 100 MB)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {isSubmitting && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-deployText-secondary">
                  <span>Deploying to worker pipeline...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-deployBorder h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions - Pinned at bottom */}
          <div className="px-5 sm:px-6 py-3 border-t border-deployBorder bg-card/60 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-deployText-secondary hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-glow-primary transition-all cursor-pointer"
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
