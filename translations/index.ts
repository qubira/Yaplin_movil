import es from './es';
import en from './en';
import { Locale } from './locales';

export const dictionaries: Record<'es' | 'en', typeof es> = { es, en };

export function getDictionary(locale: Locale) {
  return locale === 'en' ? dictionaries.en : dictionaries.es;
}
