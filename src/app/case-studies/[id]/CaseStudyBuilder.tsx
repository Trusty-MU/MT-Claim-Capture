'use client';

// Case Study builder: form on the left, live preview of the MT one-pager on
// the right. Export: shareable web link, print view, copy-as-markdown.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CaseStudy, CaseStudyStatus, Claim, ProofPoint, SocialPost, Story } from '@/lib/types';
import { SOCIAL_ROLES } from '@/lib/types';
import { CaseStudyTemplate, caseStudyToMarkdown } from '@/components/case-study/CaseStudyTemplate';
import { ApprovalBadge, ConfidenceBadge } from '@/components/brand/badges';
import { CopyButton } from '@/components/CopyButton';

export function CaseStudyBuilder({
  caseStudy,
  story,
  storyProofPoints,
  allClaims,
  socialPosts,
}: {
  caseStudy: CaseStudy;
  story: Story;
  storyProofPoints: ProofPoint[];
  allClaims: Claim[];
  socialPosts: SocialPost[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: caseStudy.title ?? '',
    meta_strip: caseStudy.meta_strip ?? '',
    pullquote: caseStudy.pullquote ?? '',
    challenge: caseStudy.challenge ?? '',
    approach: caseStudy.approach ?? '',
    cta_text: caseStudy.cta_text ?? '',
    featured_proof_point_ids: new Set(caseStudy.featured_proof_point_ids),
    featured_claim_ids: new Set(caseStudy.featured_claim_ids),
    status: caseStudy.status,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const featuredProof = useMemo(
    () => storyProofPoints.filter((p) => form.featured_proof_point_ids.has(p.id)),
    [storyProofPoints, form.featured_proof_point_ids]
  );
  const featuredClaims = useMemo(
    () => allClaims.filter((c) => form.featured_claim_ids.has(c.id)),
    [allClaims, form.featured_claim_ids]
  );

  const view = {
    title: form.title,
    meta_strip: form.meta_strip,
    pullquote: form.pullquote,
    challenge: form.challenge,
    approach: form.approach,
    cta_text: form.cta_text,
  };

  async function save(status?: CaseStudyStatus) {
    setBusy(status ?? 'save');
    const res = await fetch(`/api/case-studies/${caseStudy.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title || null,
        meta_strip: form.meta_strip || null,
        pullquote: form.pullquote || null,
        challenge: form.challenge || null,
        approach: form.approach || null,
        cta_text: form.cta_text || null,
        featured_proof_point_ids: [...form.featured_proof_point_ids],
        featured_claim_ids: [...form.featured_claim_ids],
        ...(status ? { status } : {}),
      }),
    });
    setBusy(null);
    if (res.ok) {
      if (status) setForm((f) => ({ ...f, status }));
      setSavedAt(new Date().toLocaleTimeString('en-AU'));
      router.refresh();
    }
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/case-study/${caseStudy.id}` : '';
  const unapprovedFeatured = featuredProof.filter((p) => p.approval !== 'public');

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Case study builder</h1>
          <p className="text-sm text-mt-black-sand/60">
            {story.client_name} · {story.commodity}
          </p>
        </div>
        <select
          className="border-2 border-mt-sand bg-white px-2 py-1.5 text-sm font-bold"
          value={form.status}
          onChange={(e) => save(e.target.value as CaseStudyStatus)}
        >
          <option value="draft">Draft</option>
          <option value="in_review">In review</option>
          <option value="client_approval">Client approval</option>
          <option value="published">Published</option>
        </select>
        <button type="button" className="mt-btn-red px-4 py-2 text-sm" onClick={() => save()} disabled={busy !== null}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        {savedAt && <span className="text-xs text-mt-black-sand/50">Saved {savedAt}</span>}
      </div>

      {form.status === 'published' && unapprovedFeatured.length > 0 && (
        <p className="mt-3 border-2 border-mt-sun bg-mt-sun/20 p-3 text-sm font-bold">
          Published with {unapprovedFeatured.length} featured proof point{unapprovedFeatured.length === 1 ? '' : 's'} not yet
          client-approved. Check before sharing externally.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <a href={`/share/case-study/${caseStudy.id}`} target="_blank" rel="noreferrer" className="font-bold text-mt-red-ore underline">
          Open share link
        </a>
        <a href={`/share/case-study/${caseStudy.id}?print=1`} target="_blank" rel="noreferrer" className="font-bold underline">
          Print view
        </a>
        {shareUrl && <CopyButton text={shareUrl} label="Copy link" />}
        <CopyButton text={caseStudyToMarkdown(view, featuredProof, featuredClaims)} label="Copy as markdown" />
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        {/* Form */}
        <div className="space-y-4">
          <Field label="Title">
            <input className="mt-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Meta strip (client / commodity / location)">
            <input className="mt-input" value={form.meta_strip} onChange={(e) => setForm({ ...form, meta_strip: e.target.value })} />
          </Field>
          <Field label="Pullquote">
            <textarea className="mt-input min-h-20" value={form.pullquote} onChange={(e) => setForm({ ...form, pullquote: e.target.value })} />
          </Field>
          <Field label="Challenge">
            <textarea className="mt-input min-h-28" value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} />
          </Field>
          <Field label="Approach">
            <textarea className="mt-input min-h-28" value={form.approach} onChange={(e) => setForm({ ...form, approach: e.target.value })} />
          </Field>
          <Field label="CTA">
            <input className="mt-input" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
          </Field>

          <Field label={`Outcomes: pick up to 4 stats (${form.featured_proof_point_ids.size} selected)`}>
            <div className="space-y-2">
              {storyProofPoints.map((pp) => (
                <label key={pp.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured_proof_point_ids.has(pp.id)}
                    onChange={(e) => {
                      const next = new Set(form.featured_proof_point_ids);
                      if (e.target.checked) next.add(pp.id);
                      else next.delete(pp.id);
                      setForm({ ...form, featured_proof_point_ids: next });
                    }}
                  />
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-extrabold">{pp.value ?? '[XX]'} {pp.unit ?? ''}</span>
                    <span>{pp.metric}</span>
                    <ConfidenceBadge level={pp.confidence} />
                    <ApprovalBadge status={pp.approval} />
                  </span>
                </label>
              ))}
              {!storyProofPoints.length && <p className="text-sm text-mt-black-sand/60">No proof points on this story.</p>}
            </div>
          </Field>

          <Field label="Claims featured">
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {allClaims.map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured_claim_ids.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(form.featured_claim_ids);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setForm({ ...form, featured_claim_ids: next });
                    }}
                  />
                  <span>
                    {c.title} <span className="text-xs uppercase text-mt-black-sand/50">{c.status}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* Live preview */}
        <div>
          <span className="mt-label">Live preview</span>
          <div className="mt-3 border-2 border-mt-sand shadow-none">
            <CaseStudyTemplate caseStudy={view} proofPoints={featuredProof} claims={featuredClaims} />
          </div>
        </div>
      </div>

      {/* Social post ideas */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="mt-label">Social post ideas</span>
          <button
            type="button"
            className="mt-btn-ghost px-4 py-1.5 text-sm"
            disabled={busy !== null}
            onClick={async () => {
              setBusy('social');
              await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ case_study_id: caseStudy.id }),
              });
              setBusy(null);
              router.refresh();
            }}
          >
            {busy === 'social' ? 'Drafting…' : socialPosts.length ? 'Regenerate drafts' : 'Generate drafts'}
          </button>
        </div>
        {socialPosts.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {socialPosts.map((post) => (
              <SocialPostCard key={post.id} post={post} unapproved={unapprovedFeatured.length > 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-mt-black-sand/70">{label}</p>
      {children}
    </div>
  );
}

function SocialPostCard({ post, unapproved }: { post: SocialPost; unapproved: boolean }) {
  const roleLabel = SOCIAL_ROLES.find((r) => r.key === post.target_role)?.label ?? post.target_role;
  return (
    <div className={`border-2 border-mt-sand p-4 ${post.status === 'dismissed' ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="mt-label">{roleLabel}</span>
        <CopyButton text={post.draft_text} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{post.draft_text}</p>
      {post.sources_note && (
        <p className="mt-2 text-xs text-mt-black-sand/60">
          <span className="font-bold">Uses:</span> {post.sources_note}
        </p>
      )}
      <p className={`mt-2 text-xs font-bold ${unapproved ? 'text-mt-red-ore' : 'text-mt-black-sand/60'}`}>
        Check client approval status before posting.
      </p>
    </div>
  );
}
