import { useState, useCallback, type ReactNode } from 'react';
import en from '../i18n/en';
import zh from '../i18n/zh';
import { LanguageContext, type Language, type Translations } from './LanguageContext';

const translations: Record<Language, Translations> = { en, zh };

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
