import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const inputClass =
  'w-full px-4 py-3.5 bg-dark-100/50 border border-white/[0.06] rounded-xl text-white text-sm transition-all duration-200 placeholder:text-dark-700 focus:outline-none focus:border-neon/40 focus:ring-1 focus:ring-neon/20 focus:bg-dark-100/80';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-[480px] h-[480px] rounded-full bg-gradient-radial from-neon/25 via-neon/8 to-transparent blur-3xl opacity-70 animate-pulse-glow" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="relative rounded-2xl p-px bg-gradient-to-br from-neon/50 via-neon/10 to-white/[0.04] shadow-neon-lg">
          <div className="rounded-2xl bg-dark-200/60 backdrop-blur-xl">
            <div className="text-center px-8 pt-10 pb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center mb-6 animate-glow">
                <svg className="w-8 h-8 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Create your account</h2>
              <p className="text-dark-800 text-sm mt-2">Start building your AI agents</p>
            </div>

            <div className="mx-8 h-px bg-gradient-to-r from-transparent via-neon/40 to-transparent" />

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-900 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-900 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-900 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-neon text-dark font-semibold rounded-xl disabled:opacity-50 text-sm transition-all duration-300 shadow-neon hover:bg-neon-dim hover:shadow-neon-lg"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-dark-700">
          Already have an account?{' '}
          <Link to="/login" className="text-neon font-medium hover:text-neon-dim transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
