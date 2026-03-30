import { useState, useEffect } from 'react';
import { FiVolume2, FiSend, FiUsers, FiUser, FiAlertCircle, FiX, FiChevronDown } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useAdminStore } from '@store/adminStore';
import { useNotificationStore } from '@store/notificationStore';
import AppLayout from '@components/AppLayout';

function Broadcast() {
  const { user } = useAuthStore();
  const { users, fetchUsers } = useAdminStore();
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    link: '',
    recipientType: 'all',
    selectedUserIds: []
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [showUsers, setShowUsers] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) fetchUsers(100, 0);
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-slate-400 text-xs">Super admin only</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const { token } = useAuthStore.getState();
      const endpoint = formData.recipientType === 'all' 
        ? '/api/notifications/broadcast'
        : '/api/notifications/send-batch';

      const payload = formData.recipientType === 'all'
        ? {
            title: formData.title,
            message: formData.message,
            type: 'info',
            priority: formData.priority
          }
        : {
            title: formData.title,
            message: formData.message,
            type: 'info',
            priority: formData.priority,
            userIds: formData.selectedUserIds
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        setFormData({ title: '', message: '', priority: 'normal', link: '', recipientType: 'all', selectedUserIds: [] });

        // Refresh notifications
        useNotificationStore.getState().fetchNotifications();
        useNotificationStore.getState().fetchUnreadCount();

        setTimeout(() => setSent(false), 2500);
      } else {
        setError(data.error || 'Failed to send');
      }
    } catch (err) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const toggleUser = (id) => {
    setFormData(p => ({
      ...p,
      selectedUserIds: p.selectedUserIds.includes(id)
        ? p.selectedUserIds.filter(i => i !== id)
        : [...p.selectedUserIds, id]
    }));
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
          <FiVolume2 className="text-white text-xs" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white">Broadcast</h1>
          <p className="text-slate-400 text-[10px]">Send notifications</p>
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-slate-800/50 rounded-lg border border-white/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FiUsers className="text-indigo-400 text-xs" />
            <span className="text-xs font-medium text-white">Recipients</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {formData.recipientType === 'all' ? 'All users' : `${formData.selectedUserIds.length} selected`}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setFormData(p => ({ ...p, recipientType: 'all' }))}
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium ${
              formData.recipientType === 'all'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            <FiUsers className="text-[9px]" />
            All
          </button>
          <button
            type="button"
            onClick={() => setFormData(p => ({ ...p, recipientType: 'specific' }))}
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium ${
              formData.recipientType === 'specific'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            <FiUser className="text-[9px]" />
            Specific
          </button>
        </div>

        {formData.recipientType === 'specific' && (
          <>
            <button
              type="button"
              onClick={() => setShowUsers(!showUsers)}
              className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-700/50 rounded text-[10px] text-slate-300"
            >
              <span>{showUsers ? 'Hide users' : `${formData.selectedUserIds.length || 0} selected`}</span>
              <FiChevronDown className={`text-[9px] transition-transform ${showUsers ? 'rotate-180' : ''}`} />
            </button>

            {showUsers && (
              <div className="max-h-40 overflow-auto bg-slate-900/50 rounded border border-white/5 p-1.5 space-y-0.5">
                <div className="flex items-center justify-between px-1.5 py-1">
                  <span className="text-[9px] text-slate-500">{users.length} users</span>
                  <button
                    onClick={() => setFormData(p => ({ 
                      ...p, 
                      selectedUserIds: p.selectedUserIds.length === users.length ? [] : users.map(u => u.uid)
                    }))}
                    className="text-[9px] text-indigo-400"
                  >
                    {formData.selectedUserIds.length === users.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                {users.map(u => (
                  <label key={u.uid} className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-slate-800/50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedUserIds.includes(u.uid)}
                      onChange={() => toggleUser(u.uid)}
                      className="w-3 h-3 rounded border-slate-600 text-indigo-500"
                    />
                    <span className="text-[10px] text-white truncate flex-1">
                      {u.displayName || u.email?.split('@')[0] || 'User'}
                    </span>
                    {u.role !== 'user' && (
                      <span className={`text-[8px] px-1 py-0.5 rounded ${
                        u.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-lg border border-white/5 p-3 space-y-2.5">
        <div>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
            placeholder="Title"
            required
            className="w-full px-2.5 py-2 bg-slate-900/50 border border-white/10 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div>
          <textarea
            name="message"
            value={formData.message}
            onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
            placeholder="Message"
            required
            rows={3}
            className="w-full px-2.5 py-2 bg-slate-900/50 border border-white/10 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
          <p className="text-[9px] text-slate-500 text-right mt-0.5">{formData.message.length}/1000</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            name="priority"
            value={formData.priority}
            onChange={(e) => setFormData(p => ({ ...p, priority: e.target.value }))}
            className="px-2.5 py-2 bg-slate-900/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-indigo-500/50"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input
            type="url"
            name="link"
            value={formData.link}
            onChange={(e) => setFormData(p => ({ ...p, link: e.target.value }))}
            placeholder="Link (optional)"
            className="px-2.5 py-2 bg-slate-900/50 border border-white/10 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-1.5 text-red-400 text-xs">
            <FiAlertCircle className="text-xs" />
            {error}
          </div>
        )}

        {sent && (
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded flex items-center gap-1.5 text-green-400 text-xs">
            <FiSend className="text-xs" />
            Sent!
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            <FiSend className="text-sm" />
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={() => setFormData({ title: '', message: '', priority: 'normal', link: '', recipientType: 'all', selectedUserIds: [] })}
            className="px-3 py-2 bg-slate-700/50 text-white rounded text-sm font-medium hover:bg-slate-700"
          >
            Clear
          </button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}

export default Broadcast;
