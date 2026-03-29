import { useState, useEffect } from 'react';
import { FiBell, FiX, FiTrash2, FiCheck, FiCheckSquare, FiInbox } from 'react-icons/fi';
import { useNotificationStore } from '@store/notificationStore';

// Priority badge colors
const priorityColors = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  normal: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30'
};

// Type icons and colors
const typeConfig = {
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  success: { color: 'text-green-400', bg: 'bg-green-500/10' },
  error: { color: 'text-red-400', bg: 'bg-red-500/10' }
};

function NotificationPanel({ isOpen, onClose }) {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();

  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    setLocalLoading(true);
    await markAllAsRead();
    setLocalLoading(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiBell className="text-xl text-indigo-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={localLoading}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                title="Mark all as read"
              >
                <FiCheckSquare className="text-sm" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="text-lg" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 70px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <FiInbox className="text-3xl text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No notifications yet</p>
              <p className="text-slate-600 text-xs mt-1">
                You'll see announcements and updates here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type] || typeConfig.info;
                const priorityColor = priorityColors[notification.priority] || priorityColors.normal;

                return (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                      notification.read
                        ? 'bg-slate-800/30 border-white/5 hover:bg-slate-800/50'
                        : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type indicator */}
                      <div className={`w-2 h-2 rounded-full mt-2 ${config.bg} ${notification.read ? 'opacity-50' : ''}`}>
                        <div className={`w-full h-full rounded-full ${config.color.replace('text-', 'bg-')}`}></div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-sm font-medium truncate ${
                            notification.read ? 'text-slate-400' : 'text-white'
                          }`}>
                            {notification.title}
                          </h3>
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityColor}`}>
                            {notification.priority}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationPanel;
