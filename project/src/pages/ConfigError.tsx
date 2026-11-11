import { AlertTriangle, Database, ExternalLink, Folder } from 'lucide-react';
import { BRANCH_DRIVE_LINKS } from '@/lib/branchDriveLinks';

const BRANCH_LINKS: { key: keyof typeof BRANCH_DRIVE_LINKS; label: string }[] = [
  { key: 'AIML', label: 'AIML' },
  { key: 'CIVIL', label: 'Civil' },
  { key: 'COMPUTER', label: 'Computer' },
  { key: 'ELECTRICAL', label: 'Electrical' },
];

export default function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg w-full">
        <div className="card p-8 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-warning-50 text-warning-600 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
            Database not connected
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            This app needs a Supabase database to work. The connection details
            (URL and API key) are missing from the environment. The database
            itself is set up and ready — the app just can't reach it yet.
          </p>

          <div className="bg-slate-50 rounded-xl p-5 text-left mb-6">
            <h2 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-600" /> How to fix this
            </h2>
            <ol className="space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">1</span>
                <span>Refresh this page — Bolt usually regenerates the connection file automatically.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">2</span>
                <span>If that doesn't work, go to your Supabase project dashboard, open <strong>Settings → API</strong>, and copy the <strong>Project URL</strong> and <strong>anon public key</strong>.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">3</span>
                <span>Paste both values into the chat and I'll create the connection file for you immediately.</span>
              </li>
            </ol>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 text-left mb-6">
            <h2 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary-600" /> Branch paper folders
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {BRANCH_LINKS.map((branch) => (
                <a
                  key={branch.key}
                  href={BRANCH_DRIVE_LINKS[branch.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <span>{branch.label}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-primary-600" />
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-left">
              Each branch opens its Google Drive folder with the papers inside.
            </p>
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full"
          >
            <ExternalLink className="w-4 h-4" /> Open Supabase Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
