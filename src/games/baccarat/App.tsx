import { useState } from 'react';
import { Settings } from 'lucide-react';
import { ConfigProvider } from './store/config';
import { SettingsPanel } from './components/SettingsPanel';
import { PlayerMode } from './modes/player/PlayerMode';
import { DealerMode } from './modes/dealer/DealerMode';

type Mode = 'player' | 'dealer';

export default function App() {
  return (
    <ConfigProvider>
      <Shell />
    </ConfigProvider>
  );
}

function Shell() {
  const [mode, setMode] = useState<Mode>('player');
  const [settings, setSettings] = useState(false);

  return (
    <div className="mx-auto min-h-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <a
            href="/links"
            className="mb-1 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-brass"
          >
            ← Back to Links
          </a>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-bone sm:text-3xl">
            Baccarat <span className="brass-text">Trainer</span>
          </h1>
          <p className="mt-0.5 text-xs uppercase tracking-[0.25em] text-white/55">High-limit discipline · 8-deck punto banco</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/10 bg-charcoal-2 p-1">
            {(['player', 'dealer'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  mode === m ? 'bg-brass text-charcoal' : 'text-white/55 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSettings(true)}
            className="rounded-xl border border-white/10 bg-charcoal-2 p-3 text-white/60 hover:border-brass/50 hover:text-brass"
            aria-label="Settings"
          >
            <Settings size={20} aria-hidden />
          </button>
        </div>
      </header>

      {mode === 'player' ? <PlayerMode /> : <DealerMode />}

      <footer className="mt-8 text-center text-[11px] text-white/40">
        Practice only · no real money. Banker carries the lowest edge; side bets are sucker bets; the board is noise.
      </footer>

      <SettingsPanel open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
