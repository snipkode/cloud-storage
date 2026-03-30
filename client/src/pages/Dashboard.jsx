import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiKey, FiFolder, FiBell, FiMenu, FiX, FiLogOut, FiShield, FiVolume2 } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';
import { useNotificationStore } from '@store/notificationStore';
import ApiKeys from '@pages/ApiKeys';
import AdminDashboard from '@pages/AdminDashboard';
import Broadcast from '@pages/Broadcast';
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

function Dashboard({ initialPage = 'files' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout, loading } = useAuthStore();
  const { setToken, fetchUnreadCount, fetchNotifications } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">☁️</div>
          <p className="text-slate-400 text-sm animate-pulse">Loading your cloud storage...</p>
        </div>
      </div>
    );
  }

  // Determine current page from URL or initialPage prop
  const getPageFromPath = () => {
    const path = location.pathname.slice(1); // Remove leading /
    if (['files', 'api-keys', 'admin', 'broadcast'].includes(path)) {
      return path;
    }
    return initialPage;
  };

  const [currentPage, setCurrentPage] = useState(getPageFromPath());

  // Update page when URL changes
  useEffect(() => {
    const page = getPageFromPath();
    setCurrentPage(page);
  }, [location.pathname]);

  // Navigate to page and update URL
  const navigateToPage = (page) => {
    setCurrentPage(page);
    navigate(`/${page}`);
    setSidebarOpen(false);
  };

  // Filter nav items based on user role - using useMemo for proper re-rendering
  const showAdminNav = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }, [user?.role]);

  const showBroadcastNav = useMemo(() => {
    return user?.role === 'super_admin';
  }, [user?.role]);

  // Initialize notification store with token
  useEffect(() => {
    if (token) {
      setToken(token);
      fetchNotifications(50);
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

              {/* Logo - Desktop Only */}
              <div className="hidden lg:flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <FiFolder className="text-white text-base" />
                </div>
                <div>
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
        <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-slate-900/80 backdrop-blur-xl">
          <div className="flex-1 py-3 px-2 overflow-y-auto">
            {/* Main Navigation */}
            <nav className="space-y-0.5 mb-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateToPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === item.id
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    currentPage === item.id 
                      ? 'bg-indigo-500/20 border border-indigo-500/30' 
                      : 'bg-slate-800/50'
                  }`}>
                    <item.icon className={`text-sm ${currentPage === item.id ? 'text-indigo-400' : 'text-slate-400'}`} />
                  </div>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Admin Section */}
            {(showAdminNav || showBroadcastNav) && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-2 mb-1">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">System</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                </div>
                <nav className="space-y-0.5">
                  {showAdminNav && (
                    <button
                      onClick={() => navigateToPage('admin')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === 'admin'
                          ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        currentPage === 'admin' 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : 'bg-slate-800/50'
                      }`}>
                        <FiShield className={`text-sm ${currentPage === 'admin' ? 'text-blue-400' : 'text-slate-400'}`} />
                      </div>
                      <span>Dashboard</span>
                    </button>
                  )}
                  {showBroadcastNav && (
                    <button
                      onClick={() => navigateToPage('broadcast')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === 'broadcast'
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        currentPage === 'broadcast' 
                          ? 'bg-purple-500/20 border border-purple-500/30' 
                          : 'bg-slate-800/50'
                      }`}>
                        <FiVolume2 className={`text-sm ${currentPage === 'broadcast' ? 'text-purple-400' : 'text-slate-400'}`} />
                      </div>
                      <span>Broadcast</span>
                    </button>
                  )}
                </nav>
              </div>
            )}

            {/* Storage Widget */}
            <div className="mx-2 p-3 bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <FiFolder className="text-indigo-400 text-xs" />
                  </div>
                  <span className="text-xs font-medium text-white">Storage</span>
                </div>
                <span className="text-[10px] text-slate-400">16% used</span>
              </div>
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full w-[16%] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-500">2.4 GB used</span>
                <span className="text-[10px] text-slate-500">15 GB total</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-3 mx-2 grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-800/30 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <FiFile className="text-blue-400 text-xs" />
                  </div>
                  <span className="text-[10px] text-slate-400">Files</span>
                </div>
                <p className="text-lg font-bold text-white">1,234</p>
              </div>
              <div className="p-2.5 bg-slate-800/30 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <FiKey className="text-purple-400 text-xs" />
                  </div>
                  <span className="text-[10px] text-slate-400">API Keys</span>
                </div>
                <p className="text-lg font-bold text-white">12</p>
              </div>
            </div>
          </div>

          {/* User Profile - Compact */}
          <div className="p-2 border-t border-white/5">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-lg border border-indigo-500/30 object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'user@example.com'}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Sign Out"
              >
                <FiLogOut className="text-sm" />
              </button>
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
                  navigateToPage(item.id);
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

            {/* Admin Navigation - Mobile */}
            {(showAdminNav || showBroadcastNav) && (
              <>
                <div className="my-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Admin</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                  </div>
                </div>
                <nav className="space-y-0.5 px-1">
                  {showAdminNav && (
                    <button
                      onClick={() => {
                        navigateToPage('admin');
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === 'admin'
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-lg shadow-indigo-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FiShield className={`text-sm ${currentPage === 'admin' ? 'text-indigo-400' : ''}`} />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  {showBroadcastNav && (
                    <button
                      onClick={() => {
                        navigateToPage('broadcast');
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === 'broadcast'
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-lg shadow-purple-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FiVolume2 className={`text-sm ${currentPage === 'broadcast' ? 'text-purple-400' : ''}`} />
                      <span>Broadcast</span>
                    </button>
                  )}
                </nav>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30">
          <div className="max-w-[1600px] mx-auto p-4 sm:p-5 lg:p-6">
            {/* Page Content */}
            <div className="animate-fade-in-up">
              {currentPage === 'files' ? (
                <FileBrowser />
              ) : currentPage === 'api-keys' ? (
                <ApiKeys />
              ) : currentPage === 'admin' ? (
                <AdminDashboard />
              ) : currentPage === 'broadcast' ? (
                <Broadcast />
              ) : (
                <FileBrowser />
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
