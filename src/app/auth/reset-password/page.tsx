'use client';

// Step one of password recovery: ask for the reset email.

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { QuarterCircle } from '@/components/brand/QuarterCircle';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    setBusy(false);
    // Report success either way; whether an address has an account is not
    // something an unauthenticated form should disclose.
    if (error && !/not found/i.test(error.message)) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-mt-sand px-4">
      <QuarterCircle />
      <div className="w-full max-w-sm bg-white p-8">
        <span className="mt-label">Mineral Technologies</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Reset your password</h1>

        {sent ? (
          <div className="mt-6 border-2 border-mt-coast p-4">
            <p className="font-bold">Check your email.</p>
            <p className="mt-1 text-sm">
              If there is an account for {email}, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mineraltechnologies.com"
              className="mt-input"
              autoComplete="email"
            />
            <button type="submit" disabled={busy || !email} className="mt-btn-red w-full">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            {error && <p className="text-sm font-bold text-mt-red-ore">{error}</p>}
          </form>
        )}

        <Link href="/login" className="mt-6 inline-block text-sm font-bold underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
