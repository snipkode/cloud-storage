import { useState } from 'react';
import { FiBroadcast, FiSend, FiUsers, FiAlertCircle } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

function Broadcast() {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    link: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FiAlertCircle className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">Only super admins can send broadcasts.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      // TODO: Implement API call to send broadcast
      // await fetch('/api/notifications/broadcast', { ... })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSent(true);
      setFormData({ title: '', message: '', priority: 'normal', link: '' });
      
      // Reset success message after 3 seconds
      setTimeout(() => setSent(false), 3000);
    } catch (_err) {
      setError('Failed to send broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
          <FiBroadcast className="text-white text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Broadcast Notification</h1>
          <p className="text-slate-400 text-sm">Send notifications to all users</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
        <FiUsers className="text-blue-400 text-xl mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-blue-400 mb-1">Broadcast Recipients</h3>
          <p className="text-sm text-slate-400">
            This notification will be sent to all registered users. They will receive it in their notification panel.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., System Maintenance Scheduled"
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            placeholder="Write your broadcast message here..."
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">{formData.message.length}/1000 characters</p>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-slate-300 mb-2">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          >
            <option value="low">Low - Normal notification</option>
            <option value="normal">Normal - Standard priority</option>
            <option value="high">High - Important announcement</option>
            <option value="urgent">Urgent - Critical information</option>
          </select>
        </div>

        {/* Optional Link */}
        <div>
          <label htmlFor="link" className="block text-sm font-medium text-slate-300 mb-2">
            Optional Link
          </label>
          <input
            type="url"
            id="link"
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="https://example.com/more-info"
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
          <p className="text-xs text-slate-500 mt-1">Add a link for users to learn more (optional)</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <FiAlertCircle className="text-base" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {sent && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400 text-sm">
            <FiSend className="text-base" />
            Broadcast sent successfully to all users!
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className="text-base" />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
          <button
            type="button"
            onClick={() => setFormData({ title: '', message: '', priority: 'normal', link: '' })}
            className="px-6 py-2.5 bg-slate-700/50 text-white rounded-xl font-medium hover:bg-slate-700 transition-all"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Recent Broadcasts */}
      <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Broadcasts</h3>
        <div className="space-y-3">
          {[
            { id: 1, title: 'System Maintenance', message: 'Scheduled maintenance on...', priority: 'high', date: '2 days ago' },
            { id: 2, title: 'New Feature: Folders', message: 'You can now organize...', priority: 'normal', date: '1 week ago' },
            { id: 3, title: 'Security Update', message: 'We have updated...', priority: 'urgent', date: '2 weeks ago' },
          ].map((broadcast) => (
            <div
              key={broadcast.id}
              className="p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">{broadcast.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  broadcast.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                  broadcast.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  broadcast.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {broadcast.priority}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-2">{broadcast.message}</p>
              <p className="text-xs text-slate-500">{broadcast.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Broadcast;
