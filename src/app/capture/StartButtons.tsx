'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StartButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function start(fastPath: boolean) {
    setBusy(fastPath ? 'files' : 'start');
    const res = await fetch('/api/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) {
      setBusy(null);
      return;
    }
    const { story } = await res.json();
    router.push(`/capture/${story.id}${fastPath ? '?files=1' : ''}`);
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <button type="button" className="mt-btn-red w-full py-4 text-lg" onClick={() => start(false)} disabled={busy !== null}>
        {busy === 'start' ? 'Setting up…' : 'Start'}
      </button>
      <button type="button" className="text-center text-sm font-bold underline" onClick={() => start(true)} disabled={busy !== null}>
        {busy === 'files' ? 'Setting up…' : 'Or just drop files and skip the questions'}
      </button>
    </div>
  );
}
