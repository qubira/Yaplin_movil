import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Locale, ENABLED_LOCALES, DEFAULT_LOCALE } from '../translations/locales';
import { dictionaries, getDictionary } from '../translations';

const LOCALE_KEY = 'yaplin.locale.v1';

interface LocaleCtxValue {
  locale: Locale;
  hydrated: boolean;
  setLocale: (l: Locale) => void;
  t: typeof dictionaries['es'];
}

const LocaleContext = createContext<LocaleCtxValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCALE_KEY);
        if (raw && ENABLED_LOCALES.includes(raw as Locale)) {
          setLocaleState(raw as Locale);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(LOCALE_KEY, locale).catch(() => {});
  }, [locale, hydrated]);

  const value = useMemo<LocaleCtxValue>(() => ({
    locale,
    hydrated,
    setLocale: (l: Locale) => {
      if (!ENABLED_LOCALES.includes(l)) return;
      setLocaleState(l);
    },
    t: getDictionary(locale),
  }), [locale, hydrated]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleCtxValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}

export function useTranslation() {
  return useLocale().t;
}
