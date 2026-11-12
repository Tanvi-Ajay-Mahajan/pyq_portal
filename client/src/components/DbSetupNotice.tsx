import { AlertTriangle } from 'lucide-react';

/**
 * Shown on the auth pages when the API is reachable but has no database.
 * Without this the student only sees a raw 503 toast and cannot tell whether
 * they typed something wrong.
 */
export default function DbSetupNotice() {
  return (
    <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">The portal database is not connected yet</p>
        <p className="mt-1 leading-relaxed">
          Accounts are stored in MongoDB, so sign-up cannot work until the server has a
          connection string. An administrator needs to add{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">MONGODB_URI</code>{' '}
          (plus a{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">JWT_SECRET</code>) in
          Settings &rarr; Environment variables. The app restarts automatically and sign-up
          works immediately after that.
        </p>
      </div>
    </div>
  );
}
