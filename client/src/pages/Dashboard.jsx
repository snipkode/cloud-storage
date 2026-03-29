import { useState, useEffect, useCallback } from 'react';
import { FiKey, FiFolder } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import { useAuthStore } from '@store/authStore';
import { useFilesStore } from '@store/filesStore';
import ApiKeys from '@pages/ApiKeys';
import FileBrowser from '@components/FileBrowser';

function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const { fetchFiles } = useFilesStore();
  const [activeTab, setActiveTab] = useState('files');

  const loadData = useCallback(async () => {
    if (token) {
      await fetchFiles(token);
    }
  }, [token, fetchFiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FiFolder className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Cloud Storage</h1>
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
      <main className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <FiFolder className="text-sm" />
            Files
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'api-keys'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <FiKey className="text-sm" />
            API Keys
          </button>
        </div>

        {/* Tab Content */}
        <div className="h-[calc(100vh-220px)]">
          {activeTab === 'files' ? (
            <FileBrowser />
          ) : (
            <ApiKeys />
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
