import { useState, useEffect } from 'react';
import {
  FiKey, FiPlus, FiTrash2, FiLock, FiCopy, FiCheck, FiCode,
  FiX, FiActivity, FiSearch, FiXCircle, FiEye,
  FiBook, FiShield, FiClock, FiServer, FiUnlock
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import ApiIntegrationPreview from '@components/ApiIntegrationPreview';

const PERMISSION_LEVELS = [
  { id: 'read_only', name: 'Read Only', description: 'List & download files only', permissions: ['read'], color: 'blue', icon: '📖' },
  { id: 'upload_only', name: 'Upload Only', description: 'Upload files only', permissions: ['upload'], color: 'green', icon: '📤' },
  { id: 'read_write', name: 'Read & Write', description: 'Full file management access', permissions: ['read', 'upload', 'delete'], color: 'purple', icon: '✏️' },
  { id: 'admin', name: 'Admin', description: 'Unrestricted access to all resources', permissions: ['admin'], color: 'red', icon: '👑' }
];

const CODE_EXAMPLES = {
  curl: {
    title: 'cURL',
    icon: '🖥️',
    examples: [
      { name: 'List Files', code: `curl -H "Authorization: Bearer {{API_KEY}}" \\
  http://localhost:3000/api/files` },
      { name: 'Upload File', code: `curl -X POST \\
  -H "Authorization: Bearer {{API_KEY}}" \\
  -F "file=@document.pdf" \\
  http://localhost:3000/api/upload` },
      { name: 'Delete File', code: `curl -X DELETE \\
  -H "Authorization: Bearer {{API_KEY}}" \\
  http://localhost:3000/api/files/file-id` }
    ]
  },
  javascript: {
    title: 'JavaScript',
    icon: '📜',
    examples: [
      { name: 'List Files', code: `const API_KEY = "{{API_KEY}}";

// List files
const response = await fetch('/api/files', {
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});
const files = await response.json();
console.log('Files:', files);` },
      { name: 'Upload File', code: `const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${API_KEY}\` },
  body: formData
});
const result = await response.json();` },
      { name: 'Delete File', code: `await fetch('/api/files/file-id', {
  method: 'DELETE',
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});` }
    ]
  },
  python: {
    title: 'Python',
    icon: '🐍',
    examples: [
      { name: 'List Files', code: `import requests

API_KEY = "{{API_KEY}}"
headers = {'Authorization': f'Bearer {API_KEY}'}

# List files
response = requests.get('http://localhost:3000/api/files', headers=headers)
files = response.json()
print('Files:', files)` },
      { name: 'Upload File', code: `with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/api/upload',
        headers=headers,
        files={'file': f}
    )
result = response.json()` },
      { name: 'Delete File', code: `response = requests.delete(
    'http://localhost:3000/api/files/file-id',
    headers=headers
)` }
    ]
  },
  php: {
    title: 'PHP',
    icon: '🐘',
    examples: [
      { name: 'List Files', code: `<?php
$apiKey = "{{API_KEY}}";

// List files
$response = file_get_contents(
    'http://localhost:3000/api/files',
    false,
    stream_context_create([
        'http' => ['header' => "Authorization: Bearer $apiKey"]
    ])
);
$files = json_decode($response, true);
?>` },
      { name: 'Upload File', code: `<?php
$ch = curl_init('http://localhost:3000/api/upload');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'file' => new \\CURLFile('document.pdf')
]);
$response = curl_exec($ch);
?>` }
    ]
  }
};

function ApiKeys() {
  const { token } = useAuthStore();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(['read']);
  const [expiresIn, setExpiresIn] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [codeLang, setCodeLang] = useState('curl');
  const [exampleIdx, setExampleIdx] = useState(0);
  const [showIntegrationPreview, setShowIntegrationPreview] = useState(false);
  const [environment, setEnvironment] = useState('live');
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Map API keys - don't use id as key, key is only shown once after creation
        const mappedKeys = (data.apiKeys || []).map(key => ({
          ...key,
          key: key.key || key.apiKey || '', // Don't fallback to id
          environment: key.environment || 'live'
        }));
        setApiKeys(mappedKeys);
      }
      else setError(data.error);
    } catch {
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

    let expiresAt = null;
    if (expiresIn) {
      const date = new Date();
      const days = parseInt(expiresIn);
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
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
          permissions: selectedPermissions,
          expiresAt,
          environment
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Ensure the key property exists with the actual API key value
        const newApiKey = {
          ...data.apiKey,
          key: data.apiKey.key || data.apiKey.apiKey || data.key || ''
        };
        setNewKey(newApiKey);
        setShowKeyModal(true);
        setKeyName('');
        setSelectedPermissions(['read']);
        setExpiresIn('');
        setEnvironment('live');
        loadApiKeys();
        setSuccess('API key created successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || data.message);
      }
    } catch {
      setError('Failed to create API key');
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? This action will immediately disable the key.')) return;
    try {
      const res = await fetch(`/api/api-keys/${id}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadApiKeys();
        setSuccess('API key revoked');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to revoke API key');
      }
    } catch {
      setError('Failed to revoke API key');
    }
  };

  const handleReactivate = async (id) => {
    if (!confirm('Reactivate this API key? The key will be usable again.')) return;
    try {
      const res = await fetch(`/api/api-keys/${id}/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadApiKeys();
        setSuccess('API key reactivated');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to reactivate API key');
      }
    } catch {
      setError('Failed to reactivate API key');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`/api/api-keys/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadApiKeys();
        const data = await res.json();
        setSuccess(data.message);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to toggle API key');
      }
    } catch {
      setError('Failed to toggle API key');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this API key permanently? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadApiKeys();
        setSuccess('API key deleted');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete API key');
      }
    } catch {
      setError('Failed to delete API key');
    }
  };

  const handleReveal = async (id) => {
    try {
      const res = await fetch(`/api/api-keys/${id}/reveal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedKey(data.apiKey);
        setShowRevealModal(true);
      } else {
        setError(data.error || 'Failed to reveal API key');
      }
    } catch {
      setError('Failed to reveal API key');
    }
  };

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredKeys = apiKeys.filter(key => {
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && key.active) ||
      (filter === 'revoked' && !key.active);
    const matchesSearch = key.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: apiKeys.length,
    active: apiKeys.filter(k => k.active).length,
    revoked: apiKeys.filter(k => !k.active).length
  };

  const getPermissionColor = (perm) => {
    const colors = {
      read: 'from-blue-500 to-cyan-500',
      upload: 'from-green-500 to-emerald-500',
      delete: 'from-orange-500 to-red-500',
      admin: 'from-red-500 to-rose-500'
    };
    return colors[perm] || colors.read;
  };

  const getPermissionBadgeClass = (perm) => {
    const classes = {
      read: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      upload: 'bg-green-500/10 text-green-400 border-green-500/20',
      delete: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      admin: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return classes[perm] || classes.read;
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white font-semibold text-lg">API Keys</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage access and integrations</p>
        </div>
        <button
          onClick={() => setShowIntegrationPreview(true)}
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all"
        >
          <FiBook className="text-indigo-400" />
          <span>API Docs</span>
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/25"
        >
          <FiPlus className="text-sm" />
          <span>New Key</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiX className="text-red-400 text-xs" />
            </div>
            <span className="text-red-400 text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1 rounded-lg hover:bg-red-500/10 transition-all">
            <FiX className="text-sm" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiCheck className="text-green-400 text-xs" />
          </div>
          <span className="text-green-400 text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Compact Filter Bar */}
      <div className="space-y-3 mb-4">
        <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'active', label: 'Active', count: stats.active },
            { id: 'revoked', label: 'Revoked', count: stats.revoked }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f.id
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                filter === f.id ? 'bg-slate-200 text-slate-700' : 'bg-slate-700/50 text-slate-500'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5"
            >
              <FiXCircle className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* API Keys List */}
      <div className="grid gap-3">
        {loading ? (
          // Loading skeletons
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-12 h-12 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="skeleton w-32 h-5 rounded"></div>
                    <div className="skeleton w-48 h-4 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : filteredKeys.length === 0 ? (
          // Empty state
          <div className="card p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
              <FiKey className="text-4xl text-slate-600" />
            </div>
            <h3 className="text-white font-semibold mb-2">No API keys yet</h3>
            <p className="text-slate-500 text-sm mb-4">
              {searchQuery ? 'No matching API keys found' : 'Create your first API key to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/25"
              >
                <FiPlus className="text-base" />
                Create API Key
              </button>
            )}
          </div>
        ) : (
          // Keys list
          filteredKeys.map((key) => (
            <div
              key={key.id}
              className="card p-3 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <button
                  onClick={() => {
                    setSelectedKey(key);
                    setCodeLang('curl');
                    setExampleIdx(0);
                    setShowCodeModal(true);
                  }}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    key.active
                      ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30'
                      : 'bg-slate-800/50 border border-slate-700/50'
                  }`}
                >
                  <FiKey className={key.active ? 'text-indigo-400 text-sm' : 'text-slate-600 text-sm'} />
                </button>

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    // Pass the actual API key value (only available right after creation)
                    const keyValue = key.key || key.apiKey || '';
                    setSelectedKey({ ...key, key: keyValue });
                    setCodeLang('curl');
                    setExampleIdx(0);
                    setShowCodeModal(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">{key.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${
                      key.active
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${key.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {key.active ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className={`font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 flex-shrink-0 ${
                      key.environment === 'test'
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                        : 'bg-green-500/5 border-green-500/20 text-green-400'
                    }`}>
                      <span>{key.environment === 'test' ? '🧪' : '🚀'}</span>
                      {key.id?.slice(0, 8)}
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <FiActivity className="text-[10px]" />
                      {key.usageCount || 0}
                    </span>
                    {key.lastUsedAt && (
                      <span className="truncate">{new Date(key.lastUsedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Permissions - Compact */}
                <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                  {key.permissions.slice(0, 3).map((perm) => (
                    <span
                      key={perm}
                      className={`px-1.5 py-1 text-[10px] rounded font-medium border ${getPermissionBadgeClass(perm)}`}
                      title={perm}
                    >
                      {perm.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {key.permissions.length > 3 && (
                    <span className="text-[10px] text-slate-500">+{key.permissions.length - 3}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReveal(key.id);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                    title="Show API Key"
                  >
                    <FiEye className="text-sm" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(key.id);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      key.active
                        ? 'text-slate-400 hover:text-orange-400 hover:bg-orange-500/10'
                        : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                    }`}
                    title={key.active ? 'Revoke' : 'Reactivate'}
                  >
                    {key.active ? (
                      <FiLock className="text-sm" />
                    ) : (
                      <FiUnlock className="text-sm" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(key.id);
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header - Fixed */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FiKey className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Create API Key</h3>
                  <p className="text-xs text-slate-500">Configure access permissions</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <FiShield className="inline-block mr-1.5 text-indigo-400" />
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production App, Mobile Client"
                  className="input w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <FiServer className="inline-block mr-1.5 text-indigo-400" />
                  Environment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEnvironment('test')}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      environment === 'test'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                    }`}
                  >
                    <span>🧪</span>
                    <span>Sandbox</span>
                  </button>
                  <button
                    onClick={() => setEnvironment('live')}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      environment === 'live'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                    }`}
                  >
                    <span>🚀</span>
                    <span>Live</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  {environment === 'test' 
                    ? 'Sandbox keys are for development and testing only' 
                    : 'Live keys are for production use'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <FiLock className="inline-block mr-1.5 text-indigo-400" />
                  Permissions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_LEVELS.map((level) => {
                    const isSelected = (level.id === 'admin' && selectedPermissions.includes('admin')) ||
                      (level.id !== 'admin' && level.permissions.every(p => selectedPermissions.includes(p)));
                    return (
                      <label
                        key={level.id}
                        className={`p-3 rounded-xl border cursor-pointer transition-all hover-lift ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/30 ring-2 ring-indigo-500/20'
                            : 'bg-slate-800/30 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="permission"
                            checked={isSelected}
                            onChange={() => setSelectedPermissions(level.permissions)}
                            className="w-4 h-4 text-indigo-500 accent-indigo-500 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-base">{level.icon}</span>
                              <span className="text-white font-medium text-xs">{level.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">{level.description}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <FiClock className="inline-block mr-1.5 text-indigo-400" />
                  Expiration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: '', label: 'Never' },
                    { value: '7', label: '7 days' },
                    { value: '30', label: '30 days' },
                    { value: '90', label: '90 days' }
                  ].map((opt) => (
                    <button
                      key={opt.value || 'never'}
                      onClick={() => setExpiresIn(opt.value)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        expiresIn === opt.value
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                <div className="text-lg flex-shrink-0">⚠️</div>
                <div>
                  <p className="text-amber-400 text-xs font-medium mb-0.5">Important</p>
                  <p className="text-amber-400/70 text-[10px] leading-relaxed">The API key will only be shown once. Make sure to copy and store it securely.</p>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="p-5 border-t border-white/5 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-medium rounded-xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Modal */}
      {showKeyModal && newKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header - Fixed */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25 flex-shrink-0">
                <FiCheck className="text-white text-lg" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">API Key Created</h3>
                <p className="text-xs text-slate-500 truncate">Store this key securely</p>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-medium text-slate-400">Your API Key</label>
                  <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium flex items-center gap-1 ${
                    newKey.environment === 'test'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-green-500/10 text-green-400 border border-green-500/30'
                  }`}>
                    <span>{newKey.environment === 'test' ? '🧪' : '🚀'}</span>
                    <span className="capitalize">{newKey.environment}</span>
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <code className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono break-all">
                    {newKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey.key)}
                    className={`px-3 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    {copied ? <FiCheck className="text-base" /> : <FiCopy className="text-base" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1.5">Permissions</label>
                <div className="flex gap-1.5 flex-wrap">
                  {newKey.permissions.map((perm) => (
                    <span
                      key={perm}
                      className={`px-2 py-1 text-[10px] rounded-md font-medium bg-gradient-to-r ${getPermissionColor(perm)} text-white`}
                    >
                      {perm.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1.5">Quick Test</label>
                <div className="flex gap-1.5">
                  <code className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-slate-300 text-[10px] font-mono overflow-x-auto">
                    curl -H "Authorization: Bearer {newKey.key.slice(0, 20)}..." http://localhost:3000/api/files
                  </code>
                  <button
                    onClick={() => copyToClipboard(`curl -H "Authorization: Bearer ${newKey.key}" http://localhost:3000/api/files`)}
                    className={`px-2.5 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    title="Copy curl command"
                  >
                    {copied ? <FiCheck className="text-base" /> : <FiCopy className="text-base" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="px-4 py-3 border-t border-white/5 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setSelectedKey({ ...newKey, key: newKey.key });
                  setCodeLang('curl');
                  setExampleIdx(0);
                  setShowCodeModal(true);
                }}
                className="px-4 py-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <FiCode className="text-sm" />
                Examples
              </button>
              <button
                onClick={() => setShowKeyModal(false)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-lg shadow-indigo-500/25"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Examples Modal - Compact */}
      {showCodeModal && selectedKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedKey.active ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-slate-800/50 border border-slate-700/50'
                }`}>
                  <FiKey className={`text-sm ${selectedKey.active ? 'text-indigo-400' : 'text-slate-600'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-medium text-sm truncate">{selectedKey.name}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      selectedKey.active
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${selectedKey.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {selectedKey.active ? 'Active' : 'Revoked'}
                    </span>
                    <span className="text-slate-500 font-mono">{selectedKey.id?.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all flex-shrink-0"
              >
                <FiX className="text-base" />
              </button>
            </div>

            {/* Key Display - Fixed */}
            {selectedKey.key && (
              <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-b border-indigo-500/10 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FiKey className="text-indigo-400 text-[10px]" />
                    <span className="text-[10px] font-medium text-slate-400">API Key</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedKey.key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {copied ? <FiCheck className="text-[10px]" /> : <FiCopy className="text-[10px]" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="block bg-slate-900/50 border border-white/10 rounded px-2.5 py-2 text-slate-300 text-[10px] font-mono break-all">
                  {selectedKey.key}
                </code>
              </div>
            )}

            {/* Stats & Permissions - Fixed */}
            <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <FiActivity className="text-[10px]" />
                  {selectedKey.usageCount || 0} requests
                </span>
                {selectedKey.lastUsedAt && (
                  <span className="flex items-center gap-1">
                    <FiClock className="text-[10px]" />
                    {new Date(selectedKey.lastUsedAt).toLocaleDateString()}
                  </span>
                )}
                <div className="flex gap-1 flex-wrap ml-auto">
                  {selectedKey.permissions?.slice(0, 4).map((perm) => (
                    <span
                      key={perm}
                      className={`px-1.5 py-1 text-[10px] rounded font-medium border ${getPermissionBadgeClass(perm)}`}
                    >
                      {perm.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {selectedKey.permissions?.length > 4 && (
                    <span className="text-[10px] text-slate-500">+{selectedKey.permissions.length - 4}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Code Examples - Scrollable */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* Language Tabs */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800/30 border-b border-white/5 overflow-x-auto flex-shrink-0">
                {Object.entries(CODE_EXAMPLES).map(([key, lang]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCodeLang(key);
                      setExampleIdx(0);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      codeLang === key
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{lang.icon}</span>
                    <span>{lang.title}</span>
                  </button>
                ))}
              </div>

              {/* Example Sub-tabs */}
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/20 border-b border-white/5 overflow-x-auto flex-shrink-0">
                {CODE_EXAMPLES[codeLang].examples.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => setExampleIdx(idx)}
                    className={`px-2.5 py-1 rounded text-[10px] transition-all whitespace-nowrap ${
                      exampleIdx === idx
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>

              {/* Code Display with Copy - Scrollable */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800/30 border-b border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Example:</span>
                    <span className="text-[10px] font-medium text-white bg-slate-700/50 px-1.5 py-0.5 rounded">
                      {CODE_EXAMPLES[codeLang].examples[exampleIdx].name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const code = CODE_EXAMPLES[codeLang].examples[exampleIdx].code.replace('{{API_KEY}}', selectedKey.key || 'YOUR_API_KEY');
                      copyToClipboard(code);
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                    }`}
                  >
                    {copied ? <FiCheck className="text-[10px]" /> : <FiCopy className="text-[10px]" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-[#1e1e2e] p-3 min-h-0">
                  <pre className="text-[10px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                    <code>
                      {CODE_EXAMPLES[codeLang].examples[exampleIdx].code.replace('{{API_KEY}}', selectedKey.key || 'YOUR_API_KEY')}
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border-t border-white/5 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Ready to use
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal API Key Modal */}
      {showRevealModal && revealedKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header - Fixed */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
                <FiEye className="text-white text-lg" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">API Key</h3>
                <p className="text-xs text-slate-500 truncate">{revealedKey.environment} key</p>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-medium text-slate-400">Your API Key</label>
                  <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium flex items-center gap-1 ${
                    revealedKey.environment === 'test'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-green-500/10 text-green-400 border border-green-500/30'
                  }`}>
                    <span>{revealedKey.environment === 'test' ? '🧪' : '🚀'}</span>
                    <span className="capitalize">{revealedKey.environment}</span>
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <code className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono break-all">
                    {revealedKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(revealedKey.key)}
                    className={`px-3 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    {copied ? <FiCheck className="text-base" /> : <FiCopy className="text-base" />}
                  </button>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                <div className="text-lg flex-shrink-0">⚠️</div>
                <div>
                  <p className="text-amber-400 text-xs font-medium mb-0.5">Important</p>
                  <p className="text-amber-400/70 text-[10px] leading-relaxed">Store this key securely. Do not share it or expose it in client-side code.</p>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="px-4 py-3 border-t border-white/5 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowRevealModal(false)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2 rounded-lg text-xs font-medium transition-all shadow-lg shadow-indigo-500/25"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Integration Preview Modal */}
      {showIntegrationPreview && (
        <ApiIntegrationPreview onClose={() => setShowIntegrationPreview(false)} />
      )}
    </div>
  );
}

export default ApiKeys;
