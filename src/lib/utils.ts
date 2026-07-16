import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Tailwind classes for the MT secondary palette, keyed by palette name.
// Tailwind needs literal class names, hence the lookup table.
export const PALETTE_BG: Record<string, string> = {
  ocean: 'bg-mt-ocean',
  coast: 'bg-mt-coast',
  coral: 'bg-mt-coral',
  gold: 'bg-mt-gold',
  sun: 'bg-mt-sun',
  'red-earth': 'bg-mt-red-earth',
};

export const PALETTE_TEXT: Record<string, string> = {
  ocean: 'text-mt-ocean',
  coast: 'text-mt-coast',
  coral: 'text-mt-coral',
  gold: 'text-mt-gold',
  sun: 'text-mt-sun',
  'red-earth': 'text-mt-red-earth',
};

// Dark palette colours need white text; light ones black sand.
export const PALETTE_FG_ON: Record<string, string> = {
  ocean: 'text-mt-black-sand',
  coast: 'text-mt-black-sand',
  coral: 'text-mt-black-sand',
  gold: 'text-white',
  sun: 'text-mt-black-sand',
  'red-earth': 'text-white',
};
