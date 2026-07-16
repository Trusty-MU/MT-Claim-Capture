import type { Config } from 'tailwindcss';

/**
 * Mineral Technologies brand tokens. See spec section 9.
 * Sand/White dominant, Black Sand anchors, Red Ore punctuates sparingly.
 * Secondary palette is for story-type / product-tag colour coding only.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'mt-black-sand': '#262626',
        'mt-red-ore': '#ff473b',
        'mt-dust': '#c2a68f',
        'mt-sand': '#d6c7ba',
        'mt-white': '#ffffff',
        'mt-ocean': '#75bed5',
        'mt-coast': '#46c1a5',
        'mt-coral': '#ebb6a4',
        'mt-gold': '#a8702e',
        'mt-sun': '#f9b618',
        'mt-red-earth': '#973727',
      },
      fontFamily: {
        sans: ['var(--mt-font)'],
      },
      borderRadius: {
        // single rounded corner for photos (bottom-right), consistent per screen
        photo: '2.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
