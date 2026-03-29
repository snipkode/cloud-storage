import { useState, useEffect } from 'react';
import { FiKey, FiFolder, FiBell, FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useNotificationStore } from '@store/notificationStore';
import ApiKeys from '@pages/ApiKeys';
import FileBrowser from '@components/FileBrowser';
import NotificationPanel from '@components/NotificationPanel';

function NotificationButton({ onClick }) {
  const { unreadCount } = useNotificationStore();

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
      aria-label="Notifications"
    >
      <FiBell className="text-base" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
      )}
    </button>
  );
}

function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const { setToken, fetchUnreadCount } = useNotificationStore();
  const [currentPage, setCurrentPage] = useState('files');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  // Initialize notification store with token
  useEffect(() => {
    if (token) {
      setToken(token);
      fetchUnreadCount();
    }
  }, [token]);

  const navItems = [
    { id: 'files', label: 'Files', icon: FiFolder },
    { id: 'api-keys', label: 'API Keys', icon: FiKey },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
              </button>

              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <FiFolder className="text-white text-base" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-white font-bold text-sm">Cloud Storage</h1>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <NotificationButton
                onClick={() => setNotificationPanelOpen(true)}
              />

              {/* User Menu */}
              <div className="flex items-center gap-2 sm:gap-3 pl-3 border-l border-white/10">
                {user?.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-lg border border-indigo-500/30 object-cover"
                  />
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">{user?.displayName || 'User'}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 px-3 py-2 rounded-lg transition-all"
                >
                  <FiLogOut className="text-sm" />
                  <span className="hidden sm:inline text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden lg:flex w-56 flex-col border-r border-white/5 glass bg-slate-900/50">
          <div className="flex-1 py-4 px-2 overflow-y-auto">
            {/* Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentPage === item.id
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`text-base ${currentPage === item.id ? 'text-indigo-400' : ''}`} />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Storage Info */}
            <div className="mt-6 px-2">
              <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white">Storage</span>
                  <span className="text-[10px] text-slate-400">2.4 GB / 15 GB</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full w-[16%] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 px-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-800/30 rounded-lg border border-white/5">
                  <div className="text-lg font-bold text-white">24</div>
                  <div className="text-[10px] text-slate-500">Files</div>
                </div>
                <div className="p-2.5 bg-slate-800/30 rounded-lg border border-white/5">
                  <div className="text-lg font-bold text-white">3</div>
                  <div className="text-[10px] text-slate-500">Folders</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/50 border border-white/5">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {user?.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.displayName || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-white/10 z-50 transform transition-transform duration-300 lg:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FiFolder className="text-white text-base" />
              </div>
              <span className="text-white font-bold text-sm">Cloud Storage</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="text-base" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30">
          <div className="max-w-[1600px] mx-auto p-4 sm:p-5 lg:p-6">
            {/* Page Content */}
            <div className="animate-fade-in-up">
              {currentPage === 'files' ? (
                <FileBrowser />
              ) : (
                <ApiKeys />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
      />
    </div>
  );
}

export default Dashboard;
