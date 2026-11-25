import { Clock, Flame, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import type { HistoryEntry, StreakStats } from '../engine/types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  stats: StreakStats;
  onRestore: (entry: HistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function HistoryPanel({
  history,
  stats,
  onRestore,
  onDeleteEntry,
  onClearAll,
}: HistoryPanelProps) {
  return (
    <section
      aria-label="Decision history and streak stats"
      className="rounded-2xl border border-[#252B36] bg-[#12151C] p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#E8B84B]" aria-hidden="true" />
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#C8D0DC]">
            Decision Log & Streak
          </h2>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#282F3D] bg-[#171B24] px-2.5 py-1 text-xs font-medium text-[#98A2B3] transition-colors hover:border-[#F87171]/40 hover:text-[#F87171] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear log
          </button>
        )}
      </div>

      {/* Streak telemetry grid */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-[#202632] bg-[#0F1218] px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
            Verdicts
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-base font-semibold text-[#F2F4F8]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" aria-hidden="true" />
            {stats.totalDecisions}
          </div>
        </div>
        <div className="rounded-xl border border-[#202632] bg-[#0F1218] px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
            Day Streak
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-base font-semibold text-[#F2F4F8]">
            <Flame className="h-3.5 w-3.5 text-[#E8B84B]" aria-hidden="true" />
            {stats.currentStreakDays}d
          </div>
        </div>
        <div className="rounded-xl border border-[#202632] bg-[#0F1218] px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
            Time Saved
          </div>
          <div className="mt-1 font-mono text-base font-semibold text-[#F2F4F8]">
            {stats.minutesSaved} min
          </div>
        </div>
        <div className="rounded-xl border border-[#202632] bg-[#0F1218] px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7D8798]">
            Overrides
          </div>
          <div className="mt-1 font-mono text-base font-semibold text-[#F2F4F8]">
            {stats.gutCheckOverrides}
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#262D3B] bg-[#0F1218] px-4 py-5 text-center text-xs text-[#7D8798]">
          No saved verdicts yet. Your recent calls stay privately in localStorage on this browser.
        </p>
      ) : (
        <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#202632] bg-[#0F1218] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[#F2F4F8]">
                    {entry.winnerLabel}
                  </span>
                  <span className="rounded bg-[#1B212D] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#E8B84B]">
                    {entry.modeName}
                  </span>
                  {entry.gutCheckOverridden && (
                    <span className="rounded bg-[#34D399]/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#34D399]">
                      Gut-check
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-[#98A2B3]">
                  {entry.prompt || entry.optionLabels.join(' · ')}
                </p>
                <span className="mt-1 block font-mono text-[10px] text-[#667085]">
                  {formatRelativeTime(entry.createdAt)} · {entry.optionLabels.length} options ·{' '}
                  {entry.confidencePct}%
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRestore(entry)}
                  title="Reload these options"
                  aria-label={`Reload options from ${entry.winnerLabel}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#252C39] bg-[#151922] text-[#98A2B3] transition-colors hover:border-[#E8B84B]/50 hover:text-[#F2F4F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  title="Remove from history"
                  aria-label={`Remove ${entry.winnerLabel} from history`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#252C39] bg-[#151922] text-[#7D8798] transition-colors hover:border-[#F87171]/40 hover:text-[#F87171] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
