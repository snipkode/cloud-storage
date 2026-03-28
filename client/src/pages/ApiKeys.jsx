import { useState, useEffect } from 'react';
import { FiKey, FiPlus, FiTrash2, FiLock, FiCopy, FiCheck, FiExternalLink, FiX } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';

const PERMISSION_LEVELS = [
  { id: 'read_only', name: 'Read Only', description: 'List & download files', permissions: ['read'] },
  { id: 'upload_only', name: 'Upload Only', description: 'Upload files only', permissions: ['upload'] },
  { id: 'read_write', name: 'Read & Write', description: 'Full file access', permissions: ['read', 'upload', 'delete'] },
  { id: 'admin', name: 'Admin', description: 'Unrestricted access', permissions: ['admin'] }
];

function ApiKeys() {
  const { token } = useAuthStore();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(['read']);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeys(data.apiKeys);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load API keys');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) loadApiKeys();
  }, [token]);

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      setError('API key name is required');
      return;
    }

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: keyName.trim(),
          permissions: selectedPermissions
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNewKey(data.apiKey);
        setKeyName('');
        setSelectedPermissions(['read']);
        loadApiKeys();
      } else {
        setError(data.error || data.message);
      }
    } catch (err) {
      setError('Failed to create API key');
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? It will no longer work.')) return;

    try {
      const res = await fetch(`/api/api-keys/${id}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        loadApiKeys();
      } else {
        setError('Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to revoke API key');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this API key permanently? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        loadApiKeys();
      } else {
        setError('Failed to delete API key');
      }
    } catch (err) {
      setError('Failed to delete API key');
    }
  };

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePermission = (perm) => {
    if (perm === 'admin') {
      setSelectedPermissions(['admin']);
      return;
    }
    
    if (selectedPermissions.includes('admin')) {
      setSelectedPermissions([perm]);
      return;
    }

    if (selectedPermissions.includes(perm)) {
      const filtered = selectedPermissions.filter(p => p !== perm);
      setSelectedPermissions(filtered.length > 0 ? filtered : ['read']);
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <FiKey className="text-purple-400 text-xl" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">API Keys</h2>
            <p className="text-xs text-gray-400">Manage access for external applications</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg transition-all"
        >
          <FiPlus className="text-sm" />
          New Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30 flex items-center justify-between">
          <span className="text-red-200 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
            <FiX className="text-lg" />
          </button>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🔑</div>
            <p className="text-gray-400 text-sm">No API keys yet</p>
            <p className="text-gray-500 text-xs mt-1">Create one to access the API from external apps</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {apiKeys.map((key) => (
              <div key={key.id} className="p-4 hover:bg-white/5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">{key.name}</span>
                      {key.active ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Revoked</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                      <span>{key.usageCount} requests</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {key.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded capitalize"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.active && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="flex items-center gap-1 bg-orange-500/80 hover:bg-orange-500 text-white text-xs px-3 py-2 rounded-lg transition-all"
                      >
                        <FiLock className="text-sm" />
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="flex items-center gap-1 bg-red-500/80 hover:bg-red-500 text-white text-xs px-3 py-2 rounded-lg transition-all"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Create API Key</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Key Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Key Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Mobile App, Partner API"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                <div className="space-y-2">
                  {PERMISSION_LEVELS.map((level) => (
                    <label
                      key={level.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        (level.id === 'admin' && selectedPermissions.includes('admin')) ||
                        (level.id !== 'admin' && level.permissions.every(p => selectedPermissions.includes(p)))
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="permission"
                        checked={
                          (level.id === 'admin' && selectedPermissions.includes('admin')) ||
                          (level.id !== 'admin' && level.permissions.every(p => selectedPermissions.includes(p)))
                        }
                        onChange={() => setSelectedPermissions(level.permissions)}
                        className="w-4 h-4 text-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{level.name}</div>
                        <div className="text-gray-500 text-xs">{level.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-200 text-xs">
                  ⚠️ The API key will only be shown once. Store it securely!
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Display Modal */}
      {newKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-lg w-full">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">API Key Created</h3>
              <button onClick={() => setNewKey(null)} className="text-gray-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-200 text-xs">
                  ✓ Store this key securely. It won't be shown again!
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Key Name</label>
                <div className="text-white">{newKey.name}</div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono break-all">
                    {newKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey.key, 'key')}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    {copiedId === 'key' ? <FiCheck className="text-green-400" /> : <FiCopy className="text-white" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Usage Example</label>
                <code className="block bg-black/50 rounded-lg px-4 py-3 text-gray-300 text-xs font-mono overflow-x-auto">
                  {`curl -X GET \\
  -H "Authorization: Bearer ${newKey.key}" \\
  http://localhost:3000/api/files`}
                </code>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setNewKey(null)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeys;
