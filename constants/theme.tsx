import { createContext, useContext, useState, ReactNode } from 'react';

export interface ThemeColors {
  BACKGROUND_DARK: string;
  BACKGROUND_CARD: string;
  BACKGROUND_CARD_2: string;
  ACCENT_RED: string;
  ACCENT_CYAN: string;
  ACCENT_PURPLE: string;
  TEXT_PRIMARY: string;
  TEXT_SECONDARY: string;
  SUCCESS: string;
  WARNING: string;
  BORDER: string;
  CARD_GRADIENT: [string, string];
  STATS_GRADIENT: [string, string];
  isDark: boolean;
}

export const DARK: ThemeColors = {
  BACKGROUND_DARK: '#0A0A0A',
  BACKGROUND_CARD: '#141414',
  BACKGROUND_CARD_2: '#1C1C1E',
  ACCENT_RED: '#FF3B5C',
  ACCENT_CYAN: '#00C6D7',
  ACCENT_PURPLE: '#7B2FFF',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A0A0A0',
  SUCCESS: '#00D48A',
  WARNING: '#FFB800',
  BORDER: '#2A2A2A',
  CARD_GRADIENT: ['#1C1C2E', '#141420'],
  STATS_GRADIENT: ['#1C1040', '#0E0820'],
  isDark: true,
};

export const LIGHT: ThemeColors = {
  BACKGROUND_DARK: '#F4F4F9',
  BACKGROUND_CARD: '#FFFFFF',
  BACKGROUND_CARD_2: '#EDEDF6',
  ACCENT_RED: '#FF3B5C',
  ACCENT_CYAN: '#0099AA',
  ACCENT_PURPLE: '#7B2FFF',
  TEXT_PRIMARY: '#111827',
  TEXT_SECONDARY: '#64748B',
  SUCCESS: '#059669',
  WARNING: '#D97706',
  BORDER: '#E2E2EC',
  CARD_GRADIENT: ['#EEE9FF', '#E5DCFF'],
  STATS_GRADIENT: ['#F0EAFF', '#E8E0FF'],
  isDark: false,
};

interface ThemeCtx {
  c: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ c: LIGHT, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  return (
    <ThemeContext.Provider value={{ c: dark ? DARK : LIGHT, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
