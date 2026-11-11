import { Link } from 'react-router-dom';
import { GraduationCap, Github, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">PYQ Portal</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            A centralized platform for engineering students to access previous year question papers across all branches, semesters, and academic years.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/browse" className="hover:text-white transition">Browse Papers</Link></li>
            <li><Link to="/login" className="hover:text-white transition">Sign In</Link></li>
            <li><Link to="/register" className="hover:text-white transition">Register</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">About</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Built with React, Supabase, and Tailwind CSS. Question papers are linked via Google Drive for easy access.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} PYQ Portal. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Built with <Heart className="w-3.5 h-3.5 text-error-500 fill-error-500" /> for engineering students
          </p>
        </div>
      </div>
    </footer>
  );
}
