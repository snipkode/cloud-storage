import { useState, useEffect, useCallback } from 'react';
import {
  FiGrid, FiList, FiPlus, FiSearch, FiMoreVertical, FiDownload,
  FiTrash2, FiFolder, FiFile, FiChevronRight, FiArrowLeft,
  FiRefreshCw, FiX, FiUpload, FiEdit2, FiCopy, FiScissors
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useFilesStore } from '@store/filesStore';

// File type icons
const getFileIcon = (mimetype, filename) => {
  if (mimetype?.includes('image')) return '🖼️';
  if (mimetype?.includes('video')) return '🎬';
  if (mimetype?.includes('audio')) return '🎵';
  if (mimetype?.includes('pdf')) return '📕';
  if (mimetype?.includes('word') || filename?.endsWith('.doc') || filename?.endsWith('.docx')) return '📘';
  if (mimetype?.includes('excel') || filename?.endsWith('.xls') || filename?.endsWith('.xlsx')) return '📗';
  if (mimetype?.includes('powerpoint') || filename?.endsWith('.ppt') || filename?.endsWith('.pptx')) return '📙';
  if (mimetype?.includes('zip') || mimetype?.includes('compressed')) return '📦';
  if (mimetype?.includes('text')) return '📄';
  return '📄';
};

function FileBrowser() {
  const { token } = useAuthStore();
  const { files, loading, uploadProgress, error, fetchFiles, uploadMultiple, deleteFile, downloadFile, clearError } = useFilesStore();
  
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('fileBrowserView') || 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Load files
  const loadData = useCallback(async () => {
    if (token) {
      await fetchFiles(token);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save view preference
  useEffect(() => {
    localStorage.setItem('fileBrowserView', viewMode);
  }, [viewMode]);

  // Handle view mode change
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle file/folder selection
  const handleSelect = (item, multi = false) => {
    if (multi) {
      setSelectedFiles(prev => 
        prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
      );
    } else {
      setSelectedFiles([item]);
    }
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

  // Create new folder
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      // TODO: Implement folder creation API
      setShowNewFolderModal(false);
      setNewFolderName('');
    }
  };

  // Handle upload
  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      await uploadMultiple(selectedFiles, token);
    }
    e.target.value = '';
    setUploadModalOpen(false);
  };

  // Handle delete
  const handleDelete = async (item) => {
    if (confirm(`Delete "${item.originalname || item.filename}"?`)) {
      if (item.type === 'folder') {
        // TODO: Implement folder delete
      } else {
        await deleteFile(item.filename, token);
      }
      setSelectedFiles([]);
    }
  };

  // Filter files based on current folder and search
  const filteredFiles = files.filter(file => {
    const matchesSearch = (file.originalname || file.filename).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = currentFolder 
      ? file.path?.startsWith(currentFolder.path || '/')
      : (!file.path || file.path === '/');
    return matchesSearch && matchesFolder;
  });

  // Separate folders and files
  const folders = filteredFiles.filter(f => f.type === 'folder');
  const fileList = filteredFiles.filter(f => f.type !== 'folder');

  // Get current path breadcrumbs
  const getPathBreadcrumbs = () => {
    const breadcrumbs = [{ name: 'My Drive', folder: null }];
    let folder = currentFolder;
    const history = [...folderHistory];
    
    // Build breadcrumbs from history
    history.forEach((f, idx) => {
      if (f) breadcrumbs.push({ name: f.originalname || f.name, folder: f });
    });
    
    if (currentFolder && !history.includes(currentFolder)) {
      breadcrumbs.push({ name: currentFolder.originalname || currentFolder.name, folder: currentFolder });
    }
    
    return breadcrumbs;
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50">
        <div className="flex items-center gap-3 flex-1">
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <FiArrowLeft className="text-white text-sm" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            {getPathBreadcrumbs().map((crumb, idx, arr) => (
              <div key={idx} className="flex items-center">
                {idx > 0 && <FiChevronRight className="text-gray-500 text-xs mx-1" />}
                <button
                  onClick={() => {
                    if (crumb.folder) {
                      setCurrentFolder(crumb.folder);
                      setFolderHistory(folderHistory.slice(0, idx));
                    } else {
                      setCurrentFolder(null);
                      setFolderHistory([]);
                    }
                    setSelectedFiles([]);
                  }}
                  className={`px-2 py-1 rounded-lg whitespace-nowrap transition-all ${
                    idx === arr.length - 1
                      ? 'bg-purple-500/20 text-purple-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 lg:w-64 bg-slate-800 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FiGrid className="text-sm" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FiList className="text-sm" />
            </button>
          </div>

          {/* Upload button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/25"
          >
            <FiUpload className="text-sm" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* New folder button */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <FiPlus className="text-sm" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          {/* More actions */}
          <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
            <FiMoreVertical className="text-sm" />
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {loading && uploadProgress > 0 && (
        <div className="px-4 py-2 border-b border-white/10 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <FiUpload className="text-purple-400 text-sm animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
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
        <div className="px-4 py-2 border-b border-white/10 bg-red-500/10 flex items-center justify-between">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-white">
            <FiX className="text-sm" />
          </button>
        </div>
      )}

      {/* File Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {/* Parent folder shortcut */}
            {folderHistory.length > 0 && (
              <button
                onClick={handleBack}
                className="group aspect-square bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
              >
                <div className="text-4xl">📁</div>
                <span className="text-xs text-gray-400 font-medium">..</span>
              </button>
            )}

            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id || folder.filename}
                onDoubleClick={() => handleDoubleClick(folder)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(folder, e.ctrlKey || e.metaKey);
                }}
                className={`group aspect-square bg-white/5 hover:bg-white/10 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative ${
                  selectedFiles.includes(folder)
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 hover:border-purple-500/30'
                }`}
              >
                <div className="text-5xl">📁</div>
                <span className="text-xs text-gray-300 font-medium text-center line-clamp-2 px-2">
                  {folder.originalname || folder.name}
                </span>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
                  >
                    <FiMoreVertical className="text-xs" />
                  </button>
                </div>
              </div>
            ))}

            {/* Files */}
            {fileList.map((file) => (
              <div
                key={file.id || file.filename}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(file, e.ctrlKey || e.metaKey);
                }}
                className={`group aspect-square bg-white/5 hover:bg-white/10 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative ${
                  selectedFiles.includes(file)
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 hover:border-purple-500/30'
                }`}
              >
                <div className="text-5xl">{getFileIcon(file.mimetype, file.filename)}</div>
                <span className="text-xs text-gray-300 font-medium text-center line-clamp-2 px-2">
                  {file.originalname || file.filename}
                </span>
                <span className="text-[10px] text-gray-500">{formatSize(file.size)}</span>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file.filename);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-green-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <FiDownload className="text-xs" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
                  >
                    <FiMoreVertical className="text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles([...filteredFiles]);
                        } else {
                          setSelectedFiles([]);
                        }
                      }}
                      className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                    />
                  </th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Name</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Size</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Modified</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Parent folder row */}
                {folderHistory.length > 0 && (
                  <tr
                    onClick={handleBack}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📁</span>
                        <span className="text-sm text-gray-300 font-medium">..</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">-</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">-</td>
                    <td className="px-4 py-3"></td>
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
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(folder)}
                        onChange={(e) => e.stopPropagation()}
                        className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📁</span>
                        <span className="text-sm text-gray-300 font-medium truncate max-w-xs">
                          {folder.originalname || folder.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">-</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {formatDate(folder.createdAt || folder.modifiedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <FiMoreVertical className="text-xs" />
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
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file)}
                        onChange={(e) => e.stopPropagation()}
                        className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(file.mimetype, file.filename)}</span>
                        <span className="text-sm text-gray-300 font-medium truncate max-w-xs">
                          {file.originalname || file.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file.filename);
                          }}
                          className="p-1.5 hover:bg-green-600/20 rounded-lg text-gray-400 hover:text-green-400 transition-colors"
                        >
                          <FiDownload className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <FiMoreVertical className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredFiles.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📂</div>
                <p className="text-gray-400 text-sm">
                  {searchQuery ? 'No files match your search' : 'This folder is empty'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Upload your first file →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-white/10 bg-slate-800/50 flex items-center justify-between text-xs text-gray-400">
        <span>
          {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}
          {selectedFiles.length > 0 && ` • ${selectedFiles.length} selected`}
        </span>
        {selectedFiles.length > 0 && (
          <span className="flex items-center gap-4">
            <span>
              {formatSize(selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0))}
            </span>
            <button
              onClick={() => setSelectedFiles([])}
              className="hover:text-white transition-colors"
            >
              Clear selection
            </button>
          </span>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Upload Files</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-white">
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-5">
              <label className="block">
                <div className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors">
                  <FiUpload className="text-4xl text-gray-400 mx-auto mb-3" />
                  <p className="text-white font-medium">Click to select files</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop here</p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleUpload}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">New Folder</h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white">
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
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
                disabled={!newFolderName.trim()}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
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
          className="fixed bg-slate-800 border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              downloadFile(contextMenu.item.filename);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FiDownload className="text-xs" />
            Download
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              // TODO: Implement rename
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FiEdit2 className="text-xs" />
            Rename
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              // TODO: Implement copy
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FiCopy className="text-xs" />
            Copy
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              // TODO: Implement move
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FiScissors className="text-xs" />
            Move to
          </button>
          <div className="border-t border-white/10 my-1"></div>
          <button
            onClick={() => {
              handleDelete(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <FiTrash2 className="text-xs" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default FileBrowser;
