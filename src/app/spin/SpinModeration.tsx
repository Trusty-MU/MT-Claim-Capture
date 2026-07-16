'use client';

// SPIN question moderation: AI drafts land here; the Marketing Owner edits,
// approves or bins them. Only approved questions reach the Sales Library.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Claim, SpinQuestion, SpinType } from '@/lib/types';

const SPIN_LABELS: Record<SpinType, string> = {
  situation: 'Situation',
  problem: 'Problem',
  implication: 'Implication',
  need_payoff: 'Need-payoff',
};

export function SpinModeration({ questions, claims }: { questions: SpinQuestion[]; claims: Pick<Claim, 'id' | 'title'>[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const claimTitle = (id: string | null) => claims.find((c) => c.id === id)?.title ?? 'No claim';

  const pending = questions.filter((q) => !q.approved);
  const approved = questions.filter((q) => q.approved);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/spin/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/spin/${id}`, { method: 'DELETE' });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">SPIN questions</h1>
      <p className="mt-2 text-mt-black-sand/70">
        Approve the questions sales get to see. Edit freely; the AI is a starting point, not the authority.
      </p>

      <section className="mt-6">
        <span className="mt-label">Waiting for approval · {pending.length}</span>
        <div className="mt-3 space-y-3">
          {pending.map((q) => (
            <QuestionRow key={q.id} q={q} claimTitle={claimTitle(q.claim_id)} busy={busy === q.id} onPatch={(b) => patch(q.id, b)} onDelete={() => remove(q.id)} />
          ))}
          {!pending.length && <p className="bg-mt-sand/50 p-4 text-sm font-bold">Nothing waiting.</p>}
        </div>
      </section>

      <section className="mt-8">
        <span className="mt-label">Live in the sales library · {approved.length}</span>
        <div className="mt-3 space-y-3">
          {approved.map((q) => (
            <QuestionRow key={q.id} q={q} claimTitle={claimTitle(q.claim_id)} busy={busy === q.id} onPatch={(b) => patch(q.id, b)} onDelete={() => remove(q.id)} />
          ))}
          {!approved.length && <p className="bg-mt-sand/50 p-4 text-sm font-bold">None approved yet.</p>}
        </div>
      </section>
    </div>
  );
}

function QuestionRow({
  q,
  claimTitle,
  busy,
  onPatch,
  onDelete,
}: {
  q: SpinQuestion;
  claimTitle: string;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.text);

  return (
    <div className="border-2 border-mt-sand p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-mt-black-sand px-2 py-0.5 font-bold uppercase tracking-[0.08em] text-white">{SPIN_LABELS[q.type]}</span>
        <span className="bg-mt-sand px-2 py-0.5 font-bold">{claimTitle}</span>
        {q.personas.map((p) => (
          <span key={p} className="bg-mt-dust px-2 py-0.5 font-bold">{p}</span>
        ))}
      </div>
      {editing ? (
        <div className="mt-2">
          <textarea className="mt-input min-h-20 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button type="button" className="mt-btn-red px-3 py-1.5 text-sm" disabled={busy} onClick={() => { onPatch({ text }); setEditing(false); }}>
              Save
            </button>
            <button type="button" className="mt-btn-ghost px-3 py-1.5 text-sm" onClick={() => { setText(q.text); setEditing(false); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-relaxed">{q.text}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        {!q.approved ? (
          <button type="button" className="font-bold text-mt-coast underline" disabled={busy} onClick={() => onPatch({ approved: true })}>
            Approve
          </button>
        ) : (
          <button type="button" className="font-bold text-mt-gold underline" disabled={busy} onClick={() => onPatch({ approved: false })}>
            Pull back
          </button>
        )}
        <button type="button" className="font-bold underline" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="font-bold text-mt-red-earth underline" disabled={busy} onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
