export type DecisionModeId =
  | 'instant'
  | 'tournament'
  | 'regret'
  | 'procon'
  | 'oracle';

export interface DecisionModeMeta {
  id: DecisionModeId;
  name: string;
  shortName: string;
  code: string;
  tagline: string;
  description: string;
}

export interface OptionItem {
  id: string;
  label: string;
  weight: number; // 1..5, default 3
  pros: string[];
  cons: string[];
}

export interface DilemmaPreset {
  id: string;
  label: string;
  prompt: string;
  recommendedMode: DecisionModeId;
  options: Array<{
    label: string;
    weight?: number;
    pros?: string[];
    cons?: string[];
  }>;
}

export interface TournamentMatch {
  round: number;
  roundLabel: string;
  optionA: string;
  optionB: string;
  flips: Array<'A' | 'B'>;
  winner: string;
  loser: string;
  bye?: boolean;
}

export interface RegretScore {
  optionId: string;
  label: string;
  reversibility: number; // 0..100
  lowFriction: number; // 0..100
  upside: number; // 0..100
  regretFloor: number; // 0..100 (higher = safer / less regret)
  composite: number; // 0..100
}

export interface ProConScore {
  optionId: string;
  label: string;
  prosCount: number;
  consCount: number;
  weightBonus: number;
  netScore: number;
  tieBreakerApplied: boolean;
  inferredNote?: string;
}

export interface TieBreakStat {
  label: string;
  value: string;
}

export interface DecisionVerdict {
  id: string;
  createdAt: string;
  prompt: string;
  mode: DecisionModeId;
  modeName: string;
  seed: number;
  winner: OptionItem;
  runnerUp: OptionItem | null;
  allOptions: OptionItem[];
  headline: string;
  rationale: string;
  runnerUpNote: string;
  confidencePct: number;
  timeSavedMinutes: number;
  stats: TieBreakStat[];
  tournamentMatches?: TournamentMatch[];
  regretScores?: RegretScore[];
  proConScores?: ProConScore[];
  aiEnhanced?: boolean;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  prompt: string;
  mode: DecisionModeId;
  modeName: string;
  winnerLabel: string;
  runnerUpLabel: string | null;
  optionLabels: string[];
  rationale: string;
  confidencePct: number;
  timeSavedMinutes: number;
  gutCheckOverridden?: boolean;
}

export interface StreakStats {
  totalDecisions: number;
  currentStreakDays: number;
  minutesSaved: number;
  gutCheckOverrides: number;
}
