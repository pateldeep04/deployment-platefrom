import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import {
  Folder,
  FolderPlus,
  File,
  FileCode,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  UploadCloud,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Code2,
  Sparkles,
  ChevronRight,
  Server,
  Layers,
  CheckCircle2,
  Copy,
  X,
  Archive,
  FolderDown,
  FileArchive,
  PackageOpen
} from 'lucide-react';
import { getLiveProjectUrl } from '../utils/url';

interface IProjectFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  extension: string;
  isEditable: boolean;
  isArchive?: boolean;
  archiveType?: 'zip' | 'rar' | 'archive';
}

interface IProjectMeta {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  deploymentUrl: string;
}

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'deployeai.duckdns.org';

export const CPanelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<IProjectMeta | null>(null);
  const [files, setFiles] = useState<IProjectFile[]>([]);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<IProjectFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals & Panels
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [itemToRename, setItemToRename] = useState<IProjectFile | null>(null);
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewKey, setPreviewKey] = useState<number>(Date.now());
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Archive Extractor State
  const [archiveToExtract, setArchiveToExtract] = useState<IProjectFile | null>(null);
  const [extractTargetDir, setExtractTargetDir] = useState<string>('');
  const [autoPromoteArchive, setAutoPromoteArchive] = useState<boolean>(true);
  const [deleteArchiveAfter, setDeleteArchiveAfter] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isUploadingArchive, setIsUploadingArchive] = useState<boolean>(false);
  const [showExtractModal, setShowExtractModal] = useState<boolean>(false);
  const [extractedStats, setExtractedStats] = useState<{ count: number; format?: string } | null>(null);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadArchiveInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(13);
  const [cursorPosition, setCursorPosition] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch File List
  const fetchFiles = useCallback(async (dirToLoad: string = currentDir) => {
    if (!id) return;
    try {
      setIsLoadingFiles(true);
      const res = await api.get(`/projects/${id}/files`, {
        params: { dir: dirToLoad }
      });
      if (res.data.success) {
        setProject(res.data.data.project);
        setFiles(res.data.data.files);
        setCurrentDir(res.data.data.currentDir);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load files', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [id, currentDir]);

  useEffect(() => {
    fetchFiles('');
  }, [id]);

  const openExtractModal = (file: IProjectFile) => {
    setArchiveToExtract(file);
    setExtractTargetDir(currentDir);
    setShowExtractModal(true);
  };

  // Archive extraction trigger
  const handleExtractArchive = async (customArchive?: IProjectFile) => {
    const targetArchive = customArchive || archiveToExtract;
    if (!targetArchive || !id) return;

    try {
      setIsExtracting(true);
      const res = await api.post(`/projects/${id}/files/extract`, {
        archivePath: targetArchive.path,
        targetDir: extractTargetDir,
        autoPromote: autoPromoteArchive,
        deleteArchiveAfter: deleteArchiveAfter
      });

      if (res.data.success) {
        showToast(res.data.message || `Extracted archive ${targetArchive.name} successfully!`);
        setExtractedStats({
          count: res.data.data.extractedCount,
          format: res.data.data.archiveFormat
        });
        setShowExtractModal(false);
        setPreviewKey(Date.now());
        await fetchFiles(currentDir);

        if (deleteArchiveAfter && selectedFile?.path === targetArchive.path) {
          setSelectedFile(null);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to extract archive', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // 1-Click Upload and Extract
  const handleUploadAndExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetDir', currentDir);
    formData.append('autoPromote', 'true');

    try {
      setIsUploadingArchive(true);
      showToast(`Uploading & extracting ${file.name}...`, 'success');
      const res = await api.post(`/projects/${id}/files/upload-and-extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast(res.data.message || `Extracted ${file.name} successfully!`);
        setPreviewKey(Date.now());
        await fetchFiles(currentDir);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to upload and extract archive', 'error');
    } finally {
      setIsUploadingArchive(false);
      if (uploadArchiveInputRef.current) {
        uploadArchiveInputRef.current.value = '';
      }
    }
  };

  // 2. Open File for Editing or Archive Station
  const openFile = async (file: IProjectFile) => {
    if (file.isDirectory) {
      setCurrentDir(file.path);
      fetchFiles(file.path);
      return;
    }

    if (file.isArchive || ['zip', 'rar', 'tar', 'gz', 'tgz', '7z'].includes(file.extension.toLowerCase())) {
      setSelectedFile(file);
      setArchiveToExtract(file);
      setExtractTargetDir(currentDir);
      setExtractedStats(null);
      return;
    }

    if (!file.isEditable) {
      showToast(`'${file.name}' is binary or not directly editable.`, 'error');
      return;
    }

    try {
      setIsLoadingContent(true);
      setSelectedFile(file);
      const res = await api.get(`/projects/${id}/files/content`, {
        params: { file: file.path }
      });
      if (res.data.success) {
        setFileContent(res.data.data.content);
        setOriginalContent(res.data.data.content);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to read file', 'error');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // 3. Save File Content
  const handleSaveContent = async () => {
    if (!selectedFile || !id) return;
    try {
      setIsSaving(true);
      const res = await api.put(`/projects/${id}/files/content`, {
        file: selectedFile.path,
        content: fileContent
      });
      if (res.data.success) {
        setOriginalContent(fileContent);
        showToast(`Saved '${selectedFile.name}' to live site!`);
        // Refresh preview iframe
        setPreviewKey(Date.now());
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save file', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedFile) {
          handleSaveContent();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, fileContent]);

  // Auto-Save effect
  useEffect(() => {
    if (!autoSaveEnabled || !selectedFile || !hasUnsavedChanges || isSaving) return;
    const timer = setTimeout(() => {
      handleSaveContent();
    }, 2500);
    return () => clearTimeout(timer);
  }, [fileContent, autoSaveEnabled, hasUnsavedChanges, isSaving, selectedFile]);

  // Tab key & cursor tracker inside editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      target.value = val.substring(0, start) + '  ' + val.substring(end);
      target.selectionStart = target.selectionEnd = start + 2;
      setFileContent(target.value);
    }
  };

  const updateCursorPos = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const val = target.value.substring(0, target.selectionStart);
    const lines = val.split('\n');
    setCursorPosition({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Compress folder to ZIP
  const handleCompressFolder = async () => {
    if (!id) return;
    setIsCompressing(true);
    try {
      const folderName = currentDir ? currentDir.split('/').pop() : project?.slug || 'site';
      const res = await api.post(`/projects/${id}/files/compress`, {
        targetDir: currentDir,
        archiveName: `${folderName}-backup.zip`,
      });
      if (res.data.success) {
        showToast(res.data.message || 'Folder compressed to ZIP successfully!');
        fetchFiles(currentDir);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to compress folder', 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  // 4. Create New File
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !id) return;

    try {
      const res = await api.post(`/projects/${id}/files/create`, {
        type: 'file',
        targetDir: currentDir,
        name: newFileName.trim()
      });

      if (res.data.success) {
        showToast(`Created file '${newFileName.trim()}'`);
        setNewFileName('');
        setShowNewFileModal(false);
        await fetchFiles(currentDir);
        // Automatically open the new file in editor
        const createdPath = res.data.data.path;
        const newFileEntry: IProjectFile = {
          name: newFileName.trim(),
          path: createdPath,
          isDirectory: false,
          size: 0,
          modifiedAt: new Date().toISOString(),
          extension: createdPath.split('.').pop() || '',
          isEditable: true
        };
        openFile(newFileEntry);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create file', 'error');
    }
  };

  // 5. Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !id) return;

    try {
      const res = await api.post(`/projects/${id}/files/create`, {
        type: 'folder',
        targetDir: currentDir,
        name: newFolderName.trim()
      });

      if (res.data.success) {
        showToast(`Created folder '${newFolderName.trim()}'`);
        setNewFolderName('');
        setShowNewFolderModal(false);
        fetchFiles(currentDir);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create folder', 'error');
    }
  };

  // 6. Delete File or Folder
  const handleDeleteItem = async (file: IProjectFile) => {
    if (!window.confirm(`Are you sure you want to delete '${file.name}'?`)) return;
    try {
      const res = await api.delete(`/projects/${id}/files`, {
        params: { path: file.path }
      });
      if (res.data.success) {
        showToast(`Deleted '${file.name}'`);
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
        }
        fetchFiles(currentDir);
        setPreviewKey(Date.now());
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  // 7. Rename File or Folder
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToRename || !renameNewName.trim() || !id) return;

    try {
      const res = await api.post(`/projects/${id}/files/rename`, {
        oldPath: itemToRename.path,
        newName: renameNewName.trim()
      });
      if (res.data.success) {
        showToast(`Renamed to '${renameNewName.trim()}'`);
        setItemToRename(null);
        setRenameNewName('');
        fetchFiles(currentDir);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to rename', 'error');
    }
  };

  // 8. Upload Individual Files
  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !id) return;

    const formData = new FormData();
    formData.append('targetDir', currentDir);
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      showToast('Uploading files to cPanel...', 'success');
      const res = await api.post(`/projects/${id}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast(res.data.message || 'Files uploaded successfully!');
        fetchFiles(currentDir);
        setPreviewKey(Date.now());
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    }
  };

  // 9. Quick Template Initializer
  const handleInitTemplate = async (template: 'STATIC' | 'PHP') => {
    if (!id) return;
    if (files.length > 0 && !window.confirm('Initializing a template will add starter index, style, and script files. Continue?')) {
      return;
    }
    try {
      const res = await api.post(`/projects/${id}/files/initialize-template`, { template });
      if (res.data.success) {
        showToast(res.data.message);
        await fetchFiles('');
        setPreviewKey(Date.now());
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to initialize template', 'error');
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Helper file icon renderer
  const renderFileIcon = (file: IProjectFile) => {
    if (file.isDirectory) {
      return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    const ext = file.extension.toLowerCase();
    if (file.isArchive || ['zip', 'rar', 'tar', 'gz', 'tgz', '7z'].includes(ext)) {
      if (ext === 'zip') {
        return (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1 shrink-0">
            <FileArchive className="w-3 h-3 text-amber-400" />
            <span>ZIP</span>
          </span>
        );
      }
      if (ext === 'rar') {
        return (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center space-x-1 shrink-0">
            <Archive className="w-3 h-3 text-purple-400" />
            <span>RAR</span>
          </span>
        );
      }
      return (
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
          ARC
        </span>
      );
    }
    if (ext === 'html' || ext === 'htm') {
      return <span className="text-[10px] font-black px-1 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">HTML</span>;
    }
    if (ext === 'css') {
      return <span className="text-[10px] font-black px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">CSS</span>;
    }
    if (ext === 'js' || ext === 'mjs') {
      return <span className="text-[10px] font-black px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">JS</span>;
    }
    if (ext === 'php') {
      return <span className="text-[10px] font-black px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">PHP</span>;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico'].includes(ext)) {
      return <Eye className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-deployText-secondary shrink-0" />;
  };

  const hasUnsavedChanges = fileContent !== originalContent;
  const liveUrl = project ? getLiveProjectUrl(project) : '';

  return (
    <div className="min-h-screen bg-[#070b14] text-deployText flex flex-col font-sans">
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
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* cPanel Top Control Bar */}
      <div className="bg-[#0b1120] border-b border-[#1e293b] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Breadcrumb & Project Identity */}
          <div className="flex items-center space-x-3">
            <Link
              to={`/projects/${id}`}
              className="p-1.5 rounded-lg bg-surface hover:bg-deployBorder text-deployText-secondary hover:text-white transition-colors"
              title="Back to Project Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                cPanel
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{project?.name || 'Project'}</span>
                <span className="text-xs font-normal text-deployText-secondary font-mono">
                  ({project?.slug}.{PLATFORM_DOMAIN})
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                showPreview
                  ? 'bg-primary text-white border-primary shadow-glow-primary'
                  : 'bg-surface hover:bg-deployBorder border-deployBorder text-deployText'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Hide Live Preview' : 'Live Preview'}</span>
            </button>

            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <span>Visit Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* cPanel Main Toolbar */}
      <div className="bg-[#0e1626] border-b border-[#1e293b] px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNewFileModal(true)}
              className="flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>

            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center space-x-1.5 bg-surface hover:bg-deployBorder border border-deployBorder text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => uploadInputRef.current?.click()}
              className="flex items-center space-x-1.5 bg-surface hover:bg-deployBorder border border-deployBorder text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-accent" />
              <span>Upload Files</span>
            </button>
            <input
              type="file"
              ref={uploadInputRef}
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            <button
              onClick={() => uploadArchiveInputRef.current?.click()}
              disabled={isUploadingArchive}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Upload and automatically extract .zip or .rar archive into this folder"
            >
              {isUploadingArchive ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              ) : (
                <FolderDown className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isUploadingArchive ? 'Unpacking Code...' : 'Upload & Extract (ZIP/RAR)'}</span>
            </button>
            <input
              type="file"
              ref={uploadArchiveInputRef}
              accept=".zip,.rar,.tar,.gz,.tgz,.7z"
              className="hidden"
              onChange={handleUploadAndExtract}
            />

            <button
              onClick={handleCompressFolder}
              disabled={isCompressing}
              className="flex items-center space-x-1.5 bg-surface hover:bg-deployBorder border border-deployBorder text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Compress this current folder into a downloadable .zip archive"
            >
              {isCompressing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isCompressing ? 'Compressing...' : 'Compress (ZIP)'}</span>
            </button>
            {/* Template drop */}
            <div className="relative group inline-block">
              <button
                className="flex items-center space-x-1.5 bg-surface hover:bg-deployBorder border border-deployBorder text-deployText-secondary hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Templates</span>
              </button>
              <div className="absolute left-0 mt-1 w-52 bg-surface border border-deployBorder rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-30">
                <button
                  onClick={() => handleInitTemplate('STATIC')}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-card text-deployText hover:text-white flex items-center space-x-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Static (HTML, CSS, JS)</span>
                </button>
                <button
                  onClick={() => handleInitTemplate('PHP')}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-card text-deployText hover:text-white flex items-center space-x-2"
                >
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PHP (PHP, HTML, CSS, JS)</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => fetchFiles(currentDir)}
              className="p-1.5 rounded-lg bg-surface hover:bg-deployBorder text-deployText-secondary hover:text-white transition-colors cursor-pointer"
              title="Refresh file tree"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Current Path Navigation */}
          <div className="flex items-center space-x-1 text-xs text-deployText-secondary font-mono bg-[#070b14] px-2.5 py-1 rounded-md border border-[#1e293b]">
            <button
              onClick={() => { setCurrentDir(''); fetchFiles(''); }}
              className="hover:text-accent text-deployText font-semibold cursor-pointer"
            >
              root
            </button>
            {currentDir &&
              currentDir.split('/').map((seg, idx, arr) => {
                const segPath = arr.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={segPath}>
                    <ChevronRight className="w-3 h-3 text-deployText-secondary" />
                    <button
                      onClick={() => { setCurrentDir(segPath); fetchFiles(segPath); }}
                      className="hover:text-accent text-deployText cursor-pointer"
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>
        </div>
      </div>

      {/* cPanel Workspace: Two-Pane Split View */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* LEFT COLUMN: File Explorer Tree */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full md:w-80 shrink-0 bg-[#0c1322] border rounded-2xl flex flex-col overflow-hidden transition-all ${
            isDraggingOver ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-[#1e293b]'
          }`}
        >
          {/* File explorer header */}
          <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between bg-[#0e1626]/70">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Folder className="w-3.5 h-3.5 text-accent" />
              <span>File Explorer</span>
            </span>
            <span className="text-[11px] font-mono text-deployText-secondary">
              {files.length} items
            </span>
          </div>

          {/* Drag & Drop Alert */}
          {isDraggingOver && (
            <div className="p-3 m-2 rounded-xl bg-primary/20 border border-primary/40 text-center text-xs text-primary font-semibold">
              Drop files here to upload into {currentDir || 'root'}
            </div>
          )}

          {/* Files List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[#1e293b]/20">
            {currentDir && (
              <button
                onClick={() => {
                  const parent = currentDir.split('/').slice(0, -1).join('/');
                  setCurrentDir(parent);
                  fetchFiles(parent);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center space-x-2 hover:bg-[#152033] text-deployText-secondary hover:text-white transition-colors cursor-pointer"
              >
                <Folder className="w-4 h-4 text-amber-400/80" />
                <span className="font-semibold">.. (Parent Directory)</span>
              </button>
            )}

            {files.length === 0 && !isLoadingFiles && (
              <div className="text-center py-10 px-4">
                <FileCode className="w-10 h-10 text-deployText-secondary/40 mx-auto mb-2" />
                <p className="text-xs text-deployText-secondary">No files in this folder.</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <button
                    onClick={() => handleInitTemplate('STATIC')}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    + Initialize Static Starter (HTML/CSS/JS)
                  </button>
                  <button
                    onClick={() => handleInitTemplate('PHP')}
                    className="text-xs text-indigo-400 hover:underline font-semibold"
                  >
                    + Initialize PHP Starter
                  </button>
                </div>
              </div>
            )}

            {files.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => openFile(file)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 border border-primary/40 text-white font-semibold'
                      : 'hover:bg-[#152033] text-deployText hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    {renderFileIcon(file)}
                    <span className="truncate">{file.name}</span>
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(file.isArchive || ['zip', 'rar', 'tar', 'gz', 'tgz', '7z'].includes(file.extension.toLowerCase())) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openExtractModal(file);
                        }}
                        className="p-1 hover:text-amber-300 rounded text-amber-400"
                        title={`Extract ${file.extension.toUpperCase()} code into project`}
                      >
                        <FolderDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToRename(file);
                        setRenameNewName(file.name);
                      }}
                      className="p-1 hover:text-accent rounded text-deployText-secondary"
                      title="Rename"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(file);
                      }}
                      className="p-1 hover:text-rose-400 rounded text-deployText-secondary"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick upload drop hint */}
          <div className="p-3 border-t border-[#1e293b] bg-[#0e1626]/40 text-center">
            <p className="text-[11px] text-deployText-secondary">
              Drag & drop <strong className="text-deployText">.html, .css, .js, .php</strong> directly here
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Code Editor & Live Preview */}
        <div className="flex-1 flex flex-col bg-[#0c1322] border border-[#1e293b] rounded-2xl overflow-hidden min-h-[500px]">
          
          {/* Editor Header */}
          <div className="px-4 py-2.5 border-b border-[#1e293b] flex items-center justify-between bg-[#0e1626]/80">
            <div className="flex items-center space-x-2 truncate">
              {selectedFile ? (
                <>
                  {selectedFile.isArchive ? (
                    <FolderDown className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Code2 className="w-4 h-4 text-accent shrink-0" />
                  )}
                  <span className="text-xs font-mono font-bold text-white truncate">
                    {selectedFile.path}
                  </span>
                  {selectedFile.isArchive && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                      {selectedFile.extension.toUpperCase()} Archive
                    </span>
                  )}
                  {!selectedFile.isArchive && hasUnsavedChanges && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Unsaved *
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-semibold text-deployText-secondary">
                  No file selected
                </span>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center space-x-2">
                {selectedFile.isArchive ? (
                  <button
                    onClick={() => handleExtractArchive(selectedFile)}
                    disabled={isExtracting}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderDown className="w-3.5 h-3.5" />
                    )}
                    <span>{isExtracting ? 'Extracting...' : `Extract ${selectedFile.extension.toUpperCase()}`}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveContent}
                    disabled={isSaving || !hasUnsavedChanges}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      hasUnsavedChanges
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-primary'
                        : 'bg-surface text-deployText-secondary opacity-60 cursor-not-allowed'
                    }`}
                    title="Ctrl + S to Save"
                  >
                    <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                    <span>{isSaving ? 'Saving...' : 'Save File (Ctrl+S)'}</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:text-white text-deployText-secondary rounded cursor-pointer"
                  title="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Main Work Area (Editor + Split Preview OR Archive Station) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* Editor or Archive Station */}
            <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'lg:border-r border-[#1e293b]' : ''}`}>
              {selectedFile ? (
                selectedFile.isArchive ? (
                  /* Archive Extractor Control Station */
                  <div className="flex-1 flex flex-col p-6 sm:p-8 bg-[#070b14] overflow-y-auto">
                    <div className="max-w-2xl mx-auto w-full space-y-6">
                      
                      {/* Archive Hero Card */}
                      <div className="bg-[#0e1626] border border-[#1e293b] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#1e293b]">
                          <div className="flex items-center space-x-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg ${
                              selectedFile.extension.toLowerCase() === 'rar'
                                ? 'bg-purple-950/60 border-purple-500/40 text-purple-400'
                                : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                            }`}>
                              {selectedFile.extension.toLowerCase() === 'rar' ? (
                                <Archive className="w-7 h-7" />
                              ) : (
                                <FileArchive className="w-7 h-7" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h2 className="text-lg font-bold text-white font-mono">{selectedFile.name}</h2>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border font-sans ${
                                  selectedFile.extension.toLowerCase() === 'rar'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}>
                                  {selectedFile.extension.toUpperCase()} ARCHIVE
                                </span>
                              </div>
                              <p className="text-xs text-deployText-secondary mt-1">
                                File Size: <strong className="text-white">{(selectedFile.size / 1024).toFixed(1)} KB</strong> &bull; Modified: {new Date(selectedFile.modifiedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Extraction Configuration */}
                        <div className="pt-6 space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                              Extract Code to Destination Directory
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={extractTargetDir}
                                onChange={(e) => setExtractTargetDir(e.target.value)}
                                placeholder="e.g. / or css or subfolder (leave empty for current folder)"
                                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                              />
                              <button
                                type="button"
                                onClick={() => setExtractTargetDir('')}
                                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                                  extractTargetDir === ''
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-surface hover:bg-deployBorder text-deployText-secondary border-deployBorder'
                                }`}
                              >
                                Root (/)
                              </button>
                            </div>
                            <p className="text-[11px] text-deployText-secondary mt-1">
                              Destination: <code className="text-amber-300">/sites/{project?.slug}/{extractTargetDir ? `${extractTargetDir}/` : ''}</code>
                            </p>
                          </div>

                          {/* Options */}
                          <div className="space-y-2 pt-2">
                            <label className="flex items-start space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoPromoteArchive}
                                onChange={(e) => setAutoPromoteArchive(e.target.checked)}
                                className="mt-0.5 rounded border-deployBorder bg-[#070b14] text-amber-500 focus:ring-amber-400"
                              />
                              <div>
                                <span className="text-xs font-semibold text-white">Auto-flatten single wrapper directory</span>
                                <p className="text-[11px] text-deployText-secondary">
                                  If the archive has a single parent directory (e.g. <code>my-site/index.html</code>), its contents will automatically be promoted to the target folder so <code>index.html</code> is immediately served.
                                </p>
                              </div>
                            </label>

                            <label className="flex items-start space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={deleteArchiveAfter}
                                onChange={(e) => setDeleteArchiveAfter(e.target.checked)}
                                className="mt-0.5 rounded border-deployBorder bg-[#070b14] text-amber-500 focus:ring-amber-400"
                              />
                              <div>
                                <span className="text-xs font-semibold text-white">Delete archive file after successful extraction</span>
                                <p className="text-[11px] text-deployText-secondary">
                                  Removes this <code>.{selectedFile.extension}</code> archive after unpacking to free up storage space.
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* Extraction Button */}
                          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                            <button
                              onClick={() => handleExtractArchive(selectedFile)}
                              disabled={isExtracting}
                              className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isExtracting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                                  <span>Decompressing & Unpacking Code...</span>
                                </>
                              ) : (
                                <>
                                  <FolderDown className="w-4 h-4 text-slate-950" />
                                  <span>Extract {selectedFile.extension.toUpperCase()} Code to Site</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Extracted Result Feedback */}
                          {extractedStats && (
                            <div className="mt-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-center justify-between animate-in fade-in">
                              <div className="flex items-center space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-white">
                                    Successfully extracted {extractedStats.count} files!
                                  </p>
                                  <p className="text-[11px] text-emerald-300/80">
                                    Your website code is deployed and ready on edge runtime.
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setShowPreview(true);
                                  setPreviewKey(Date.now());
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shrink-0"
                              >
                                View in Live Preview
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Security & Feature Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-4 rounded-xl bg-[#0e1626] border border-[#1e293b] space-y-1">
                          <h4 className="font-semibold text-white flex items-center space-x-1.5">
                            <Server className="w-3.5 h-3.5 text-accent" />
                            <span>Sandboxed Unpacking</span>
                          </h4>
                          <p className="text-[11px] text-deployText-secondary">
                            Integrated path traversal protection and decompression bomb checks verify every archive entry before writing to disk.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0e1626] border border-[#1e293b] space-y-1">
                          <h4 className="font-semibold text-white flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Instant Edge Serving</span>
                          </h4>
                          <p className="text-[11px] text-deployText-secondary">
                            Extracted static files (HTML, CSS, JS) and PHP scripts are immediately served on your custom subdomain.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  /* Professional Code Editor with Line Numbers, Status Bar, and Auto-Save */
                  <div className="relative flex-1 flex flex-col bg-[#070b14] overflow-hidden">
                    {/* Editor Status Bar */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0f1d] border-b border-[#1e293b] text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 uppercase font-bold">
                          {selectedFile.extension.toUpperCase() || 'PLAINTEXT'}
                        </span>
                        <span className="text-[11px] text-deployText-secondary font-mono">
                          Ln {cursorPosition.line}, Col {cursorPosition.col} • {fileContent.split('\n').length} lines • {(new TextEncoder().encode(fileContent).length / 1024).toFixed(1)} KB
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-deployText-secondary hover:text-white select-none">
                          <input
                            type="checkbox"
                            checked={autoSaveEnabled}
                            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                            className="rounded border-deployBorder bg-[#070b14] text-emerald-500 focus:ring-emerald-400 w-3 h-3"
                          />
                          <span>Auto-Save (2.5s)</span>
                        </label>

                        <div className="flex items-center space-x-1 bg-[#111827] border border-[#1e293b] rounded px-1.5 py-0.5">
                          <button
                            onClick={() => setFontSize(Math.max(11, fontSize - 1))}
                            className="text-[11px] text-deployText-secondary hover:text-white px-1"
                            title="Decrease font size"
                          >
                            A-
                          </button>
                          <span className="text-[10px] text-deployText font-mono px-1">{fontSize}px</span>
                          <button
                            onClick={() => setFontSize(Math.min(18, fontSize + 1))}
                            className="text-[11px] text-deployText-secondary hover:text-white px-1"
                            title="Increase font size"
                          >
                            A+
                          </button>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                          UTF-8
                        </span>
                      </div>
                    </div>

                    {/* Main Editor Body */}
                    {isLoadingContent ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-deployText-secondary">
                        <RefreshCw className="w-5 h-5 text-primary animate-spin mr-2" />
                        Loading file contents...
                      </div>
                    ) : (
                      <div className="flex-1 flex overflow-hidden">
                        {/* Line Numbers Gutter */}
                        <div
                          ref={lineNumbersRef}
                          className="w-12 py-4 select-none bg-[#0a0f1d] border-r border-[#1e293b] text-deployText-secondary/40 font-mono text-right pr-3 overflow-hidden"
                          style={{ fontSize: `${fontSize}px`, lineHeight: '1.625' }}
                        >
                          {fileContent.split('\n').map((_, idx) => (
                            <div
                              key={idx}
                              className={cursorPosition.line === idx + 1 ? 'text-primary font-bold' : ''}
                            >
                              {idx + 1}
                            </div>
                          ))}
                        </div>

                        {/* Textarea */}
                        <textarea
                          ref={textareaRef}
                          value={fileContent}
                          onChange={(e) => {
                            setFileContent(e.target.value);
                            updateCursorPos(e);
                          }}
                          onKeyUp={updateCursorPos}
                          onClick={updateCursorPos}
                          onScroll={handleEditorScroll}
                          onKeyDown={handleEditorKeyDown}
                          spellCheck={false}
                          className="w-full flex-1 p-4 bg-transparent text-emerald-300 font-mono leading-relaxed resize-none focus:outline-none selection:bg-primary/30 whitespace-pre overflow-auto"
                          style={{ fontSize: `${fontSize}px`, lineHeight: '1.625', tabSize: 2 }}
                          placeholder="Start writing HTML, CSS, JS or PHP code..."
                        />
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* Empty Selection State */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#070b14]">
                  <div className="w-16 h-16 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4 text-accent">
                    <FileCode className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Select a File or Archive</h3>
                  <p className="text-xs text-deployText-secondary max-w-sm mb-6">
                    Click any HTML, CSS, JavaScript, or PHP file to edit code, or select a <strong className="text-amber-400">.ZIP</strong> or <strong className="text-purple-400">.RAR</strong> archive to unpack your website.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => uploadArchiveInputRef.current?.click()}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs text-amber-300 font-semibold transition-colors cursor-pointer"
                    >
                      <FolderDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload & Extract ZIP/RAR</span>
                    </button>
                    <button
                      onClick={() => setShowNewFileModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-deployBorder border border-deployBorder text-xs text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-accent" />
                      <span>Create index.html</span>
                    </button>
                    <button
                      onClick={() => handleInitTemplate('STATIC')}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-deployBorder border border-deployBorder text-xs text-white transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Static Starter</span>
                    </button>
                    <button
                      onClick={() => handleInitTemplate('PHP')}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-deployBorder border border-deployBorder text-xs text-white transition-colors cursor-pointer"
                    >
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      <span>PHP Starter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Split Screen Live Preview */}
            {showPreview && (
              <div className="w-full lg:w-1/2 flex flex-col bg-[#070b14] border-t lg:border-t-0 border-[#1e293b]">
                <div className="px-3 py-2 border-b border-[#1e293b] bg-[#0e1626]/70 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white">Live Site Preview</span>
                  </div>
                  <button
                    onClick={() => setPreviewKey(Date.now())}
                    className="p-1 rounded hover:bg-surface text-deployText-secondary hover:text-white text-xs flex items-center space-x-1"
                    title="Reload Preview"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="text-[10px]">Reload</span>
                  </button>
                </div>
                <div className="flex-1 bg-white relative">
                  <iframe
                    key={previewKey}
                    src={liveUrl}
                    title="Live Site Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal: New File */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>Create New File</span>
              </h3>
              <button
                onClick={() => setShowNewFileModal(false)}
                className="p-1 text-deployText-secondary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                  File Name (e.g. index.html, style.css, script.js, index.php)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="index.html"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Quick extension shortcuts */}
              <div className="flex flex-wrap gap-1.5">
                {['index.html', 'style.css', 'script.js', 'index.php', 'about.html', 'contact.php'].map((sample) => (
                  <button
                    type="button"
                    key={sample}
                    onClick={() => setNewFileName(sample)}
                    className="px-2 py-1 rounded bg-[#172033] hover:bg-[#1e293b] text-[11px] font-mono text-deployText transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFileModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-deployBorder text-xs text-deployText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary"
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Folder */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Create New Folder</span>
              </h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="p-1 text-deployText-secondary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                  Folder Name (e.g. css, js, images, assets)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="css"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-deployBorder text-xs text-deployText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Item */}
      {itemToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-accent" />
                <span>Rename Item</span>
              </h3>
              <button
                onClick={() => setItemToRename(null)}
                className="p-1 text-deployText-secondary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                  New Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToRename(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-deployBorder text-xs text-deployText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Extract Archive */}
      {showExtractModal && archiveToExtract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c1322] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FolderDown className="w-4 h-4 text-amber-400" />
                <span>Extract {archiveToExtract.extension.toUpperCase()} Archive</span>
              </h3>
              <button
                onClick={() => setShowExtractModal(false)}
                className="p-1 text-deployText-secondary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                  archiveToExtract.extension.toLowerCase() === 'rar'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {archiveToExtract.extension}
                </div>
                <div className="truncate flex-1">
                  <p className="text-xs font-mono font-bold text-white truncate">{archiveToExtract.name}</p>
                  <p className="text-[11px] text-deployText-secondary">{(archiveToExtract.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-deployText-secondary mb-1.5">
                  Target Destination Directory
                </label>
                <input
                  type="text"
                  value={extractTargetDir}
                  onChange={(e) => setExtractTargetDir(e.target.value)}
                  placeholder="e.g. root (leave blank) or subfolder"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-deployText-secondary mt-1">
                  Leave empty to extract into the root website directory.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPromoteArchive}
                    onChange={(e) => setAutoPromoteArchive(e.target.checked)}
                    className="mt-0.5 rounded border-deployBorder bg-[#070b14] text-amber-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">Auto-flatten single wrapper directory</span>
                    <p className="text-[11px] text-deployText-secondary">
                      Ensures <code>index.html</code> lands at root if the archive contains a top-level folder.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteArchiveAfter}
                    onChange={(e) => setDeleteArchiveAfter(e.target.checked)}
                    className="mt-0.5 rounded border-deployBorder bg-[#070b14] text-amber-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">Delete archive file after extraction</span>
                    <p className="text-[11px] text-deployText-secondary">
                      Frees up project storage space immediately after unpacking.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtractModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-deployBorder text-xs text-deployText cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExtractArchive()}
                  disabled={isExtracting}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Extract Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CPanelPage;
