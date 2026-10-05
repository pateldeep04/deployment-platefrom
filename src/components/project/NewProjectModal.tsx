import React, { useState, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: IProject) => void;
  initialName?: string;
  initialSlug?: string;
  initialType?: 'STATIC' | 'PHP' | 'REACT' | 'VITE';
}

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'pateldeeep.in';

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialName = '',
  initialSlug = '',
  initialType = 'STATIC'
}) => {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [type, setType] = useState<'STATIC' | 'PHP' | 'REACT' | 'VITE'>(initialType);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialName) setName(initialName);
      if (initialSlug) setSlug(initialSlug);
      if (initialType) setType(initialType);
    }
  }, [isOpen, initialName, initialSlug, initialType]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setSlug(autoSlug);
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

    try {
      setIsSubmitting(true);
      setUploadProgress(15);

      // 1. Create project
      const createRes = await api.post('/projects', {
        name,
        slug: slug || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface border border-deployBorder rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-deployBorder bg-card/60">
          <div>
            <h3 className="text-lg font-bold text-white">Create New Project</h3>
            <p className="text-xs text-deployText-secondary">Configure your deployment runtime and source archive</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-deployText-secondary hover:text-white rounded-lg hover:bg-deployBorder transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Name & Auto Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="my-portfolio"
                required
                className="w-full bg-card border border-deployBorder focus:border-primary rounded-lg px-3 py-2 text-sm text-white placeholder-deployText-muted outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                URL Subdomain Slug
              </label>
              <div className="flex items-center bg-card border border-deployBorder rounded-lg px-3 py-2 text-sm text-deployText-secondary">
                <span className="text-white font-mono text-xs">{slug || 'project'}</span>
                <span className="text-xs text-accent font-mono font-medium">.{PLATFORM_DOMAIN}</span>
              </div>
            </div>
          </div>

          {/* Deployment Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-deployText-secondary mb-2">
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
                        ? 'border-primary bg-primary/10 shadow-glow-primary'
                        : 'border-deployBorder bg-card/60 hover:border-deployBorder-light'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold text-white">{dt.title}</span>
                    </div>
                    <p className="text-[11px] text-deployText-secondary leading-tight">{dt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ZIP or Web Files Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
              Project Archive or Web Files (.zip, .html, .css, .js, .php)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                <div className="flex flex-col items-center space-y-1 text-success">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-sm font-semibold text-white">{file.name}</span>
                  <span className="text-xs text-deployText-secondary">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to deploy
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Drag & drop your ZIP or web files</span>
                    <span className="text-xs text-deployText-secondary block">Supports .zip archives or individual .html, .css, .js, .php files (Max 100 MB)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isSubmitting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-deployText-secondary">
                <span>Deploying to worker pipeline...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-deployBorder h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
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
              className="flex items-center space-x-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-glow-primary transition-all cursor-pointer"
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
