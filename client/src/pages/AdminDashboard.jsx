import { useState } from 'react';
import { FiUsers, FiServer, FiHardDrive, FiActivity, FiBroadcast, FiShield } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import BroadcastNotification from '@components/BroadcastNotification';

function AdminDashboard() {
  const { user } = useAuthStore();
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Check if user is admin or super_admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  if (!isAdmin) {
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

  const stats = [
    {
      icon: FiUsers,
      label: 'Total Users',
      value: '1,234',
      change: '+12%',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: FiServer,
      label: 'API Keys',
      value: '89',
      change: '+5',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FiHardDrive,
      label: 'Storage Used',
      value: '2.4 TB',
      change: '16%',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: FiActivity,
      label: 'Active Now',
      value: '156',
      change: '+23',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const recentActivities = [
    { id: 1, action: 'New user registered', user: 'john@example.com', time: '2 min ago', type: 'user' },
    { id: 2, action: 'API key created', user: 'admin@example.com', time: '5 min ago', type: 'api' },
    { id: 3, action: 'File uploaded', user: 'jane@example.com', time: '10 min ago', type: 'file' },
    { id: 4, action: 'Broadcast sent', user: 'admin@example.com', time: '1 hour ago', type: 'broadcast' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage users, API keys, and system settings</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-indigo-500/25"
          >
            <FiBroadcast className="text-base" />
            Broadcast
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="p-5 bg-slate-800/50 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="text-white text-base" />
              </div>
              <span className="text-xs font-medium text-green-400">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
          <FiUsers className="text-2xl text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">User Management</h3>
          <p className="text-sm text-slate-400">Manage users and roles</p>
        </div>

        <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group">
          <FiServer className="text-2xl text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Samba Integration</h3>
          <p className="text-sm text-slate-400">Configure SMB/CIFS shares</p>
        </div>

        <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all cursor-pointer group">
          <FiActivity className="text-2xl text-green-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">System Logs</h3>
          <p className="text-sm text-slate-400">View audit and access logs</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.type === 'user' ? 'bg-blue-500/20 text-blue-400' :
                  activity.type === 'api' ? 'bg-purple-500/20 text-purple-400' :
                  activity.type === 'file' ? 'bg-green-500/20 text-green-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {activity.type === 'user' ? <FiUsers className="text-sm" /> :
                   activity.type === 'api' ? <FiServer className="text-sm" /> :
                   activity.type === 'file' ? <FiHardDrive className="text-sm" /> :
                   <FiBroadcast className="text-sm" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.user}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && isSuperAdmin && (
        <BroadcastNotification onClose={() => setShowBroadcastModal(false)} />
      )}
    </div>
  );
}

export default AdminDashboard;
