import { createContext, useContext } from 'react';
import type en from '../i18n/en';

// The provider lives in LanguageProvider.tsx so this file has no components (keeps fast refresh happy)

export type Language = 'en' | 'zh';
export type Translations = typeof en;

export interface LanguageContextType {
  lang: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
