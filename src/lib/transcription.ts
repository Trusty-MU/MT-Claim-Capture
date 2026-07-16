// Stage 0: transcription. Provider is pluggable via TRANSCRIPTION_PROVIDER.
// Claude models do not accept audio, so this uses a dedicated speech-to-text
// service. With no provider configured, voice notes are stored untranscribed
// and flagged so typed answers and documents still flow through the pipeline.

export interface TranscriptionResult {
  status: 'done' | 'skipped' | 'failed';
  text: string | null;
  error?: string;
}

export async function transcribeAudio(buffer: Buffer, fileName: string, mime: string): Promise<TranscriptionResult> {
  const provider = process.env.TRANSCRIPTION_PROVIDER?.toLowerCase();

  if (provider === 'openai') {
    return transcribeWithWhisper(buffer, fileName, mime);
  }

  return {
    status: 'skipped',
    text: null,
    error: 'No transcription provider configured (set TRANSCRIPTION_PROVIDER=openai and OPENAI_API_KEY).',
  };
}

async function transcribeWithWhisper(buffer: Buffer, fileName: string, mime: string): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { status: 'failed', text: null, error: 'OPENAI_API_KEY not set' };

  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mime || 'audio/webm' }), fileName || 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('language', 'en');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text();
      return { status: 'failed', text: null, error: `Whisper API ${res.status}: ${detail.slice(0, 300)}` };
    }

    const json = (await res.json()) as { text?: string };
    return { status: 'done', text: json.text?.trim() || '' };
  } catch (err) {
    return { status: 'failed', text: null, error: err instanceof Error ? err.message : 'unknown error' };
  }
}
