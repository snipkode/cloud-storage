import { useState, useEffect } from 'react';
import { 
  FiKey, FiPlus, FiTrash2, FiLock, FiCopy, FiCheck, 
  FiX, FiCalendar, FiActivity, FiShield, FiCode, FiEye 
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

const PERMISSION_LEVELS = [
  { id: 'read_only', name: 'Read Only', description: 'List & download files', permissions: ['read'], color: 'blue' },
  { id: 'upload_only', name: 'Upload Only', description: 'Upload files only', permissions: ['upload'], color: 'green' },
  { id: 'read_write', name: 'Read & Write', description: 'Full file access', permissions: ['read', 'upload', 'delete'], color: 'purple' },
  { id: 'admin', name: 'Admin', description: 'Unrestricted access', permissions: ['admin'], color: 'red' }
];

function ApiKeys() {
  const { token } = useAuthStore();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(['read']);
  const [expiresIn, setExpiresIn] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('curl');

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

    let expiresAt = null;
    if (expiresIn) {
      const date = new Date();
      switch (expiresIn) {
        case '7d': date.setDate(date.getDate() + 7); break;
        case '30d': date.setDate(date.getDate() + 30); break;
        case '90d': date.setDate(date.getDate() + 90); break;
        case '1y': date.setFullYear(date.getFullYear() + 1); break;
        default: break;
      }
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
        setSuccess('API key revoked');
        setTimeout(() => setSuccess(null), 3000);
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
        setSuccess('API key deleted');
        setTimeout(() => setSuccess(null), 3000);
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

  const viewKeyDetails = (key) => {
    setSelectedKey(key);
    setShowCodeModal(true);
  };

  const getCodeSnippet = (apiKey, language) => {
    const snippets = {
      curl: `# List files
curl -H "Authorization: Bearer ${apiKey}" \\
  http://localhost:3000/api/files

# Upload file
curl -X POST \\
  -H "Authorization: Bearer ${apiKey}" \\
  -F "file=@document.pdf" \\
  http://localhost:3000/api/upload`,

      javascript: `const API_KEY = "${apiKey}";

// List files
const response = await fetch('/api/files', {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  }
});
const files = await response.json();

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  },
  body: formData
});`,

      python: `import requests

API_KEY = "${apiKey}"
headers = {'Authorization': f'Bearer {API_KEY}'}

# List files
response = requests.get('http://localhost:3000/api/files', headers=headers)
files = response.json()

# Upload file
with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/api/upload',
        headers=headers,
        files={'file': f}
    )`,

      php: `<?php
$apiKey = "${apiKey}";

// List files
$response = file_get_contents('http://localhost:3000/api/files', false, stream_context_create([
    'http' => ['header' => "Authorization: Bearer $apiKey"]
]));
$files = json_decode($response, true);

// Upload file
$ch = curl_init('http://localhost:3000/api/upload');
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, ['file' => new \\CURLFile('document.pdf')]);
$response = curl_exec($ch);
?>`
    };
    return snippets[language] || snippets.curl;
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
    revoked: apiKeys.filter(k => !k.active).length,
    totalRequests: apiKeys.reduce((sum, k) => sum + k.usageCount, 0)
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total Keys</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-gray-400">Active</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="text-2xl font-bold text-red-400">{stats.revoked}</div>
          <div className="text-xs text-gray-400">Revoked</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="text-2xl font-bold text-purple-400">{stats.totalRequests}</div>
          <div className="text-xs text-gray-400">API Requests</div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30 flex items-center justify-between">
          <span className="text-red-200 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
            <FiX className="text-lg" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
          <span className="text-green-200 text-sm">{success}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['all', 'active', 'revoked'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search keys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* API Keys List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse text-4xl">⏳</div>
            <p className="text-gray-400 text-sm mt-4">Loading API keys...</p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🔑</div>
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'No matching API keys found' : 'No API keys yet'}
            </p>
            {!searchQuery && (
              <p className="text-gray-500 text-xs mt-1">Create one to access the API from external apps</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredKeys.map((key) => (
              <div key={key.id} className="p-4 hover:bg-white/5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-white font-medium">{key.name}</span>
                      {key.active ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Revoked</span>
                      )}
                      {key.expiresAt && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <FiCalendar className="text-xs" />
                          {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <FiCalendar className="text-xs" />
                        {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiActivity className="text-xs" />
                        {key.usageCount} requests
                      </span>
                      {key.lastUsedAt && (
                        <span>
                          Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <FiShield className="text-xs text-gray-500" />
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
                    <button
                      onClick={() => viewKeyDetails(key)}
                      className="flex items-center gap-1 bg-blue-500/80 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg transition-all"
                    >
                      <FiCode className="text-sm" />
                      <span className="hidden sm:inline">Code</span>
                    </button>
                    {key.active && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="flex items-center gap-1 bg-orange-500/80 hover:bg-orange-500 text-white text-xs px-3 py-2 rounded-lg transition-all"
                      >
                        <FiLock className="text-sm" />
                        <span className="hidden sm:inline">Revoke</span>
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

              {/* Expiry */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Expiration (Optional)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: '', label: 'Never' },
                    { value: '7d', label: '7 days' },
                    { value: '30d', label: '30 days' },
                    { value: '90d', label: '90 days' }
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
      {showKeyModal && newKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-lg w-full">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">API Key Created</h3>
              <button onClick={() => setShowKeyModal(false)} className="text-gray-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-200 text-xs flex items-center gap-2">
                  <FiCheck className="text-sm" />
                  Store this key securely. It won't be shown again!
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
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all shrink-0"
                  >
                    {copiedId === 'key' ? <FiCheck className="text-green-400" /> : <FiCopy className="text-white" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                <div className="flex gap-2 flex-wrap">
                  {newKey.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded capitalize"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Quick Start</label>
                <code className="block bg-black/50 rounded-lg px-4 py-3 text-gray-300 text-xs font-mono overflow-x-auto">
                  {`curl -H "Authorization: Bearer ${newKey.key}" \\
  http://localhost:3000/api/files`}
                </code>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  viewKeyDetails({ ...newKey, key: newKey.key });
                }}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <FiCode className="text-sm" />
                More Examples
              </button>
              <button
                onClick={() => setShowKeyModal(false)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Examples Modal */}
      {showCodeModal && selectedKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">API Integration</h3>
                <p className="text-xs text-gray-400 mt-1">{selectedKey.name}</p>
              </div>
              <button onClick={() => setShowCodeModal(false)} className="text-gray-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <FiKey className="text-purple-400" />
                <span className="text-gray-400">API Key:</span>
                <code className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-white text-xs font-mono">
                  {selectedKey.key || 'cs_***...****'}
                </code>
                {selectedKey.key && (
                  <button
                    onClick={() => copyToClipboard(selectedKey.key, 'detail-key')}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded transition-all"
                  >
                    {copiedId === 'detail-key' ? <FiCheck className="text-green-400" /> : <FiCopy className="text-white" />}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Language</label>
                <div className="flex gap-2 flex-wrap">
                  {['curl', 'javascript', 'python', 'php'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        codeLanguage === lang
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Code Example</label>
                <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto">
                  <code className="text-gray-300 text-xs font-mono whitespace-pre">
                    {getCodeSnippet(selectedKey.key || 'YOUR_API_KEY', codeLanguage)}
                  </code>
                </pre>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-200 text-xs">
                  💡 Tip: Store your API key in environment variables, never in source code.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowCodeModal(false)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeys;
