import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage, isDatabaseNotConfigured } from '@/lib/api';
import DbSetupNotice from '@/components/DbSetupNotice';
import { useToast } from '@/context/ToastContext';
import { Mail, Lock, User, UserPlus, Eye, EyeOff, Loader2, GraduationCap, CheckCircle } from 'lucide-react';

export default function Register() {
  const { signUp } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);

  const passwordChecks = [
    { label: 'At least 6 characters', ok: password.length >= 6 },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', ok: /\d/.test(password) },
  ];

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword && password.length >= 6;
  const allChecksPass = passwordChecks.every((c) => c.ok);
  const canSubmit = fullName.trim().length >= 2 && emailValid && allChecksPass && passwordsMatch && !loading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      // signUp(name, email, password) — argument order must match the context.
      await signUp(fullName.trim(), email, password);
      notify('success', 'Account created! You are now signed in.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setDbMissing(isDatabaseNotConfigured(error));
      notify('error', apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
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
            Join the portal<br />and start studying smarter
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed max-w-md">
            Create a student account to browse and download previous year question papers organized by branch, semester, and scheme.
          </p>
          <div className="mt-10 space-y-3">
            {['Free student account', 'Instant access to all papers', 'Search and filter by subject'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-primary-100">
                <CheckCircle className="w-4 h-4 text-accent-400" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in-up py-4">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900">PYQ Portal</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Create a student account</h2>
          <p className="text-sm text-slate-500 mb-8">New accounts are registered as students by default.</p>

          {dbMissing && <DbSetupNotice />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="label-field">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="input-field pl-11"
                />
              </div>
            </div>

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
                  className="input-field pl-11"
                  autoComplete="email"
                />
              </div>
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
                  placeholder="Create a password"
                  className="input-field pl-11 pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map((c) => (
                    <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-success-600' : 'text-slate-400'}`}>
                      <CheckCircle className="w-3.5 h-3.5" /> {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label-field">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`input-field pl-11 ${confirmPassword.length > 0 && !passwordsMatch ? 'border-error-300 focus:ring-error-500/30 focus:border-error-500' : ''}`}
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1.5 text-xs text-error-600">Passwords do not match.</p>
              )}
            </div>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
