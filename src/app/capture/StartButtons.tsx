'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StartButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(fastPath: boolean) {
    setBusy(fastPath ? 'files' : 'start');
    setError(null);

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (!res.ok) {
        // Previously this returned silently, so a failure here looked like the
        // button doing nothing at all.
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Could not start (HTTP ${res.status}).`);
        setBusy(null);
        return;
      }

      const { story } = await res.json();
      router.push(`/capture/${story.id}${fastPath ? '?files=1' : ''}`);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <button type="button" className="mt-btn-red w-full py-4 text-lg" onClick={() => start(false)} disabled={busy !== null}>
        {busy === 'start' ? 'Setting up…' : 'Start'}
      </button>
      <button type="button" className="text-center text-sm font-bold underline" onClick={() => start(true)} disabled={busy !== null}>
        {busy === 'files' ? 'Setting up…' : 'Or just drop files and skip the questions'}
      </button>

      {error && (
        <p className="border-2 border-mt-red-ore bg-white p-3 text-sm font-bold text-mt-red-ore">
          {error}
        </p>
      )}
    </div>
  );
}
