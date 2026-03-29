import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FiShield, FiZap, FiCloud } from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

function Login() {
  const { login, loading } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogin = async () => {
    await login();
  };

  const features = [
    { icon: FiCloud, text: 'Secure cloud storage' },
    { icon: FiZap, text: 'Lightning fast sync' },
    { icon: FiShield, text: 'End-to-end encryption' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Production Ready</span>
            </div>
            
            <h1 className="text-5xl xl:text-6xl font-bold mb-6 leading-tight">
              Your Files,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Anywhere, Anytime</span>
            </h1>
            
            <p className="text-lg text-white/80 max-w-md leading-relaxed">
              Experience seamless cloud storage with enterprise-grade security, 
              real-time synchronization, and lightning-fast access to all your files.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
                style={{ animation: 'fadeInUp 0.5s ease-out', animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
              >
                <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl">
                  <feature.icon className="text-2xl" />
                </div>
                <span className="text-lg font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold mb-1">99.9%</div>
              <div className="text-sm text-white/60">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">256-bit</div>
              <div className="text-sm text-white/60">Encryption</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">24/7</div>
              <div className="text-sm text-white/60">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/50"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
              <FiCloud className="text-3xl text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Cloud Storage</h1>
            <p className="text-slate-400 mt-2">Secure file storage powered by Firebase</p>
          </div>

          {/* Login Card */}
          <div className="card p-8 sm:p-10 animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="hidden lg:block mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                  <FiCloud className="text-3xl text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Welcome back
              </h2>
              <p className="text-slate-400">
                Sign in to access your cloud storage
              </p>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="w-full relative group bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-lg overflow-hidden"
            >
              {/* Shine Effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -translate-x-full transition-transform duration-700 ${
                  isHovered ? 'translate-x-full' : ''
                }`}
              ></div>
              
              <div className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <FiCloud className="text-xl animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <FcGoogle className="text-2xl" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-slate-800/50 text-slate-500 text-sm">Secure authentication</span>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-3 mb-8">
              {[
                'Access files from any device',
                'Automatic backup and sync',
                'Share files securely with others',
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="w-5 h-5 flex items-center justify-center bg-green-500/10 rounded-full">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {item}
                </div>
              ))}
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-slate-500">
              By signing in, you agree to our{' '}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 underline">
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
