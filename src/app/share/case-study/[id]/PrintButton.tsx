'use client';

import { useEffect } from 'react';

export function PrintButton({ autoPrint }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (autoPrint) window.print();
  }, [autoPrint]);

  return (
    <button type="button" className="mt-btn px-4 py-2 text-sm" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
