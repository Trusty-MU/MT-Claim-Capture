'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QuarterCircle } from '@/components/brand/QuarterCircle';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const next = searchParams.get('next') ?? '/';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-mt-sand px-4">
      <QuarterCircle />
      <div className="w-full max-w-sm bg-white p-8">
        <span className="mt-label">Mineral Technologies</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Proof Engine</h1>
        <p className="mt-2 text-sm text-mt-black-sand/70">
          Capture client wins. Build the proof library.
        </p>

        {sent ? (
          <div className="mt-6 border-2 border-mt-coast p-4">
            <p className="font-bold">Check your email.</p>
            <p className="mt-1 text-sm">We sent a sign-in link to {email}. No password needed.</p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-4">
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
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {error && <p className="text-sm font-bold text-mt-red-ore">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
