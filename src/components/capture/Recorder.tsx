'use client';

// Voice-first capture: tap to record, tap to stop, re-record option.
// Waveform animation while recording so people trust it's working.

import { useEffect, useRef, useState } from 'react';

type RecorderState = 'idle' | 'recording' | 'recorded' | 'saving' | 'saved' | 'error';

export function Recorder({
  onSave,
  savedLabel,
}: {
  onSave: (blob: Blob) => Promise<void>;
  savedLabel?: string;
}) {
  const [state, setState] = useState<RecorderState>(savedLabel ? 'saved' : 'idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      audioCtx.current?.close().catch(() => {});
    };
  }, []);

  function drawWaveform() {
    const canvas = canvasRef.current;
    const node = analyser.current;
    if (!canvas || !node) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = new Uint8Array(node.frequencyBinCount);
    node.getByteFrequencyData(data);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 32;
    const step = Math.floor(data.length / bars);
    const barWidth = canvas.width / bars - 3;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const h = Math.max(4, v * canvas.height);
      ctx.fillStyle = '#ff473b';
      ctx.fillRect(i * (barWidth + 3), (canvas.height - h) / 2, barWidth, h);
    }
    rafRef.current = requestAnimationFrame(drawWaveform);
  }

  async function startRecording() {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;

      audioCtx.current = new AudioContext();
      const source = audioCtx.current.createMediaStreamSource(mediaStream);
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const recorded = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' });
        setBlob(recorded);
        setState('recorded');
      };
      recorder.start();
      mediaRecorder.current = recorder;

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState('recording');
      drawWaveform();
    } catch {
      setError("We couldn't reach your microphone. Check permissions, or type instead.");
      setState('error');
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  }

  async function save() {
    if (!blob) return;
    setState('saving');
    try {
      await onSave(blob);
      setState('saved');
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
      setState('recorded');
    }
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  if (state === 'saved') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-mt-coast">
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-mt-black-sand"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
        </div>
        <p className="text-sm font-bold">{savedLabel ?? 'Got it.'}</p>
        <button type="button" className="text-sm font-bold text-mt-red-ore underline" onClick={() => { setBlob(null); setState('idle'); }}>
          Record again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {state === 'recording' && (
        <canvas ref={canvasRef} width={280} height={56} className="h-14 w-[280px]" aria-hidden />
      )}

      {state === 'idle' || state === 'error' ? (
        <button
          type="button"
          onClick={startRecording}
          className="flex h-32 w-32 items-center justify-center rounded-full bg-mt-red-ore transition-transform active:scale-95"
          aria-label="Tap to record"
        >
          <svg viewBox="0 0 24 24" className="h-14 w-14 fill-white">
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
          </svg>
        </button>
      ) : state === 'recording' ? (
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-32 w-32 animate-pulse items-center justify-center rounded-full bg-mt-black-sand"
          aria-label="Tap to stop"
        >
          <span className="block h-10 w-10 bg-white" />
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {blob && <audio controls src={URL.createObjectURL(blob)} className="w-[280px]" />}
          <div className="flex gap-3">
            <button type="button" className="mt-btn-red" onClick={save} disabled={state === 'saving'}>
              {state === 'saving' ? 'Saving…' : 'Use this'}
            </button>
            <button type="button" className="mt-btn-ghost" onClick={() => { setBlob(null); setState('idle'); }}>
              Re-record
            </button>
          </div>
        </div>
      )}

      {state === 'recording' && <p className="font-mono text-sm font-bold">{mmss}</p>}
      {state === 'idle' && <p className="text-sm text-mt-black-sand/60">Tap to record. Tap again to stop.</p>}
      {error && <p className="max-w-xs text-center text-sm font-bold text-mt-red-ore">{error}</p>}
    </div>
  );
}
