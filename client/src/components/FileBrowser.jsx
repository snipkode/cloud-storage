import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FiGrid, FiList, FiPlus, FiSearch, FiMoreVertical, FiDownload,
  FiTrash2, FiFolder, FiChevronRight, FiArrowLeft,
  FiRefreshCw, FiX, FiUpload, FiEdit2, FiCopy, FiScissors, FiCheck
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useFilesStore } from '@store/filesStore';

/**
 * Get appropriate icon for file type based on mimetype or extension
 */
const getFileIcon = (mimetype, filename) => {
  if (mimetype?.includes('image')) return '🖼️';
  if (mimetype?.includes('video')) return '🎬';
  if (mimetype?.includes('audio')) return '🎵';
  if (mimetype?.includes('pdf')) return '📕';
  if (mimetype?.includes('word') || filename?.endsWith('.doc') || filename?.endsWith('.docx')) return '📘';
  if (mimetype?.includes('excel') || filename?.endsWith('.xls') || filename?.endsWith('.xlsx')) return '📗';
  if (mimetype?.includes('powerpoint') || filename?.endsWith('.ppt') || filename?.endsWith('.pptx')) return '📙';
  if (mimetype?.includes('zip') || mimetype?.includes('compressed')) return '📦';
  if (mimetype?.includes('text') || filename?.endsWith('.txt')) return '📄';
  if (filename?.endsWith('.js') || filename?.endsWith('.ts') || filename?.endsWith('.jsx') || filename?.endsWith('.tsx')) return '📜';
  if (filename?.endsWith('.py')) return '🐍';
  if (filename?.endsWith('.java')) return '☕';
  if (filename?.endsWith('.html') || filename?.endsWith('.css')) return '🌐';
  return '📄';
};

/**
 * Format bytes to human-readable size
 */
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Format date to locale string
 */
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

function FileBrowser() {
  const { token } = useAuthStore();
  const { files, loading, uploadProgress, error, fetchFiles, uploadMultiple, deleteFile, downloadFile, clearError } = useFilesStore();
  
  // View state
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('fileBrowserView') || 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Folder navigation state
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  
  // Selection state
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Modal state
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Refs
  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load files on mount
  const loadData = useCallback(async () => {
    if (token) {
      await fetchFiles(token);
    }
  }, [token, fetchFiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save view preference to localStorage
  useEffect(() => {
    localStorage.setItem('fileBrowserView', viewMode);
  }, [viewMode]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setShowNewFolderModal(false);
        setUploadModalOpen(false);
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFiles.length > 0 && !showNewFolderModal && !uploadModalOpen) {
        handleDeleteSelected();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !showNewFolderModal && !uploadModalOpen) {
        e.preventDefault();
        setSelectedFiles([...filteredFiles]);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles, showNewFolderModal, uploadModalOpen]);

  // Filter files based on current folder and search (memoized)
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = !debouncedSearch || 
        (file.originalname || file.filename).toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesFolder = currentFolder 
        ? file.path?.startsWith(currentFolder.path || '/')
        : (!file.path || file.path === '/');
      return matchesSearch && matchesFolder;
    });
  }, [files, debouncedSearch, currentFolder]);

  // Separate folders and files (memoized)
  const { folders, fileList } = useMemo(() => {
    return {
      folders: filteredFiles.filter(f => f.type === 'folder'),
      fileList: filteredFiles.filter(f => f.type !== 'folder')
    };
  }, [filteredFiles]);

  // Get breadcrumbs (memoized)
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ name: 'My Drive', folder: null }];
    folderHistory.forEach((f) => {
      if (f) crumbs.push({ name: f.originalname || f.name, folder: f });
    });
    if (currentFolder && !folderHistory.includes(currentFolder)) {
      crumbs.push({ name: currentFolder.originalname || currentFolder.name, folder: currentFolder });
    }
    return crumbs;
  }, [currentFolder, folderHistory]);

  // Calculate selected size (memoized)
  const selectedSize = useMemo(() => {
    return selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  }, [selectedFiles]);

  // Handle file/folder selection
  const handleSelect = (item, multi = false) => {
    setSelectedFiles(prev =>
      prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
    );
  };

  // Handle double click (open folder or download file)
  const handleDoubleClick = (item) => {
    if (item.type === 'folder') {
      setFolderHistory(prev => [...prev, currentFolder]);
      setCurrentFolder(item);
      setSelectedFiles([]);
    } else {
      downloadFile(item.filename);
    }
  };

  // Navigate back
  const handleBack = () => {
    if (folderHistory.length > 0) {
      const prevFolder = folderHistory[folderHistory.length - 1];
      setFolderHistory(prev => prev.slice(0, -1));
      setCurrentFolder(prevFolder);
      setSelectedFiles([]);
    }
  };

  // Navigate to folder
  const navigateToFolder = (crumb, idx) => {
    if (crumb.folder) {
      setCurrentFolder(crumb.folder);
      setFolderHistory(folderHistory.slice(0, idx));
    } else {
      setCurrentFolder(null);
      setFolderHistory([]);
    }
    setSelectedFiles([]);
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    try {
      // TODO: Implement folder creation API
      // await createFolder(newFolderName.trim(), token);
      setShowNewFolderModal(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      try {
        await uploadMultiple(selectedFiles, token);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setIsUploading(false);
      }
    }
    e.target.value = '';
    setUploadModalOpen(false);
  };

  // Handle delete single item
  const handleDelete = async (item) => {
    const name = item.originalname || item.filename;
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    
    setIsDeleting(true);
    try {
      if (item.type === 'folder') {
        // TODO: Implement folder delete API
      } else {
        await deleteFile(item.filename, token);
      }
      setSelectedFiles([]);
      setContextMenu(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete selected items
  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} selected item(s)? This action cannot be undone.`)) return;
    
    setIsDeleting(true);
    try {
      for (const item of selectedFiles) {
        if (item.type === 'folder') {
          // TODO: Implement folder delete API
        } else {
          await deleteFile(item.filename, token);
        }
      }
      setSelectedFiles([]);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle download
  const handleDownload = (item) => {
    downloadFile(item.filename);
    setContextMenu(null);
  };

  // Toggle select all
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFiles([...filteredFiles]);
    } else {
      setSelectedFiles([]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-white/10 overflow-hidden" role="main" aria-label="File Browser">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2.5 border-b border-white/10 bg-slate-800/50" role="toolbar" aria-label="File browser toolbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Go back"
            title="Go back"
          >
            <FiArrowLeft className="text-white text-xs" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-0.5 text-xs overflow-x-auto" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx, arr) => (
              <div key={idx} className="flex items-center flex-shrink-0">
                {idx > 0 && <FiChevronRight className="text-gray-500 text-[10px] mx-0.5 flex-shrink-0" />}
                <button
                  onClick={() => navigateToFolder(crumb, idx)}
                  className={`px-1.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                    idx === arr.length - 1
                      ? 'bg-purple-500/20 text-purple-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  aria-current={idx === arr.length - 1 ? 'page' : undefined}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search - hidden on mobile */}
          <div className="relative hidden sm:block">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 lg:w-56 bg-slate-800 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
              aria-label="Search files"
            />
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-white/10" role="group" aria-label="View toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              title="Grid view"
            >
              <FiGrid className="text-xs" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              title="List view"
            >
              <FiList className="text-xs" />
            </button>
          </div>

          {/* Upload button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-lg shadow-purple-500/25"
            aria-label="Upload files"
          >
            <FiUpload className="text-xs" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* New folder button */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            aria-label="Create new folder"
          >
            <FiPlus className="text-xs" />
            <span className="hidden sm:inline">New Folder</span>
            <span className="sm:hidden">Folder</span>
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {(loading || isUploading) && uploadProgress > 0 && (
        <div className="px-3 py-1.5 border-b border-white/10 bg-slate-800/50" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <FiUpload className="text-purple-400 text-xs animate-pulse" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-3 py-1.5 border-b border-white/10 bg-red-500/10 flex items-center justify-between" role="alert">
          <span className="text-red-400 text-xs">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-white p-0.5" aria-label="Dismiss error">
            <FiX className="text-xs" />
          </button>
        </div>
      )}

      {/* File Grid/List */}
      <div className="flex-1 overflow-auto p-2.5" role="region" aria-label="File list">
        {viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {/* Parent folder shortcut */}
            {folderHistory.length > 0 && (
              <button
                onClick={handleBack}
                className="group aspect-square bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all"
                aria-label="Parent folder"
              >
                <div className="text-3xl">📁</div>
                <span className="text-[10px] text-gray-400 font-medium">..</span>
              </button>
            )}

            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id || folder.filename}
                onDoubleClick={() => handleDoubleClick(folder)}
                onClick={(e) => handleSelect(folder, e.ctrlKey || e.metaKey)}
                className={`group aspect-square bg-white/5 hover:bg-white/10 border rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  selectedFiles.includes(folder)
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 hover:border-purple-500/30'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`Folder: ${folder.originalname || folder.name}`}
              >
                <div className="text-4xl">📁</div>
                <span className="text-[10px] text-gray-300 font-medium text-center line-clamp-2 px-1.5">
                  {folder.originalname || folder.name}
                </span>
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                    }}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded-md text-gray-400 hover:text-white"
                    aria-label="More options"
                  >
                    <FiMoreVertical className="text-[10px]" />
                  </button>
                </div>
              </div>
            ))}

            {/* Files */}
            {fileList.map((file) => (
              <div
                key={file.id || file.filename}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={(e) => handleSelect(file, e.ctrlKey || e.metaKey)}
                className={`group aspect-square bg-white/5 hover:bg-white/10 border rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  selectedFiles.includes(file)
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 hover:border-purple-500/30'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`File: ${file.originalname || file.filename}`}
              >
                <div className="text-4xl">{getFileIcon(file.mimetype, file.filename)}</div>
                <span className="text-[10px] text-gray-300 font-medium text-center line-clamp-2 px-1.5">
                  {file.originalname || file.filename}
                </span>
                <span className="text-[10px] text-gray-500">{formatSize(file.size)}</span>
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file.filename);
                    }}
                    className="p-1 bg-slate-800 hover:bg-green-600 rounded-md text-gray-400 hover:text-white transition-colors"
                    aria-label="Download"
                  >
                    <FiDownload className="text-[10px]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                    }}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded-md text-gray-400 hover:text-white"
                    aria-label="More options"
                  >
                    <FiMoreVertical className="text-[10px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-[10px] text-gray-400 font-medium px-2.5 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50 w-3.5 h-3.5"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left text-[10px] text-gray-400 font-medium px-2.5 py-2" scope="col">Name</th>
                  <th className="text-left text-[10px] text-gray-400 font-medium px-2.5 py-2 hidden sm:table-cell" scope="col">Size</th>
                  <th className="text-left text-[10px] text-gray-400 font-medium px-2.5 py-2 hidden md:table-cell" scope="col">Modified</th>
                  <th className="text-left text-[10px] text-gray-400 font-medium px-2.5 py-2 w-16" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Parent folder row */}
                {folderHistory.length > 0 && (
                  <tr
                    onClick={handleBack}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-2.5 py-2"></td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📁</span>
                        <span className="text-xs text-gray-300 font-medium">..</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-xs text-gray-500 hidden sm:table-cell">-</td>
                    <td className="px-2.5 py-2 text-xs text-gray-500 hidden md:table-cell">-</td>
                    <td className="px-2.5 py-2"></td>
                  </tr>
                )}

                {/* Folders */}
                {folders.map((folder) => (
                  <tr
                    key={folder.id || folder.filename}
                    onDoubleClick={() => handleDoubleClick(folder)}
                    onClick={() => handleSelect(folder)}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                      selectedFiles.includes(folder) ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <td className="px-2.5 py-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(folder)}
                        onChange={(e) => e.stopPropagation()}
                        className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50 w-3.5 h-3.5"
                        aria-label={`Select ${folder.originalname || folder.name}`}
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📁</span>
                        <span className="text-xs text-gray-300 font-medium truncate max-w-[160px] sm:max-w-xs">
                          {folder.originalname || folder.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-xs text-gray-500 hidden sm:table-cell">-</td>
                    <td className="px-2.5 py-2 text-xs text-gray-500 hidden md:table-cell">
                      {formatDate(folder.createdAt || folder.modifiedAt)}
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                          }}
                          className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                          aria-label="More options"
                        >
                          <FiMoreVertical className="text-[10px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Files */}
                {fileList.map((file) => (
                  <tr
                    key={file.id || file.filename}
                    onDoubleClick={() => handleDoubleClick(file)}
                    onClick={() => handleSelect(file)}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                      selectedFiles.includes(file) ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <td className="px-2.5 py-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file)}
                        onChange={(e) => e.stopPropagation()}
                        className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50 w-3.5 h-3.5"
                        aria-label={`Select ${file.originalname || file.filename}`}
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getFileIcon(file.mimetype, file.filename)}</span>
                        <span className="text-xs text-gray-300 font-medium truncate max-w-[160px] sm:max-w-xs">
                          {file.originalname || file.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-xs text-gray-500 hidden sm:table-cell">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-gray-500 hidden md:table-cell">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file.filename);
                          }}
                          className="p-1 hover:bg-green-600/20 rounded-md text-gray-400 hover:text-green-400 transition-colors"
                          aria-label="Download"
                        >
                          <FiDownload className="text-[10px]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                          }}
                          className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                          aria-label="More options"
                        >
                          <FiMoreVertical className="text-[10px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {filteredFiles.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4" aria-hidden="true">📂</div>
                <p className="text-gray-400 text-sm mb-4">
                  {debouncedSearch ? 'No files match your search' : 'This folder is empty'}
                </p>
                {!debouncedSearch && (
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium inline-flex items-center gap-2"
                  >
                    <FiUpload className="text-xs" />
                    Upload your first file
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-white/10 bg-slate-800/50 flex items-center justify-between text-xs text-gray-400" role="status">
        <span>
          {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}
          {selectedFiles.length > 0 && ` • ${selectedFiles.length} selected`}
        </span>
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-4">
            <span>{formatSize(selectedSize)}</span>
            <button
              onClick={() => setSelectedFiles([])}
              className="hover:text-white transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
          <div className="bg-slate-900 rounded-xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 id="upload-modal-title" className="text-white font-semibold">Upload Files</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-white p-1" aria-label="Close upload modal">
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-5">
              <label className="block cursor-pointer">
                <div 
                  className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-xl p-8 text-center transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFiles = Array.from(e.dataTransfer.files);
                    if (droppedFiles.length > 0) {
                      uploadMultiple(droppedFiles, token);
                      setUploadModalOpen(false);
                    }
                  }}
                >
                  <FiUpload className="text-4xl text-gray-400 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-white font-medium">Click to select files</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop here</p>
                  <p className="text-xs text-gray-600 mt-2">Max 50MB per file</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept="*/*"
                  aria-label="Select files to upload"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title">
          <div className="bg-slate-900 rounded-xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 id="folder-modal-title" className="text-white font-semibold">New Folder</h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white p-1" aria-label="Close new folder modal">
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="folder-name" className="block text-sm text-gray-400 mb-2">Folder Name</label>
                <input
                  id="folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isCreatingFolder && <FiCheck className="text-xs animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-slate-800 border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          aria-label="File actions"
        >
          <button
            onClick={() => handleDownload(contextMenu.item)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            role="menuitem"
          >
            <FiDownload className="text-xs" aria-hidden="true" />
            Download
          </button>
          <button
            onClick={() => setContextMenu(null)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            role="menuitem"
          >
            <FiEdit2 className="text-xs" aria-hidden="true" />
            Rename
          </button>
          <button
            onClick={() => setContextMenu(null)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            role="menuitem"
          >
            <FiCopy className="text-xs" aria-hidden="true" />
            Copy
          </button>
          <button
            onClick={() => setContextMenu(null)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            role="menuitem"
          >
            <FiScissors className="text-xs" aria-hidden="true" />
            Move to
          </button>
          <div className="border-t border-white/10 my-1" role="separator"></div>
          <button
            onClick={() => handleDelete(contextMenu.item)}
            disabled={isDeleting}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50"
            role="menuitem"
          >
            <FiTrash2 className="text-xs" aria-hidden="true" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FileBrowser;
