import { useState, useEffect } from 'react';
import {
  FiKey, FiPlus, FiTrash2, FiLock, FiCopy, FiCheck,
  FiX, FiActivity, FiCode, FiChevronRight, FiSearch,
  FiFilter, FiXCircle
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

const PERMISSION_LEVELS = [
  { id: 'read_only', name: 'Read Only', description: 'List & download files', permissions: ['read'], color: 'blue' },
  { id: 'upload_only', name: 'Upload Only', description: 'Upload files only', permissions: ['upload'], color: 'green' },
  { id: 'read_write', name: 'Read & Write', description: 'Full file access', permissions: ['read', 'upload', 'delete'], color: 'purple' },
  { id: 'admin', name: 'Admin', description: 'Unrestricted access', permissions: ['admin'], color: 'red' }
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

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setApiKeys(data.apiKeys);
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
          expiresAt
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNewKey(data.apiKey);
        setShowKeyModal(true);
        setKeyName('');
        setSelectedPermissions(['read']);
        setExpiresIn('');
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
    if (!confirm('Revoke this API key?')) return;
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

  const handleDelete = async (id) => {
    if (!confirm('Delete this API key permanently?')) return;
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

  const getPermissionStyle = (perm) => {
    const colors = {
      read: 'bg-blue-500/10 text-blue-400',
      upload: 'bg-green-500/10 text-green-400',
      delete: 'bg-orange-500/10 text-orange-400',
      admin: 'bg-red-500/10 text-red-400'
    };
    return colors[perm] || colors.read;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <FiKey className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">API Keys</h2>
            <p className="text-xs text-gray-400">Manage access for external applications</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <FiPlus className="text-base transition-transform group-hover:rotate-90" />
          <span>Create New Key</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400 mt-1">Total Keys</div>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-gray-400 mt-1">Active</div>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <div className="text-2xl font-bold text-red-400">{stats.revoked}</div>
          <div className="text-xs text-gray-400 mt-1">Revoked</div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <FiX className="text-lg" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-2">
          <FiCheck className="text-green-400" />
          <span className="text-green-400 text-sm">{success}</span>
        </div>
      )}

      {/* Filters & Search - Redesigned */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Filter Control */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium uppercase tracking-wider">
            <FiFilter className="text-xs" />
            <span>Filter</span>
          </div>
          <div className="flex bg-slate-800/80 rounded-xl p-1.5 border border-white/10 shadow-sm">
            {[
              { id: 'all', label: 'All Keys', icon: '📁' },
              { id: 'active', label: 'Active', icon: '🟢' },
              { id: 'revoked', label: 'Revoked', icon: '🔴' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  filter === f.id
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{f.icon}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input - Redesigned */}
        <div className="relative w-full sm:w-80 lg:w-96">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base" />
          <input
            type="text"
            placeholder="Search keys by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-11 pr-10 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <FiXCircle className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* API Keys List */}
      <div className="grid gap-2">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">🔑</div>
            <p className="text-gray-400 text-xs">
              {searchQuery ? 'No matching API keys' : 'No API keys yet'}
            </p>
          </div>
        ) : (
          filteredKeys.map((key) => (
            <div
              key={key.id}
              className="group bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/10 hover:border-purple-500/30 transition-all"
            >
              <div className="p-3">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <button
                    onClick={() => {
                      setSelectedKey(key);
                      setCodeLang('curl');
                      setExampleIdx(0);
                      setShowCodeModal(true);
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      key.active ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10' : 'bg-gray-500/10'
                    } ${key.active ? 'hover:from-purple-500/30 hover:to-purple-600/20' : ''}`}
                  >
                    <FiKey className={key.active ? 'text-purple-400 text-sm' : 'text-gray-500 text-sm'} />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => {
                    setSelectedKey(key);
                    setCodeLang('curl');
                    setExampleIdx(0);
                    setShowCodeModal(true);
                  }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">{key.name}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                        key.active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {key.active ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                      <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                        {key.id.slice(0, 8)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiActivity className="text-[10px]" />
                        {key.usageCount}
                      </span>
                      {key.lastUsedAt && (
                        <span>• {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Permissions - Mobile friendly */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {key.permissions.slice(0, 3).map((perm) => (
                      <span
                        key={perm}
                        className={`px-1.5 py-1 text-[10px] rounded-md font-medium ${getPermissionStyle(perm)}`}
                        title={perm}
                      >
                        {perm.charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {key.permissions.length > 3 && (
                      <span className="text-[10px] text-gray-500">+{key.permissions.length - 3}</span>
                    )}
                  </div>

                  {/* Actions - Always visible on mobile */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {key.active && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevoke(key.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all"
                        title="Revoke"
                      >
                        <FiLock className="text-sm" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(key.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Create API Key</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Mobile App"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                <div className="space-y-2">
                  {PERMISSION_LEVELS.map((level) => {
                    const isSelected = (level.id === 'admin' && selectedPermissions.includes('admin')) ||
                      (level.id !== 'admin' && level.permissions.every(p => selectedPermissions.includes(p)));
                    return (
                      <label
                        key={level.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="permission"
                          checked={isSelected}
                          onChange={() => setSelectedPermissions(level.permissions)}
                          className="w-4 h-4 text-purple-500 accent-purple-500"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{level.name}</div>
                          <div className="text-gray-500 text-xs">{level.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Expiration</label>
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
                      className={`py-2 rounded-lg text-sm transition-all ${
                        expiresIn === opt.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-xs">
                  ⚠️ The API key will only be shown once
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Modal */}
      {showKeyModal && newKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full">
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <FiCheck className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">API Key Created</h3>
                  <p className="text-xs text-gray-400">Store this key securely</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">API Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs font-mono break-all">
                    {newKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey.key)}
                    className={`px-3 rounded-lg transition-colors ${
                      copied ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {copied ? <FiCheck className="text-sm" /> : <FiCopy className="text-sm" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Permissions</label>
                <div className="flex gap-1.5 flex-wrap">
                  {newKey.permissions.map((perm) => (
                    <span
                      key={perm}
                      className={`px-2 py-1 text-xs rounded ${getPermissionStyle(perm)}`}
                    >
                      {perm.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Quick Test</label>
                <code className="block bg-black/50 rounded-lg px-3 py-2.5 text-gray-300 text-xs font-mono">
                  curl -H "Authorization: Bearer {newKey.key.slice(0, 20)}..." http://localhost:3000/api/files
                </code>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setSelectedKey({ ...newKey, key: newKey.key });
                  setCodeLang('curl');
                  setExampleIdx(0);
                  setShowCodeModal(true);
                }}
                className="px-4 py-2 text-purple-400 hover:bg-purple-500/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FiCode className="text-sm" />
                More Examples
              </button>
              <button
                onClick={() => setShowKeyModal(false)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Examples Modal - IDE Style */}
      {showCodeModal && selectedKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1e2e] rounded-xl border border-white/10 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* IDE Header - Mac Style */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#181825] border-b border-white/10 rounded-t-xl">
              <div className="flex items-center gap-3">
                {/* Mac Window Controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group"
                  >
                    <FiX className="text-[8px] text-red-900 opacity-0 group-hover:opacity-100" />
                  </button>
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e2e] rounded-lg border border-white/10">
                  <FiKey className="text-purple-400 text-xs" />
                  <span className="text-gray-400 text-xs font-mono">
                    {selectedKey.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">API Integration</span>
              </div>
            </div>

            {/* API Key Bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1e1e2e] border-b border-white/10">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">API Key</span>
              <code className="flex-1 bg-[#11111b] border border-white/10 rounded px-3 py-1.5 text-purple-300 text-xs font-mono truncate">
                {selectedKey.key || 'cs_***...****'}
              </code>
              {selectedKey.key && (
                <button
                  onClick={() => copyToClipboard(selectedKey.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {copied ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {/* IDE Content */}
            <div className="flex-1 overflow-hidden flex flex-col bg-[#1e1e2e]">
              {/* Language Tabs */}
              <div className="flex items-center gap-1 px-2 py-2 bg-[#181825] border-b border-white/10">
                {Object.entries(CODE_EXAMPLES).map(([key, lang]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCodeLang(key);
                      setExampleIdx(0);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      codeLang === key
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{lang.icon}</span>
                    <span className="hidden sm:inline">{lang.title}</span>
                  </button>
                ))}
              </div>

              {/* Example Tabs */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-[#181825] border-b border-white/10">
                {CODE_EXAMPLES[codeLang].examples.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => setExampleIdx(idx)}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                      exampleIdx === idx
                        ? 'bg-[#1e1e2e] text-white border border-white/10 shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>

              {/* Code Editor */}
              <div className="flex-1 overflow-auto relative">
                <div className="absolute inset-0 flex">
                  {/* Line Numbers */}
                  <div className="flex-shrink-0 py-4 px-3 bg-[#181825] border-r border-white/10 select-none">
                    {CODE_EXAMPLES[codeLang].examples[exampleIdx].code.split('\n').map((_, i) => (
                      <div key={i} className="text-[10px] text-gray-600 font-mono leading-6">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Code Content */}
                  <div className="flex-1 py-4 px-4 overflow-x-auto">
                    <pre className="text-xs font-mono leading-6">
                      <code>
                        {CODE_EXAMPLES[codeLang].examples[exampleIdx].code
                          .split('\n')
                          .map((line, lineIdx) => {
                            // Replace API key placeholder
                            const displayLine = line.replace('{{API_KEY}}', selectedKey.key || 'YOUR_API_KEY');
                            
                            // Simple syntax highlighting
                            const highlightLine = (text) => {
                              const parts = [];
                              let remaining = text;
                              let key = 0;

                              while (remaining.length > 0) {
                                // Check for strings (double quotes)
                                const strMatch = remaining.match(/^"([^"\\]|\\.)*"/);
                                if (strMatch) {
                                  parts.push(<span key={key++} className="text-green-400">{strMatch[0]}</span>);
                                  remaining = remaining.slice(strMatch[0].length);
                                  continue;
                                }

                                // Check for strings (single quotes)
                                const singleStrMatch = remaining.match(/^'([^'\\]|\\.)*'/);
                                if (singleStrMatch) {
                                  parts.push(<span key={key++} className="text-green-400">{singleStrMatch[0]}</span>);
                                  remaining = remaining.slice(singleStrMatch[0].length);
                                  continue;
                                }

                                // Check for comments
                                const commentMatch = remaining.match(/^(\/\/.*|#.*|<\?php|\?>)/);
                                if (commentMatch) {
                                  parts.push(<span key={key++} className="text-gray-500 italic">{commentMatch[0]}</span>);
                                  remaining = remaining.slice(commentMatch[0].length);
                                  continue;
                                }

                                // Check for keywords
                                const keywordMatch = remaining.match(/^(const|let|var|function|return|if|else|for|while|import|from|await|async|with|new|print)\b/);
                                if (keywordMatch) {
                                  parts.push(<span key={key++} className="text-purple-400">{keywordMatch[0]}</span>);
                                  remaining = remaining.slice(keywordMatch[0].length);
                                  continue;
                                }

                                // Check for built-ins
                                const builtinMatch = remaining.match(/^(true|false|null|undefined|console|log|json|requests|curl)\b/);
                                if (builtinMatch) {
                                  parts.push(<span key={key++} className="text-orange-400">{builtinMatch[0]}</span>);
                                  remaining = remaining.slice(builtinMatch[0].length);
                                  continue;
                                }

                                // Check for numbers
                                const numMatch = remaining.match(/^\d+/);
                                if (numMatch) {
                                  parts.push(<span key={key++} className="text-orange-400">{numMatch[0]}</span>);
                                  remaining = remaining.slice(numMatch[0].length);
                                  continue;
                                }

                                // Check for PHP variables
                                const phpVarMatch = remaining.match(/^\$[a-zA-Z_][a-zA-Z0-9_]*/);
                                if (phpVarMatch) {
                                  parts.push(<span key={key++} className="text-blue-400">{phpVarMatch[0]}</span>);
                                  remaining = remaining.slice(phpVarMatch[0].length);
                                  continue;
                                }

                                // Check for JS template literals
                                const templateMatch = remaining.match(/^\$\{[^}]+\}/);
                                if (templateMatch) {
                                  parts.push(<span key={key++} className="text-orange-400">{templateMatch[0]}</span>);
                                  remaining = remaining.slice(templateMatch[0].length);
                                  continue;
                                }

                                // Default - single character
                                parts.push(<span key={key++} className="text-gray-200">{remaining[0]}</span>);
                                remaining = remaining.slice(1);
                              }

                              return parts;
                            };

                            return (
                              <div key={lineIdx} className="whitespace-pre">
                                {highlightLine(displayLine)}
                              </div>
                            );
                          })}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#181825] border-t border-white/10 rounded-b-xl">
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Ready to use
                </span>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
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
