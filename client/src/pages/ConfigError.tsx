import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ServerCrash } from 'lucide-react';

/**
 * Shown when the Express API cannot be reached (server down, wrong
 * VITE_API_URL, or MongoDB not connected). The old Supabase variant is gone —
 * this app talks to its own Node/Express backend only.
 */
export default function ConfigError() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg w-full">
        <div className="card p-8 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-warning-50 text-warning-600 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
            Backend not reachable
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            The portal could not reach its API, so paper lists and login are unavailable.
            Start the Express server and MongoDB, then reload this page.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              <ServerCrash className="w-4 h-4" /> Expected API base URL
            </div>
            <code className="text-xs text-slate-700 break-all">{apiUrl}</code>
          </div>

          <ul className="text-left text-sm text-slate-600 space-y-2 mb-6">
            <li>1. Start MongoDB, then run <code className="text-xs">npm run dev</code> inside <code className="text-xs">server/</code>.</li>
            <li>2. Make sure <code className="text-xs">client/.env</code> points <code className="text-xs">VITE_API_URL</code> at that server.</li>
            <li>3. Reload the page — branch cards open their Google Drive folder from MongoDB.</li>
          </ul>

          <Link to="/" className="btn-primary inline-flex">
            Back to home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
