'use client';

// Step two of password recovery. The recovery link has already been exchanged
// for a session by /auth/callback, so this page just sets the new password.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QuarterCircle } from '@/components/brand/QuarterCircle';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }
    window.location.assign('/');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-mt-sand px-4">
      <QuarterCircle />
      <div className="w-full max-w-sm bg-white p-8">
        <span className="mt-label">Mineral Technologies</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Choose a new password</h1>

        {checking ? (
          <p className="mt-6 text-sm text-mt-black-sand/60">Checking your link…</p>
        ) : !hasSession ? (
          <div className="mt-6 border-2 border-mt-red-ore p-4">
            <p className="font-bold">That reset link is no longer valid.</p>
            <p className="mt-1 text-sm">Reset links expire after a short time. Request a fresh one.</p>
            <a href="/auth/reset-password" className="mt-3 inline-block text-sm font-bold underline">
              Request a new link
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className="mt-input"
              autoComplete="new-password"
            />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="mt-input"
              autoComplete="new-password"
            />
            <button type="submit" disabled={busy || !password || !confirm} className="mt-btn-red w-full">
              {busy ? 'Saving…' : 'Save password'}
            </button>
            {error && <p className="text-sm font-bold text-mt-red-ore">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
