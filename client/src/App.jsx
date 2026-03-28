import { useEffect } from 'react';
import { useAuthStore } from '@store/authStore';
import Login from '@pages/Login';
import Dashboard from '@pages/Dashboard';

function App() {
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

  return isAuthenticated ? <Dashboard /> : <Login />;
}

export default App;
