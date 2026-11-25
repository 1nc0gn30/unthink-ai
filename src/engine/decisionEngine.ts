import { DECISION_MODES } from './presets';
import type {
  DecisionModeId,
  DecisionVerdict,
  HistoryEntry,
  OptionItem,
  ProConScore,
  RegretScore,
  StreakStats,
  TieBreakStat,
  TournamentMatch,
} from './types';

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** Fast, deterministic FNV-1a 32-bit string hash */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic Mulberry32 PRNG returning [0, 1) */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeOptions(options: OptionItem[]): OptionItem[] {
  return options
    .map((opt, idx) => ({
      id: opt.id || `opt-${idx + 1}`,
      label: opt.label.trim(),
      weight: Math.min(5, Math.max(1, Math.round(Number(opt.weight) || 3))),
      pros: (opt.pros || []).map((s) => s.trim()).filter(Boolean),
      cons: (opt.cons || []).map((s) => s.trim()).filter(Boolean),
    }))
    .filter((opt) => opt.label.length > 0)
    .slice(0, MAX_OPTIONS);
}

function getModeName(mode: DecisionModeId): string {
  return DECISION_MODES.find((m) => m.id === mode)?.name ?? 'Instant Verdict';
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function pickFrom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function estimateMinutesSaved(optionCount: number, mode: DecisionModeId): number {
  const base = 4 + optionCount * 3;
  const bonus = mode === 'procon' || mode === 'regret' ? 4 : 2;
  return base + bonus;
}

/** Keyword heuristics for 2-Minute Regret Minimizer (fast, local, explainable) */
const LOW_FRICTION_WORDS =
  /\b(walk|water|nap|stay|quick|fast|simple|classic|short|ship|now|tacos|cortado|tea|stretch|read)\b/i;
const HIGH_UPSIDE_WORDS =
  /\b(ship|launch|build|drive|coast|ramen|new|explore|learn|create|write|fix|workout|cook|run)\b/i;
const REVERSIBLE_WORDS =
  /\b(try|test|pilot|draft|coffee|lunch|watch|rewatch|drive|browse|sketch|skip|wait)\b/i;
const HEAVY_COMMIT_WORDS =
  /\b(buy|subscribe|lease|refactor|rewrite|marry|quit|10-episode|all-nighter|expensive)\b/i;

function scoreRegretOption(option: OptionItem, rng: () => number): RegretScore {
  const text = `${option.label} ${option.pros.join(' ')} ${option.cons.join(' ')}`;
  const jitter = () => Math.round((rng() - 0.5) * 14);

  let reversibility = 68 + option.weight * 3 + jitter();
  if (REVERSIBLE_WORDS.test(text)) reversibility += 12;
  if (HEAVY_COMMIT_WORDS.test(text)) reversibility -= 16;

  let lowFriction = 62 + option.weight * 3 + option.pros.length * 4 - option.cons.length * 5 + jitter();
  if (LOW_FRICTION_WORDS.test(text)) lowFriction += 14;
  if (HEAVY_COMMIT_WORDS.test(text)) lowFriction -= 10;

  let upside = 60 + option.weight * 6 + option.pros.length * 5 - option.cons.length * 2 + jitter();
  if (HIGH_UPSIDE_WORDS.test(text)) upside += 12;

  reversibility = clamp(reversibility, 28, 98);
  lowFriction = clamp(lowFriction, 25, 98);
  upside = clamp(upside, 30, 99);

  // Regret floor weights reversibility + low friction heavily for trivial choices
  const regretFloor = Math.round(reversibility * 0.45 + lowFriction * 0.35 + upside * 0.2);
  const composite = Math.round(regretFloor * 0.65 + upside * 0.35);

  return {
    optionId: option.id,
    label: option.label,
    reversibility,
    lowFriction,
    upside,
    regretFloor,
    composite,
  };
}

function runTournament(options: OptionItem[], rng: () => number): {
  winner: OptionItem;
  runnerUp: OptionItem;
  matches: TournamentMatch[];
} {
  // Shuffle seed order deterministically using Fisher-Yates
  let contenders = [...options];
  for (let i = contenders.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [contenders[i], contenders[j]] = [contenders[j], contenders[i]];
  }

  const matches: TournamentMatch[] = [];
  let roundNum = 1;
  let lastLoser: OptionItem = contenders[1] ?? contenders[0];

  while (contenders.length > 1) {
    const nextRound: OptionItem[] = [];
    const totalMatches = Math.ceil(contenders.length / 2);
    const roundLabel =
      contenders.length === 2
        ? 'Final'
        : contenders.length <= 4
          ? 'Semifinal'
          : `Round ${roundNum}`;

    for (let i = 0; i < contenders.length; i += 2) {
      const a = contenders[i];
      const b = contenders[i + 1];

      if (!b) {
        nextRound.push(a);
        matches.push({
          round: roundNum,
          roundLabel,
          optionA: a.label,
          optionB: 'BYE',
          flips: [],
          winner: a.label,
          loser: '—',
          bye: true,
        });
        continue;
      }

      // Best-of-3 weighted coin flips
      const probA = a.weight / (a.weight + b.weight);
      const flips: Array<'A' | 'B'> = [];
      let winsA = 0;
      let winsB = 0;

      while (winsA < 2 && winsB < 2) {
        const hitA = rng() < probA;
        if (hitA) {
          winsA += 1;
          flips.push('A');
        } else {
          winsB += 1;
          flips.push('B');
        }
      }

      const matchWinner = winsA > winsB ? a : b;
      const matchLoser = winsA > winsB ? b : a;
      nextRound.push(matchWinner);
      if (totalMatches === 1) {
        lastLoser = matchLoser;
      }

      matches.push({
        round: roundNum,
        roundLabel,
        optionA: a.label,
        optionB: b.label,
        flips,
        winner: matchWinner.label,
        loser: matchLoser.label,
      });
    }

    contenders = nextRound;
    roundNum += 1;
  }

  return {
    winner: contenders[0],
    runnerUp: lastLoser,
    matches,
  };
}

function runProCon(options: OptionItem[], rng: () => number): {
  winner: OptionItem;
  runnerUp: OptionItem;
  scores: ProConScore[];
  tieBroken: boolean;
} {
  const scored = options.map((opt) => {
    const hasExplicit = opt.pros.length > 0 || opt.cons.length > 0;
    const prosCount = opt.pros.length;
    const consCount = opt.cons.length;
    // Priority weight centered on 3 adds -2..+2 nudge
    const weightBonus = (opt.weight - 3) * 0.5;
    const baseScore = prosCount * 2 - consCount * 1.5 + weightBonus;
    const tieMicro = rng() * 0.01; // Deterministic tie-break jitter only used on exact ties

    const score: ProConScore = {
      optionId: opt.id,
      label: opt.label,
      prosCount,
      consCount,
      weightBonus,
      netScore: Math.round(baseScore * 10) / 10,
      tieBreakerApplied: false,
      inferredNote: hasExplicit
        ? undefined
        : `No pros/cons listed — scored on priority weight (${opt.weight}/5)`,
    };

    return {
      option: opt,
      score,
      sortKey: baseScore + tieMicro,
    };
  });

  scored.sort((a, b) => b.sortKey - a.sortKey);

  const top = scored[0];
  const second = scored[1];
  const tieBroken = Boolean(second && top.score.netScore === second.score.netScore);

  if (tieBroken) {
    top.score.tieBreakerApplied = true;
  }

  return {
    winner: top.option,
    runnerUp: second.option,
    scores: scored.map((s) => s.score),
    tieBroken,
  };
}

const INSTANT_RATIONALES = [
  (w: string, r: string) =>
    `${w} clears the bar with less friction than ${r}. Lock it in now and reclaim the mental tab.`,
  (w: string, r: string) =>
    `You already know ${w} beats staring at ${r} for another ten minutes. Commit and move.`,
  (w: string, r: string) =>
    `${w} edges out ${r} on pure momentum. Trivial choices reward speed, not committee meetings.`,
  (w: string, r: string) =>
    `Pick ${w}. ${r} stays on the bench for next time—you lose nothing by deciding right now.`,
];

const ORACLE_HEADLINES = [
  (w: string) => `${w}. Case closed.`,
  (w: string) => `It is ${w}. Stop negotiating.`,
  (w: string) => `${w}. Do not open another tab.`,
  (w: string) => `Verdict: ${w}. Move along.`,
];

const ORACLE_RATIONALES = [
  (w: string, r: string) =>
    `You have spent enough calories debating ${w} versus ${r} to power a small desk lamp. Go with ${w}.`,
  (w: string, r: string) =>
    `${r} is a lovely theoretical option for a version of you who enjoys indecision. Today belongs to ${w}.`,
  (w: string, r: string) =>
    `Statistically speaking, you will forget this dilemma by Thursday. ${w} gets you there faster than ${r}.`,
  (w: string, r: string) =>
    `If you just winced reading "${w}", congratulations—you secretly wanted ${r}. Otherwise, obey the coin.`,
];

export interface DecideParams {
  prompt?: string;
  options: OptionItem[];
  mode: DecisionModeId;
  /** Optional explicit seed for deterministic reproducibility; omit or increment to re-roll */
  seed?: number;
}

export function decideDilemma(params: DecideParams): DecisionVerdict {
  const cleanOptions = normalizeOptions(params.options);
  if (cleanOptions.length < MIN_OPTIONS) {
    throw new Error(`Enter at least ${MIN_OPTIONS} non-empty options to decide.`);
  }

  const prompt = (params.prompt ?? '').trim();
  const mode = params.mode;
  const modeName = getModeName(mode);

  const fingerprint = JSON.stringify({
    prompt,
    mode,
    options: cleanOptions.map((o) => ({
      l: o.label,
      w: o.weight,
      p: o.pros,
      c: o.cons,
    })),
  });
  const seed = typeof params.seed === 'number' ? params.seed >>> 0 : hashString(fingerprint);
  const rng = createPrng(seed);

  let winner = cleanOptions[0];
  let runnerUp: OptionItem | null = cleanOptions[1] ?? null;
  let headline = winner.label;
  let rationale = '';
  let runnerUpNote = '';
  let confidencePct = 82;
  let stats: TieBreakStat[] = [];
  let tournamentMatches: TournamentMatch[] | undefined;
  let regretScores: RegretScore[] | undefined;
  let proConScores: ProConScore[] | undefined;

  if (mode === 'tournament') {
    const tourney = runTournament(cleanOptions, rng);
    winner = tourney.winner;
    runnerUp = tourney.runnerUp;
    tournamentMatches = tourney.matches;

    const totalFlips = tourney.matches.reduce((acc, m) => acc + m.flips.length, 0);
    const finalMatch = tourney.matches[tourney.matches.length - 1];
    const finalA = finalMatch.flips.filter((f) => f === 'A').length;
    const finalB = finalMatch.flips.filter((f) => f === 'B').length;
    const scoreStr = `${Math.max(finalA, finalB)}-${Math.min(finalA, finalB)}`;

    headline = winner.label;
    rationale = `${winner.label} survived ${tourney.matches.filter((m) => !m.bye).length} head-to-head match${
      tourney.matches.filter((m) => !m.bye).length === 1 ? '' : 'es'
    }, taking the final against ${runnerUp.label} (${scoreStr}) on weighted best-of-3 flips.`;
    runnerUpNote = `${runnerUp.label} reached the final before dropping the deciding toss.`;
    confidencePct = clamp(74 + winner.weight * 4 + (finalA === 0 || finalB === 0 ? 6 : 0), 72, 96);
    stats = [
      { label: 'Final Score', value: scoreStr },
      { label: 'Total Flips', value: `${totalFlips}` },
      { label: 'Winner Weight', value: `${winner.weight}/5` },
      { label: 'Seed', value: `#${(seed % 9999).toString().padStart(4, '0')}` },
    ];
  } else if (mode === 'regret') {
    const scored = cleanOptions
      .map((opt) => ({ option: opt, score: scoreRegretOption(opt, rng) }))
      .sort((a, b) => b.score.composite - a.score.composite);

    winner = scored[0].option;
    runnerUp = scored[1].option;
    regretScores = scored.map((s) => s.score);

    const topScore = scored[0].score;
    const secondScore = scored[1].score;
    const margin = Math.max(1, topScore.composite - secondScore.composite);

    headline = winner.label;
    rationale = `${winner.label} posts the highest 48-hour regret floor (${topScore.regretFloor}/100) with ${topScore.reversibility}% reversibility and ${topScore.lowFriction}% ease of execution. If it's mediocre, you're fine in 2 minutes.`;
    runnerUpNote = `${runnerUp.label} trailed by ${margin} pts (regret floor ${secondScore.regretFloor}/100).`;
    confidencePct = clamp(76 + Math.min(20, margin * 2), 75, 97);
    stats = [
      { label: 'Regret Floor', value: `${topScore.regretFloor}/100` },
      { label: 'Reversibility', value: `${topScore.reversibility}%` },
      { label: 'Low Friction', value: `${topScore.lowFriction}%` },
      { label: 'Lead Margin', value: `+${margin} pts` },
    ];
  } else if (mode === 'procon') {
    const res = runProCon(cleanOptions, rng);
    winner = res.winner;
    runnerUp = res.runnerUp;
    proConScores = res.scores;

    const topScore = res.scores[0];
    const secondScore = res.scores[1];
    const delta = Math.round((topScore.netScore - secondScore.netScore) * 10) / 10;

    headline = winner.label;
    if (res.tieBroken) {
      rationale = `${winner.label} and ${runnerUp.label} deadlocked at ${topScore.netScore >= 0 ? '+' : ''}${topScore.netScore} net pts. Deterministic tie-breaker #${(
        seed % 997
      )
        .toString()
        .padStart(3, '0')} awarded the edge to ${winner.label}.`;
    } else {
      rationale = `${winner.label} led the ledger at ${topScore.netScore >= 0 ? '+' : ''}${topScore.netScore} pts (${topScore.prosCount} pro${
        topScore.prosCount === 1 ? '' : 's'
      }, ${topScore.consCount} con${topScore.consCount === 1 ? '' : 's'}, priority ${winner.weight}/5), beating ${runnerUp.label} by ${delta} pts.`;
    }
    runnerUpNote = `${runnerUp.label} finished second at ${secondScore.netScore >= 0 ? '+' : ''}${secondScore.netScore} pts.`;
    confidencePct = res.tieBroken ? 71 : clamp(78 + Math.round(delta * 5), 76, 98);
    stats = [
      { label: 'Net Score', value: `${topScore.netScore >= 0 ? '+' : ''}${topScore.netScore}` },
      { label: 'Pros / Cons', value: `${topScore.prosCount} / ${topScore.consCount}` },
      { label: 'Margin', value: res.tieBroken ? 'Tie-break' : `+${delta}` },
      { label: 'Priority', value: `${winner.weight}/5` },
    ];
  } else if (mode === 'oracle') {
    // Weighted draw with slight favor to higher weights
    const totalWeight = cleanOptions.reduce((sum, o) => sum + o.weight, 0);
    let roll = rng() * totalWeight;
    winner = cleanOptions[cleanOptions.length - 1];
    for (const opt of cleanOptions) {
      roll -= opt.weight;
      if (roll <= 0) {
        winner = opt;
        break;
      }
    }
    const others = cleanOptions.filter((o) => o.id !== winner.id);
    runnerUp = others[Math.floor(rng() * others.length)] ?? cleanOptions[0];

    headline = pickFrom(ORACLE_HEADLINES, rng)(winner.label);
    rationale = pickFrom(ORACLE_RATIONALES, rng)(winner.label, runnerUp.label);
    runnerUpNote = `${runnerUp.label} was respectfully declined by the oracle.`;
    confidencePct = clamp(88 + Math.floor(rng() * 11), 88, 99);
    const entropyBits = (Math.log2(cleanOptions.length) * 1.4).toFixed(1);
    stats = [
      { label: 'Oracle Certainty', value: `${confidencePct}%` },
      { label: 'Entropy Cut', value: `${entropyBits} bits` },
      { label: 'Overthinking', value: 'Terminated' },
      { label: 'Appeals Left', value: '0' },
    ];
  } else {
    // Instant Verdict — weighted deterministic rank
    const ranked = cleanOptions
      .map((opt) => ({
        option: opt,
        score: opt.weight * 14 + opt.pros.length * 4 - opt.cons.length * 3 + rng() * 35,
      }))
      .sort((a, b) => b.score - a.score);

    winner = ranked[0].option;
    runnerUp = ranked[1].option;
    const marginPct = clamp(Math.round(((ranked[0].score - ranked[1].score) / ranked[0].score) * 100), 3, 42);

    headline = winner.label;
    rationale = pickFrom(INSTANT_RATIONALES, rng)(winner.label, runnerUp.label);
    runnerUpNote = `Runner-up: ${runnerUp.label} (${marginPct}% behind on tie-break index).`;
    confidencePct = clamp(78 + Math.round(marginPct * 0.45), 78, 96);
    stats = [
      { label: 'Confidence', value: `${confidencePct}%` },
      { label: 'Lead Margin', value: `+${marginPct}%` },
      { label: 'Pool Size', value: `${cleanOptions.length} options` },
      { label: 'Decision Time', value: '< 1 ms' },
    ];
  }

  return {
    id: `v-${seed.toString(36)}-${cleanOptions.length}`,
    createdAt: new Date().toISOString(),
    prompt,
    mode,
    modeName,
    seed,
    winner,
    runnerUp,
    allOptions: cleanOptions,
    headline,
    rationale,
    runnerUpNote,
    confidencePct,
    timeSavedMinutes: estimateMinutesSaved(cleanOptions.length, mode),
    stats,
    tournamentMatches,
    regretScores,
    proConScores,
  };
}

export function formatVerdictCard(verdict: DecisionVerdict): string {
  const lines: string[] = [];
  lines.push(`UNTHINK AI — ${verdict.modeName.toUpperCase()}`);
  if (verdict.prompt) {
    lines.push(`Dilemma: ${verdict.prompt}`);
  }
  lines.push(`Verdict: ${verdict.winner.label}`);
  lines.push(`Why: ${verdict.rationale}`);
  if (verdict.runnerUp) {
    lines.push(`Runner-up: ${verdict.runnerUp.label}`);
  }
  const statLine = verdict.stats.map((s) => `${s.label}: ${s.value}`).join(' · ');
  lines.push(`Stats: ${statLine}`);
  lines.push(`https://unthink-ai.757tech.pro/`);
  return lines.join('\n');
}

export function computeStreakStats(history: HistoryEntry[], now = new Date()): StreakStats {
  const totalDecisions = history.length;
  const minutesSaved = history.reduce((sum, item) => sum + (item.timeSavedMinutes || 0), 0);
  const gutCheckOverrides = history.filter((item) => item.gutCheckOverridden).length;

  if (history.length === 0) {
    return {
      totalDecisions: 0,
      currentStreakDays: 0,
      minutesSaved: 0,
      gutCheckOverrides: 0,
    };
  }

  // Unique local calendar days (YYYY-MM-DD in UTC for deterministic cross-env tests)
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const uniqueDays = new Set(
    history
      .map((h) => {
        const parsed = new Date(h.createdAt);
        return Number.isNaN(parsed.getTime()) ? null : dayKey(parsed);
      })
      .filter((k): k is string => Boolean(k)),
  );

  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Allow streak to start from today or yesterday
  if (!uniqueDays.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (uniqueDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    totalDecisions,
    currentStreakDays: streak,
    minutesSaved,
    gutCheckOverrides,
  };
}
