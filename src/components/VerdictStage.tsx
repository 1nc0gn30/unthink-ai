import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Copy,
  RefreshCcw,
  Scissors,
  Sparkles,
  Trophy,
  AlertCircle,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { formatVerdictCard } from '../engine/decisionEngine';
import type { DecisionModeMeta, DecisionVerdict } from '../engine/types';

interface VerdictStageProps {
  verdict: DecisionVerdict | null;
  isRevealing: boolean;
  tickerLabel: string;
  activeMode: DecisionModeMeta;
  validOptionCount: number;
  onReroll: () => void;
  onRunNow: () => void;
  onEliminateAndReroll: () => void;
  onGutCheckOverride: () => void;
  gutCheckApplied: boolean;
  canEliminate: boolean;
  canRun: boolean;
}

export function VerdictStage({
  verdict,
  isRevealing,
  tickerLabel,
  activeMode,
  validOptionCount,
  onReroll,
  onRunNow,
  onEliminateAndReroll,
  onGutCheckOverride,
  gutCheckApplied,
  canEliminate,
  canRun,
}: VerdictStageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCard = async () => {
    if (!verdict) return;
    const text = formatVerdictCard(verdict);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy via textarea
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      aria-label="Decision verdict stage"
      className="flex flex-col gap-4"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border transition-colors ${
          verdict && !isRevealing
            ? 'verdict-card-frame border-[#E8B84B]/45 bg-[#12151C]'
            : 'border-[#252B36] bg-[#12151C]'
        }`}
      >
        {/* Top instrument telemetry bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222833] bg-[#0F1218] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isRevealing
                  ? 'animate-pulse bg-[#E8B84B]'
                  : verdict
                    ? 'bg-[#34D399]'
                    : 'bg-[#667085]'
              }`}
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#98A2B3]">
              {isRevealing
                ? 'LOCKING TIE-BREAKER'
                : verdict
                  ? `VERDICT LOCKED · ${verdict.modeName}`
                  : `READY · ${activeMode.code} ${activeMode.shortName}`}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#7D8798]">
            {verdict && !isRevealing
              ? `~${verdict.timeSavedMinutes} min saved`
              : `${validOptionCount} candidate${validOptionCount === 1 ? '' : 's'} loaded`}
          </span>
        </div>

        {/* Main verdict body */}
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {isRevealing ? (
              <motion.div
                key="revealing"
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="flex min-h-[260px] flex-col items-center justify-center py-8 text-center"
                aria-live="polite"
              >
                <span className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#E8B84B]">
                  Running {activeMode.name}
                </span>
                <div className="rounded-xl border border-[#E8B84B]/30 bg-[#171B24] px-6 py-4">
                  <p className="font-display text-2xl font-bold tracking-tight text-[#F2F4F8] sm:text-3xl">
                    {tickerLabel || 'Evaluating...'}
                  </p>
                </div>
                <p className="mt-4 font-mono text-xs text-[#7D8798]">
                  Cutting hesitation down to one call
                </p>
              </motion.div>
            ) : verdict ? (
              <motion.div
                key={verdict.id + (gutCheckApplied ? '-override' : '')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {verdict.prompt && (
                  <p className="mb-2 text-xs font-medium text-[#98A2B3]">
                    {verdict.prompt}
                  </p>
                )}

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#E8B84B]/35 bg-[#E8B84B]/10 px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#E8B84B]">
                      <Trophy className="h-3 w-3" aria-hidden="true" />
                      {gutCheckApplied ? 'Gut-Check Pick' : 'Final Call'}
                    </span>
                    <h2 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-[#F2F4F8] sm:text-[34px]">
                      {verdict.headline}
                    </h2>
                  </div>
                  {verdict.aiEnhanced && (
                    <span className="shrink-0 rounded-md border border-[#34D399]/30 bg-[#34D399]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#34D399]">
                      BYOK Enhanced
                    </span>
                  )}
                </div>

                <p className="mb-5 max-w-[60ch] text-[15px] leading-relaxed text-[#C8D0DC]">
                  {verdict.rationale}
                </p>

                {/* Tie-Break Stats Strip */}
                <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {verdict.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-[#222833] bg-[#0F1218] px-3 py-2.5"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
                        {stat.label}
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold text-[#F2F4F8]">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mode-specific transparent breakdown */}
                {verdict.tournamentMatches && verdict.tournamentMatches.length > 0 && (
                  <div className="mb-5 rounded-xl border border-[#222833] bg-[#0F1218] p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#98A2B3]">
                        Elimination Bracket
                      </span>
                      <span className="font-mono text-[11px] text-[#7D8798]">
                        Best of 3 weighted flips
                      </span>
                    </div>
                    <ol className="space-y-2">
                      {verdict.tournamentMatches.map((m, i) => (
                        <li
                          key={`${m.round}-${m.optionA}-${i}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1E242E] bg-[#141820] px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-[#1F2532] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#E8B84B]">
                              {m.roundLabel}
                            </span>
                            {m.bye ? (
                              <span className="text-[#C8D0DC]">
                                <strong className="text-[#F2F4F8]">{m.optionA}</strong> advances (bye)
                              </span>
                            ) : (
                              <span className="text-[#98A2B3]">
                                <span
                                  className={
                                    m.winner === m.optionA
                                      ? 'font-semibold text-[#F2F4F8]'
                                      : 'line-through opacity-65'
                                  }
                                >
                                  {m.optionA}
                                </span>{' '}
                                vs{' '}
                                <span
                                  className={
                                    m.winner === m.optionB
                                      ? 'font-semibold text-[#F2F4F8]'
                                      : 'line-through opacity-65'
                                  }
                                >
                                  {m.optionB}
                                </span>
                              </span>
                            )}
                          </div>
                          {!m.bye && (
                            <span className="font-mono text-[11px] text-[#34D399]">
                              {m.flips.map((f) => (f === 'A' ? '●' : '○')).join(' ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {verdict.regretScores && verdict.regretScores.length > 0 && (
                  <div className="mb-5 rounded-xl border border-[#222833] bg-[#0F1218] p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#98A2B3]">
                        48-Hour Regret Ranking
                      </span>
                      <span className="font-mono text-[11px] text-[#7D8798]">
                        Higher floor = safer call
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {verdict.regretScores.map((item, idx) => (
                        <div key={item.optionId} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span
                              className={
                                idx === 0 ? 'font-semibold text-[#F2F4F8]' : 'text-[#98A2B3]'
                              }
                            >
                              {idx + 1}. {item.label}
                            </span>
                            <span className="font-mono text-[11px] text-[#C8D0DC]">
                              Floor {item.regretFloor} · Rev {item.reversibility}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1C222D]">
                            <div
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-[#E8B84B]' : 'bg-[#475467]'
                              }`}
                              style={{ width: `${item.composite}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {verdict.proConScores && verdict.proConScores.length > 0 && (
                  <div className="mb-5 rounded-xl border border-[#222833] bg-[#0F1218] p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#98A2B3]">
                        Pro / Con Ledger
                      </span>
                      <span className="font-mono text-[11px] text-[#7D8798]">
                        +2 pro · -1.5 con · weight bias
                      </span>
                    </div>
                    <div className="space-y-2">
                      {verdict.proConScores.map((row, idx) => (
                        <div
                          key={row.optionId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1E242E] bg-[#141820] px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span
                              className={
                                idx === 0 ? 'font-semibold text-[#F2F4F8]' : 'text-[#98A2B3]'
                              }
                            >
                              {idx + 1}. {row.label}
                            </span>
                            {row.inferredNote && (
                              <p className="mt-0.5 text-[11px] text-[#7D8798]">
                                {row.inferredNote}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-[#34D399]">+{row.prosCount}P</span>
                            <span className="text-[#F87171]">-{row.consCount}C</span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-semibold ${
                                idx === 0
                                  ? 'bg-[#E8B84B]/15 text-[#E8B84B]'
                                  : 'bg-[#1F2532] text-[#C8D0DC]'
                              }`}
                            >
                              {row.netScore >= 0 ? `+${row.netScore}` : row.netScore}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Runner-up & Gut-Check Insight */}
                <div className="mb-5 flex flex-col gap-2.5 rounded-xl border border-[#222833] bg-[#0F1218] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5 text-xs text-[#98A2B3]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E8B84B]" aria-hidden="true" />
                    <span>{verdict.runnerUpNote}</span>
                  </div>
                  {verdict.runnerUp && !gutCheckApplied && (
                    <button
                      type="button"
                      onClick={onGutCheckOverride}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#2B3342] bg-[#171C26] px-3 py-1.5 text-xs font-medium text-[#E8B84B] transition-colors hover:border-[#E8B84B]/50 hover:bg-[#1E2430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                    >
                      Felt disappointed? Take runner-up
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Equal-height action row */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#2B3342] bg-[#181D27] px-4 py-2.5 text-sm font-medium text-[#F2F4F8] transition-colors hover:border-[#E8B84B]/50 hover:bg-[#1E2431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
                        Copied card
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
                        Copy verdict
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onReroll}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#2B3342] bg-[#181D27] px-4 py-2.5 text-sm font-medium text-[#F2F4F8] transition-colors hover:border-[#E8B84B]/50 hover:bg-[#1E2431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                  >
                    <RefreshCcw className="h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
                    Re-roll seed
                  </button>

                  <button
                    type="button"
                    onClick={onEliminateAndReroll}
                    disabled={!canEliminate}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#2B3342] bg-[#181D27] px-4 py-2.5 text-sm font-medium text-[#F2F4F8] transition-colors hover:border-[#E8B84B]/50 hover:bg-[#1E2431] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Scissors className="h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
                    Drop & re-run
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[260px] flex-col justify-between py-2"
              >
                <div>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#262D3B] bg-[#171C25] text-[#E8B84B]">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-[#F2F4F8]">
                    {activeMode.name}
                  </h2>
                  <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-[#98A2B3]">
                    {activeMode.description}
                  </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={onRunNow}
                      disabled={!canRun}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#E8B84B] px-5 py-2.5 text-sm font-bold text-[#0B0D11] transition-all hover:bg-[#F0C764] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2F4F8] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Run {activeMode.shortName} now
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-[#222833] pt-4">
                  <div className="rounded-lg bg-[#0F1218] px-3 py-2.5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
                      Engine
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-medium text-[#F2F4F8]">
                      100% Local
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0F1218] px-3 py-2.5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
                      Options
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-medium text-[#F2F4F8]">
                      {validOptionCount} / 6 ready
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0F1218] px-3 py-2.5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
                      API Key
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-medium text-[#34D399]">
                      Not required
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick shortcut reminder when idle */}
      {!verdict && !isRevealing && (
        <div className="flex items-center gap-2 rounded-xl border border-[#202631] bg-[#101319] px-4 py-3 text-xs text-[#98A2B3]">
          <Sparkles className="h-4 w-4 shrink-0 text-[#E8B84B]" aria-hidden="true" />
          <span>
            Tip: If the verdict makes you groan, click <strong className="text-[#F2F4F8]">Take runner-up</strong>—the coin flip already revealed what you actually wanted.
          </span>
        </div>
      )}
    </section>
  );
}
