import type { Metadata, Viewport } from 'next';
import { Albert_Sans } from 'next/font/google';
import './globals.css';

const albertSans = Albert_Sans({
  subsets: ['latin'],
  variable: '--mt-font',
  weight: ['400', '500', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MT Proof Engine',
  description: 'Capture client wins. Build the proof library. Mineral Technologies.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#262626',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={albertSans.variable}>
      <body>{children}</body>
    </html>
  );
}
