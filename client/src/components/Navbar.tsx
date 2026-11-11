import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FileText, LogOut, LayoutDashboard, ShieldCheck, BookOpen, Menu, X, GraduationCap } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { session, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinkClass = (path: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      location.pathname === path
        ? 'text-primary-700 bg-primary-50'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="block font-display font-bold text-slate-900 text-base">PYQ Portal</span>
            <span className="block text-[11px] text-slate-500 -mt-0.5">Engineering Question Papers</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={navLinkClass('/')}>Home</Link>
          <Link to="/browse" className={navLinkClass('/browse')}>Browse Papers</Link>
          {session && (
            <Link to="/dashboard" className={navLinkClass('/dashboard')}>
              <span className="inline-flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </span>
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link to="/admin" className={navLinkClass('/admin')}>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Admin
              </span>
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <div className="flex items-center gap-2.5 pr-2 border-r border-slate-200">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-slate-800 max-w-[140px] truncate">{profile?.full_name || 'User'}</p>
                  <span className="badge bg-primary-50 text-primary-700 text-[10px] py-0">
                    {role === 'ADMIN' ? 'Admin' : 'Student'}
                  </span>
                </div>
              </div>
              <button onClick={handleSignOut} className="btn-ghost">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-primary">
                <BookOpen className="w-4 h-4" /> Register
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 animate-fade-in">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Home</Link>
          <Link to="/browse" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Browse Papers</Link>
          {session && (
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
              <ShieldCheck className="w-4 h-4" /> Admin
            </Link>
          )}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {session ? (
              <>
                <p className="px-3 text-sm text-slate-600">{profile?.full_name} <span className="badge bg-primary-50 text-primary-700 ml-1">{role === 'ADMIN' ? 'Admin' : 'Student'}</span></p>
                <button onClick={() => { setMobileOpen(false); handleSignOut(); }} className="btn-secondary w-full">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary w-full">Sign in</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full">
                  <FileText className="w-4 h-4" /> Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
