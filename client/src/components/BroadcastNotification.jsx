import { useState, useEffect } from 'react';
import { FiBell, FiX, FiSend, FiUsers, FiUser, FiAlertTriangle } from 'react-icons/fi';
import { FiAlertCircle } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

const typeOptions = [
  { value: 'info', label: 'Info', color: 'bg-blue-500' },
  { value: 'success', label: 'Success', color: 'bg-green-500' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-500' },
  { value: 'error', label: 'Error', color: 'bg-red-500' }
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

function BroadcastNotification({ onClose }) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    mode: 'broadcast', // 'broadcast' or 'single'
    userId: '',
    title: '',
    message: '',
    type: 'info',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Check if user is super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Access denied: Super admin role required');
    }
  }, [isSuperAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const endpoint = formData.mode === 'broadcast'
        ? `${API_BASE_URL}/notifications/broadcast`
        : `${API_BASE_URL}/notifications/send`;

      const payload = formData.mode === 'broadcast'
        ? {
            title: formData.title,
            message: formData.message,
            type: formData.type,
            priority: formData.priority
          }
        : {
            userId: formData.userId,
            title: formData.title,
            message: formData.message,
            type: formData.type,
            priority: formData.priority
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FiBell className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Send Notification</h2>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin ? (
                    formData.mode === 'broadcast' ? 'Send to all users' : 'Send to specific user'
                  ) : (
                    <span className="text-red-400">Super admin access required</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {!isSuperAdmin && (
              <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-3">
                <FiAlertTriangle className="text-lg flex-shrink-0" />
                <div>
                  <p className="font-medium">Access Denied</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    You need super_admin role to send broadcast notifications. Your current role: <span className="font-mono">{user?.role || 'user'}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'broadcast' })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  formData.mode === 'broadcast'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <FiUsers className="text-sm" />
                <span className="text-sm font-medium">Broadcast</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'single' })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  formData.mode === 'single'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <FiUser className="text-sm" />
                <span className="text-sm font-medium">Single User</span>
              </button>
            </div>

            {/* User ID (for single user mode) */}
            {formData.mode === 'single' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  User ID
                </label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="Enter user ID"
                  required
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter notification title"
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter notification message"
                required
                rows={3}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: option.value })}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      formData.type === option.value
                        ? `${option.color}/20 border-${option.color.replace('bg-', '')}/40 text-white`
                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: option.value })}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      formData.priority === option.value
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <FiAlertCircle className="text-base flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                <FiSend className="text-base flex-shrink-0" />
                <span>Notification sent successfully!</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <FiSend className="text-base" />
                  <span>{formData.mode === 'broadcast' ? 'Broadcast to All' : 'Send Notification'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default BroadcastNotification;
