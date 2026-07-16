'use client';

// Instant gratification: within ~60 seconds of submitting, the contributor
// sees the AI brief of THEIR story looking impressive. "Here's what we heard.
// Look right?" One-tap confirmations or a voice correction.

import { useEffect, useState } from 'react';
import type { BriefJson, BriefSnapshot } from '@/lib/types';
import { Recorder } from './Recorder';

interface StatusPayload {
  story: { status: string; pipeline_stage: string | null; pipeline_error: string | null };
  brief: {
    snapshot_json: BriefSnapshot | null;
    challenge_draft: string | null;
    approach_draft: string | null;
    pullquote_suggestion: string | null;
    raw_json: BriefJson | null;
  } | null;
}

export function ResultScreen({ storyId }: { storyId: string }) {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState(false);
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/stories/${storyId}/status`);
        if (res.ok) {
          const data = (await res.json()) as StatusPayload;
          if (!active) return;
          setPayload(data);
          if (data.brief) return; // done polling
        }
      } catch {
        // transient; keep polling
      }
      timer = setTimeout(poll, 3000);
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [storyId]);

  async function confirmSection(section: string) {
    setConfirmed((prev) => new Set(prev).add(section));
    const form = new FormData();
    form.append('kind', 'text');
    form.append('text', `Contributor confirmed the ${section} section looks right.`);
    await fetch(`/api/stories/${storyId}/inputs`, { method: 'POST', body: form });
  }

  async function saveCorrection(blob: Blob) {
    const form = new FormData();
    form.append('kind', 'voice');
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
    form.append('file', new File([blob], `contributor-correction.${ext}`, { type: blob.type }));
    await fetch(`/api/stories/${storyId}/inputs`, { method: 'POST', body: form });
    setThanked(true);
    setCorrecting(false);
  }

  if (!payload || !payload.brief) {
    const stage = payload?.story?.pipeline_stage;
    const error = payload?.story?.pipeline_error;
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-extrabold">We hit a snag.</h1>
            <p className="mt-3 text-mt-black-sand/70">
              Your story is safe and the team has it. Nothing for you to redo.
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-mt-sand border-t-mt-red-ore" />
            <h1 className="mt-6 text-2xl font-extrabold">Working on it…</h1>
            <p className="mt-2 text-mt-black-sand/70">{stage ?? 'Reading through everything you gave us.'}</p>
            <p className="mt-1 text-sm text-mt-black-sand/50">This usually takes about a minute.</p>
          </>
        )}
      </div>
    );
  }

  const { brief } = payload;
  const snapshot = brief.snapshot_json ?? {};
  const outcomes = brief.raw_json?.outcomes?.filter((o) => o.value && o.value !== '[XX]') ?? [];

  return (
    <div className="mx-auto w-full max-w-md pb-16">
      <span className="mt-pill">Thank you</span>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Here&apos;s what we heard. Look right?</h1>

      {brief.pullquote_suggestion && (
        <blockquote className="mt-6 border-l-4 border-mt-red-ore pl-4 text-xl font-bold leading-snug">
          {brief.pullquote_suggestion}
        </blockquote>
      )}

      <Section
        title="The snapshot"
        confirmed={confirmed.has('snapshot')}
        onConfirm={() => confirmSection('snapshot')}
      >
        <dl className="space-y-1 text-sm">
          {snapshot.client && <Row label="Client" value={snapshot.client} />}
          {snapshot.commodity && <Row label="Commodity" value={snapshot.commodity} />}
          {snapshot.location && <Row label="Where" value={snapshot.location} />}
          {snapshot.dates && <Row label="When" value={snapshot.dates} />}
          {snapshot.current_status && <Row label="Today" value={snapshot.current_status} />}
        </dl>
      </Section>

      {brief.challenge_draft && (
        <Section title="The challenge" confirmed={confirmed.has('challenge')} onConfirm={() => confirmSection('challenge')}>
          <p className="text-sm leading-relaxed">{brief.challenge_draft}</p>
        </Section>
      )}

      {brief.approach_draft && (
        <Section title="What MT did" confirmed={confirmed.has('approach')} onConfirm={() => confirmSection('approach')}>
          <p className="text-sm leading-relaxed">{brief.approach_draft}</p>
        </Section>
      )}

      {outcomes.length > 0 && (
        <Section title="The numbers we caught" confirmed={confirmed.has('numbers')} onConfirm={() => confirmSection('numbers')}>
          <ul className="space-y-2">
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{o.metric}</span>
                <span className="shrink-0 font-extrabold">
                  {o.value}
                  {o.unit ? ` ${o.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-8 border-t-2 border-mt-sand pt-6">
        {thanked ? (
          <p className="font-bold text-mt-coast">Got it. The team will fold that in.</p>
        ) : correcting ? (
          <div>
            <p className="mb-4 font-bold">Tell us what to fix.</p>
            <Recorder onSave={saveCorrection} />
            <button type="button" className="mt-4 text-sm font-bold underline" onClick={() => setCorrecting(false)}>
              Never mind
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-mt-black-sand/70">Something off? Say it and we&apos;ll fix it.</p>
            <button type="button" className="mt-btn-ghost" onClick={() => setCorrecting(true)}>
              Add a voice correction
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-sm text-mt-black-sand/60">
        That&apos;s you done. The marketing team takes it from here, and you&apos;ll see the finished piece first.
      </p>
    </div>
  );
}

function Section({
  title,
  confirmed,
  onConfirm,
  children,
}: {
  title: string;
  confirmed: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 bg-mt-sand/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="mt-label">{title}</span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmed}
          className={`text-lg leading-none ${confirmed ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
          aria-label={confirmed ? `${title} confirmed` : `Confirm ${title}`}
          title="Looks right"
        >
          👍
        </button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
