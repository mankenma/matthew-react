import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { BaseFormat } from '../engine/payouts';
import { type SideBetConfig, type SideBetId, defaultSideBetConfig } from '../engine/sidebets';
import { usePersistentState } from './persist';

export interface AppConfig {
  baseFormat: BaseFormat;
  sideBets: SideBetConfig;
  enabledSideBets: SideBetId[];
  startingBankroll: number;
  showTips: boolean;
  squeeze: boolean;
}

const DEFAULT_ENABLED: SideBetId[] = [
  'playerPair',
  'bankerPair',
  'perfectPair',
  'tiger',
  'tigerPair',
  'lucky6',
  'lucky7',
];

const DEFAULT_CONFIG: AppConfig = {
  baseFormat: 'commission',
  sideBets: defaultSideBetConfig,
  enabledSideBets: DEFAULT_ENABLED,
  startingBankroll: 1000,
  showTips: true,
  squeeze: true,
};

interface ConfigContextValue {
  config: AppConfig;
  setConfig: (v: AppConfig | ((p: AppConfig) => AppConfig)) => void;
  toggleSideBet: (id: SideBetId) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig, resetConfig] = usePersistentState<AppConfig>('bt:config', DEFAULT_CONFIG);

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      setConfig,
      resetConfig,
      toggleSideBet: (id: SideBetId) =>
        setConfig((p) => ({
          ...p,
          enabledSideBets: p.enabledSideBets.includes(id)
            ? p.enabledSideBets.filter((x) => x !== id)
            : [...p.enabledSideBets, id],
        })),
    }),
    [config, setConfig, resetConfig],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
