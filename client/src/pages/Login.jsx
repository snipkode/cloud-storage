import { FcGoogle } from 'react-icons/fc';

function Login() {
  const { login } = useAuthStore();

  const handleLogin = async () => {
    await login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">☁️</div>
            <h1 className="text-2xl font-bold text-white">Cloud Storage</h1>
            <p className="text-gray-400 text-sm mt-2">Secure file storage powered by Firebase</p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
          >
            <FcGoogle className="text-xl" />
            Sign in with Google
          </button>

          <p className="text-xs text-gray-500 text-center mt-6">
            By signing in, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
