import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Check,
  ChevronDown,
  Coffee,
  Copy,
  KeyRound,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { BrandMark } from './components/BrandMark';
import { HistoryPanel } from './components/HistoryPanel';
import { VerdictStage } from './components/VerdictStage';
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  computeStreakStats,
  decideDilemma,
  normalizeOptions,
} from './engine/decisionEngine';
import { DECISION_MODES, DILEMMA_PRESETS } from './engine/presets';
import {
  appendHistoryEntry,
  clearHistoryStorage,
  loadHistory,
  saveHistory,
} from './engine/storage';
import type {
  DecisionModeId,
  DecisionVerdict,
  DilemmaPreset,
  HistoryEntry,
  OptionItem,
} from './engine/types';

const STRIPE_COFFEE_URL = 'https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X';
const SOLANA_TIP_ADDRESS = 'GG2eQbVh8ut1BK6j1A2tz7pSySdLpD38BgyEhGcxdXoK';

let optionUid = 100;
function makeOption(
  label = '',
  weight = 3,
  pros: string[] = [],
  cons: string[] = [],
): OptionItem {
  optionUid += 1;
  return {
    id: `opt-${optionUid}`,
    label,
    weight,
    pros,
    cons,
  };
}

function buildInitialOptions(): OptionItem[] {
  const first = DILEMMA_PRESETS[0];
  return first.options.map((o) => makeOption(o.label, o.weight ?? 3, o.pros ?? [], o.cons ?? []));
}

export default function App() {
  const [prompt, setPrompt] = useState(DILEMMA_PRESETS[0].prompt);
  const [activePresetId, setActivePresetId] = useState<string | null>(DILEMMA_PRESETS[0].id);
  const [options, setOptions] = useState<OptionItem[]>(buildInitialOptions);
  const [mode, setMode] = useState<DecisionModeId>('tournament');
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);

  const [verdict, setVerdict] = useState<DecisionVerdict | null>(null);
  const [gutCheckApplied, setGutCheckApplied] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [tickerLabel, setTickerLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rerollNonce, setRerollNonce] = useState(0);

  // Optional BYOK Gemini rationale enhancement (collapsed & off by default)
  const [showByok, setShowByok] = useState(false);
  const [useByok, setUseByok] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [byokNotice, setByokNotice] = useState<string | null>(null);

  // Persistent localStorage history
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [copiedSolana, setCopiedSolana] = useState(false);

  const revealTimerRef = useRef<number | null>(null);
  const tickerIntervalRef = useRef<number | null>(null);

  const validOptions = useMemo(() => normalizeOptions(options), [options]);
  const activeModeMeta = useMemo(
    () => DECISION_MODES.find((m) => m.id === mode) ?? DECISION_MODES[0],
    [mode],
  );
  const streakStats = useMemo(() => computeStreakStats(history), [history]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
      if (tickerIntervalRef.current) window.clearInterval(tickerIntervalRef.current);
    };
  }, []);

  const clearTimers = () => {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (tickerIntervalRef.current) {
      window.clearInterval(tickerIntervalRef.current);
      tickerIntervalRef.current = null;
    }
  };

  const applyPreset = (preset: DilemmaPreset) => {
    setActivePresetId(preset.id);
    setPrompt(preset.prompt);
    setMode(preset.recommendedMode);
    setOptions(
      preset.options.map((o) => makeOption(o.label, o.weight ?? 3, o.pros ?? [], o.cons ?? [])),
    );
    setExpandedOptionId(null);
    setError(null);
    setByokNotice(null);
    setRerollNonce(0);
  };

  const updateOptionLabel = (id: string, label: string) => {
    setActivePresetId(null);
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  const updateOptionWeight = (id: string, weight: number) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, weight } : o)));
  };

  const updateOptionList = (id: string, field: 'pros' | 'cons', raw: string) => {
    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: items } : o)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setActivePresetId(null);
    setOptions((prev) => [...prev, makeOption('')]);
  };

  const removeOption = (id: string) => {
    if (options.length <= MIN_OPTIONS) return;
    setActivePresetId(null);
    setOptions((prev) => prev.filter((o) => o.id !== id));
    if (expandedOptionId === id) setExpandedOptionId(null);
  };

  const shuffleOptionsOrder = () => {
    setOptions((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  };

  const clearBlankOptions = () => {
    setActivePresetId(null);
    setPrompt('');
    setOptions([makeOption(''), makeOption('')]);
    setVerdict(null);
    setGutCheckApplied(false);
    setError(null);
  };

  const persistVerdict = (v: DecisionVerdict, overridden = false) => {
    const entry: HistoryEntry = {
      id: `${v.id}-${Date.now()}`,
      createdAt: v.createdAt,
      prompt: v.prompt,
      mode: v.mode,
      modeName: v.modeName,
      winnerLabel: v.winner.label,
      runnerUpLabel: v.runnerUp?.label ?? null,
      optionLabels: v.allOptions.map((o) => o.label),
      rationale: v.rationale,
      confidencePct: v.confidencePct,
      timeSavedMinutes: v.timeSavedMinutes,
      gutCheckOverridden: overridden,
    };
    const updated = appendHistoryEntry(entry);
    setHistory(updated);
  };

  const runDecision = (overrideOptions?: OptionItem[], explicitNonce?: number) => {
    const pool = normalizeOptions(overrideOptions ?? options);
    if (pool.length < MIN_OPTIONS) {
      setError(`Add at least ${MIN_OPTIONS} non-empty options so Unthink has something to break.`);
      return;
    }

    setError(null);
    setByokNotice(null);
    setGutCheckApplied(false);
    clearTimers();

    const activeNonce = typeof explicitNonce === 'number' ? explicitNonce : rerollNonce;
    const baseVerdict = decideDilemma({
      prompt,
      options: pool,
      mode,
      seed: activeNonce > 0 ? (Date.now() ^ (activeNonce * 2654435761)) >>> 0 : undefined,
    });

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finalize = async () => {
      let finalVerdict = baseVerdict;

      if (useByok && apiKey.trim().length > 20) {
        try {
          const summaryPrompt = `Dilemma: ${prompt || 'Pick one'}. Options: ${pool
            .map((o) => o.label)
            .join(', ')}. Selected winner: "${baseVerdict.winner.label}" (mode: ${
            baseVerdict.modeName
          }). Give a punchy 1-sentence decisive directive backing "${baseVerdict.winner.label}".`;
          const response = await fetch('/api/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: summaryPrompt, apiKey: apiKey.trim() }),
          });
          if (response.ok) {
            const payload = (await response.json()) as { decision?: string };
            if (payload.decision?.trim()) {
              finalVerdict = {
                ...baseVerdict,
                rationale: payload.decision.trim(),
                aiEnhanced: true,
              };
            }
          } else {
            setByokNotice('BYOK endpoint unavailable—kept instant local verdict.');
          }
        } catch {
          setByokNotice('BYOK offline—kept instant local verdict.');
        }
      }

      setVerdict(finalVerdict);
      setIsRevealing(false);
      persistVerdict(finalVerdict, false);
    };

    if (prefersReducedMotion) {
      void finalize();
      return;
    }

    setIsRevealing(true);
    let tick = 0;
    setTickerLabel(pool[0].label);
    tickerIntervalRef.current = window.setInterval(() => {
      tick += 1;
      setTickerLabel(pool[tick % pool.length].label);
    }, 65);

    revealTimerRef.current = window.setTimeout(() => {
      clearTimers();
      void finalize();
    }, 360);
  };

  const handleReroll = () => {
    const nextNonce = rerollNonce + 1;
    setRerollNonce(nextNonce);
    runDecision(options, nextNonce);
  };

  const handleEliminateAndReroll = () => {
    if (!verdict || validOptions.length <= MIN_OPTIONS) return;
    const remaining = options.filter(
      (o) => o.label.trim().toLowerCase() !== verdict.winner.label.trim().toLowerCase(),
    );
    if (normalizeOptions(remaining).length < MIN_OPTIONS) return;
    setOptions(remaining);
    const nextNonce = rerollNonce + 1;
    setRerollNonce(nextNonce);
    runDecision(remaining, nextNonce);
  };

  const handleGutCheckOverride = () => {
    if (!verdict || !verdict.runnerUp) return;
    const swapped: DecisionVerdict = {
      ...verdict,
      id: `${verdict.id}-gut`,
      winner: verdict.runnerUp,
      runnerUp: verdict.winner,
      headline: verdict.runnerUp.label,
      rationale: `Classic coin-flip psychology: hesitating at "${verdict.winner.label}" proved you wanted "${verdict.runnerUp.label}" all along. Go with your actual preference.`,
      runnerUpNote: `Original engine pick "${verdict.winner.label}" stepped aside after your gut-check.`,
    };
    setVerdict(swapped);
    setGutCheckApplied(true);
    persistVerdict(swapped, true);
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setActivePresetId(null);
    setPrompt(entry.prompt);
    setMode(entry.mode);
    setOptions(entry.optionLabels.slice(0, MAX_OPTIONS).map((label) => makeOption(label)));
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryEntry = (id: string) => {
    const next = history.filter((item) => item.id !== id);
    saveHistory(next);
    setHistory(next);
  };

  const handleClearHistory = () => {
    clearHistoryStorage();
    setHistory([]);
  };

  const handleCopySolana = async () => {
    try {
      await navigator.clipboard.writeText(SOLANA_TIP_ADDRESS);
      setCopiedSolana(true);
      window.setTimeout(() => setCopiedSolana(false), 2000);
    } catch {
      setCopiedSolana(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runDecision();
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#0B0D11] text-[#F2F4F8]"
      onKeyDown={handleKeyDown}
    >
      {/* Subtle top brass horizon rule */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#E8B84B]/70 to-transparent" />

      <div className="mx-auto flex min-h-[calc(100dvh-2px)] w-full max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#1E232D] pb-4">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-[#F2F4F8]">
                  Unthink AI
                </span>
                <span className="rounded-md border border-[#2A3140] bg-[#141821] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#E8B84B]">
                  v2.0 · Local
                </span>
              </div>
              <p className="text-xs text-[#7D8798]">Trivial Dilemma & Tie-Breaker Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden rounded-full border border-[#232A36] bg-[#12161E] px-3 py-1.5 font-mono text-[11px] text-[#98A2B3] sm:inline-flex">
              100% Free · Zero Login
            </span>
            <a
              href={STRIPE_COFFEE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#2B3342] bg-[#151A23] px-3.5 py-2 text-xs font-medium text-[#E8B84B] transition-colors hover:border-[#E8B84B]/60 hover:bg-[#1C222E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
              Buy Us a Coffee
            </a>
          </div>
        </header>

        <main className="flex-1">
          {/* Compact Hero Header */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#E8B84B]">
                05 MODES · ZERO OVERTHINKING
              </p>
              <h1 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-[#F2F4F8] sm:text-4xl">
                Stop debating trivial choices.
              </h1>
              <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-[#98A2B3] sm:text-[15px]">
                Drop 2 to 6 options, pick a tie-breaker mode, and get one decisive call with transparent math—right in your browser.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7D8798]">
                Quick dilemmas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DILEMMA_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B] ${
                        isActive
                          ? 'border-[#E8B84B]/70 bg-[#E8B84B]/12 text-[#E8B84B]'
                          : 'border-[#252C38] bg-[#131720] text-[#C8D0DC] hover:border-[#394356] hover:text-[#F2F4F8]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Primary 2-Column Workstation */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left Column: Composer & Modes */}
            <section
              aria-label="Dilemma builder"
              className="flex flex-col gap-5 rounded-2xl border border-[#252B36] bg-[#12151C] p-5 sm:p-6"
            >
              {/* Optional Context Prompt */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="dilemma-prompt"
                    className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#98A2B3]"
                  >
                    Dilemma (optional)
                  </label>
                  <span className="font-mono text-[11px] text-[#667085]">
                    {prompt.length}/160
                  </span>
                </div>
                <input
                  id="dilemma-prompt"
                  type="text"
                  maxLength={160}
                  value={prompt}
                  onChange={(e) => {
                    setActivePresetId(null);
                    setPrompt(e.target.value);
                  }}
                  placeholder="e.g., What should we eat tonight?"
                  className="min-h-[44px] w-full rounded-xl border border-[#252C38] bg-[#0D1016] px-3.5 py-2.5 text-sm text-[#F2F4F8] placeholder:text-[#5C6678] focus:border-[#E8B84B]/70 focus:outline-none"
                />
              </div>

              {/* Options List (2-6) */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#98A2B3]">
                    Options ({options.length}/{MAX_OPTIONS})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={shuffleOptionsOrder}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#252C38] bg-[#161B24] px-2.5 py-1 text-xs font-medium text-[#98A2B3] transition-colors hover:border-[#394356] hover:text-[#F2F4F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                    >
                      <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                      Shuffle
                    </button>
                    <button
                      type="button"
                      onClick={clearBlankOptions}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#252C38] bg-[#161B24] px-2.5 py-1 text-xs font-medium text-[#98A2B3] transition-colors hover:border-[#394356] hover:text-[#F2F4F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, idx) => {
                    const isExpanded =
                      expandedOptionId === opt.id || mode === 'procon';
                    return (
                      <div
                        key={opt.id}
                        className="rounded-xl border border-[#222936] bg-[#0E1117] p-2.5 transition-colors focus-within:border-[#3A4458]"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#181D27] font-mono text-[11px] font-semibold text-[#98A2B3] sm:h-7 sm:w-7 sm:text-xs">
                            {idx + 1}
                          </span>
                          <label htmlFor={`option-input-${opt.id}`} className="sr-only">
                            Option {idx + 1}
                          </label>
                          <input
                            id={`option-input-${opt.id}`}
                            type="text"
                            maxLength={90}
                            value={opt.label}
                            onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="min-h-[38px] min-w-0 flex-1 bg-transparent px-1 text-sm font-medium text-[#F2F4F8] placeholder:text-[#5C6678] focus:outline-none sm:px-1.5"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOptionId(expandedOptionId === opt.id ? null : opt.id)
                            }
                            aria-label={`Tune weight and pros/cons for option ${idx + 1}`}
                            title="Weight & pros/cons"
                            className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B] ${
                              isExpanded
                                ? 'border-[#E8B84B]/50 bg-[#E8B84B]/10 text-[#E8B84B]'
                                : 'border-[#252C38] bg-[#151A23] text-[#98A2B3] hover:text-[#F2F4F8]'
                            }`}
                          >
                            <SlidersHorizontal className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
                            <span>w{opt.weight}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOption(opt.id)}
                            disabled={options.length <= MIN_OPTIONS}
                            aria-label={`Remove option ${idx + 1}`}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#252C38] bg-[#151A23] text-[#7D8798] transition-colors hover:border-[#F87171]/40 hover:text-[#F87171] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2.5 grid grid-cols-1 gap-2.5 border-t border-[#1D232E] pt-2.5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <div className="mb-1 flex items-center justify-between text-[11px] text-[#98A2B3]">
                                <label htmlFor={`weight-${opt.id}`}>Priority weight</label>
                                <span className="font-mono text-[#E8B84B]">{opt.weight} / 5</span>
                              </div>
                              <input
                                id={`weight-${opt.id}`}
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={opt.weight}
                                onChange={(e) =>
                                  updateOptionWeight(opt.id, Number(e.target.value))
                                }
                                className="h-1.5 w-full cursor-pointer accent-[#E8B84B]"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`pros-${opt.id}`}
                                className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#34D399]"
                              >
                                Pros (comma-separated)
                              </label>
                              <input
                                id={`pros-${opt.id}`}
                                type="text"
                                defaultValue={opt.pros.join(', ')}
                                key={`${opt.id}-p-${activePresetId ?? 'custom'}`}
                                onBlur={(e) => updateOptionList(opt.id, 'pros', e.target.value)}
                                placeholder="Fast, cheap, fun"
                                className="min-h-[36px] w-full rounded-lg border border-[#242B37] bg-[#131720] px-2.5 py-1.5 text-xs text-[#F2F4F8] placeholder:text-[#5C6678] focus:border-[#34D399]/60 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`cons-${opt.id}`}
                                className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#F87171]"
                              >
                                Cons (comma-separated)
                              </label>
                              <input
                                id={`cons-${opt.id}`}
                                type="text"
                                defaultValue={opt.cons.join(', ')}
                                key={`${opt.id}-c-${activePresetId ?? 'custom'}`}
                                onBlur={(e) => updateOptionList(opt.id, 'cons', e.target.value)}
                                placeholder="Long wait, messy"
                                className="min-h-[36px] w-full rounded-lg border border-[#242B37] bg-[#131720] px-2.5 py-1.5 text-xs text-[#F2F4F8] placeholder:text-[#5C6678] focus:border-[#F87171]/60 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {options.length < MAX_OPTIONS && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2.5 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2C3444] bg-[#0F1218] px-4 py-2 text-xs font-medium text-[#98A2B3] transition-colors hover:border-[#E8B84B]/55 hover:text-[#F2F4F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add option ({options.length}/{MAX_OPTIONS})
                  </button>
                )}
              </div>

              {/* 5 Decision Modes */}
              <div>
                <span className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#98A2B3]">
                  Decision Mode
                </span>
                <div
                  role="radiogroup"
                  aria-label="Decision mode"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {DECISION_MODES.map((m, idx) => {
                    const selected = m.id === mode;
                    const isLastOdd =
                      idx === DECISION_MODES.length - 1 && DECISION_MODES.length % 2 === 1;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setMode(m.id)}
                        className={`flex min-h-[56px] flex-col justify-center rounded-xl border px-3.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B] ${
                          isLastOdd ? 'sm:col-span-2' : ''
                        } ${
                          selected
                            ? 'border-[#E8B84B]/80 bg-[#E8B84B]/10'
                            : 'border-[#232A36] bg-[#0E1117] hover:border-[#364053]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              selected ? 'text-[#F2F4F8]' : 'text-[#C8D0DC]'
                            }`}
                          >
                            {m.name}
                          </span>
                          <span
                            className={`font-mono text-[10px] ${
                              selected ? 'text-[#E8B84B]' : 'text-[#667085]'
                            }`}
                          >
                            {m.code}
                          </span>
                        </div>
                        <span className="mt-0.5 text-xs text-[#8C96A8]">{m.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#F87171]/35 bg-[#2A1518] px-3.5 py-2.5 text-xs font-medium text-[#FCA5A5]"
                >
                  {error}
                </p>
              )}

              {byokNotice && (
                <p className="rounded-xl border border-[#E8B84B]/30 bg-[#1F1A10] px-3.5 py-2 text-xs text-[#E8B84B]">
                  {byokNotice}
                </p>
              )}

              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => runDecision()}
                disabled={validOptions.length < MIN_OPTIONS || isRevealing}
                className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E8B84B] px-5 py-3 text-base font-bold text-[#0B0D11] transition-all hover:bg-[#F0C764] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F4F8] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                {isRevealing ? 'Breaking tie...' : `Lock in ${activeModeMeta.shortName}`}
                <span className="ml-1 hidden rounded bg-[#0B0D11]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold sm:inline">
                  Ctrl+↵
                </span>
              </button>

              {/* Optional Collapsed BYOK Gemini Enhancer */}
              <div className="border-t border-[#1E2430] pt-3">
                <button
                  type="button"
                  onClick={() => setShowByok((v) => !v)}
                  aria-expanded={showByok}
                  className="flex min-h-[36px] w-full items-center justify-between text-xs font-medium text-[#7D8798] transition-colors hover:text-[#C8D0DC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Optional: Bring Your Own Gemini Key (not required)
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showByok ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {showByok && (
                  <div className="mt-3 space-y-2.5 rounded-xl border border-[#222834] bg-[#0D1016] p-3.5">
                    <p className="text-xs leading-relaxed text-[#8C96A8]">
                      The local engine works completely offline with zero keys. Optionally add a Gemini key to rewrite the final one-liner via <code>/api/decide</code>; falls back locally if unreachable.
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[#C8D0DC]">
                      <input
                        type="checkbox"
                        checked={useByok}
                        onChange={(e) => setUseByok(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#E8B84B]"
                      />
                      Enhance verdict one-liner with my Gemini key
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza... (held in memory only)"
                      aria-label="Optional Gemini API key"
                      className="min-h-[40px] w-full rounded-lg border border-[#252C38] bg-[#131720] px-3 py-2 text-xs text-[#F2F4F8] placeholder:text-[#5C6678] focus:border-[#E8B84B]/70 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Right Column: Verdict Stage + History */}
            <div className="flex flex-col gap-5">
              <VerdictStage
                verdict={verdict}
                isRevealing={isRevealing}
                tickerLabel={tickerLabel}
                activeMode={activeModeMeta}
                validOptionCount={validOptions.length}
                onReroll={handleReroll}
                onRunNow={() => runDecision()}
                onEliminateAndReroll={handleEliminateAndReroll}
                onGutCheckOverride={handleGutCheckOverride}
                gutCheckApplied={gutCheckApplied}
                canEliminate={validOptions.length > MIN_OPTIONS}
                canRun={validOptions.length >= MIN_OPTIONS && !isRevealing}
              />

              <HistoryPanel
                history={history}
                stats={streakStats}
                onRestore={handleRestoreHistory}
                onDeleteEntry={handleDeleteHistoryEntry}
                onClearAll={handleClearHistory}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-10 border-t border-[#1E232D] pt-6 text-xs text-[#8C96A8]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-[#C8D0DC]">
                Engineered by Neal Frazier Tech (@1nc0gn30) • NullAI Platform
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[#7D8798]">
                <a
                  href="https://github.com/1nc0gn30/unthink-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-[#F2F4F8] hover:underline"
                >
                  GitHub Repository
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href="https://nullai.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-[#F2F4F8] hover:underline"
                >
                  nullai.tech
                </a>
                <span aria-hidden="true">·</span>
                <span>100% open-access local utility</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={STRIPE_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#2B3342] bg-[#141821] px-3 py-1.5 font-medium text-[#E8B84B] transition-colors hover:border-[#E8B84B]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
              >
                <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
                Buy Us a Coffee
              </a>
              <button
                type="button"
                onClick={handleCopySolana}
                title={`Copy Solana tip address: ${SOLANA_TIP_ADDRESS}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#252C38] bg-[#12161F] px-3 py-1.5 font-mono text-[11px] text-[#C8D0DC] transition-colors hover:border-[#3A4458] hover:text-[#F2F4F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
              >
                {copiedSolana ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#34D399]" aria-hidden="true" />
                    Copied SOL
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#7D8798]" aria-hidden="true" />
                    SOL: GG2e...XdXoK
                  </>
                )}
              </button>
              <a
                href={`solana:${SOLANA_TIP_ADDRESS}`}
                className="sr-only"
              >
                Solana Tip Wallet {SOLANA_TIP_ADDRESS}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
