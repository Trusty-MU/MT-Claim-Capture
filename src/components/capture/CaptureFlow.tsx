'use client';

// The capture flow: story type -> one question at a time -> file drop ->
// submit -> result. Every answer is saved as it happens; leaving and coming
// back resumes at the first unanswered question.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { questionsForType, CAPTURE_QUESTIONS, type CaptureQuestion } from '@/lib/questions';
import { STORY_TYPE_LABELS, type Story, type StoryInput, type StoryType } from '@/lib/types';
import { Recorder } from './Recorder';
import { FileDrop } from './FileDrop';
import { ResultScreen } from './ResultScreen';

type Step = { kind: 'type' } | { kind: 'question'; index: number } | { kind: 'files' } | { kind: 'submit' } | { kind: 'result' };

const SECTION_ORDER = ['A', 'B', 'C', 'D'] as const;

export function CaptureFlow({
  story,
  inputs,
  fastPath = false,
}: {
  story: Story;
  inputs: StoryInput[];
  fastPath?: boolean;
}) {
  const router = useRouter();
  const [storyType, setStoryType] = useState<StoryType | null>(story.story_type);
  const [answered, setAnswered] = useState<Set<number>>(
    () => new Set(inputs.filter((i) => i.question_number != null).map((i) => i.question_number!))
  );
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const questions = useMemo(
    () => (storyType ? questionsForType(storyType) : CAPTURE_QUESTIONS),
    [storyType]
  );

  const firstUnanswered = questions.findIndex((q) => !answered.has(q.number));
  const [step, setStep] = useState<Step>(() => {
    if (['submitted', 'processing', 'brief_ready', 'in_review', 'reviewed'].includes(story.status)) return { kind: 'result' };
    if (!story.story_type) return { kind: 'type' };
    if (fastPath) return { kind: 'files' };
    if (firstUnanswered === -1 && answered.size > 0) return { kind: 'files' };
    return { kind: 'question', index: Math.max(0, firstUnanswered) };
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function chooseType(type: StoryType) {
    setStoryType(type);
    await fetch(`/api/stories/${story.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_type: type }),
    });
    setStep(fastPath ? { kind: 'files' } : { kind: 'question', index: 0 });
  }

  function advance(fromIndex: number) {
    if (fromIndex + 1 < questions.length) setStep({ kind: 'question', index: fromIndex + 1 });
    else setStep({ kind: 'files' });
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}/submit`, { method: 'POST' });
      setSubmitting(false);
      if (res.ok) {
        setStep({ kind: 'result' });
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? `Could not send that in (HTTP ${res.status}).`);
    } catch {
      setSubmitting(false);
      setSubmitError('Could not reach the server. Your answers are saved; try again.');
    }
  }

  // -- progress ---------------------------------------------------------------
  const progress = useMemo(() => {
    if (step.kind !== 'question') return null;
    const q = questions[step.index];
    const sectionIndex = SECTION_ORDER.indexOf(q.section);
    const remaining = questions.length - step.index;
    return {
      section: sectionIndex + 1,
      sectionTitle: q.sectionTitle,
      minutes: Math.max(1, Math.round(remaining * 0.9)),
      pct: Math.round((step.index / questions.length) * 100),
    };
  }, [step, questions]);

  if (step.kind === 'result') {
    return <ResultScreen storyId={story.id} />;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col">
      {progress && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between text-sm font-bold">
            <span>
              Section {progress.section} of 4 <span className="font-normal text-mt-black-sand/60">· {progress.sectionTitle}</span>
            </span>
            <span className="text-mt-black-sand/60">about {progress.minutes} min left</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-mt-sand">
            <div className="h-full bg-mt-red-ore transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      {step.kind === 'type' && (
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">What kind of win is this?</h1>
          <div className="mt-6 grid gap-3">
            {(Object.keys(STORY_TYPE_LABELS) as StoryType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => chooseType(type)}
                className="border-2 border-mt-black-sand p-4 text-left text-lg font-bold transition-colors hover:bg-mt-black-sand hover:text-white"
              >
                {STORY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step.kind === 'question' && (
        <QuestionScreen
          key={questions[step.index].number}
          storyId={story.id}
          question={questions[step.index]}
          alreadyAnswered={answered.has(questions[step.index].number)}
          onAnswered={() => {
            setAnswered((prev) => new Set(prev).add(questions[step.index].number));
            advance(step.index);
          }}
          onSkip={() => {
            setSkipped((prev) => new Set(prev).add(questions[step.index].number));
            advance(step.index);
          }}
          onBack={step.index > 0 ? () => setStep({ kind: 'question', index: step.index - 1 }) : undefined}
        />
      )}

      {step.kind === 'files' && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-extrabold tracking-tight">Drop anything that has the numbers</h1>
          <p className="mt-2 text-mt-black-sand/70">Reports, schedules, emails, photos. Skip it if there&apos;s nothing handy.</p>
          <div className="mt-6">
            <FileDrop storyId={story.id} />
          </div>
          <div className="mt-8 flex items-center justify-between">
            <button type="button" className="text-sm font-bold underline" onClick={() => setStep({ kind: 'question', index: questions.length - 1 })}>
              Back
            </button>
            <button type="button" className="mt-btn-red" onClick={() => setStep({ kind: 'submit' })}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step.kind === 'submit' && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">That&apos;s it.</h1>
          <p className="mt-3 max-w-xs text-mt-black-sand/70">
            We&apos;ll turn this into something great and you&apos;ll see it first.
          </p>
          {answered.size === 0 && (
            <p className="mt-3 max-w-xs text-sm font-bold text-mt-red-ore">
              You haven&apos;t answered any questions. That&apos;s fine if the files tell the story.
            </p>
          )}
          <button type="button" className="mt-btn-red mt-8 w-full max-w-xs py-4 text-lg" onClick={submit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send it in'}
          </button>
          {submitError && (
            <p className="mt-4 max-w-xs border-2 border-mt-red-ore bg-white p-3 text-sm font-bold text-mt-red-ore">
              {submitError}
            </p>
          )}
          <button type="button" className="mt-4 text-sm font-bold underline" onClick={() => setStep({ kind: 'files' })}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One question on screen at a time. Big type, big mic button, skip always visible.
// ---------------------------------------------------------------------------
function QuestionScreen({
  storyId,
  question,
  alreadyAnswered,
  onAnswered,
  onSkip,
  onBack,
}: {
  storyId: string;
  question: CaptureQuestion;
  alreadyAnswered: boolean;
  onAnswered: () => void;
  onSkip: () => void;
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveVoice(blob: Blob) {
    const form = new FormData();
    form.append('kind', 'voice');
    form.append('question_number', String(question.number));
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
    form.append('file', new File([blob], `q${question.number}.${ext}`, { type: blob.type }));
    const res = await fetch(`/api/stories/${storyId}/inputs`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('save failed');
    onAnswered();
  }

  async function saveText() {
    if (!text.trim()) return;
    setSaving(true);
    const form = new FormData();
    form.append('kind', 'text');
    form.append('question_number', String(question.number));
    form.append('text', text.trim());
    try {
      const res = await fetch(`/api/stories/${storyId}/inputs`, { method: 'POST', body: form });
      setSaving(false);
      if (res.ok) {
        onAnswered();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error ?? `Could not save that answer (HTTP ${res.status}).`);
    } catch {
      setSaving(false);
      setSaveError('Could not reach the server. Check your connection and try again.');
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">{question.text}</h1>
      {question.hint && <p className="mt-2 text-sm text-mt-black-sand/60">{question.hint}</p>}
      {alreadyAnswered && (
        <p className="mt-2 text-sm font-bold text-mt-coast">Already answered. Add more, or move on.</p>
      )}

      <div className="mt-10 flex flex-1 flex-col items-center justify-start">
        {mode === 'voice' ? (
          <>
            <Recorder onSave={saveVoice} />
            <button type="button" className="mt-6 text-sm font-bold underline" onClick={() => setMode('text')}>
              Type instead
            </button>
          </>
        ) : (
          <div className="w-full">
            <textarea
              className="mt-input min-h-36"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your answer"
              autoFocus
            />
            {saveError && (
              <p className="mt-3 border-2 border-mt-red-ore p-3 text-sm font-bold text-mt-red-ore">{saveError}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button type="button" className="text-sm font-bold underline" onClick={() => setMode('voice')}>
                Talk instead
              </button>
              <button type="button" className="mt-btn-red" onClick={saveText} disabled={saving || !text.trim()}>
                {saving ? 'Saving…' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t-2 border-mt-sand pt-4">
        {onBack ? (
          <button type="button" className="text-sm font-bold underline" onClick={onBack}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="text-sm font-bold text-mt-black-sand/60 underline" onClick={onSkip}>
          {alreadyAnswered ? 'Next question' : "Doesn't apply / Don't know"}
        </button>
      </div>
    </div>
  );
}
