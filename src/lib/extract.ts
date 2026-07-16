// Server-side text extraction for dropped files. "Drop anything": PDFs, Word,
// Excel, images, audio, email exports, pasted text. Unknown types are stored
// anyway and flagged rather than rejected.

export interface ExtractionResult {
  text: string | null;
  note?: string;
}

export function isAudio(mime: string, name: string): boolean {
  return mime.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i.test(name);
}

export function isImage(mime: string, name: string): boolean {
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name);
}

export async function extractText(buffer: Buffer, mime: string, fileName: string): Promise<ExtractionResult> {
  const lower = fileName.toLowerCase();
  try {
    if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
      // Import the lib file directly: pdf-parse's index runs debug code when
      // it thinks it's the entry module.
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
      const result = await pdfParse(buffer);
      return { text: result.text?.trim() || null };
    }

    if (lower.endsWith('.docx') || mime.includes('officedocument.wordprocessingml')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value?.trim() || null };
    }

    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || mime.includes('spreadsheetml') || mime === 'text/csv') {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const parts: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
        if (csv.trim()) parts.push(`## Sheet: ${sheetName}\n${csv}`);
      }
      return { text: parts.join('\n\n') || null };
    }

    if (lower.endsWith('.eml') || mime === 'message/rfc822') {
      // Light-touch .eml handling: keep headers of interest and the text body.
      const raw = buffer.toString('utf-8');
      const headerMatch = raw.match(/^(?:From|To|Subject|Date):.*$/gm)?.join('\n') ?? '';
      const body = raw
        .split(/\r?\n\r?\n/)
        .slice(1)
        .join('\n\n')
        .replace(/=\r?\n/g, '') // quoted-printable soft breaks
        .replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      return { text: `${headerMatch}\n\n${body}`.trim() || null };
    }

    if (mime.startsWith('text/') || /\.(txt|md|json|log)$/i.test(lower)) {
      return { text: buffer.toString('utf-8').trim() || null };
    }

    if (isImage(mime, lower)) {
      // Images go to the Stage 1 model as vision blocks; nothing to extract here.
      return { text: null, note: 'image' };
    }

    if (isAudio(mime, lower)) {
      return { text: null, note: 'audio' };
    }

    if (lower.endsWith('.msg')) {
      return { text: null, note: 'Outlook .msg stored; needs manual review or conversion to .eml' };
    }

    return { text: null, note: `No extractor for ${mime || 'unknown type'}; file stored for manual review` };
  } catch (err) {
    return { text: null, note: `Extraction failed: ${err instanceof Error ? err.message : 'unknown error'}` };
  }
}
