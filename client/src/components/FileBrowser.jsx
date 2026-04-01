import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import {
  FiGrid, FiList, FiPlus, FiSearch, FiMoreVertical, FiDownload,
  FiTrash2, FiFolder, FiX, FiUpload, FiCheck, FiCheckSquare, FiCloud, FiFile,
  FiImage, FiFilm, FiMusic, FiCode, FiSettings, FiBook, FiBarChart, FiInfo,
  FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiPlay
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useFilesStore } from '@store/filesStore';
import { VideoPlayer } from './VideoPlayer';

/**
 * Environment toggle component to switch between Test/Live mode
 */
const EnvironmentToggle = ({ environment, onEnvironmentChange }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-800/50 border border-white/10 rounded-lg p-0.5">
      <button
        onClick={() => onEnvironmentChange('test')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all min-w-[64px] justify-center ${
          environment === 'test'
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="text-[10px]">🧪</span>
        <span>Sandbox</span>
      </button>
      <button
        onClick={() => onEnvironmentChange('live')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all min-w-[64px] justify-center ${
          environment === 'live'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="text-[10px]">🚀</span>
        <span>Production</span>
      </button>
    </div>
  );
};

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
  const { files, folders, loading, uploadProgress, uploadStatus, error, fetchFiles, fetchFolders, uploadMultiple, deleteFile, deleteFolder, createFolder, downloadFile, clearError, environment } = useFilesStore();

  // View state
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('fileBrowserView') || 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [currentEnvironment, setCurrentEnvironment] = useState('live');

  // Folder navigation state
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);

  // Selection state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  // Preview/Lightbox state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Modal state
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadToast, setShowUploadToast] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs
  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load files and folders when environment changes
  useEffect(() => {
    const loadData = async () => {
      if (token) {
        await Promise.all([
          fetchFiles(token, currentEnvironment),
          fetchFolders(token, currentEnvironment)
        ]);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentEnvironment]);

  // Handle environment switch
  const handleEnvironmentChange = useCallback((newEnv) => {
    console.log(`[FileBrowser] Switching environment from ${currentEnvironment} to ${newEnv}`);
    setCurrentEnvironment(newEnv);
    // fetchFiles will be called by the useEffect above when currentEnvironment changes
  }, [currentEnvironment]);

  // Load preview image when index changes
  useEffect(() => {
    if (previewOpen && previewFiles.length > 0 && previewIndex >= 0) {
      const loadCurrentPreview = async () => {
        setPreviewLoading(true);
        const file = previewFiles[previewIndex];

        // Reset zoom for non-image files
        if (file.mimetype?.includes('video') || file.mimetype?.includes('pdf')) {
          setZoom(1);
        }

        // Clean up old URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        const url = await getPreviewUrl(file);
        setPreviewUrl(url);
        setPreviewLoading(false);
      };

      loadCurrentPreview();
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewIndex, previewOpen, previewFiles]);

  // Get streaming URL for video thumbnail generation
  const getVideoStreamingUrl = useCallback(async (file) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const cleanFilename = file.filename.split('/').pop();
    return `${API_BASE}/api/stream/${encodeURIComponent(cleanFilename)}?token=${encodeURIComponent(token)}`;
  }, [token]);

  // Load thumbnails for images (lazy - only first 50 images, with concurrency)
  useEffect(() => {
    const loadThumbnails = async () => {
      const imageFiles = files.filter(f => f.mimetype?.includes('image')).slice(0, 50); // Limit to 50
      const urls = {};
      
      // Load with concurrency limit (5 at a time)
      const CONCURRENCY_LIMIT = 5;
      
      for (let i = 0; i < imageFiles.length; i += CONCURRENCY_LIMIT) {
        const batch = imageFiles.slice(i, i + CONCURRENCY_LIMIT);
        const promises = batch.map(async (file) => {
          const url = await getPreviewUrl(file);
          if (url) {
            urls[file.id || file.filename] = url;
          }
        });
        await Promise.all(promises);
      }

      setThumbnailUrls(urls);
    };

    if (files.length > 0) {
      loadThumbnails();
    }

    // Cleanup URLs on unmount
    return () => {
      Object.values(thumbnailUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  // Generate thumbnails for videos (lazy - only first 20 files)
  useEffect(() => {
    const generateVideoThumbnails = async () => {
      const videoFiles = files.filter(f => f.mimetype?.includes('video')).slice(0, 20); // Limit to 20
      console.log('[VideoThumbnail] Found video files:', videoFiles.length);
      const thumbnails = {};

      for (const file of videoFiles) {
        try {
          const url = await getVideoStreamingUrl(file);
          console.log('[VideoThumbnail] Stream URL for', file.filename, ':', url.substring(0, 80));
          if (!url) continue;

          // Create video element to extract frame
          const video = document.createElement('video');
          video.src = url;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.preload = 'metadata';

          // Wait for metadata then seek to 10% or 5 seconds
          await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', () => {
              console.log('[VideoThumbnail] Loaded metadata for', file.filename, 'duration:', video.duration);
              const thumbnailTime = Math.min(video.duration * 0.1, 5);
              video.currentTime = thumbnailTime;
              resolve();
            }, { once: true });

            video.addEventListener('error', (e) => {
              console.warn('[VideoThumbnail] Video error for', file.filename, e);
              resolve();
            }, { once: true });
            setTimeout(resolve, 3000); // Timeout
          });

          // Wait for seek
          await new Promise((resolve) => {
            video.addEventListener('seeked', () => {
              console.log('[VideoThumbnail] Seeked for', file.filename);
              resolve();
            }, { once: true });
            video.addEventListener('error', (e) => {
              console.warn('[VideoThumbnail] Seek error for', file.filename, e);
              resolve();
            }, { once: true });
            setTimeout(resolve, 3000); // Timeout
          });

          // Create canvas and extract frame
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          console.log('[VideoThumbnail] Generated thumbnail for', file.filename, 'length:', dataUrl.length);
          thumbnails[file.id || file.filename] = dataUrl;
        } catch (error) {
          console.warn('[VideoThumbnail] Failed to generate thumbnail for', file.filename, error);
        }
      }

      console.log('[VideoThumbnail] Generated thumbnails count:', Object.keys(thumbnails).length);
      if (Object.keys(thumbnails).length > 0) {
        setVideoThumbnails(prev => {
          const updated = { ...prev, ...thumbnails };
          console.log('[VideoThumbnail] Updated videoThumbnails state, total:', Object.keys(updated).length);
          return updated;
        });
      }
    };

    if (files.length > 0) {
      generateVideoThumbnails();
    }
  }, [files, getVideoStreamingUrl]);

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

    if (mime.includes('image') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.gif') || ext.endsWith('.webp') || ext.endsWith('.bmp') || ext.endsWith('.svg') || ext.endsWith('.heic') || ext.endsWith('.raw')) return 'photo';
    if (mime.includes('video') || ext.endsWith('.mp4') || ext.endsWith('.avi') || ext.endsWith('.mov') || ext.endsWith('.mkv') || ext.endsWith('.webm') || ext.endsWith('.flv') || ext.endsWith('.wmv') || ext.endsWith('.m4v')) return 'video';
    if (mime.includes('audio') || ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.ogg') || ext.endsWith('.flac') || ext.endsWith('.aac') || ext.endsWith('.m4a') || ext.endsWith('.wma') || ext.endsWith('.aiff') || ext.endsWith('.alac') || ext.endsWith('.opus') || ext.endsWith('.mka')) return 'audio';
    if (mime.includes('pdf') || ext.endsWith('.pdf')) return 'pdf';
    if (mime.includes('word') || ext.endsWith('.doc') || ext.endsWith('.docx')) return 'docs';
    if (mime.includes('excel') || ext.endsWith('.xls') || ext.endsWith('.xlsx') || ext.endsWith('.csv')) return 'excel';
    if (mime.includes('text') || ext.endsWith('.txt') || ext.endsWith('.md') || ext.endsWith('.rtf')) return 'txt';
    return 'other';
  };

  // Calculate file type stats (memoized)
  const fileTypeStats = useMemo(() => {
    const stats = { all: 0, photo: 0, video: 0, audio: 0, pdf: 0, docs: 0, excel: 0, txt: 0, other: 0 };

    files.forEach(file => {
      if (file.type === 'folder') return;

      stats.all++;
      const category = getFileTypeCategory(file.mimetype, file.originalname || file.filename);
      if (stats[category] !== undefined) {
        stats[category]++;
      } else {
        stats.other++;
      }
    });

    return stats;
  }, [files]);

  // Filter files based on current folder, search and file type (memoized)
  const filteredFiles = useMemo(() => {
    // Merge folders and files, adding type property
    const foldersWithType = (folders || []).map(f => ({ ...f, type: 'folder' }));
    const filesWithType = (files || []).map(f => ({ ...f, type: 'file' }));
    const allItems = [...foldersWithType, ...filesWithType];

    const result = allItems.filter(file => {
      const matchesSearch = !debouncedSearch ||
        ((file.originalname || file.filename) || file.name)?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Folder matching logic:
      // - At root (currentFolder = null): show items with path = '/' or path = '/folderName' (single level)
      // - In folder: show items whose path starts with currentFolder.path + '/' (direct children only)
      let matchesFolder;
      if (currentFolder) {
        // Inside a folder: show only direct children (not nested deeper)
        const parentPathWithSlash = currentFolder.path.endsWith('/') ? currentFolder.path : currentFolder.path + '/';
        if (file.type === 'folder') {
          // For folders: must be direct child (only one segment after parent path)
          matchesFolder = file.path.startsWith(parentPathWithSlash);
          const relativePath = file.path.substring(parentPathWithSlash.length);
          // Only show if it's a direct child (no more slashes)
          matchesFolder = matchesFolder && !relativePath.includes('/');
        } else {
          // For files: must be in this folder
          matchesFolder = file.path === currentFolder.path || file.path === parentPathWithSlash;
        }
      } else {
        // At root: show items at root level (path = '/' for files, or '/folderName' for folders with single level)
        if (file.type === 'folder') {
          // For folders at root: path should be like '/folderName' (only one segment)
          const pathSegments = (file.path || '/').split('/').filter(s => s);
          matchesFolder = pathSegments.length === 1;
        } else {
          // For files at root: path should be '/' or empty
          matchesFolder = !file.path || file.path === '/';
        }
      }

      // Filter by file type (folders are always shown, file type filter applies only to files)
      let matchesType = true;
      if (fileTypeFilter !== 'all' && file.type !== 'folder') {
        const fileCategory = getFileTypeCategory(file.mimetype, file.originalname || file.filename);
        matchesType = fileCategory === fileTypeFilter;
      }

      return matchesSearch && matchesFolder && matchesType;
    });

    return result;
  }, [files, folders, debouncedSearch, currentFolder, fileTypeFilter]);

  // Separate folders and files (memoized)
  const { folderItems, fileList } = useMemo(() => {
    return {
      folderItems: filteredFiles.filter(f => f.type === 'folder'),
      fileList: filteredFiles.filter(f => f.type !== 'folder')
    };
  }, [filteredFiles]);

  // Pagination for large file lists (performance optimization)
  const [visibleFileLimit, setVisibleFileLimit] = useState(100);
  
  // Show all folders, but limit files for performance
  const displayedFolders = folderItems; // Always show all folders
  const displayedFiles = fileList.slice(0, visibleFileLimit); // Limit files
  const hasMoreFiles = fileList.length > visibleFileLimit;
  const remainingFiles = fileList.length - visibleFileLimit;

  // Calculate selected size (memoized)
  const selectedSize = useMemo(() => {
    return selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  }, [selectedFiles]);

  // Handle file/folder selection
  const handleSelect = (item, multi = false) => {
    if (selectMode) {
      // In select mode: toggle selection
      setSelectedFiles(prev =>
        prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
      );
    } else if (multi) {
      // Ctrl/Cmd click: multi-select
      setSelectedFiles(prev =>
        prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
      );
    } else {
      // Normal click: single select
      setSelectedFiles(prev =>
        prev.includes(item) ? prev.filter(f => f !== item) : [item]
      );
    }
  };

  // Handle double click (open folder or download file)
  const handleDoubleClick = (item) => {
    if (item.type === 'folder') {
      // Navigate into folder
      setFolderHistory(prev => [...prev, currentFolder]);
      setCurrentFolder(item);
      setSelectedFiles([]);
    } else {
      // Download file
      downloadFile(item.filename, token, currentEnvironment);
    }
  };

  // Handle single click
  const handleClick = (item, e) => {
    if (item.type === 'folder') {
      // Single click on folder: navigate into it
      setFolderHistory(prev => [...prev, currentFolder]);
      setCurrentFolder(item);
      setSelectedFiles([]);
    } else if (selectMode || (e.ctrlKey || e.metaKey)) {
      // In select mode or Ctrl/Cmd click: select file
      handleSelect(item, e.ctrlKey || e.metaKey);
    } else if (isPreviewable(item)) {
      // Previewable file: open preview
      openPreview(item);
    } else {
      // Other files: select
      handleSelect(item, false);
    }
  };

  // Toggle select mode
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedFiles([]);
    }
  };

  // Navigate up one level
  const handleNavigateUp = () => {
    if (!currentFolder) return;
    
    // Go to parent folder
    const currentPath = currentFolder.path;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    
    if (parentPath === '') {
      // At root level
      setCurrentFolder(null);
      setFolderHistory([]);
    } else {
      const parentFolder = folders?.find(f => f.path === parentPath);
      setCurrentFolder(parentFolder || null);
    }
    setSelectedFiles([]);
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const parentId = currentFolder?.id || null;
      const result = await createFolder(newFolderName.trim(), parentId, token, currentEnvironment);

      if (result.success) {
        setShowNewFolderModal(false);
        setNewFolderName('');
        // Refresh files and folders to show the new folder
        await Promise.all([
          fetchFiles(token, currentEnvironment),
          fetchFolders(token, currentEnvironment)
        ]);
      } else {
        console.error('Failed to create folder:', result.error);
      }
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
      setShowUploadToast(true);
      setUploadModalOpen(false); // Always close modal immediately (Google Drive style)
      
      try {
        // Upload to current folder if inside one
        const folderPath = currentFolder?.path || null;
        await uploadMultiple(selectedFiles, token, currentEnvironment, folderPath);
        
        // Hide toast after upload completes
        setTimeout(() => setShowUploadToast(false), 3000);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setIsUploading(false);
      }
    }
    e.target.value = '';
  };

  // Handle delete single item
  const handleDelete = async (item) => {
    const name = item.originalname || item.filename;
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      if (item.type === 'folder') {
        await deleteFolder(item.id, token, currentEnvironment);
      } else {
        await deleteFile(item.filename, token, currentEnvironment);
      }
      setSelectedFiles([]);
      setContextMenu(null);
      // Refresh files and folders after deletion
      await Promise.all([
        fetchFiles(token, currentEnvironment),
        fetchFolders(token, currentEnvironment)
      ]);
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
          await deleteFolder(item.id, token, currentEnvironment);
        } else {
          await deleteFile(item.filename, token, currentEnvironment);
        }
      }
      setSelectedFiles([]);
      // Refresh files and folders after deletion
      await Promise.all([
        fetchFiles(token, currentEnvironment),
        fetchFolders(token, currentEnvironment)
      ]);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle download
  const handleDownload = (item) => {
    downloadFile(item.filename, token, currentEnvironment);
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

  // Check if file is previewable (image, PDF, video, or audio)
  const isPreviewable = (file) => {
    const mime = file.mimetype?.toLowerCase() || '';
    const ext = (file.originalname || file.filename || '').toLowerCase();
    return mime.includes('image') || mime.includes('pdf') || mime.includes('video') || mime.includes('audio') ||
           ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') ||
           ext.endsWith('.gif') || ext.endsWith('.webp') || ext.endsWith('.pdf') ||
           ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.ogg') || ext.endsWith('.mov') ||
           ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.ogg') || ext.endsWith('.flac') ||
           ext.endsWith('.aac') || ext.endsWith('.m4a') || ext.endsWith('.wma') || ext.endsWith('.aiff');
  };

  // Get previewable files from current view
  const getPreviewableFiles = () => {
    return filteredFiles.filter(f => isPreviewable(f));
  };

  // Open preview lightbox
  const openPreview = (file) => {
    const previewable = getPreviewableFiles();
    const index = previewable.findIndex(f => f.id === file.id || f.filename === file.filename);
    setPreviewFiles(previewable);
    setPreviewIndex(index >= 0 ? index : 0);
    setPreviewOpen(true);
    setZoom(1);
  };

  // Navigate preview
  const navigatePreview = (direction) => {
    const newIndex = previewIndex + direction;
    if (newIndex >= 0 && newIndex < previewFiles.length) {
      setPreviewIndex(newIndex);
      setZoom(1);
    }
  };

  // Close preview
  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFiles([]);
    setPreviewIndex(0);
    setZoom(1);
  };

  // Get preview URL with auth token
  const getPreviewUrl = async (file) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    // For videos, don't download - let VideoPlayer handle streaming
    if (file.mimetype?.includes('video')) {
      return null; // VideoPlayer will use streaming directly
    }

    // For images, create blob URL for preview
    try {
      const response = await fetch(`${API_BASE}/api/download/${encodeURIComponent(file.filename)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    }
    return null;
  };

  // Load preview image
  const loadPreviewImage = async (file) => {
    const url = await getPreviewUrl(file);
    if (url) {
      return url;
    }
    return null;
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
      <div className="space-y-2">
        {/* Top Bar: Title + Environment */}
        <div className="flex flex-col gap-2 pb-2 border-b border-white/5">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-semibold text-base truncate">
                {currentFolder ? (currentFolder.originalname || currentFolder.name) : 'All Files'}
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {currentFolder ? 'Browse folder contents' : 'Manage and organize your files'}
              </p>
            </div>
          </div>

          {/* Environment Toggle */}
          <div className="flex items-center">
            <EnvironmentToggle
              environment={currentEnvironment}
              onEnvironmentChange={handleEnvironmentChange}
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Right side: View Toggle, Upload, New Folder, Select Mode */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {/* Select Mode Toggle */}
            <button
              onClick={toggleSelectMode}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[50px] ${
                selectMode || selectedFiles.length > 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                  : 'bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 text-slate-300 hover:text-white'
              }`}
              title={selectMode ? 'Exit select mode' : 'Select files'}
            >
              {selectMode ? (
                <>
                  <FiX className="text-base" />
                  <span className="hidden sm:inline">Cancel</span>
                </>
              ) : (
                <>
                  <FiCheckSquare className="text-base" />
                  <span className="hidden sm:inline">Select</span>
                </>
              )}
              {selectedFiles.length > 0 && (
                <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full min-w-[24px]">{selectedFiles.length}</span>
              )}
            </button>

            {/* Delete Button (shown when files selected) */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {selectedFiles.length} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                  title="Delete selected"
                >
                  <FiTrash2 className="text-base" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all min-w-[40px] ${
                  viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FiGrid className="text-sm" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all min-w-[40px] ${
                  viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FiList className="text-sm" />
              </button>
            </div>

            {/* Upload */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/25 min-w-[50px]"
            >
              <FiUpload className="text-base" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* New Folder */}
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[50px]"
            >
              <FiPlus className="text-base" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
          </div>
        </div>

        {/* Search - Above File Type Filter */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
          <input
            type="search"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        {/* File Type Filter - Grid Cards - Compact */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-3">
          {[
            { id: 'all', label: 'All', icon: FiFolder, color: 'from-slate-500 to-slate-600' },
            { id: 'photo', label: 'Photo', icon: FiImage, color: 'from-pink-500 to-rose-500' },
            { id: 'video', label: 'Video', icon: FiFilm, color: 'from-purple-500 to-violet-500' },
            { id: 'audio', label: 'Audio', icon: FiMusic, color: 'from-amber-500 to-orange-500' },
            { id: 'pdf', label: 'PDF', icon: FiBook, color: 'from-red-500 to-rose-500' },
            { id: 'docs', label: 'Docs', icon: FiFile, color: 'from-blue-500 to-indigo-500' },
            { id: 'excel', label: 'Excel', icon: FiBarChart, color: 'from-emerald-500 to-green-500' },
            { id: 'txt', label: 'TXT', icon: FiFile, color: 'from-cyan-500 to-teal-500' },
          ].map((filter) => {
            const IconComponent = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => setFileTypeFilter(filter.id)}
                className={`relative p-1.5 rounded-lg border transition-all overflow-hidden group ${
                  fileTypeFilter === filter.id
                    ? 'bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800/30 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-0.5">
                    <IconComponent className={`text-base ${
                      fileTypeFilter === filter.id ? 'text-indigo-400' : 'text-slate-400'
                    }`} />
                  </div>
                  <div className="text-[9px] font-medium text-slate-300">{filter.label}</div>
                  <div className={`text-[9px] font-bold mt-0.5 ${
                    fileTypeFilter === filter.id ? 'text-indigo-400' : 'text-slate-500'
                  }`}>
                    {fileTypeStats[filter.id] || 0}
                  </div>
                </div>
                {fileTypeFilter === filter.id && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${filter.color} opacity-10`}></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Progress Toast - Google Drive Style (bottom-right) */}
      {showUploadToast && (
        <div className="fixed bottom-4 right-4 z-[100] animate-slide-up">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-4 min-w-[320px] max-w-md">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                {uploadProgress >= 100 ? (
                  <FiCheck className="text-white text-lg" />
                ) : (
                  <FiCloud className="text-white text-lg animate-pulse" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {uploadProgress >= 100 ? 'Upload complete!' : 'Uploading...'}
                </p>
                {uploadProgress < 100 && (
                  <>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                      {uploadStatus?.currentFile || 'Preparing upload...'}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-indigo-400 text-xs mt-1 font-medium">{Math.round(uploadProgress)}%</p>
                  </>
                )}
                {uploadProgress >= 100 && (
                  <p className="text-slate-400 text-xs mt-0.5">
                    {uploadStatus?.total || 1} file(s) uploaded successfully
                  </p>
                )}
              </div>
              
              {/* Close button */}
              <button
                onClick={() => setShowUploadToast(false)}
                className="flex-shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <FiX className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message - Compact */}
      {error && (
        <div className="mb-3 p-2 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <FiX className="text-red-400 text-xs" />
            <span className="text-red-400 text-xs">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-white p-1 rounded-md hover:bg-red-500/10 transition-all">
            <FiX className="text-xs" />
          </button>
        </div>
      )}

      {/* Navigation Bar: Back + Up + Breadcrumbs */}
      <div className="flex items-center gap-1 bg-slate-800/30 border border-white/5 rounded-lg px-2 py-1.5 mb-2">
        {/* Back Button */}
        <button
          onClick={() => {
            if (folderHistory.length > 0) {
              const prevFolder = folderHistory[folderHistory.length - 1];
              setFolderHistory(prev => prev.slice(0, -1));
              setCurrentFolder(prevFolder);
              setSelectedFiles([]);
            } else if (currentFolder) {
              handleNavigateUp();
            }
          }}
          disabled={!currentFolder && folderHistory.length === 0}
          className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          title="Go back"
        >
          <FiChevronLeft className="text-sm" />
        </button>

        {/* Up Button */}
        <button
          onClick={handleNavigateUp}
          disabled={!currentFolder}
          className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          title="Up one level"
        >
          <FiChevronRight className="text-sm rotate-[-90deg]" />
        </button>

        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-0.5 text-[11px] text-slate-400 overflow-x-auto flex-1 min-w-0 ml-1">
          <button
            onClick={() => {
              setCurrentFolder(null);
              setFolderHistory([]);
              setSelectedFiles([]);
            }}
            className="flex items-center gap-1 hover:text-indigo-400 transition-colors flex-shrink-0"
            title="Root"
          >
            <FiCloud className="text-xs flex-shrink-0" />
            <span className="whitespace-nowrap font-medium">Root</span>
          </button>
          {currentFolder && (
            <>
              <FiChevronRight className="text-xs flex-shrink-0 opacity-50" />
              {(() => {
                const pathParts = currentFolder.path.split('/').filter(p => p);
                let accumulatedPath = '';

                return pathParts.map((part, index) => {
                  accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : `/${part}`;

                  return (
                    <Fragment key={index}>
                      <button
                        onClick={() => {
                          const targetFolder = folders?.find(f => f.path === accumulatedPath);
                          if (targetFolder) {
                            setCurrentFolder(targetFolder);
                            setFolderHistory(prev => {
                              const newHistory = prev.slice(0, index);
                              if (index > 0) {
                                const parentPath = accumulatedPath.substring(0, accumulatedPath.lastIndexOf('/'));
                                const parentFolder = folders?.find(f => f.path === parentPath);
                                if (parentFolder && !newHistory.includes(parentFolder)) {
                                  newHistory.push(parentFolder);
                                }
                              }
                              return newHistory;
                            });
                          }
                          setSelectedFiles([]);
                        }}
                        className="hover:text-indigo-400 transition-colors flex-shrink-0 truncate max-w-[100px] font-medium"
                        title={part}
                      >
                        {part}
                      </button>
                      {index < pathParts.length - 1 && (
                        <FiChevronRight className="text-xs flex-shrink-0 opacity-50" />
                      )}
                    </Fragment>
                  );
                });
              })()}
            </>
          )}
        </div>
      </div>

      {/* File Grid/List */}
      {viewMode === 'grid' ? (
        filteredFiles.length === 0 ? (
          /* Grid Empty State - Compact */
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-2 bg-slate-800/50 rounded-lg flex items-center justify-center">
                {debouncedSearch ? (
                  <FiSearch className="text-xl text-slate-600" />
                ) : currentFolder ? (
                  <FiFolder className="text-xl text-slate-600" />
                ) : (
                  <FiCloud className="text-xl text-slate-600" />
                )}
              </div>
              <p className="text-slate-400 text-xs font-medium mb-3">
                {debouncedSearch
                  ? 'No matches'
                  : currentFolder
                    ? 'Empty folder'
                    : 'No files yet'}
              </p>
              {!debouncedSearch && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                >
                  <FiUpload className="text-xs" />
                  Upload
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 mt-3 mb-20">
          {/* Folders */}
          {displayedFolders.map((folder) => (
            <div
              key={folder.id || folder.filename}
              onDoubleClick={() => handleDoubleClick(folder)}
              onClick={(e) => handleClick(folder, e)}
              className={`group aspect-square bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-700/40 hover:to-slate-800/40 border rounded-2xl flex flex-col items-center transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 relative overflow-hidden ${
                selectedFiles.includes(folder)
                  ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/20'
                  : 'border-white/10 hover:border-indigo-500/40'
              }`}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Folder icon with enhanced styling */}
              <div className="relative mt-3 mb-2">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400/25 to-orange-500/25 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-amber-500/20 group-hover:scale-105 transition-all duration-300">
                  <FiFolder className="text-amber-400 text-3xl drop-shadow-lg" />
                </div>
                {/* Folder tab decoration */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-400/30 rounded-full blur-sm" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-400/20 rounded-full blur-sm" />
              </div>
              
              {/* Folder name */}
              <div className="flex-1 w-full px-3 py-2 flex items-center justify-center z-10">
                <span className="text-xs text-slate-200 font-semibold text-center line-clamp-2 break-all drop-shadow-sm">
                  {folder.originalname || folder.name}
                </span>
              </div>
              
              {/* Context menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                }}
                className="absolute top-2 right-2 p-2 bg-slate-900/95 backdrop-blur-sm rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:shadow-xl hover:scale-110"
              >
                <FiMoreVertical className="text-xs" />
              </button>
              
              {/* Hover indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                  <span>Open</span>
                  <FiChevronRight className="text-xs" />
                </div>
              </div>
            </div>
          ))}

          {/* Files */}
          {displayedFiles.map((file) => {
            const fileIcon = getFileIcon(file.mimetype, file.filename);
            const IconComponent = fileIcon.icon;
            const previewable = isPreviewable(file);
            const isImage = file.mimetype?.includes('image');
            const isVideo = file.mimetype?.includes('video');

            return (
              <div
                key={file.id || file.filename}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={(e) => handleClick(file, e)}
                className={`group aspect-square bg-slate-800/30 hover:bg-slate-700/30 border rounded-xl flex flex-col items-center transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg relative ${
                  selectedFiles.includes(file)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/5 hover:border-indigo-500/30'
                } ${previewable ? 'hover:bg-slate-700/50' : ''}`}
              >
                {/* Thumbnail for images */}
                {isImage ? (
                  <div className="w-full h-32 mt-2 px-2 relative overflow-hidden rounded-lg">
                    {thumbnailUrls[file.id || file.filename] ? (
                      <>
                        <img
                          src={thumbnailUrls[file.id || file.filename]}
                          alt={file.originalname || file.filename}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
                          loading="eager" // Changed to eager for already loaded thumbnails
                        />
                        {/* Preview indicator */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <FiZoomIn className="text-white text-xl" />
                        </div>
                      </>
                    ) : (
                      // Placeholder - no thumbnail yet
                      <div className="w-full h-full flex items-center justify-center bg-slate-800/30 rounded-lg">
                        <FiImage className="text-slate-600 text-2xl" />
                      </div>
                    )}
                  </div>
                ) : isVideo ? (
                  <div className="w-full h-32 mt-2 px-2 relative overflow-hidden rounded-lg bg-slate-900/50">
                    {videoThumbnails[file.id || file.filename] ? (
                      <>
                        <img
                          src={videoThumbnails[file.id || file.filename]}
                          alt={file.originalname || file.filename}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Play icon overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiPlay className="text-slate-900 text-lg ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`w-12 h-12 mt-2 ${fileIcon.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`${fileIcon.color} text-xl`} />
                  </div>
                )}
                <div className="flex-1 w-full px-2 py-1 flex flex-col items-center justify-center gap-0.5 min-h-0">
                  <span className="text-xs text-slate-300 font-medium text-center line-clamp-2 break-all w-full">
                    {file.originalname || file.filename}
                  </span>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{formatSize(file.size)}</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {previewable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(file);
                      }}
                      className="p-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-slate-400 hover:text-indigo-400 transition-all"
                      title="Preview"
                    >
                      <FiZoomIn className="text-xs" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file.filename, token, currentEnvironment);
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
        <div className="bg-slate-800/30 border border-white/5 rounded-xl overflow-visible mt-3 mb-20">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-auto">Name</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-24 hidden sm:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 w-32 hidden md:table-cell">Modified</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {folderItems.map((folder) => (
                <tr
                  key={folder.id || folder.filename}
                  onDoubleClick={() => handleDoubleClick(folder)}
                  onClick={() => handleClick(folder, {})}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                  }}
                  className={`border-b border-white/5 hover:bg-slate-700/30 cursor-pointer transition-colors group ${
                    selectedFiles.includes(folder) ? 'bg-indigo-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Enhanced folder icon */}
                      <div className="relative">
                        <div className="w-11 h-11 bg-gradient-to-br from-amber-400/25 to-orange-500/25 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-amber-500/20 group-hover:scale-105 transition-all duration-300">
                          <FiFolder className="text-amber-400 text-xl drop-shadow-lg" />
                        </div>
                        {/* Decorative dot */}
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400/40 rounded-full" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-slate-200 font-semibold truncate max-w-full">
                          {folder.originalname || folder.name}
                        </span>
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          Folder
                        </span>
                      </div>
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
                const previewable = isPreviewable(file);
                const isVideo = file.mimetype?.includes('video');
                const isImage = file.mimetype?.includes('image');

                return (
                  <tr
                    key={file.id || file.filename}
                    onDoubleClick={() => handleDoubleClick(file)}
                    onClick={(e) => handleClick(file, e)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                    }}
                    className={`border-b border-white/5 hover:bg-slate-700/30 cursor-pointer transition-colors group ${
                      selectedFiles.includes(file) ? 'bg-indigo-500/10' : ''
                    } ${previewable ? 'hover:bg-slate-700/50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {isVideo && videoThumbnails[file.id || file.filename] ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                              <img
                                src={videoThumbnails[file.id || file.filename]}
                                alt={file.originalname || file.filename}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <FiPlay className="text-white text-xs" />
                              </div>
                            </div>
                          ) : isImage && thumbnailUrls[file.id || file.filename] ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                              <img
                                src={thumbnailUrls[file.id || file.filename]}
                                alt={file.originalname || file.filename}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 ${fileIcon.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <IconComponent className={`${fileIcon.color} text-lg`} />
                            </div>
                          )}
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
            <div className="py-6 text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-slate-800/50 rounded-lg flex items-center justify-center">
                {debouncedSearch ? (
                  <FiSearch className="text-lg text-slate-600" />
                ) : currentFolder ? (
                  <FiFolder className="text-lg text-slate-600" />
                ) : (
                  <FiCloud className="text-lg text-slate-600" />
                )}
              </div>
              <p className="text-slate-400 text-xs mb-2">
                {debouncedSearch ? 'No matches' : currentFolder ? 'Empty folder' : 'No files yet'}
              </p>
              {!debouncedSearch && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                >
                  <FiUpload className="text-xs" />
                  Upload
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Bar - 2 Row Compact Design */}
      {selectedFiles.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl min-w-[280px]">
            {/* Top Row - Info */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white font-bold bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  {selectedFiles.length}
                </span>
                <span className="text-[10px] text-slate-400">selected</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{formatSize(selectedSize)}</span>
            </div>

            {/* Bottom Row - Actions */}
            <div className="flex items-center gap-1.5">
              {/* Preview */}
              {selectedFiles.some(f => isPreviewable(f)) && (
                <button
                  onClick={() => {
                    const previewableFile = selectedFiles.find(f => isPreviewable(f));
                    if (previewableFile) openPreview(previewableFile);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 hover:text-purple-200 transition-all text-[10px] font-medium"
                  title="Preview first selected file"
                >
                  <FiZoomIn className="text-xs" />
                  Preview
                </button>
              )}

              {/* Download */}
              <button
                onClick={() => {
                  selectedFiles.forEach(file => {
                    if (file.type !== 'folder') downloadFile(file.filename, token, currentEnvironment);
                  });
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-all text-[10px] font-medium ${
                  !selectedFiles.some(f => isPreviewable(f)) ? 'flex-1' : ''
                }`}
              >
                <FiDownload className="text-xs" />
                Download
              </button>

              {/* Clear */}
              <button
                onClick={() => setSelectedFiles([])}
                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 text-slate-400 hover:text-white transition-all"
                title="Clear selection"
              >
                <FiX className="text-xs" />
              </button>

              {/* Delete */}
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                title="Delete selected"
              >
                <FiTrash2 className="text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal - Modern Design */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="relative p-6 border-b border-white/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <FiUpload className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Upload Files</h3>
                    <p className="text-xs text-slate-400">Add files to your cloud storage</p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="p-6">
              <label className="block cursor-pointer">
                <div
                  className="group relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all duration-300 hover:bg-slate-800/50 hover:shadow-xl hover:shadow-indigo-500/10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFiles = Array.from(e.dataTransfer.files);
                    if (droppedFiles.length > 0) {
                      // Upload to current folder if inside one
                      const folderPath = currentFolder?.path || null;
                      
                      // Google Drive style: close modal immediately, show toast
                      setIsUploading(true);
                      setShowUploadToast(true);
                      setUploadModalOpen(false);
                      
                      uploadMultiple(droppedFiles, token, currentEnvironment, folderPath)
                        .then(() => {
                          setTimeout(() => setShowUploadToast(false), 3000);
                        })
                        .finally(() => {
                          setIsUploading(false);
                        });
                    }
                  }}
                >
                  {/* Animated Icon */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <FiUpload className="text-4xl text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <FiPlus className="text-white text-xs" />
                    </div>
                  </div>

                  {/* Text */}
                  <p className="text-white font-semibold mb-1.5 group-hover:text-indigo-300 transition-colors">
                    Click to browse files
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    or drag and drop files here
                  </p>

                  {/* Supported Formats */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] text-slate-500 border border-white/5">
                      Images
                    </span>
                    <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] text-slate-500 border border-white/5">
                      Videos
                    </span>
                    <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] text-slate-500 border border-white/5">
                      Docs
                    </span>
                    <span className="px-2 py-1 bg-slate-800 rounded-md text-[10px] text-slate-500 border border-white/5">
                      PDFs
                    </span>
                  </div>

                  {/* Max Size */}
                  <p className="text-[10px] text-slate-500 mt-4 flex items-center justify-center gap-1">
                    <FiInfo className="text-xs" />
                    Max 50MB per file
                  </p>
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

            {/* Footer */}
            <div className="px-6 pb-6">
              <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Secure upload with encryption</span>
                </div>
              </div>
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

      {/* Load More Button (for large file lists) */}
      {hasMoreFiles && viewMode === 'grid' && (
        <div className="flex justify-center mt-6 mb-8">
          <button
            onClick={() => setVisibleFileLimit(prev => prev + 100)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"
          >
            <FiCloud className="text-indigo-400" />
            Load {Math.min(100, remainingFiles)} more files ({remainingFiles} remaining)
          </button>
        </div>
      )}

      {/* Preview Lightbox Modal */}
      {previewOpen && previewFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200]" onClick={closePreview}>
          {/* Close button */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-white z-[210] transition-all"
          >
            <FiX className="text-xl" />
          </button>

          {/* Navigation - Previous */}
          {previewIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigatePreview(-1); }}
              className="absolute left-4 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-white z-[210] transition-all"
            >
              <FiChevronLeft className="text-2xl" />
            </button>
          )}

          {/* Navigation - Next */}
          {previewIndex < previewFiles.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigatePreview(1); }}
              className="absolute right-4 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-white z-[210] transition-all"
            >
              <FiChevronRight className="text-2xl" />
            </button>
          )}

          {/* Zoom controls - only for images */}
          {!previewFiles[previewIndex]?.mimetype?.includes('video') && !previewFiles[previewIndex]?.mimetype?.includes('pdf') && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/80 rounded-xl px-4 py-2 z-[210]">
              <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.25)); }} className="p-2 hover:bg-slate-700 rounded-lg text-white">
                <FiZoomOut className="text-lg" />
              </button>
              <span className="text-white text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.25)); }} className="p-2 hover:bg-slate-700 rounded-lg text-white">
                <FiZoomIn className="text-lg" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setZoom(1); }} className="p-2 hover:bg-slate-700 rounded-lg text-white text-xs">
                Reset
              </button>
            </div>
          )}

          {/* Image counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 rounded-xl px-4 py-2 z-[210]">
            <span className="text-white text-sm font-medium">
              {previewIndex + 1} / {previewFiles.length}
            </span>
          </div>

          {/* Preview content */}
          <div className={`flex-1 flex items-center justify-center p-4 overflow-visible ${!previewFiles[previewIndex]?.mimetype?.includes('video') && !previewFiles[previewIndex]?.mimetype?.includes('pdf') && !previewFiles[previewIndex]?.mimetype?.includes('audio') ? 'pb-24' : ''}`} onClick={(e) => e.stopPropagation()}>
            {previewFiles[previewIndex].mimetype?.includes('pdf') ? (
              /* PDF Preview */
              <div className="w-full h-full max-w-4xl">
                <iframe
                  src={previewUrl || ''}
                  className="w-full h-[75vh] rounded-lg"
                  title="PDF Preview"
                />
              </div>
            ) : previewFiles[previewIndex].mimetype?.includes('video') ? (
              /* Video Preview with custom player */
              <VideoPlayer
                src={previewUrl || ''}
                filename={previewFiles[previewIndex].originalname || previewFiles[previewIndex].filename}
                onDownload={() => handleDownload(previewFiles[previewIndex])}
                enableStreaming={true}
                apiBase={import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                token={token}
              />
            ) : previewFiles[previewIndex].mimetype?.includes('audio') ? (
              /* Audio Preview */}
              <div className="w-full max-w-md">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-white/10 shadow-2xl">
                  {/* Album art placeholder */}
                  <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-white/10">
                    <FiMusic className="text-6xl text-amber-400" />
                  </div>
                  
                  {/* File info */}
                  <div className="text-center mb-4">
                    <h3 className="text-white font-semibold text-base truncate">
                      {previewFiles[previewIndex].originalname || previewFiles[previewIndex].filename}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {formatSize(previewFiles[previewIndex].size)}
                    </p>
                  </div>
                  
                  {/* Audio player */}
                  <audio
                    key={previewUrl || 'audio'}
                    src={previewUrl || ''}
                    controls
                    className="w-full rounded-lg"
                  >
                    Your browser does not support the audio element.
                  </audio>
                  
                  {/* Download button */}
                  <button
                    onClick={() => handleDownload(previewFiles[previewIndex])}
                    className="w-full mt-3 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <FiDownload className="text-sm" />
                    Download
                  </button>
                </div>
              </div>
            ) : previewLoading ? (
              /* Loading state */
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white text-sm">Loading preview...</p>
              </div>
            ) : previewUrl ? (
              /* Image Preview */
              <img
                src={previewUrl}
                alt={previewFiles[previewIndex].originalname || previewFiles[previewIndex].filename}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.2s ease-out" }}
              />
            ) : (
              /* Error state */
              <div className="text-center text-slate-400">
                <FiX className="text-4xl mb-2" />
                <p>Failed to load preview</p>
              </div>
            )}
          </div>

          {/* File info - hide for video and audio since they have their own overlay */}
          {!previewFiles[previewIndex]?.mimetype?.includes('video') && !previewFiles[previewIndex]?.mimetype?.includes('audio') && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center z-[210]">
              <p className="text-white font-medium text-sm mb-1">
                {previewFiles[previewIndex].originalname || previewFiles[previewIndex].filename}
              </p>
              <p className="text-slate-400 text-xs">
                {formatSize(previewFiles[previewIndex].size)}
              </p>
            </div>
          )}
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
          {/* Download - only for files */}
          {contextMenu.item.type !== 'folder' && (
            <button
              onClick={() => handleDownload(contextMenu.item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              <FiDownload className="text-sm" />
              Download
            </button>
          )}
          
          {/* Delete */}
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
