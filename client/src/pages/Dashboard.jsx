import { useState, useEffect, useCallback } from 'react';
import { FiUpload, FiDownload, FiTrash2, FiRefreshCw, FiFile, FiX } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { useFilesStore } from '../store/filesStore';

function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const { files, loading, uploadProgress, error, fetchFiles, uploadMultiple, deleteFile, downloadFile, clearError } = useFilesStore();
  const [dragOver, setDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const loadData = useCallback(async () => {
    if (token) {
      await fetchFiles(token);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadMultiple(droppedFiles, token);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      await uploadMultiple(selectedFiles, token);
    }
    e.target.value = '';
  };

  const handleDelete = async (filename) => {
    if (confirm(`Delete "${filename}"?`)) {
      await deleteFile(filename, token);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☁️</span>
            <div>
              <h1 className="text-white font-bold">Cloud Storage</h1>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.photoURL && (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border-2 border-white/30" />
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-white/10 hover:bg-red-500/80 text-white text-sm px-3 py-2 rounded-lg transition-all"
            >
              <FaGoogle className="text-xs" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto">
        {/* Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`bg-white/10 backdrop-blur-lg rounded-xl border-2 border-dashed transition-all cursor-pointer mb-4 ${
            dragOver ? 'border-purple-400 bg-purple-500/20' : 'border-white/20 hover:border-white/40'
          }`}
        >
          <label className="block p-8 text-center">
            <FiUpload className="text-4xl text-gray-400 mx-auto mb-3" />
            <p className="text-white font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-gray-500 mt-1">Max 50MB per file</p>
            <input type="file" multiple onChange={handleFileSelect} className="hidden" />
          </label>
        </div>

        {/* Progress Bar */}
        {loading && uploadProgress > 0 && (
          <div className="mb-4 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between text-sm text-white mb-2">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30 flex items-center justify-between">
            <span className="text-red-200 text-sm">{error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-white">
              <FiX className="text-lg" />
            </button>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2">
              <FiFile className="text-purple-400" />
              Files ({files.length})
            </h2>
            <button
              onClick={loadData}
              disabled={loading && uploadProgress === 0}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              <FiRefreshCw className={`text-sm ${loading && uploadProgress === 0 ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {files.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📂</div>
              <p className="text-gray-400">No files yet. Upload something!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {files.map((file) => (
                <div
                  key={file.filename}
                  className="p-4 flex items-center gap-4 hover:bg-white/5 transition-all group"
                >
                  <div className="text-3xl text-purple-400">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.originalname || file.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatSize(file.size)} • {formatDate(file.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => downloadFile(file.filename)}
                      className="flex items-center gap-1 bg-green-500/80 hover:bg-green-500 text-white text-sm px-3 py-2 rounded-lg transition-all"
                    >
                      <FiDownload className="text-sm" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      onClick={() => handleDelete(file.filename)}
                      className="flex items-center gap-1 bg-red-500/80 hover:bg-red-500 text-white text-sm px-3 py-2 rounded-lg transition-all"
                    >
                      <FiTrash2 className="text-sm" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Storage Stats */}
        {files.length > 0 && (
          <div className="mt-4 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Storage Used</span>
              <span className="text-white font-medium">
                {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
