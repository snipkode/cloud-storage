import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import ErrorBoundary from '@components/ErrorBoundary';
import Login from '@pages/Login';
import Dashboard from '@pages/Dashboard';
import ApiKeys from '@pages/ApiKeys';
import AdminDashboard from '@pages/AdminDashboard';
import Broadcast from '@pages/Broadcast';
import TokenExpiredWarning from '@components/TokenExpiredWarning';

function AppContent() {
  const [searchParams] = useSearchParams();
  const initialPage = searchParams.get('page') || 'files';
  const { isAuthenticated, loading, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">☁️</div>
      </div>
    );
  }

  return (
    <>
      <TokenExpiredWarning />
      {isAuthenticated ? (
        <ErrorBoundary>
          <Dashboard initialPage={initialPage} />
        </ErrorBoundary>
      ) : (
        <Login />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/api-keys" element={<ApiKeys />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
