import { useState, useEffect } from 'react';
import {
  FiUsers, FiServer, FiHardDrive, FiActivity, FiVolume2, FiShield,
  FiKey, FiSettings, FiTrendingUp, FiClock, FiAlertCircle, FiCheckCircle,
  FiUserX, FiTrash2, FiEdit2, FiSearch, FiX, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useAdminStore } from '@store/adminStore';
import AppLayout from '@components/AppLayout';

// Compact Stats Card Component
function StatCard({ icon: Icon, label, value, change, color, loading }) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="text-white text-sm" />
        </div>
        {change && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${
            change.startsWith('+') ? 'text-green-400' : 'text-red-400'
          }`}>
            <FiTrendingUp className={`text-xs ${change.startsWith('+') ? '' : 'rotate-180'}`} />
            {change}
          </span>
        )}
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-slate-700 rounded w-20"></div>
          <div className="h-3 bg-slate-700 rounded w-16"></div>
        </div>
      ) : (
        <>
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </>
      )}
    </div>
  );
}

// User Management Modal
function UserManagementModal({ isOpen, onClose }) {
  const { users, totalUsers, fetchUsers, updateUserRole, deleteUser } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(null);

  useEffect(() => {
    if (isOpen) fetchUsers(50, 0);
  }, [isOpen, fetchUsers]);

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = async (uid, newRole) => {
    await updateUserRole(uid, newRole);
    setShowRoleDropdown(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FiUsers className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">User Management</h3>
              <p className="text-xs text-slate-500">{totalUsers || 0} total users</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-auto p-2 min-h-0">
          <div className="space-y-1">
            {filteredUsers.map((user) => (
              <div
                key={user.uid}
                className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-lg" />
                    ) : (
                      <span className="text-white text-sm font-medium">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">{user.displayName || 'Unnamed'}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium border ${
                        user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                        user.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 truncate block">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Role Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowRoleDropdown(showRoleDropdown === user.uid ? null : user.uid)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-xs text-slate-300 transition-all"
                    >
                      <FiEdit2 className="text-xs" />
                      <span>Role</span>
                      <FiChevronDown className={`text-xs transition-transform ${showRoleDropdown === user.uid ? 'rotate-180' : ''}`} />
                    </button>
                    {showRoleDropdown === user.uid && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-10 min-w-[120px]">
                        {['user', 'admin', 'super_admin'].map((role) => (
                          <button
                            key={role}
                            onClick={() => handleRoleChange(user.uid, role)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700/50 transition-all first:rounded-t-lg last:rounded-b-lg ${
                              user.role === role ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this user? This will remove all their files and API keys.')) {
                        deleteUser(user.uid);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete user"
                  >
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// System Logs Modal
function SystemLogsModal({ isOpen, onClose }) {
  const { logs, fetchLogs } = useAdminStore();
  const [logLevel, setLogLevel] = useState('all');

  useEffect(() => {
    if (isOpen) fetchLogs(logLevel, 100);
  }, [isOpen, logLevel, fetchLogs]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-500/10';
      case 'warn': return 'text-amber-400 bg-amber-500/10';
      case 'info': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <FiActivity className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">System Logs</h3>
              <p className="text-xs text-slate-500">Real-time system activity</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Level Filter */}
        <div className="p-3 border-b border-white/5 flex-shrink-0">
          <div className="flex gap-2">
            {['all', 'info', 'warn', 'error'].map((level) => (
              <button
                key={level}
                onClick={() => setLogLevel(level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  logLevel === level
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-auto bg-[#1e1e2e] p-3 min-h-0 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No logs found</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2 text-slate-300">
                  <span className="text-slate-500 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${getLevelColor(log.level)}`}>
                    {log.level?.toUpperCase()}
                  </span>
                  <span className="truncate">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Cloud Settings Modal
function CloudSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    uploadLimit: 50, // MB
    downloadLimit: 100, // MB per day
    enableTranscoding: true,
    defaultQuality: '720p'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Load current settings from localStorage (or API in production)
      const saved = localStorage.getItem('cloudSettings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load settings:', e);
        }
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // In production, this would call an API endpoint
    // await fetch('/api/admin/settings', { method: 'POST', body: JSON.stringify(settings) })
    
    localStorage.setItem('cloudSettings', JSON.stringify(settings));
    
    setTimeout(() => {
      setSaving(false);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <FiSettings className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">Cloud Settings</h3>
              <p className="text-xs text-slate-500">Storage & bandwidth limits</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Upload Limit */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Upload Size Limit (MB)
            </label>
            <input
              type="number"
              value={settings.uploadLimit}
              onChange={(e) => setSettings({ ...settings, uploadLimit: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              min="1"
              max="1000"
            />
            <p className="text-xs text-slate-500 mt-1">Maximum file size per upload</p>
          </div>

          {/* Download Limit */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Download Limit (MB/day)
            </label>
            <input
              type="number"
              value={settings.downloadLimit}
              onChange={(e) => setSettings({ ...settings, downloadLimit: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              min="10"
              max="10000"
            />
            <p className="text-xs text-slate-500 mt-1">Daily download quota per user</p>
          </div>

          {/* Transcoding */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium text-slate-300">Enable Transcoding</label>
              <p className="text-xs text-slate-500 mt-0.5">Auto-transcode videos for streaming</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enableTranscoding: !settings.enableTranscoding })}
              className={`w-11 h-6 rounded-full transition-colors ${
                settings.enableTranscoding ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.enableTranscoding ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Default Quality */}
          {settings.enableTranscoding && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Default Transcode Quality
              </label>
              <select
                value={settings.defaultQuality}
                onChange={(e) => setSettings({ ...settings, defaultQuality: e.target.value })}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              >
                <option value="360p">360p (Low bandwidth)</option>
                <option value="480p">480p (Minimum quality)</option>
                <option value="720p">720p (Recommended)</option>
                <option value="1080p">1080p (Full HD)</option>
              </select>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? <FiCheckCircle className="text-sm" /> : <FiAlertCircle className="text-sm" />}
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiCheckCircle className="text-sm" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Samba Integration Modal
function SambaModal({ isOpen, onClose }) {
  const { sambaStatus, fetchSambaStatus } = useAdminStore();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) fetchSambaStatus();
  }, [isOpen, fetchSambaStatus]);

  useEffect(() => {
    if (sambaStatus?.enabled !== undefined) {
      setEnabled(sambaStatus.enabled);
    }
  }, [sambaStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <FiServer className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">Samba Integration</h3>
              <p className="text-xs text-slate-500">SMB/CIFS file sharing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              {enabled ? (
                <FiCheckCircle className="text-green-400 text-lg" />
              ) : (
                <FiAlertCircle className="text-amber-400 text-lg" />
              )}
              <div>
                <span className="text-white text-sm font-medium">Samba Service</span>
                <p className="text-xs text-slate-500">{enabled ? 'Running' : 'Stopped'}</p>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs rounded font-medium ${
              enabled ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {/* Config Info */}
          {sambaStatus?.config && (
            <div className="space-y-2">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <div className="text-xs text-slate-500 mb-1">Shares</div>
                <div className="text-white text-sm font-medium">
                  {sambaStatus.config.shares?.length || 0} configured
                </div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <div className="text-xs text-slate-500 mb-1">Valid Users</div>
                <div className="text-white text-sm font-medium">
                  {sambaStatus.config.validUsers?.length || 0} users
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all">
              Configure Shares
            </button>
            <button className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all">
              {enabled ? 'Disable' : 'Enable'} Samba
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuthStore();
  const { stats, activities, error, clearError } = useAdminStore();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showSambaModal, setShowSambaModal] = useState(false);
  const [showCloudSettingsModal, setShowCloudSettingsModal] = useState(false);

  // Check if user is admin or super_admin
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const hasAccess = isAdmin || isSuperAdmin;

  const { fetchStats, fetchActivities } = useAdminStore();

  useEffect(() => {
    if (hasAccess) {
      fetchStats();
      fetchActivities(10);
    }
  }, [hasAccess, fetchStats, fetchActivities]);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FiShield className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatActivityTime = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user': return FiUsers;
      case 'api': return FiKey;
      case 'file': return FiHardDrive;
      case 'broadcast': return FiVolume2;
      default: return FiActivity;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'user': return 'bg-blue-500/20 text-blue-400';
      case 'api': return 'bg-purple-500/20 text-purple-400';
      case 'file': return 'bg-green-500/20 text-green-400';
      case 'broadcast': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
            {isSuperAdmin && (
              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-[10px] font-medium text-purple-400">
                Super Admin
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5">System overview and management</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="text-red-400 text-sm" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/10">
            <FiX className="text-sm" />
          </button>
        </div>
      )}

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={FiUsers}
          label="Total Users"
          value={stats?.totalUsers || 0}
          change="+12%"
          color="from-blue-500 to-cyan-500"
          loading={!stats}
        />
        <StatCard
          icon={FiKey}
          label="API Keys"
          value={stats?.totalApiKeys || 0}
          change="+5"
          color="from-purple-500 to-pink-500"
          loading={!stats}
        />
        <StatCard
          icon={FiHardDrive}
          label="Storage Used"
          value={formatBytes(stats?.totalStorage)}
          change="+16%"
          color="from-orange-500 to-red-500"
          loading={!stats}
        />
        <StatCard
          icon={FiActivity}
          label="Active Now"
          value={stats?.activeUsers || 0}
          change="+23"
          color="from-green-500 to-emerald-500"
          loading={!stats}
        />
      </div>

      {/* Quick Actions & Activity - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-slate-800/50 rounded-xl border border-white/5 p-4">
          <h3 className="text-base font-semibold text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => setShowUserModal(true)}
                className="p-3 bg-slate-700/30 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 rounded-lg transition-all group text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FiUsers className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-white text-sm font-medium">Users</span>
                </div>
                <p className="text-xs text-slate-500">Manage users</p>
              </button>
            )}
            <button
              onClick={() => setShowCloudSettingsModal(true)}
              className="p-3 bg-slate-700/30 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-lg transition-all group text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <FiSettings className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-sm font-medium">Cloud</span>
              </div>
              <p className="text-xs text-slate-500">Storage limits</p>
            </button>
            <button
              onClick={() => setShowSambaModal(true)}
              className="p-3 bg-slate-700/30 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 rounded-lg transition-all group text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <FiServer className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-sm font-medium">Samba</span>
              </div>
              <p className="text-xs text-slate-500">SMB shares</p>
            </button>
            <button
              onClick={() => setShowLogsModal(true)}
              className="p-3 bg-slate-700/30 hover:bg-green-500/10 border border-white/5 hover:border-green-500/30 rounded-lg transition-all group text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <FiActivity className="text-green-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-sm font-medium">Logs</span>
              </div>
              <p className="text-xs text-slate-500">System logs</p>
            </button>
            <button
              onClick={() => window.location.href = '/api-keys'}
              className="p-3 bg-slate-700/30 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-lg transition-all group text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <FiKey className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-sm font-medium">API Keys</span>
              </div>
              <p className="text-xs text-slate-500">Manage keys</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 rounded-xl border border-white/5 p-4">
          <h3 className="text-base font-semibold text-white mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-auto">
            {activities.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-sm">No recent activity</div>
            ) : (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="text-xs" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{activity.action}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {activity.user || activity.filename || activity.title || ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                      {formatActivityTime(activity.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUserModal && isSuperAdmin && (
        <UserManagementModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} />
      )}
      <CloudSettingsModal isOpen={showCloudSettingsModal} onClose={() => setShowCloudSettingsModal(false)} />
      <SystemLogsModal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} />
      <SambaModal isOpen={showSambaModal} onClose={() => setShowSambaModal(false)} />
      </div>
    </AppLayout>
  );
}

export default AdminDashboard;
