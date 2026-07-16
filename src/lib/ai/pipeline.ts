// The AI pipeline. Runs server-side with the service role, triggered on story
// submission. Progress is written to stories.pipeline_stage so the Marketing
// Owner (and the contributor's result screen) can watch it move.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { structuredCall } from './anthropic';
import {
  INTAKE_BRIEF_SYSTEM_PROMPT,
  CLAIMS_MATCHING_SYSTEM_PROMPT,
  SPIN_SYSTEM_PROMPT,
  SOCIAL_SYSTEM_PROMPT,
  VALUE_PROP_SYSTEM_PROMPT,
} from './prompts';
import { transcribeAudio } from '@/lib/transcription';
import { isImage } from '@/lib/extract';
import type { BriefJson, Claim, ProofPoint, SpinType, StoryInput, StoryType } from '@/lib/types';

async function setStage(db: SupabaseClient, storyId: string, stage: string | null, error?: string) {
  await db
    .from('stories')
    .update({ pipeline_stage: stage, ...(error !== undefined ? { pipeline_error: error } : {}) })
    .eq('id', storyId);
}

// ---------------------------------------------------------------------------
// Stage 0: transcription
// ---------------------------------------------------------------------------
async function runTranscription(db: SupabaseClient, storyId: string, inputs: StoryInput[]) {
  const pending = inputs.filter(
    (i) => (i.kind === 'voice' || i.transcription_status === 'pending') && !i.transcript_or_text && i.storage_path
  );
  if (pending.length === 0) return;

  await setStage(db, storyId, `Transcribing ${pending.length} voice note${pending.length === 1 ? '' : 's'}…`);

  for (const input of pending) {
    const bucket = input.kind === 'voice' ? 'voice-notes' : 'story-files';
    const { data: blob, error } = await db.storage.from(bucket).download(input.storage_path!);
    if (error || !blob) {
      await db.from('story_inputs').update({ transcription_status: 'failed' }).eq('id', input.id);
      continue;
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await transcribeAudio(buffer, input.file_name ?? 'audio.webm', input.mime_type ?? 'audio/webm');
    await db
      .from('story_inputs')
      .update({ transcript_or_text: result.text, transcription_status: result.status })
      .eq('id', input.id);
    input.transcript_or_text = result.text;
    input.transcription_status = result.status;
  }
}

// ---------------------------------------------------------------------------
// Stage 1: intake brief
// ---------------------------------------------------------------------------
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

const MAX_VISION_IMAGES = 4;

async function buildStageOneContent(db: SupabaseClient, story: Record<string, unknown>, inputs: StoryInput[]) {
  const blocks: ContentBlock[] = [];
  const parts: string[] = [];

  parts.push(`Contributor's story type selection: ${story.story_type ?? 'not selected'}`);

  const voiceAnswers = inputs.filter((i) => i.kind !== 'file' && i.question_number != null);
  for (const input of voiceAnswers.sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0))) {
    const label = input.kind === 'voice' ? 'Voice note transcript' : 'Typed answer';
    if (input.transcript_or_text) {
      parts.push(`## ${label}, question ${input.question_number}\n${input.transcript_or_text}`);
    } else if (input.kind === 'voice') {
      parts.push(
        `## Voice note, question ${input.question_number}\n[Audio recorded but not transcribed: ${input.transcription_status ?? 'unavailable'}. Log a gap to review the recording.]`
      );
    }
  }

  const freeInputs = inputs.filter((i) => i.kind === 'text' && i.question_number == null && i.transcript_or_text);
  for (const input of freeInputs) {
    parts.push(`## Pasted text${input.file_name ? ` (${input.file_name})` : ''}\n${input.transcript_or_text}`);
  }

  const files = inputs.filter((i) => i.kind === 'file');
  let imageCount = 0;
  for (const file of files) {
    if (file.transcript_or_text) {
      parts.push(`## File: ${file.file_name}\n${file.transcript_or_text.slice(0, 30000)}`);
    } else if (file.mime_type && file.file_name && isImage(file.mime_type, file.file_name) && imageCount < MAX_VISION_IMAGES && file.storage_path) {
      const { data: blob } = await db.storage.from('story-files').download(file.storage_path);
      if (blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        // Anthropic image limit is 5MB per image; skip larger ones.
        if (buffer.length < 5 * 1024 * 1024) {
          parts.push(`## Image file provided: ${file.file_name} (attached below)`);
          blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: file.mime_type, data: buffer.toString('base64') },
          });
          imageCount++;
        }
      }
    } else {
      parts.push(`## File stored without extracted text: ${file.file_name} (${file.mime_type ?? 'unknown type'})`);
    }
  }

  blocks.unshift({ type: 'text', text: parts.join('\n\n') });
  return blocks;
}

const CONFIDENCE_MAP: Record<string, 'confirmed' | 'reported' | 'missing'> = {
  CONFIRMED: 'confirmed',
  REPORTED: 'reported',
  MISSING: 'missing',
};

function matchSourceInput(source: string | undefined, inputs: StoryInput[]): string | null {
  if (!source) return null;
  const lower = source.toLowerCase();
  const byFile = inputs.find((i) => i.file_name && lower.includes(i.file_name.toLowerCase()));
  if (byFile) return byFile.id;
  const qMatch = lower.match(/question\s*(\d+)/);
  if (qMatch) {
    const byQuestion = inputs.find((i) => i.question_number === Number(qMatch[1]));
    if (byQuestion) return byQuestion.id;
  }
  return null;
}

async function runIntakeBrief(db: SupabaseClient, storyId: string, story: Record<string, unknown>, inputs: StoryInput[]) {
  await setStage(db, storyId, 'Extracting proof points and drafting the brief…');

  const content = await buildStageOneContent(db, story, inputs);
  const brief = await structuredCall<BriefJson>(INTAKE_BRIEF_SYSTEM_PROMPT, content, 16000);

  await db.from('briefs').insert({
    story_id: storyId,
    snapshot_json: brief.snapshot ?? {},
    challenge_draft: brief.challenge_draft ?? null,
    approach_draft: brief.approach_draft ?? null,
    pullquote_suggestion: brief.pullquote_suggestion ?? null,
    raw_json: brief,
  });

  // Fill story fields the AI inferred; the human confirms in review.
  await db
    .from('stories')
    .update({
      client_name: story.client_name || brief.snapshot?.client || null,
      commodity: story.commodity || brief.snapshot?.commodity || null,
      location: story.location || brief.snapshot?.location || null,
      story_type: story.story_type || brief.story_type || null,
      scope_elements: brief.snapshot?.scope_elements ?? [],
      current_status: brief.snapshot?.current_status ?? null,
    })
    .eq('id', storyId);

  const proofPointIds: string[] = [];
  for (const outcome of brief.outcomes ?? []) {
    const value = outcome.value?.trim() || '[XX]';
    const confidence = value === '[XX]' ? 'missing' : CONFIDENCE_MAP[outcome.confidence] ?? 'reported';
    const { data } = await db
      .from('proof_points')
      .insert({
        story_id: storyId,
        metric: outcome.metric,
        value,
        unit: outcome.unit ?? null,
        source_input_id: matchSourceInput(outcome.source, inputs),
        source_note: outcome.source ?? null,
        confidence,
      })
      .select('id')
      .single();
    if (data) proofPointIds.push(data.id);
  }

  for (const quote of brief.client_voice ?? []) {
    await db.from('client_quotes').insert({
      story_id: storyId,
      quote_text: quote.quote,
      speaker: quote.speaker ?? null,
      context: quote.context ?? null,
      approval: quote.approval_status === 'public' ? 'public' : 'needs_approval',
    });
  }

  for (const gap of brief.gaps ?? []) {
    await db.from('gaps').insert({
      story_id: storyId,
      description: gap.description,
      owner_name: gap.chase_person ?? null,
    });
  }

  return { brief, proofPointIds };
}

// ---------------------------------------------------------------------------
// Stage 2: claims matching
// ---------------------------------------------------------------------------
async function runClaimsMatching(db: SupabaseClient, storyId: string, brief: BriefJson, proofPointIds: string[]) {
  await setStage(db, storyId, 'Matching evidence against the Claims library…');

  const { data: library } = await db
    .from('claims')
    .select('id, title, description, status')
    .neq('status', 'retired');
  const { data: proofPoints } = await db
    .from('proof_points')
    .select('id, metric, value, unit, confidence')
    .in('id', proofPointIds.length ? proofPointIds : ['00000000-0000-0000-0000-000000000000']);

  const payload = JSON.stringify(
    {
      claims_library: library ?? [],
      candidate_claims: (brief.candidate_claims ?? []).map((c) => c.claim_text),
      proof_points: proofPoints ?? [],
    },
    null,
    2
  );

  const result = await structuredCall<{
    proof_point_links: { proof_point_id: string; claim_ids: string[] }[];
    candidate_claims: { claim_text: string; verdict: string; existing_claim_id: string | null; reason: string }[];
  }>(CLAIMS_MATCHING_SYSTEM_PROMPT, payload, 8000);

  const validClaimIds = new Set((library ?? []).map((c) => c.id));
  const validProofIds = new Set((proofPoints ?? []).map((p) => p.id));

  for (const link of result.proof_point_links ?? []) {
    if (!validProofIds.has(link.proof_point_id)) continue;
    for (const claimId of link.claim_ids ?? []) {
      if (!validClaimIds.has(claimId)) continue;
      await db
        .from('claim_proof_points')
        .upsert({ claim_id: claimId, proof_point_id: link.proof_point_id }, { onConflict: 'claim_id,proof_point_id' });
    }
  }

  for (const candidate of result.candidate_claims ?? []) {
    if (candidate.verdict === 'new' && candidate.claim_text) {
      await db.from('claims').insert({
        title: candidate.claim_text,
        description: candidate.reason ?? null,
        status: 'candidate',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point for submission
// ---------------------------------------------------------------------------
export async function runPipeline(storyId: string): Promise<void> {
  const db = createAdminClient();

  try {
    await db.from('stories').update({ status: 'processing', pipeline_error: null }).eq('id', storyId);

    const { data: story, error: storyError } = await db.from('stories').select('*').eq('id', storyId).single();
    if (storyError || !story) throw new Error(`Story not found: ${storyError?.message}`);

    const { data: inputs } = await db
      .from('story_inputs')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at');

    await runTranscription(db, storyId, (inputs ?? []) as StoryInput[]);
    const { brief, proofPointIds } = await runIntakeBrief(db, storyId, story, (inputs ?? []) as StoryInput[]);
    await runClaimsMatching(db, storyId, brief, proofPointIds);

    await db.from('stories').update({ status: 'brief_ready', pipeline_stage: null }).eq('id', storyId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error';
    console.error(`Pipeline failed for story ${storyId}:`, err);
    await db
      .from('stories')
      .update({ status: 'submitted', pipeline_stage: null, pipeline_error: message })
      .eq('id', storyId);
  }
}

// ---------------------------------------------------------------------------
// Stage 3: SPIN question generation (on proof point confirmation / publication)
// ---------------------------------------------------------------------------
export async function generateSpinQuestions(claimId: string): Promise<number> {
  const db = createAdminClient();

  const { data: claim } = await db.from('claims').select('*').eq('id', claimId).single();
  if (!claim) throw new Error('Claim not found');

  const { data: links } = await db.from('claim_proof_points').select('proof_point_id').eq('claim_id', claimId);
  const proofIds = (links ?? []).map((l) => l.proof_point_id);
  const { data: proofPoints } = proofIds.length
    ? await db.from('proof_points').select('*, stories(client_name, commodity, location, story_type)').in('id', proofIds)
    : { data: [] as never[] };

  const storySummaries = new Map<string, string>();
  for (const pp of (proofPoints ?? []) as (ProofPoint & { stories: { client_name: string; commodity: string; location: string; story_type: StoryType } | null })[]) {
    if (pp.story_id && pp.stories) {
      storySummaries.set(
        pp.story_id,
        `${pp.stories.client_name ?? 'Unnamed client'} (${pp.stories.commodity ?? ''}, ${pp.stories.location ?? ''}), type: ${pp.stories.story_type}`
      );
    }
  }

  const { data: personas } = await db.from('personas').select('name, description');

  const payload = JSON.stringify(
    {
      claim: { title: (claim as Claim).title, description: (claim as Claim).description, so_what: (claim as Claim).so_what },
      proof_points: (proofPoints ?? []).map((p) => ({ metric: p.metric, value: p.value, unit: p.unit, confidence: p.confidence })),
      source_stories: [...storySummaries.values()],
      target_personas: personas ?? [],
    },
    null,
    2
  );

  const result = await structuredCall<{
    questions: { type: SpinType; text: string; persona: string; story_type: string }[];
  }>(SPIN_SYSTEM_PROMPT, payload, 6000);

  const storyId = storySummaries.size === 1 ? [...storySummaries.keys()][0] : null;
  const validTypes = new Set(['situation', 'problem', 'implication', 'need_payoff']);
  const validStoryTypes = new Set(['project_delivery', 'equipment_upgrade', 'testwork_study', 'plant_optimisation', 'service_partnership']);

  let inserted = 0;
  for (const q of result.questions ?? []) {
    if (!validTypes.has(q.type) || !q.text) continue;
    await db.from('spin_questions').insert({
      type: q.type,
      text: q.text,
      claim_id: claimId,
      story_id: storyId,
      story_type: validStoryTypes.has(q.story_type) ? q.story_type : null,
      personas: q.persona ? [q.persona] : [],
      product_tags: (claim as Claim).product_tags ?? [],
      approved: false,
    });
    inserted++;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Stage 4: social post ideas (on case study publication)
// ---------------------------------------------------------------------------
export async function generateSocialPosts(caseStudyId: string): Promise<number> {
  const db = createAdminClient();

  const { data: cs } = await db.from('case_studies').select('*, stories(*)').eq('id', caseStudyId).single();
  if (!cs) throw new Error('Case study not found');

  const { data: proofPoints } = cs.featured_proof_point_ids?.length
    ? await db.from('proof_points').select('metric, value, unit, confidence, approval').in('id', cs.featured_proof_point_ids)
    : { data: [] as never[] };
  const { data: quotes } = await db
    .from('client_quotes')
    .select('quote_text, speaker, approval')
    .eq('story_id', cs.story_id);

  const payload = JSON.stringify(
    {
      case_study: {
        title: cs.title,
        pullquote: cs.pullquote,
        challenge: cs.challenge,
        approach: cs.approach,
        client: cs.stories?.client_name,
        commodity: cs.stories?.commodity,
        location: cs.stories?.location,
        story_type: cs.stories?.story_type,
      },
      proof_points: proofPoints ?? [],
      client_quotes: quotes ?? [],
    },
    null,
    2
  );

  const result = await structuredCall<{
    posts: { target_role: string; draft_text: string; sources_note: string }[];
  }>(SOCIAL_SYSTEM_PROMPT, payload, 6000);

  const validRoles = new Set(['leadership', 'engineer', 'bd_sales', 'site_tech']);
  let inserted = 0;
  for (const post of result.posts ?? []) {
    if (!validRoles.has(post.target_role) || !post.draft_text) continue;
    await db.from('social_posts').insert({
      case_study_id: caseStudyId,
      target_role: post.target_role,
      draft_text: post.draft_text,
      sources_note: post.sources_note ?? null,
    });
    inserted++;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Stage 5: value proposition synthesis (on demand from the Claims Library)
// ---------------------------------------------------------------------------
export async function generateValueProps(filter?: { productTag?: string; persona?: string }): Promise<number> {
  const db = createAdminClient();

  let query = db.from('claims').select('*').in('status', ['proven', 'developing']);
  if (filter?.productTag) query = query.contains('product_tags', [filter.productTag]);
  if (filter?.persona) query = query.contains('personas', [filter.persona]);
  const { data: claims } = await query;
  if (!claims?.length) return 0;

  const claimIds = claims.map((c) => c.id);
  const { data: links } = await db.from('claim_proof_points').select('claim_id, proof_point_id').in('claim_id', claimIds);
  const proofIds = [...new Set((links ?? []).map((l) => l.proof_point_id))];
  const { data: proofPoints } = proofIds.length
    ? await db.from('proof_points').select('id, metric, value, unit, confidence').in('id', proofIds)
    : { data: [] as never[] };

  const proofByClaim = new Map<string, unknown[]>();
  for (const link of links ?? []) {
    const pp = (proofPoints ?? []).find((p) => p.id === link.proof_point_id);
    if (!pp) continue;
    proofByClaim.set(link.claim_id, [...(proofByClaim.get(link.claim_id) ?? []), pp]);
  }

  const payload = JSON.stringify(
    {
      filter: filter ?? 'all',
      claims: claims.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        status: c.status,
        personas: c.personas,
        product_tags: c.product_tags,
        proof_points: proofByClaim.get(c.id) ?? [],
      })),
    },
    null,
    2
  );

  const result = await structuredCall<{
    value_props: { text: string; personas: string[]; product_tags: string[]; claim_ids: string[] }[];
  }>(VALUE_PROP_SYSTEM_PROMPT, payload, 6000);

  const validClaimIds = new Set(claimIds);
  let inserted = 0;
  for (const vp of result.value_props ?? []) {
    if (!vp.text) continue;
    await db.from('value_props').insert({
      text: vp.text,
      personas: vp.personas ?? [],
      product_tags: vp.product_tags ?? [],
      claim_ids: (vp.claim_ids ?? []).filter((id) => validClaimIds.has(id)),
    });
    inserted++;
  }
  return inserted;
}
