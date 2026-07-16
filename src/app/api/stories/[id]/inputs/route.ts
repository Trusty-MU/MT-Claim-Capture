import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractText, isAudio } from '@/lib/extract';

export const maxDuration = 60;

// Save one capture input: a voice note, a dropped file, or typed text.
// Multipart form: kind, question_number?, text?, file?
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = await params;
  const supabase = await createClient();

  // RLS-scoped ownership check
  const { data: story } = await supabase.from('stories').select('id, status').eq('id', storyId).single();
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  const form = await request.formData();
  const kind = String(form.get('kind') ?? '');
  const questionRaw = form.get('question_number');
  const questionNumber = questionRaw != null && questionRaw !== '' ? Number(questionRaw) : null;

  if (!['voice', 'file', 'text'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (kind === 'text') {
    const text = String(form.get('text') ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Empty text' }, { status: 400 });
    const { data, error } = await admin
      .from('story_inputs')
      .insert({ story_id: storyId, kind: 'text', transcript_or_text: text, question_number: questionNumber })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ input: data });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || (kind === 'voice' ? 'voice-note.webm' : 'upload')).replace(/[^\w.\- ]+/g, '_');
  const bucket = kind === 'voice' ? 'voice-notes' : 'story-files';
  const path = `${storyId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  let transcript: string | null = null;
  let transcriptionStatus: string | null = null;

  if (kind === 'voice' || isAudio(file.type ?? '', safeName)) {
    // Transcription runs in the pipeline (Stage 0); mark it pending.
    transcriptionStatus = 'pending';
  } else {
    const extraction = await extractText(buffer, file.type ?? '', safeName);
    transcript = extraction.text;
  }

  const { data, error } = await admin
    .from('story_inputs')
    .insert({
      story_id: storyId,
      kind,
      storage_path: path,
      file_name: safeName,
      mime_type: file.type || null,
      transcript_or_text: transcript,
      transcription_status: transcriptionStatus,
      question_number: questionNumber,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ input: data });
}

// Re-record / remove an input.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = await params;
  const supabase = await createClient();

  const { data: story } = await supabase.from('stories').select('id').eq('id', storyId).single();
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  const inputId = new URL(request.url).searchParams.get('inputId');
  if (!inputId) return NextResponse.json({ error: 'inputId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: input } = await admin
    .from('story_inputs')
    .select('id, kind, storage_path')
    .eq('id', inputId)
    .eq('story_id', storyId)
    .single();
  if (!input) return NextResponse.json({ error: 'Input not found' }, { status: 404 });

  if (input.storage_path) {
    const bucket = input.kind === 'voice' ? 'voice-notes' : 'story-files';
    await admin.storage.from(bucket).remove([input.storage_path]);
  }
  await admin.from('story_inputs').delete().eq('id', inputId);

  return NextResponse.json({ ok: true });
}
