'use client';

// Email and password, with email verification on signup.

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QuarterCircle } from '@/components/brand/QuarterCircle';

type Mode = 'signin' | 'signup';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // A failed link (expired, already used) redirects back here with a reason.
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [unverified, setUnverified] = useState(false);
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  function reset() {
    setError(null);
    setUnverified(false);
    setResent(false);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setBusy(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (!error) {
      router.push(next);
      router.refresh();
      return;
    }

    // Supabase reports an unconfirmed address as a distinct error; offer to
    // resend rather than leaving people stuck on "invalid credentials".
    if (/confirm/i.test(error.message)) {
      setUnverified(true);
      setError('That address has not been verified yet. Check your inbox for the verification link.');
    } else {
      setError(error.message);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    reset();

    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // handle_new_user() reads this into public.users.name
        data: { name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    // With email confirmation on, Supabase returns a user but no session.
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setSent(true);
    }
  }

  async function resendVerification() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setResent(true);
  }

  if (sent) {
    return (
      <Shell>
        <div className="mt-6 border-2 border-mt-coast p-4">
          <p className="font-bold">Check your email.</p>
          <p className="mt-1 text-sm">
            We sent a verification link to {email}. Click it to activate your account, then sign in.
          </p>
        </div>
        <button
          type="button"
          className="mt-4 text-sm font-bold underline"
          onClick={() => {
            setSent(false);
            setMode('signin');
          }}
        >
          Back to sign in
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={mode === 'signin' ? signIn : signUp} className="mt-6 space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-input"
            autoComplete="name"
          />
        )}

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@mineraltechnologies.com"
          className="mt-input"
          autoComplete="email"
        />

        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? 'Choose a password (8+ characters)' : 'Password'}
          className="mt-input"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

        <button type="submit" disabled={busy || !email || !password} className="mt-btn-red w-full">
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {error && <p className="text-sm font-bold text-mt-red-ore">{error}</p>}

        {unverified && !resent && (
          <button type="button" className="text-sm font-bold underline" onClick={resendVerification} disabled={busy}>
            Resend the verification email
          </button>
        )}
        {resent && <p className="text-sm font-bold text-mt-coast">Sent. Check your inbox.</p>}
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t-2 border-mt-sand pt-4 text-sm">
        {mode === 'signin' ? (
          <>
            <button type="button" className="font-bold underline" onClick={() => { reset(); setMode('signup'); }}>
              Create an account
            </button>
            <Link href="/auth/reset-password" className="font-bold text-mt-black-sand/60 underline">
              Forgot password
            </Link>
          </>
        ) : (
          <button type="button" className="font-bold underline" onClick={() => { reset(); setMode('signin'); }}>
            Already have an account? Sign in
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-mt-sand px-4">
      <QuarterCircle />
      <div className="w-full max-w-sm bg-white p-8">
        <span className="mt-label">Mineral Technologies</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Proof Engine</h1>
        <p className="mt-2 text-sm text-mt-black-sand/70">Capture client wins. Build the proof library.</p>
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
