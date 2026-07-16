'use client';

// "Drop anything that has the numbers." One drop zone, any file type,
// no file-type lectures.

import { useRef, useState } from 'react';

interface UploadItem {
  name: string;
  status: 'uploading' | 'done' | 'failed';
}

export function FileDrop({ storyId, onUploaded }: { storyId: string; onUploaded?: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    for (const file of list) {
      setItems((prev) => [...prev, { name: file.name, status: 'uploading' }]);
      const form = new FormData();
      form.append('kind', 'file');
      form.append('file', file);
      try {
        const res = await fetch(`/api/stories/${storyId}/inputs`, { method: 'POST', body: form });
        setItems((prev) =>
          prev.map((i) => (i.name === file.name && i.status === 'uploading' ? { ...i, status: res.ok ? 'done' : 'failed' } : i))
        );
        if (res.ok) onUploaded?.();
      } catch {
        setItems((prev) =>
          prev.map((i) => (i.name === file.name && i.status === 'uploading' ? { ...i, status: 'failed' } : i))
        );
      }
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border-4 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-mt-red-ore bg-mt-coral/30' : 'border-mt-dust bg-mt-sand/40'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10 fill-mt-black-sand/60">
          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4a7.48 7.48 0 0 0-6.64 4.04A6 6 0 0 0 6 20h13a5 5 0 0 0 .35-9.96zM13 13v4h-2v-4H8l4-4 4 4h-3z" />
        </svg>
        <p className="font-bold">Drop anything that has the numbers</p>
        <p className="text-sm text-mt-black-sand/60">Reports, schedules, emails, spreadsheets, photos. Or tap to choose.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {items.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-2 border-b border-mt-sand py-1.5">
              <span className="truncate">{item.name}</span>
              <span className={`shrink-0 text-xs font-bold uppercase tracking-[0.08em] ${
                item.status === 'done' ? 'text-mt-coast' : item.status === 'failed' ? 'text-mt-red-ore' : 'text-mt-dust'
              }`}>
                {item.status === 'uploading' ? 'Uploading…' : item.status === 'done' ? 'Uploaded' : 'Failed'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
