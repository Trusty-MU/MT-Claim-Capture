import type { StoryType } from './types';

export interface CaptureQuestion {
  number: number;
  section: 'A' | 'B' | 'C' | 'D';
  sectionTitle: string;
  text: string;
  hint?: string;
  storyTypes?: StoryType[]; // undefined = all types
}

// The fourteen capture questions. Question text is the on-screen copy.
export const CAPTURE_QUESTIONS: CaptureQuestion[] = [
  {
    number: 1,
    section: 'A',
    sectionTitle: 'The Basics',
    text: "Who was the client, what's the commodity, and where is the site? And in a sentence, what did MT provide?",
  },
  {
    number: 2,
    section: 'A',
    sectionTitle: 'The Basics',
    text: 'Rough dates: when did this start, and when was it delivered or finished?',
  },
  {
    number: 3,
    section: 'A',
    sectionTitle: 'The Basics',
    text: 'Where does it stand today? Running, ramping up, ongoing?',
  },
  {
    number: 4,
    section: 'B',
    sectionTitle: 'The Story',
    text: 'What problem was the client actually trying to solve? What was at stake for them?',
  },
  {
    number: 5,
    section: 'B',
    sectionTitle: 'The Story',
    text: "What would the conventional answer have been, and why wouldn't it have worked here?",
  },
  {
    number: 6,
    section: 'B',
    sectionTitle: 'The Story',
    text: 'What did MT do differently? Specific decisions, not philosophy.',
  },
  {
    number: 7,
    section: 'B',
    sectionTitle: 'The Story',
    text: 'Was there a turning point? A moment it nearly went wrong or the client tested us?',
  },
  {
    number: 8,
    section: 'C',
    sectionTitle: 'The Numbers',
    text: 'How long did it take, start to finish? How does that compare to what the client expected or others quoted?',
    hint: 'Say "don\'t know, ask [name]" wherever that\'s honest.',
  },
  {
    number: 9,
    section: 'C',
    sectionTitle: 'The Numbers',
    text: 'What moved? Recovery, grade, throughput, availability: before and after.',
    hint: 'Say "don\'t know, ask [name]" wherever that\'s honest.',
    storyTypes: ['equipment_upgrade', 'plant_optimisation', 'testwork_study'],
  },
  {
    number: 10,
    section: 'C',
    sectionTitle: 'The Numbers',
    text: "What did it do to the client's money? IRR, payback, cost per tonne, downtime avoided?",
    hint: 'Say "don\'t know, ask [name]" wherever that\'s honest.',
  },
  {
    number: 11,
    section: 'C',
    sectionTitle: 'The Numbers',
    text: 'Were we on time and on budget? What was the variance and why?',
    hint: 'Say "don\'t know, ask [name]" wherever that\'s honest.',
    storyTypes: ['project_delivery', 'equipment_upgrade'],
  },
  {
    number: 12,
    section: 'C',
    sectionTitle: 'The Numbers',
    text: 'Who else did they talk to before choosing MT? Any repeat orders or follow-on work since?',
  },
  {
    number: 13,
    section: 'D',
    sectionTitle: "The Client's Voice",
    text: "Best thing anyone at the client said about this? Who said it, where? Who'd give us a quote?",
  },
  {
    number: 14,
    section: 'D',
    sectionTitle: "The Client's Voice",
    text: 'What can we say publicly? Can we name them? Any numbers they\'d consider sensitive?',
  },
];

export function questionsForType(storyType: StoryType): CaptureQuestion[] {
  return CAPTURE_QUESTIONS.filter((q) => !q.storyTypes || q.storyTypes.includes(storyType));
}
