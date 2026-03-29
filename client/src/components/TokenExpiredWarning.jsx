import { FiAlertTriangle, FiRefreshCw, FiX } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

function TokenExpiredWarning() {
  const { tokenExpiredWarning, dismissTokenExpiredWarning, logout } = useAuthStore();

  if (!tokenExpiredWarning) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />

      {/* Warning Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <FiAlertTriangle className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Session Expired</h2>
                <p className="text-xs text-slate-400">Please refresh to continue</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="text-amber-400 text-lg flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200 font-medium">Your session has expired</p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    For security reasons, your login session has timed out. Please refresh the page to sign in again.
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown info */}
            <p className="text-xs text-slate-500 text-center">
              You will be logged out automatically in 30 seconds
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
              >
                <FiX className="text-base" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={handleRefresh}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-4 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/25 text-sm font-medium"
              >
                <FiRefreshCw className="text-base" />
                <span>Refresh Page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TokenExpiredWarning;
