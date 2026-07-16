'use client';

// Two-panel review: left = the structured brief, right = the raw sources.
// Every fact links to its source; clicking a proof point scrolls the source
// panel to the file or transcript it came from.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Brief, Claim, ClientQuote, Gap, Story, ApprovalStatus } from '@/lib/types';
import type { InputWithUrl, ProofPointWithClaims } from './page';
import { ApprovalBadge, ConfidenceBadge, StoryStatusChip, StoryTypeBadge } from '@/components/brand/badges';

export function ReviewDetail({
  story,
  brief,
  inputs,
  proofPoints,
  quotes,
  gaps,
  claims,
  existingCaseStudyId,
}: {
  story: Story;
  brief: Brief | null;
  inputs: InputWithUrl[];
  proofPoints: ProofPointWithClaims[];
  quotes: ClientQuote[];
  gaps: Gap[];
  claims: Claim[];
  existingCaseStudyId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [highlightedInput, setHighlightedInput] = useState<string | null>(null);
  const sourceRefs = useRef<Map<string, HTMLElement>>(new Map());

  function jumpToSource(inputId: string | null) {
    if (!inputId) return;
    const el = sourceRefs.current.get(inputId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedInput(inputId);
      setTimeout(() => setHighlightedInput(null), 2500);
    }
  }

  async function patch(url: string, body: unknown, key: string) {
    setBusy(key);
    await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(null);
    router.refresh();
  }

  async function promote() {
    setBusy('promote');
    const res = await fetch(`/api/stories/${story.id}/promote`, { method: 'POST' });
    setBusy(null);
    if (res.ok) {
      const { caseStudy } = await res.json();
      router.push(`/case-studies/${caseStudy.id}`);
    }
  }

  async function reprocess() {
    setBusy('reprocess');
    await fetch(`/api/stories/${story.id}/reprocess`, { method: 'POST' });
    setBusy(null);
    router.refresh();
  }

  const snapshot = brief?.snapshot_json ?? {};
  const raw = brief?.raw_json;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{story.client_name || 'Untitled win'}</h1>
          <p className="text-sm text-mt-black-sand/60">
            {[story.commodity, story.location].filter(Boolean).join(' · ')}
          </p>
        </div>
        <StoryTypeBadge type={story.story_type} />
        <StoryStatusChip status={story.status} />
        <button type="button" className="mt-btn-ghost px-4 py-2 text-sm" onClick={reprocess} disabled={busy !== null}>
          {busy === 'reprocess' ? 'Queued…' : 'Re-run pipeline'}
        </button>
        {existingCaseStudyId ? (
          <Link href={`/case-studies/${existingCaseStudyId}`} className="mt-btn px-4 py-2 text-sm">
            Open case study
          </Link>
        ) : (
          <button type="button" className="mt-btn-red px-4 py-2 text-sm" onClick={promote} disabled={busy !== null || !brief}>
            {busy === 'promote' ? 'Creating…' : 'Promote to case study'}
          </button>
        )}
      </div>

      {story.pipeline_stage && <p className="mt-2 font-bold text-mt-gold">{story.pipeline_stage}</p>}
      {story.pipeline_error && (
        <p className="mt-2 border-2 border-mt-red-ore p-2 text-sm font-bold text-mt-red-ore">
          Pipeline failed: {story.pipeline_error}
        </p>
      )}

      {!brief ? (
        <p className="mt-8 bg-mt-sand/50 p-6 font-bold">No brief yet. The pipeline may still be running.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* LEFT: the structured brief */}
          <div className="space-y-6">
            <Panel label="Snapshot">
              <dl className="space-y-1 text-sm">
                <SnapRow label="Client" value={snapshot.client} />
                <SnapRow label="Commodity" value={snapshot.commodity} />
                <SnapRow label="Location" value={snapshot.location} />
                <SnapRow label="Scope" value={snapshot.scope_elements?.join(', ')} />
                <SnapRow label="Dates" value={snapshot.dates} />
                <SnapRow label="Status" value={snapshot.current_status} />
              </dl>
            </Panel>

            <EditablePanel
              label="Challenge draft"
              value={brief.challenge_draft ?? ''}
              onSave={(v) => patch(`/api/briefs/${brief.id}`, { challenge_draft: v }, 'challenge')}
              busy={busy === 'challenge'}
            />
            <EditablePanel
              label="Approach draft"
              value={brief.approach_draft ?? ''}
              onSave={(v) => patch(`/api/briefs/${brief.id}`, { approach_draft: v }, 'approach')}
              busy={busy === 'approach'}
            />
            <EditablePanel
              label="Suggested pullquote"
              value={brief.pullquote_suggestion ?? ''}
              onSave={(v) => patch(`/api/briefs/${brief.id}`, { pullquote_suggestion: v }, 'pullquote')}
              busy={busy === 'pullquote'}
            />

            <Panel label={`Outcomes · ${proofPoints.length} proof points`}>
              <div className="space-y-4">
                {proofPoints.map((pp) => (
                  <ProofPointRow
                    key={pp.id}
                    proofPoint={pp}
                    claims={claims}
                    onJumpToSource={() => jumpToSource(pp.source_input_id)}
                    onPatch={(body) => patch(`/api/proof-points/${pp.id}`, body, `pp-${pp.id}`)}
                    busy={busy === `pp-${pp.id}`}
                  />
                ))}
                {!proofPoints.length && <p className="text-sm text-mt-black-sand/60">No proof points extracted.</p>}
              </div>
            </Panel>

            {raw?.candidate_claims && raw.candidate_claims.length > 0 && (
              <Panel label="Candidate claims from this story">
                <ul className="space-y-2 text-sm">
                  {raw.candidate_claims.map((c, i) => (
                    <li key={i} className="border-l-4 border-mt-dust pl-3">
                      <p className="font-bold">{c.claim_text}</p>
                      <p className="text-mt-black-sand/60">
                        {c.supported ? 'Supported by evidence' : 'Not yet supported'}
                        {c.evidence_note ? ` · ${c.evidence_note}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel label="Client voice">
              <div className="space-y-3">
                {quotes.map((q) => (
                  <div key={q.id} className="border-l-4 border-mt-red-ore pl-3 text-sm">
                    <p className="font-bold">&ldquo;{q.quote_text}&rdquo;</p>
                    <p className="text-mt-black-sand/60">
                      {[q.speaker, q.context].filter(Boolean).join(' · ') || 'Unattributed'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <ApprovalBadge status={q.approval} />
                      <ApprovalSelect
                        value={q.approval}
                        onChange={(v) => patch(`/api/quotes/${q.id}`, { approval: v }, `q-${q.id}`)}
                      />
                    </div>
                  </div>
                ))}
                {!quotes.length && <p className="text-sm text-mt-black-sand/60">No client quotes captured.</p>}
              </div>
            </Panel>

            <Panel label={`Gaps to chase · ${gaps.filter((g) => g.status !== 'resolved').length} open`}>
              <div className="space-y-3">
                {gaps.map((g) => (
                  <GapRow key={g.id} gap={g} onPatch={(body) => patch(`/api/gaps/${g.id}`, body, `g-${g.id}`)} />
                ))}
                {!gaps.length && <p className="text-sm text-mt-black-sand/60">No gaps. Suspicious.</p>}
              </div>
            </Panel>

            {raw?.risk_flags && raw.risk_flags.length > 0 && (
              <Panel label="Risk flags">
                <ul className="list-inside list-disc space-y-1 text-sm font-bold text-mt-red-earth">
                  {raw.risk_flags.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          {/* RIGHT: the raw sources */}
          <div className="space-y-4 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-2">
            <span className="mt-label">Sources</span>
            {inputs.map((input) => (
              <div
                key={input.id}
                ref={(el) => {
                  if (el) sourceRefs.current.set(input.id, el);
                }}
                className={`border-2 p-3 transition-colors ${
                  highlightedInput === input.id ? 'border-mt-red-ore bg-mt-coral/30' : 'border-mt-sand'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-mt-black-sand/60">
                  {input.kind === 'voice'
                    ? `Voice note${input.question_number ? ` · question ${input.question_number}` : ''}`
                    : input.kind === 'file'
                      ? `File · ${input.file_name}`
                      : `Typed${input.question_number ? ` · question ${input.question_number}` : ''}`}
                </p>
                {input.kind === 'voice' && input.signed_url && (
                  <audio controls src={input.signed_url} className="mt-2 w-full" preload="none" />
                )}
                {input.kind === 'file' && input.signed_url && (
                  <a href={input.signed_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-bold text-mt-red-ore underline">
                    Open file
                  </a>
                )}
                {input.transcript_or_text ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{input.transcript_or_text.slice(0, 4000)}</p>
                ) : input.kind === 'voice' ? (
                  <p className="mt-2 text-sm italic text-mt-black-sand/50">
                    {input.transcription_status === 'skipped'
                      ? 'Not transcribed: no transcription provider configured.'
                      : input.transcription_status === 'failed'
                        ? 'Transcription failed.'
                        : 'Transcript pending.'}
                  </p>
                ) : null}
              </div>
            ))}
            {!inputs.length && <p className="text-sm text-mt-black-sand/60">No inputs.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-mt-sand p-4">
      <span className="mt-label">{label}</span>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SnapRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EditablePanel({
  label,
  value,
  onSave,
  busy,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <Panel label={label}>
      {editing ? (
        <div>
          <textarea className="mt-input min-h-28 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="mt-btn-red px-4 py-1.5 text-sm"
              disabled={busy}
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
            >
              Save
            </button>
            <button type="button" className="mt-btn-ghost px-4 py-1.5 text-sm" onClick={() => { setDraft(value); setEditing(false); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="group">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{value || <span className="italic text-mt-black-sand/50">Empty</span>}</p>
          <button type="button" className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-mt-red-ore" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      )}
    </Panel>
  );
}

function ApprovalSelect({ value, onChange }: { value: ApprovalStatus; onChange: (v: ApprovalStatus) => void }) {
  return (
    <select
      className="border-2 border-mt-sand bg-white px-1 py-0.5 text-xs font-bold"
      value={value}
      onChange={(e) => onChange(e.target.value as ApprovalStatus)}
    >
      <option value="needs_approval">Needs approval</option>
      <option value="public">Public</option>
      <option value="internal_only">Internal only</option>
    </select>
  );
}

function ProofPointRow({
  proofPoint: pp,
  claims,
  onJumpToSource,
  onPatch,
  busy,
}: {
  proofPoint: ProofPointWithClaims;
  claims: Claim[];
  onJumpToSource: () => void;
  onPatch: (body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [showClaims, setShowClaims] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(pp.claim_ids));
  const [newClaim, setNewClaim] = useState('');
  const linkedTitles = claims.filter((c) => pp.claim_ids.includes(c.id)).map((c) => c.title);

  async function saveClaims() {
    let claimIds = [...selected];
    if (newClaim.trim()) {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newClaim.trim(), status: 'candidate' }),
      });
      if (res.ok) {
        const { claim } = await res.json();
        claimIds = [...claimIds, claim.id];
      }
    }
    onPatch({ claim_ids: claimIds });
    setShowClaims(false);
    setNewClaim('');
  }

  return (
    <div className={`border-2 p-3 ${pp.review === 'rejected' ? 'border-mt-sand opacity-50' : 'border-mt-sand'}`}>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="min-w-0 flex-1 text-sm font-bold">{pp.metric}</p>
        <p className="text-lg font-extrabold">
          {pp.value ?? '[XX]'}
          {pp.unit ? <span className="ml-1 text-sm font-bold text-mt-black-sand/60">{pp.unit}</span> : null}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ConfidenceBadge level={pp.confidence} />
        <ApprovalBadge status={pp.approval} />
        {pp.source_input_id ? (
          <button type="button" className="text-xs font-bold uppercase tracking-[0.08em] text-mt-red-ore underline" onClick={onJumpToSource}>
            Source
          </button>
        ) : pp.source_note ? (
          <span className="text-xs text-mt-black-sand/50" title={pp.source_note}>src: {pp.source_note.slice(0, 40)}</span>
        ) : null}
      </div>
      {linkedTitles.length > 0 && (
        <p className="mt-2 text-xs text-mt-black-sand/70">
          <span className="font-bold uppercase tracking-[0.08em]">Claims:</span> {linkedTitles.join(' · ')}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {pp.review !== 'confirmed' && (
          <button type="button" className="font-bold text-mt-coast underline" disabled={busy} onClick={() => onPatch({ review: 'confirmed' })}>
            Confirm
          </button>
        )}
        {pp.review !== 'rejected' && (
          <button type="button" className="font-bold text-mt-red-earth underline" disabled={busy} onClick={() => onPatch({ review: 'rejected' })}>
            Reject
          </button>
        )}
        {pp.review === 'confirmed' && <span className="text-xs font-bold uppercase tracking-[0.08em] text-mt-coast">Confirmed</span>}
        <button type="button" className="font-bold underline" onClick={() => setShowClaims((s) => !s)}>
          {showClaims ? 'Close' : 'Assign claims'}
        </button>
        <ApprovalSelect value={pp.approval} onChange={(v) => onPatch({ approval: v })} />
      </div>

      {showClaims && (
        <div className="mt-3 border-t-2 border-mt-sand pt-3">
          <input
            className="mt-input py-2 text-sm"
            placeholder="Filter claims"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {claims
              .filter((c) => c.title.toLowerCase().includes(filter.toLowerCase()))
              .map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setSelected(next);
                    }}
                  />
                  <span>
                    {c.title} <span className="text-xs uppercase text-mt-black-sand/50">{c.status}</span>
                  </span>
                </label>
              ))}
          </div>
          <input
            className="mt-input mt-2 py-2 text-sm"
            placeholder="Or create a new candidate claim"
            value={newClaim}
            onChange={(e) => setNewClaim(e.target.value)}
          />
          <button type="button" className="mt-btn-red mt-2 px-4 py-1.5 text-sm" disabled={busy} onClick={saveClaims}>
            Save claim links
          </button>
        </div>
      )}
    </div>
  );
}

function GapRow({ gap, onPatch }: { gap: Gap; onPatch: (body: Record<string, unknown>) => void }) {
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);

  return (
    <div className={`text-sm ${gap.status === 'resolved' ? 'opacity-50' : ''}`}>
      <p className={gap.status === 'resolved' ? 'line-through' : 'font-bold'}>{gap.description}</p>
      <p className="text-xs text-mt-black-sand/60">
        {gap.owner_name ? `Chase: ${gap.owner_name} · ` : ''}
        {gap.status}
        {gap.resolved_note ? ` · ${gap.resolved_note}` : ''}
      </p>
      {gap.status !== 'resolved' && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {gap.status === 'open' && (
            <button type="button" className="text-xs font-bold uppercase tracking-[0.08em] text-mt-gold underline" onClick={() => onPatch({ status: 'chasing' })}>
              Mark as chasing
            </button>
          )}
          {resolving ? (
            <>
              <input
                className="border-2 border-mt-sand px-2 py-1 text-xs"
                placeholder="What did we find?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                type="button"
                className="text-xs font-bold uppercase tracking-[0.08em] text-mt-coast underline"
                onClick={() => onPatch({ status: 'resolved', resolved_note: note })}
              >
                Save
              </button>
            </>
          ) : (
            <button type="button" className="text-xs font-bold uppercase tracking-[0.08em] text-mt-coast underline" onClick={() => setResolving(true)}>
              Resolve
            </button>
          )}
        </div>
      )}
    </div>
  );
}
