import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en from '../i18n/en';
import zh from '../i18n/zh';

type Language = 'en' | 'zh';
type Translations = typeof en;

interface LanguageContextType {
  lang: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const translations: Record<Language, Translations> = { en, zh };

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'zh' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('language', newLang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
