import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  computeStreakStats,
  decideDilemma,
  formatVerdictCard,
  normalizeOptions,
} from '../src/engine/decisionEngine';
import { DECISION_MODES, DILEMMA_PRESETS } from '../src/engine/presets';
import type { DecisionModeId, HistoryEntry, OptionItem } from '../src/engine/types';

const sampleOptions: OptionItem[] = [
  {
    id: 'o1',
    label: 'Spicy tonkotsu ramen',
    weight: 4,
    pros: ['Warm', 'Zero regret'],
    cons: ['Heavy'],
  },
  {
    id: 'o2',
    label: 'Street tacos',
    weight: 4,
    pros: ['Fast', 'Cheap'],
    cons: ['Messy'],
  },
  {
    id: 'o3',
    label: 'Salmon poke bowl',
    weight: 3,
    pros: ['Fresh'],
    cons: ['Pricey'],
  },
  {
    id: 'o4',
    label: 'Smashburger',
    weight: 2,
    pros: ['Crispy'],
    cons: ['Food coma', 'Long line'],
  },
];

test('normalizeOptions trims labels, clamps weights, and caps at MAX_OPTIONS', () => {
  const raw: OptionItem[] = Array.from({ length: 8 }, (_, idx) => ({
    id: `x-${idx}`,
    label: idx === 1 ? '   ' : `  Choice ${idx}  `,
    weight: idx === 0 ? 99 : idx === 2 ? -3 : 3,
    pros: ['  fast ', ''],
    cons: [' slow '],
  }));

  const normalized = normalizeOptions(raw);
  assert.equal(normalized.length, MAX_OPTIONS);
  assert.equal(normalized[0].label, 'Choice 0');
  assert.equal(normalized[0].weight, 5);
  assert.equal(normalized[1].label, 'Choice 2');
  assert.equal(normalized[1].weight, 1);
  assert.deepEqual(normalized[0].pros, ['fast']);
});

test('decideDilemma rejects fewer than MIN_OPTIONS valid options', () => {
  assert.throws(() => {
    decideDilemma({
      prompt: 'Solo option',
      options: [{ id: '1', label: 'Only one', weight: 3, pros: [], cons: [] }],
      mode: 'instant',
    });
  }, new RegExp(`${MIN_OPTIONS}`));
});

test('all 5 decision modes return valid, deterministic verdicts with stats', () => {
  const modes: DecisionModeId[] = ['instant', 'tournament', 'regret', 'procon', 'oracle'];
  assert.equal(DECISION_MODES.length, 5);

  for (const mode of modes) {
    const first = decideDilemma({
      prompt: 'Lunch call',
      options: sampleOptions,
      mode,
    });
    const second = decideDilemma({
      prompt: 'Lunch call',
      options: sampleOptions,
      mode,
    });

    assert.equal(first.winner.id, second.winner.id, `Mode ${mode} should be deterministic for identical inputs`);
    assert.equal(first.seed, second.seed);
    assert.ok(first.headline.length > 0);
    assert.ok(first.rationale.length > 15);
    assert.ok(first.runnerUp !== null);
    assert.notEqual(first.winner.id, first.runnerUp?.id);
    assert.equal(first.stats.length, 4);
    assert.ok(first.confidencePct >= 65 && first.confidencePct <= 99);
    assert.ok(first.timeSavedMinutes >= 10);
  }
});

test('tournament mode produces a complete elimination bracket with odd or even pools', () => {
  const oddPool = sampleOptions.slice(0, 3);
  const res = decideDilemma({
    prompt: 'Three-way tie',
    options: oddPool,
    mode: 'tournament',
    seed: 1337,
  });

  assert.ok(res.tournamentMatches && res.tournamentMatches.length >= 2);
  const finalMatch = res.tournamentMatches[res.tournamentMatches.length - 1];
  assert.equal(finalMatch.roundLabel, 'Final');
  assert.equal(finalMatch.winner, res.winner.label);
  assert.equal(finalMatch.loser, res.runnerUp?.label);
  assert.ok(finalMatch.flips.length === 2 || finalMatch.flips.length === 3);
});

test('pro/con tiebreaker ranks higher net score first and flags exact ties cleanly', () => {
  const clearLeader: OptionItem[] = [
    { id: 'a', label: 'Clear Winner', weight: 4, pros: ['Fast', 'Cheap', 'Fun'], cons: [] },
    { id: 'b', label: 'Clear Loser', weight: 2, pros: [], cons: ['Slow', 'Expensive'] },
  ];
  const clearRes = decideDilemma({ options: clearLeader, mode: 'procon' });
  assert.equal(clearRes.winner.label, 'Clear Winner');
  assert.equal(clearRes.proConScores?.[0].tieBreakerApplied, false);

  const exactTie: OptionItem[] = [
    { id: 'a', label: 'Option Alpha', weight: 3, pros: ['Good'], cons: ['Meh'] },
    { id: 'b', label: 'Option Beta', weight: 3, pros: ['Good'], cons: ['Meh'] },
  ];
  const tieRes = decideDilemma({ options: exactTie, mode: 'procon', seed: 42 });
  assert.equal(tieRes.proConScores?.[0].tieBreakerApplied, true);
  assert.match(tieRes.rationale, /deadlocked/i);
});

test('regret minimizer scores every option in descending composite order', () => {
  const res = decideDilemma({
    prompt: 'Weekend plan',
    options: sampleOptions,
    mode: 'regret',
    seed: 99,
  });
  assert.ok(res.regretScores);
  assert.equal(res.regretScores.length, sampleOptions.length);
  for (let i = 1; i < res.regretScores.length; i += 1) {
    assert.ok(res.regretScores[i - 1].composite >= res.regretScores[i].composite);
  }
});

test('presets all validate cleanly through their recommended mode', () => {
  assert.ok(DILEMMA_PRESETS.length >= 4);
  for (const preset of DILEMMA_PRESETS) {
    const opts: OptionItem[] = preset.options.map((o, i) => ({
      id: `${preset.id}-${i}`,
      label: o.label,
      weight: o.weight ?? 3,
      pros: o.pros ?? [],
      cons: o.cons ?? [],
    }));
    const verdict = decideDilemma({
      prompt: preset.prompt,
      options: opts,
      mode: preset.recommendedMode,
    });
    assert.ok(opts.some((o) => o.id === verdict.winner.id));
  }
});

test('formatVerdictCard includes mode, winner, rationale, stats, and canonical URL', () => {
  const verdict = decideDilemma({
    prompt: 'Coffee run',
    options: sampleOptions.slice(0, 2),
    mode: 'oracle',
    seed: 777,
  });
  const card = formatVerdictCard(verdict);
  assert.match(card, /UNTHINK AI/);
  assert.match(card, /Coffee run/);
  assert.match(card, new RegExp(verdict.winner.label));
  assert.match(card, /https:\/\/unthink-ai\.757tech\.pro\//);
});

test('computeStreakStats counts consecutive UTC days, saved minutes, and gut overrides', () => {
  const now = new Date('2026-11-25T15:00:00Z');
  const history: HistoryEntry[] = [
    {
      id: 'h1',
      createdAt: '2026-11-25T12:00:00Z',
      prompt: 'Today',
      mode: 'instant',
      modeName: 'Instant Verdict',
      winnerLabel: 'Tacos',
      runnerUpLabel: 'Ramen',
      optionLabels: ['Tacos', 'Ramen'],
      rationale: 'Go tacos.',
      confidencePct: 88,
      timeSavedMinutes: 12,
      gutCheckOverridden: false,
    },
    {
      id: 'h2',
      createdAt: '2026-11-24T19:00:00Z',
      prompt: 'Yesterday',
      mode: 'oracle',
      modeName: 'Deadpan Oracle',
      winnerLabel: 'Thriller',
      runnerUpLabel: 'Doc',
      optionLabels: ['Thriller', 'Doc'],
      rationale: 'Watch thriller.',
      confidencePct: 91,
      timeSavedMinutes: 14,
      gutCheckOverridden: true,
    },
    {
      id: 'h3',
      createdAt: '2026-11-22T09:00:00Z',
      prompt: 'Gap day before',
      mode: 'regret',
      modeName: '2-Minute Regret Minimizer',
      winnerLabel: 'Drive',
      runnerUpLabel: 'Stay in',
      optionLabels: ['Drive', 'Stay in'],
      rationale: 'Low regret.',
      confidencePct: 84,
      timeSavedMinutes: 16,
      gutCheckOverridden: false,
    },
  ];

  const stats = computeStreakStats(history, now);
  assert.equal(stats.totalDecisions, 3);
  assert.equal(stats.currentStreakDays, 2);
  assert.equal(stats.minutesSaved, 42);
  assert.equal(stats.gutCheckOverrides, 1);
});
