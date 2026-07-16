'use client';

// The Claims Library: what can we defensibly say in the market today?
// Health: 0 confirmed proof points = red, 1 = amber, 2+ = green.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Claim, ClaimStatus, Persona, ProductTag, StoryType, ValueProp } from '@/lib/types';
import { STORY_TYPE_SHORT } from '@/lib/types';
import { ClaimHealthDot, ClaimStatusChip, ConfidenceBadge, StoryTypeBadge } from '@/components/brand/badges';

export interface ClaimWithHealth extends Claim {
  proof_points: {
    id: string;
    metric: string;
    value: string | null;
    unit: string | null;
    confidence: 'confirmed' | 'reported' | 'missing';
    review: string;
  }[];
  confirmed_count: number;
  reported_count: number;
  missing_count: number;
  story_types: StoryType[];
}

export function ClaimsBoard({
  claims,
  personas,
  productTags,
  valueProps,
}: {
  claims: ClaimWithHealth[];
  personas: Persona[];
  productTags: ProductTag[];
  valueProps: ValueProp[];
}) {
  const router = useRouter();
  const [tagFilter, setTagFilter] = useState('');
  const [personaFilter, setPersonaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      claims.filter((c) => {
        if (tagFilter && !c.product_tags.includes(tagFilter)) return false;
        if (personaFilter && !c.personas.includes(personaFilter)) return false;
        if (typeFilter && !c.story_types.includes(typeFilter as StoryType)) return false;
        return true;
      }),
    [claims, tagFilter, personaFilter, typeFilter]
  );

  async function suggestValueProps() {
    setBusy('vp');
    await fetch('/api/value-props/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_tag: tagFilter || undefined, persona: personaFilter || undefined }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Claims library</h1>
          <p className="mt-1 text-mt-black-sand/70">What can we defensibly say in the market today?</p>
        </div>
        <button type="button" className="mt-btn-ghost px-4 py-2 text-sm" onClick={suggestValueProps} disabled={busy !== null}>
          {busy === 'vp' ? 'Drafting…' : 'Suggest value propositions'}
        </button>
        <button type="button" className="mt-btn-red px-4 py-2 text-sm" onClick={() => setShowNew((s) => !s)}>
          New claim
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <select className="border-2 border-mt-sand bg-white px-2 py-1.5 font-bold" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All product tags</option>
          {productTags.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
        <select className="border-2 border-mt-sand bg-white px-2 py-1.5 font-bold" value={personaFilter} onChange={(e) => setPersonaFilter(e.target.value)}>
          <option value="">All personas</option>
          {personas.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
        <select className="border-2 border-mt-sand bg-white px-2 py-1.5 font-bold" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All story types</option>
          {Object.entries(STORY_TYPE_SHORT).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {showNew && <ClaimEditor personas={personas} productTags={productTags} onDone={() => { setShowNew(false); router.refresh(); }} />}

      <div className="mt-6 space-y-3">
        {filtered.map((claim) => (
          <ClaimRow key={claim.id} claim={claim} personas={personas} productTags={productTags} />
        ))}
        {!filtered.length && <p className="bg-mt-sand/50 p-6 font-bold">No claims match those filters.</p>}
      </div>

      {/* Value propositions */}
      {valueProps.length > 0 && (
        <section className="mt-10">
          <span className="mt-label">Value propositions</span>
          <div className="mt-3 space-y-3">
            {valueProps.map((vp) => (
              <ValuePropRow key={vp.id} vp={vp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ClaimRow({ claim, personas, productTags }: { claim: ClaimWithHealth; personas: Persona[]; productTags: ProductTag[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="border-2 border-mt-sand">
      <button type="button" className="flex w-full flex-wrap items-center gap-3 p-4 text-left" onClick={() => setOpen((o) => !o)}>
        <ClaimHealthDot confirmedCount={claim.confirmed_count} />
        <span className="min-w-0 flex-1 font-bold">{claim.title}</span>
        <span className="flex items-center gap-1 text-xs text-mt-black-sand/60">
          <span className="font-bold text-mt-coast">{claim.confirmed_count}</span>/
          <span className="font-bold text-mt-gold">{claim.reported_count}</span>/
          <span className="font-bold text-mt-red-ore">{claim.missing_count}</span>
          <span className="ml-1">proof</span>
        </span>
        {claim.story_types.map((t) => (
          <StoryTypeBadge key={t} type={t} />
        ))}
        <ClaimStatusChip status={claim.status} />
      </button>

      {open && (
        <div className="border-t-2 border-mt-sand p-4">
          <ClaimEditor
            claim={claim}
            personas={personas}
            productTags={productTags}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
          {claim.proof_points.length > 0 && (
            <div className="mt-4">
              <span className="mt-label">Linked proof points</span>
              <ul className="mt-2 space-y-1">
                {claim.proof_points.map((pp) => (
                  <li key={pp.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <ConfidenceBadge level={pp.confidence} />
                    <span>{pp.metric}:</span>
                    <span className="font-extrabold">
                      {pp.value ?? '[XX]'} {pp.unit ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClaimEditor({
  claim,
  personas,
  productTags,
  onDone,
}: {
  claim?: ClaimWithHealth;
  personas: Persona[];
  productTags: ProductTag[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    title: claim?.title ?? '',
    description: claim?.description ?? '',
    status: (claim?.status ?? 'candidate') as ClaimStatus,
    so_what: claim?.so_what ?? '',
    we_do_that_too: claim?.we_do_that_too ?? '',
    prove_it: claim?.prove_it ?? '',
    personas: new Set(claim?.personas ?? []),
    product_tags: new Set(claim?.product_tags ?? []),
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const body = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      so_what: form.so_what || null,
      we_do_that_too: form.we_do_that_too || null,
      prove_it: form.prove_it || null,
      personas: [...form.personas],
      product_tags: [...form.product_tags],
    };
    await fetch(claim ? `/api/claims/${claim.id}` : '/api/claims', {
      method: claim ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    onDone();
  }

  async function generateSpin() {
    if (!claim) return;
    setBusy(true);
    await fetch('/api/spin/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_id: claim.id }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="mt-4 space-y-3 border-2 border-mt-black-sand p-4">
      <input className="mt-input font-bold" placeholder="Claim: the statement of value" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="mt-input min-h-16 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <span className="mt-label">So what</span>
          <textarea className="mt-input mt-1 min-h-24 text-sm" placeholder="Why buyers care" value={form.so_what} onChange={(e) => setForm({ ...form, so_what: e.target.value })} />
        </div>
        <div>
          <span className="mt-label">We do that too</span>
          <textarea className="mt-input mt-1 min-h-24 text-sm" placeholder="Which competitors could copy it" value={form.we_do_that_too} onChange={(e) => setForm({ ...form, we_do_that_too: e.target.value })} />
        </div>
        <div>
          <span className="mt-label">Prove it</span>
          <textarea className="mt-input mt-1 min-h-24 text-sm" placeholder="What evidence it needs" value={form.prove_it} onChange={(e) => setForm({ ...form, prove_it: e.target.value })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <p className="font-bold">Lifecycle</p>
          <select className="mt-1 border-2 border-mt-sand bg-white px-2 py-1 font-bold" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClaimStatus })}>
            <option value="candidate">Candidate</option>
            <option value="developing">Developing</option>
            <option value="proven">Proven</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        <fieldset>
          <legend className="font-bold">Personas</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {personas.map((p) => (
              <label key={p.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={form.personas.has(p.name)}
                  onChange={(e) => {
                    const next = new Set(form.personas);
                    if (e.target.checked) next.add(p.name); else next.delete(p.name);
                    setForm({ ...form, personas: next });
                  }}
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-bold">Product tags</legend>
          <div className="mt-1 flex max-w-md flex-wrap gap-x-4 gap-y-1">
            {productTags.map((t) => (
              <label key={t.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={form.product_tags.has(t.name)}
                  onChange={(e) => {
                    const next = new Set(form.product_tags);
                    if (e.target.checked) next.add(t.name); else next.delete(t.name);
                    setForm({ ...form, product_tags: next });
                  }}
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="mt-btn-red px-4 py-2 text-sm" onClick={save} disabled={busy || !form.title.trim()}>
          {busy ? 'Saving…' : claim ? 'Save claim' : 'Create claim'}
        </button>
        {claim && (
          <button type="button" className="mt-btn-ghost px-4 py-2 text-sm" onClick={generateSpin} disabled={busy}>
            Generate SPIN questions
          </button>
        )}
      </div>
    </div>
  );
}

function ValuePropRow({ vp }: { vp: ValueProp }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    await fetch(`/api/value-props/${vp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className={`border-2 border-mt-sand p-4 ${vp.status === 'dismissed' ? 'opacity-40' : ''}`}>
      <p className="text-sm leading-relaxed">{vp.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {vp.personas.map((p) => (
          <span key={p} className="bg-mt-sand px-2 py-0.5 font-bold">{p}</span>
        ))}
        {vp.product_tags.map((t) => (
          <span key={t} className="bg-mt-dust px-2 py-0.5 font-bold">{t}</span>
        ))}
        <span className="ml-auto flex gap-2">
          {vp.status !== 'approved' && (
            <button type="button" className="font-bold text-mt-coast underline" disabled={busy} onClick={() => setStatus('approved')}>
              Save to library
            </button>
          )}
          {vp.status !== 'dismissed' && (
            <button type="button" className="font-bold text-mt-red-earth underline" disabled={busy} onClick={() => setStatus('dismissed')}>
              Dismiss
            </button>
          )}
          {vp.status === 'approved' && <span className="font-bold uppercase tracking-[0.08em] text-mt-coast">Saved</span>}
        </span>
      </div>
    </div>
  );
}
