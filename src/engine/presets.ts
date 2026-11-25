import type { DecisionModeMeta, DilemmaPreset } from './types';

export const DECISION_MODES: DecisionModeMeta[] = [
  {
    id: 'instant',
    name: 'Instant Verdict',
    shortName: 'Instant',
    code: '01',
    tagline: 'Zero-hesitation single call',
    description: 'Deterministic tie-break with a direct call and runner-up dismissal.',
  },
  {
    id: 'tournament',
    name: 'Weighted Coin & Elimination',
    shortName: 'Tournament',
    code: '02',
    tagline: 'Best-of-3 weighted bracket',
    description: 'Pairs your options in head-to-head weighted coin rounds until one survives.',
  },
  {
    id: 'regret',
    name: '2-Minute Regret Minimizer',
    shortName: 'Regret Min',
    code: '03',
    tagline: 'Lowest 48-hour regret floor',
    description: 'Scores reversibility, friction, and upside to lock in the safest bet.',
  },
  {
    id: 'procon',
    name: 'Pro/Con Tiebreaker',
    shortName: 'Pro / Con',
    code: '04',
    tagline: 'Net weighted score + tie delta',
    description: 'Tallies your pros, cons, and priority weight—then transparently breaks ties.',
  },
  {
    id: 'oracle',
    name: 'Deadpan Oracle',
    shortName: 'Oracle',
    code: '05',
    tagline: 'Dry, decisive anti-paralysis',
    description: 'Cuts through overthinking with deadpan certainty and blunt tie-break stats.',
  },
];

export const DILEMMA_PRESETS: DilemmaPreset[] = [
  {
    id: 'lunch',
    label: 'Lunch',
    prompt: 'What should I eat for lunch right now?',
    recommendedMode: 'tournament',
    options: [
      {
        label: 'Spicy tonkotsu ramen',
        weight: 4,
        pros: ['Warm & deeply satisfying', 'Zero menu regret'],
        cons: ['Possible 3pm food coma'],
      },
      {
        label: 'Street tacos (al pastor)',
        weight: 4,
        pros: ['Fast turnaround', 'High flavor per dollar'],
        cons: ['Messy at a desk'],
      },
      {
        label: 'Crisp salmon poke bowl',
        weight: 3,
        pros: ['Steady afternoon energy', 'Fresh ingredients'],
        cons: ['Pricier than usual'],
      },
      {
        label: 'Double smashburger',
        weight: 3,
        pros: ['Immediate dopamine', 'Crispy edges'],
        cons: ['Heavy before meetings'],
      },
    ],
  },
  {
    id: 'weekend',
    label: 'Weekend',
    prompt: 'How should I spend Saturday afternoon?',
    recommendedMode: 'regret',
    options: [
      {
        label: 'Coastal coffee drive',
        weight: 4,
        pros: ['Fresh air & reset', 'Good playlist excuse'],
        cons: ['Parking roulette'],
      },
      {
        label: 'Stay in & recharge guilt-free',
        weight: 3,
        pros: ['Zero commute', 'Real rest'],
        cons: ['Might feel stuck indoors'],
      },
      {
        label: 'Bookshop + thrift crawl',
        weight: 4,
        pros: ['Low cost', 'Unexpected finds'],
        cons: ['Crowded after 2pm'],
      },
      {
        label: 'Finally fix that wobbly shelf',
        weight: 2,
        pros: ['Permanent relief', 'Done in 40 minutes'],
        cons: ['Requires finding the drill'],
      },
    ],
  },
  {
    id: 'side-project',
    label: 'Side Project',
    prompt: 'Next 2-hour block on my side project?',
    recommendedMode: 'procon',
    options: [
      {
        label: 'Ship the ugly MVP tonight',
        weight: 5,
        pros: ['Real user feedback', 'Breaks perfection loop'],
        cons: ['Rough edges visible'],
      },
      {
        label: 'Refactor the messy core module',
        weight: 3,
        pros: ['Cleaner velocity later'],
        cons: ['Zero visible progress today', 'Easy rabbit hole'],
      },
      {
        label: 'Write crisp README + launch post',
        weight: 4,
        pros: ['Forces clarity', 'Immediately shareable'],
        cons: ['Less fun than coding'],
      },
    ],
  },
  {
    id: 'watch',
    label: 'Watch Tonight',
    prompt: 'What goes on screen tonight?',
    recommendedMode: 'oracle',
    options: [
      {
        label: 'Tight 95-minute thriller',
        weight: 4,
        pros: ['Finishes before midnight', 'High pacing'],
        cons: ['Requires phone down'],
      },
      {
        label: 'Rewatch a comfort classic',
        weight: 3,
        pros: ['Guaranteed hit rate', 'Zero cognitive load'],
        cons: ['Nothing new'],
      },
      {
        label: 'Start a prestige sci-fi pilot',
        weight: 4,
        pros: ['Big worldbuilding'],
        cons: ['10-episode commitment trap'],
      },
      {
        label: 'Oddly specific documentary',
        weight: 3,
        pros: ['Weird trivia acquired'],
        cons: ['Hit-or-miss pacing'],
      },
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee Run',
    prompt: 'Mid-afternoon caffeine call?',
    recommendedMode: 'instant',
    options: [
      {
        label: 'Iced oat cortado',
        weight: 4,
        pros: ['Balanced kick', 'Fast sip'],
        cons: ['Gone in 4 minutes'],
      },
      {
        label: 'Plain black pour-over',
        weight: 3,
        pros: ['Clean focus', 'No sugar crash'],
        cons: ['Takes 5 minutes to brew'],
      },
      {
        label: 'Skip caffeine & drink cold water',
        weight: 3,
        pros: ['Better sleep tonight', 'Free'],
        cons: ['Less ceremonial joy'],
      },
    ],
  },
];
