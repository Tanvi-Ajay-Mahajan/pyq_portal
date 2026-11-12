import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Mail, Lock, LogIn, Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && password.length >= 6 && !loading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid || password.length < 6) return;
    setLoading(true);
    try {
      await signIn(email, password);
      notify('success', 'Welcome back! Signed in successfully.');
      navigate(from, { replace: true });
    } catch (error) {
      notify('error', apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <span className="font-display font-bold text-2xl">PYQ Portal</span>
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Welcome back to your<br />question paper library
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed max-w-md">
            Access previous year question papers for FE, SE, TE and BE across all branches, schemes, and academic years.
          </p>
          <div className="mt-10 space-y-3">
            {['Search by subject, branch, or semester', 'Download papers via Google Drive links', 'Admin tools for managing the portal'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-primary-100">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-slate-50">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900">PYQ Portal</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Sign in to your account</h2>
          <p className="text-sm text-slate-500 mb-8">Enter your credentials to access the portal.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label-field">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className={`input-field pl-11 ${email.length > 0 && !emailValid ? 'border-error-300 focus:ring-error-500/30 focus:border-error-500' : ''}`}
                  autoComplete="email"
                />
              </div>
              {email.length > 0 && !emailValid && (
                <p className="mt-1.5 text-xs text-error-600">Please enter a valid email address.</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label-field">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
