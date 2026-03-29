import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FiGrid, FiList, FiPlus, FiSearch, FiMoreVertical, FiDownload,
  FiTrash2, FiFolder, FiX, FiUpload, FiCheck, FiCloud, FiFile,
  FiImage, FiFilm, FiMusic, FiCode, FiSettings
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useFilesStore } from '@store/filesStore';

/**
 * Get appropriate icon for file type based on mimetype or extension
 */
const getFileIcon = (mimetype, filename) => {
  if (mimetype?.includes('image')) return { icon: FiImage, color: 'text-pink-400', bg: 'bg-pink-500/10' };
  if (mimetype?.includes('video')) return { icon: FiFilm, color: 'text-purple-400', bg: 'bg-purple-500/10' };
  if (mimetype?.includes('audio')) return { icon: FiMusic, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (mimetype?.includes('pdf')) return { icon: FiFile, color: 'text-red-400', bg: 'bg-red-500/10' };
  if (filename?.endsWith('.doc') || filename?.endsWith('.docx')) return { icon: FiFile, color: 'text-blue-400', bg: 'bg-blue-500/10' };
  if (filename?.endsWith('.xls') || filename?.endsWith('.xlsx')) return { icon: FiFile, color: 'text-green-400', bg: 'bg-green-500/10' };
  if (filename?.endsWith('.ppt') || filename?.endsWith('.pptx')) return { icon: FiFile, color: 'text-orange-400', bg: 'bg-orange-500/10' };
  if (mimetype?.includes('zip') || mimetype?.includes('compressed')) return { icon: FiFile, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (filename?.endsWith('.js') || filename?.endsWith('.ts') || filename?.endsWith('.jsx') || filename?.endsWith('.tsx')) return { icon: FiCode, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  if (filename?.endsWith('.py')) return { icon: FiCode, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
  return { icon: FiFile, color: 'text-slate-400', bg: 'bg-slate-500/10' };
};

/**
 * Format bytes to human-readable size
 */
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Format date to relative time
 */
const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return past.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

function FileBrowser() {
  const { token } = useAuthStore();
  const { files, loading, uploadProgress, error, fetchFiles, uploadMultiple, deleteFile, downloadFile, clearError } = useFilesStore();

  // View state
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('fileBrowserView') || 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');

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

  // Helper to determine file type category
  const getFileTypeCategory = (mimetype, filename) => {
    const ext = filename?.toLowerCase() || '';
    const mime = mimetype?.toLowerCase() || '';
    
    if (mime.includes('image') || mime.includes('video')) return 'media';
    if (mime.includes('video')) return 'video';
    if (mime.includes('audio')) return 'audio';
    if (mime.includes('pdf') || ext.endsWith('.pdf')) return 'pdf';
    if (mime.includes('word') || ext.endsWith('.doc') || ext.endsWith('.docx')) return 'docs';
    if (mime.includes('excel') || ext.endsWith('.xls') || ext.endsWith('.xlsx')) return 'excel';
    if (mime.includes('text') || ext.endsWith('.txt')) return 'txt';
    return 'other';
  };

  // Filter files based on current folder, search and file type (memoized)
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = !debouncedSearch ||
        (file.originalname || file.filename).toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesFolder = currentFolder
        ? file.path?.startsWith(currentFolder.path || '/')
        : (!file.path || file.path === '/');
      
      // Filter by file type
      let matchesType = true;
      if (fileTypeFilter !== 'all' && file.type !== 'folder') {
        const fileCategory = getFileTypeCategory(file.mimetype, file.originalname || file.filename);
        if (fileTypeFilter === 'media') {
          matchesType = fileCategory === 'media' || fileCategory === 'video' || fileCategory === 'audio';
        } else {
          matchesType = fileCategory === fileTypeFilter;
        }
      }
      
      return matchesSearch && matchesFolder && matchesType;
    });
  }, [files, debouncedSearch, currentFolder, fileTypeFilter]);

  // Separate folders and files (memoized)
  const { folders, fileList } = useMemo(() => {
    return {
      folders: filteredFiles.filter(f => f.type === 'folder'),
      fileList: filteredFiles.filter(f => f.type !== 'folder')
    };
  }, [filteredFiles]);

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
      downloadFile(item.filename, token);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      // TODO: Implement folder creation API
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
    downloadFile(item.filename, token);
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

  // Loading skeleton
  if (loading && files.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Toolbar Skeleton */}
        <div className="flex items-center justify-between p-4 mb-4">
          <div className="skeleton w-32 h-8 rounded-lg"></div>
          <div className="flex items-center gap-2">
            <div className="skeleton w-20 h-9 rounded-lg"></div>
            <div className="skeleton w-24 h-9 rounded-lg"></div>
          </div>
        </div>
        {/* Grid Skeleton */}
        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square skeleton rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div>
              <h1 className="text-white font-semibold text-lg">
                {currentFolder ? (currentFolder.originalname || currentFolder.name) : 'All Files'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentFolder ? 'Browse folder contents' : 'Manage and organize your files'}
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full hidden sm:inline">
              {folders.length + fileList.length} items
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {/* View toggle */}
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
                aria-label="Grid view"
              >
                <FiGrid className="text-sm" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
                aria-label="List view"
              >
                <FiList className="text-sm" />
              </button>
            </div>
          </div>
        </div>

        {/* File Type Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All', icon: '📁' },
            { id: 'media', label: 'Media', icon: '🖼️' },
            { id: 'video', label: 'Video', icon: '🎬' },
            { id: 'audio', label: 'Audio', icon: '🎵' },
            { id: 'pdf', label: 'PDF', icon: '📕' },
            { id: 'docs', label: 'Docs', icon: '📘' },
            { id: 'excel', label: 'Excel', icon: '📗' },
            { id: 'txt', label: 'TXT', icon: '📄' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFileTypeFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                fileTypeFilter === filter.id
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Upload */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/25"
          >
            <FiUpload className="text-sm" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* New Folder */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <FiPlus className="text-sm" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {(loading || isUploading) && uploadProgress > 0 && (
        <div className="mb-4 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl" role="status">
          <div className="flex items-center gap-3">
            <FiCloud className="text-indigo-400 text-sm animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Uploading...</span>
                <span className="font-medium text-indigo-400">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <FiX className="text-red-400 text-sm" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-white p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
            <FiX className="text-sm" />
          </button>
        </div>
      )}

      {/* File Grid/List */}
      {viewMode === 'grid' ? (
        filteredFiles.length === 0 ? (
          /* Grid Empty State - Compact */
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-800/50 rounded-xl flex items-center justify-center">
                <FiCloud className="text-2xl text-slate-600" />
              </div>
              <p className="text-slate-400 text-xs mb-2">
                {debouncedSearch ? 'No files match your search' : 'This folder is empty'}
              </p>
              {!debouncedSearch && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                >
                  <FiUpload className="text-xs" />
                  Upload file
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {/* Folders */}
          {folders.map((folder) => (
            <div
              key={folder.id || folder.filename}
              onDoubleClick={() => handleDoubleClick(folder)}
              onClick={(e) => handleSelect(folder, e.ctrlKey || e.metaKey)}
              className={`group aspect-square bg-slate-800/30 hover:bg-slate-700/30 border rounded-xl flex flex-col items-center transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg relative ${
                selectedFiles.includes(folder)
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/5 hover:border-indigo-500/30'
              }`}
            >
              <div className="w-12 h-12 mt-2 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiFolder className="text-amber-400 text-xl" />
              </div>
              <div className="flex-1 w-full px-2 py-1 flex items-center justify-center">
                <span className="text-xs text-slate-300 font-medium text-center line-clamp-2 break-all">
                  {folder.originalname || folder.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                }}
                className="absolute top-2 right-2 p-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
              >
                <FiMoreVertical className="text-xs" />
              </button>
            </div>
          ))}

          {/* Files */}
          {fileList.map((file) => {
            const fileIcon = getFileIcon(file.mimetype, file.filename);
            const IconComponent = fileIcon.icon;
            return (
              <div
                key={file.id || file.filename}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={(e) => handleSelect(file, e.ctrlKey || e.metaKey)}
                className={`group aspect-square bg-slate-800/30 hover:bg-slate-700/30 border rounded-xl flex flex-col items-center transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg relative ${
                  selectedFiles.includes(file)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/5 hover:border-indigo-500/30'
                }`}
              >
                <div className={`w-12 h-12 mt-2 ${fileIcon.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`${fileIcon.color} text-xl`} />
                </div>
                <div className="flex-1 w-full px-2 py-1 flex flex-col items-center justify-center gap-0.5 min-h-0">
                  <span className="text-xs text-slate-300 font-medium text-center line-clamp-2 break-all w-full">
                    {file.originalname || file.filename}
                  </span>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{formatSize(file.size)}</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file.filename, token);
                    }}
                    className="p-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-slate-400 hover:text-green-400 transition-all"
                  >
                    <FiDownload className="text-xs" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                    }}
                    className="p-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-slate-400 hover:text-white transition-all"
                  >
                    <FiMoreVertical className="text-xs" />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )
      ) : (
        /* List View */
        <div className="bg-slate-800/30 border border-white/5 rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500/50 w-4 h-4"
                  />
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-auto">Name</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-24 hidden sm:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-32 hidden md:table-cell">Modified</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {folders.map((folder) => (
                <tr
                  key={folder.id || folder.filename}
                  onDoubleClick={() => handleDoubleClick(folder)}
                  onClick={() => handleSelect(folder)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                  }}
                  className={`border-b border-white/5 hover:bg-slate-700/30 cursor-pointer transition-colors group ${
                    selectedFiles.includes(folder) ? 'bg-indigo-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(folder)}
                      onChange={(e) => e.stopPropagation()}
                      className="rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500/50 w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiFolder className="text-amber-400 text-lg" />
                      </div>
                      <span className="text-sm text-slate-300 font-medium truncate max-w-full">
                        {folder.originalname || folder.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">-</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                    {formatRelativeTime(folder.createdAt || folder.modifiedAt)}
                  </td>
                </tr>
              ))}

              {/* Files */}
              {fileList.map((file) => {
                const fileIcon = getFileIcon(file.mimetype, file.filename);
                const IconComponent = fileIcon.icon;
                return (
                  <tr
                    key={file.id || file.filename}
                    onDoubleClick={() => handleDoubleClick(file)}
                    onClick={() => handleSelect(file)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                    }}
                    className={`border-b border-white/5 hover:bg-slate-700/30 cursor-pointer transition-colors group ${
                      selectedFiles.includes(file) ? 'bg-indigo-500/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file)}
                        onChange={(e) => e.stopPropagation()}
                        className="rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500/50 w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${fileIcon.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className={`${fileIcon.color} text-lg`} />
                        </div>
                        <div className="min-w-0 max-w-full">
                          <div className="text-sm text-slate-300 font-medium truncate max-w-full">
                            {file.originalname || file.filename}
                          </div>
                          <div className="text-xs text-slate-500 sm:hidden">{formatSize(file.size)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {formatRelativeTime(file.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state - Compact */}
          {filteredFiles.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-800/50 rounded-xl flex items-center justify-center">
                <FiCloud className="text-2xl text-slate-600" />
              </div>
              <p className="text-slate-400 text-xs mb-2">
                {debouncedSearch ? 'No files match your search' : 'This folder is empty'}
              </p>
              {!debouncedSearch && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                >
                  <FiUpload className="text-xs" />
                  Upload file
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Bar - Compact */}
      {selectedFiles.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2.5 flex items-center gap-3 shadow-2xl whitespace-nowrap">
            <span className="text-xs text-slate-300 font-medium">
              {selectedFiles.length} selected
            </span>
            <span className="text-xs text-slate-500">{formatSize(selectedSize)}</span>
            <div className="h-3 w-px bg-slate-700"></div>
            <button
              onClick={() => {
                selectedFiles.forEach(file => {
                  if (file.type !== 'folder') downloadFile(file.filename, token);
                });
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <FiDownload className="text-[10px]" />
              Download
            </button>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap"
            >
              Clear
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
            >
              <FiTrash2 className="text-[10px]" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-semibold">Upload Files</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-5">
              <label className="block cursor-pointer">
                <div
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 text-center transition-all hover:bg-slate-800/30"
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
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                    <FiUpload className="text-3xl text-indigo-400" />
                  </div>
                  <p className="text-white font-medium mb-1">Click to select files</p>
                  <p className="text-xs text-slate-500">or drag and drop here</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept="*/*"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-sm w-full">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-semibold">New Folder</h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-5">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-all"
              >
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
          className="fixed bg-slate-800 border border-white/10 rounded-xl shadow-2xl py-1.5 z-[100] min-w-[160px]"
          style={{
            left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 180 : contextMenu.x),
            top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 100 : contextMenu.y)
          }}
        >
          <button
            onClick={() => handleDownload(contextMenu.item)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
          >
            <FiDownload className="text-sm" />
            Download
          </button>
          <div className="border-t border-white/5 my-1"></div>
          <button
            onClick={() => handleDelete(contextMenu.item)}
            disabled={isDeleting}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-50"
          >
            <FiTrash2 className="text-sm" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FileBrowser;
