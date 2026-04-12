import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCcw, Info, ShieldCheck, KeyRound } from 'lucide-react';

const loadingPhrases = [
  'Routing your dilemma through the decision graph...',
  'Calibrating confidence thresholds...',
  'Comparing the two strongest outcomes...',
  'Reducing overthinking to one clear answer...',
  'Locking in a final recommendation...',
];

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function App() {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    if (isAnalyzing) {
      interval = window.setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 1600);
    } else {
      setLoadingPhraseIndex(0);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [isAnalyzing]);

  const isPromptValid = input.trim().length > 0 && input.trim().length <= 500;
  const hasApiKey = apiKey.trim().length > 20;

  const handleDecide = async () => {
    const prompt = input.trim();
    const userApiKey = apiKey.trim();

    if (!isPromptValid || !hasApiKey) {
      if (!hasApiKey) {
        setError('Add your Gemini API key to run a decision.');
      }
      return;
    }

    setError(null);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/decide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, apiKey: userApiKey }),
      });

      const payload = (await response.json()) as { decision?: string; error?: string };

      if (!response.ok || !payload.decision) {
        throw new Error(payload.error || 'Unable to decide right now.');
      }

      setTimeout(() => {
        setResult(payload.decision ?? null);
        setIsAnalyzing(false);
      }, 700);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to decide right now.';
      setTimeout(() => {
        setError(message);
        setIsAnalyzing(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0f1115] text-[#e8eaed]">
      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[150%] -translate-x-1/2 bg-gradient-to-b from-[#4285F4]/20 via-[#34A853]/6 to-transparent blur-[110px]" />

        <header className="relative z-10 flex items-center justify-between py-2">
          <a href="#top" className="flex items-center gap-3" aria-label="Unthink AI homepage">
            <GoogleMark />
            <span className="text-xl font-semibold tracking-tight text-[#e8eaed]">Unthink AI</span>
          </a>
          <span className="rounded-full border border-[#2c3136] bg-[#171a1f] px-3 py-1 text-xs font-medium text-[#9aa0a6]">
            BYO key only
          </span>
        </header>

        <div id="top" className="relative z-10 mt-6 grid flex-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
          <section className="text-center lg:self-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2c3136] bg-[#171a1f] px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#8ab4f8]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9aa0a6]">Decision Engine</span>
            </div>
            <h1 className="mb-5 text-[38px] font-semibold leading-[1.08] tracking-tight text-[#e8eaed] sm:text-[44px]">
              Ask once.
              <br />
              <span className="bg-gradient-to-r from-[#8ab4f8] via-[#81c995] to-[#fbbc04] bg-clip-text text-transparent">
                Get one answer.
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-[#9aa0a6] lg:mx-0">
              A cleaner, faster way to stop overthinking small choices, with your own Gemini API key.
            </p>
          </section>

          <section className="relative flex min-h-[500px] flex-col gap-4">
            <div className="rounded-3xl border border-[#2c3136] bg-[#171a1f] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
              <label htmlFor="api-key" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9aa0a6]">
                Gemini API key
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#2c3136] bg-[#111419] px-4 py-3 focus-within:border-[#8ab4f8]/70">
                <KeyRound className="h-4 w-4 text-[#8ab4f8]" aria-hidden="true" />
                <input
                  id="api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-transparent text-sm text-[#e8eaed] placeholder:text-[#5f6368] focus:outline-none"
                  aria-describedby="api-key-help"
                />
              </div>
              <div className="mt-2">
                <p id="api-key-help" className="text-xs text-[#9aa0a6]">
                  Key is required for every request and is only held in memory for this session.
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-[#2c3136] bg-[#171a1f] shadow-[0_20px_40px_rgba(0,0,0,0.28)] transition-all duration-300 focus-within:border-[#8ab4f8]/60">
              <label htmlFor="dilemma" className="sr-only">
                Describe your dilemma
              </label>
              <textarea
                id="dilemma"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                placeholder="Should I book the trip now or wait one week?"
                className="min-h-[250px] flex-1 resize-none bg-transparent p-7 text-xl font-medium leading-relaxed text-[#e8eaed] placeholder:text-[#5f6368] focus:outline-none sm:text-2xl"
                maxLength={500}
              />

              <div className="flex items-center justify-between border-t border-[#2c3136] bg-[#14171c] px-7 py-5">
                <div className="flex gap-4" aria-hidden="true">
                  <Info className="h-5 w-5 text-[#5f6368]" />
                  <ShieldCheck className="h-5 w-5 text-[#5f6368]" />
                </div>
                <span className="text-xs font-semibold text-[#5f6368]">{input.length} / 500</span>
              </div>
            </div>

            {error && <p className="rounded-xl border border-[#5f2a2a] bg-[#261617] px-4 py-3 text-sm text-[#f6c6c6]">{error}</p>}

            <button
              type="button"
              onClick={handleDecide}
              disabled={!isPromptValid || !hasApiKey || isAnalyzing}
              className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05]" />
              <span className="relative flex items-center justify-center gap-2 rounded-2xl bg-[#12151b] py-4 text-lg font-semibold text-[#e8eaed] transition-colors group-hover:bg-transparent">
                {isAnalyzing ? 'Resolving...' : 'Resolve'}
                {isAnalyzing ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              </span>
            </button>
          </section>
        </div>

        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0f1115]/95 p-8 text-center backdrop-blur-xl"
              aria-live="polite"
            >
              <div className="relative mb-10 h-20 w-20">
                <div className="absolute inset-0 rounded-full border-[5px] border-[#4285F4]/20" />
                <div className="absolute inset-0 animate-spin rounded-full border-[5px] border-[#8ab4f8] border-t-transparent" />
                <div className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center">
                  <GoogleMark />
                </div>
              </div>
              <motion.p
                key={loadingPhraseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl px-4 text-2xl font-semibold tracking-tight text-[#e8eaed]"
              >
                {loadingPhrases[loadingPhraseIndex]}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 180 }}
              className="absolute inset-0 z-50 flex flex-col bg-gradient-to-br from-[#1a73e8] via-[#188038] to-[#fbbc04] p-4"
            >
              <div className="relative mb-4 mt-8 flex flex-1 flex-col justify-center overflow-hidden rounded-[40px] border border-white/15 bg-[#11151b]/70 px-7 pb-10 pt-8 shadow-2xl backdrop-blur-[30px] sm:px-10 sm:pb-14 sm:pt-10">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2
                  className={`mb-8 font-semibold leading-[1.12] tracking-tight text-white ${
                    result.length < 40 ? 'text-[42px]' : result.length < 80 ? 'text-[34px]' : 'text-[28px]'
                  }`}
                >
                  {result}
                </h2>
                <p className="mb-10 text-base font-medium text-white/85">One answer, no second guessing.</p>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                  className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-[#0f1115] transition-all active:scale-[0.99]"
                >
                  Ask another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
