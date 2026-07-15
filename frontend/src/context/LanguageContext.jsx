import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import en from '../locales/en';
import fr from '../locales/fr';

const locales = { en, fr };
const LanguageContext = createContext();
export { LanguageContext };

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { t: (key) => key, lang: 'en', setLang: () => {} };
  const t = (key, params = {}) => {
    const str = ctx.langData[key] || key;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  };
  return { t, lang: ctx.lang, setLang: ctx.setLang };
};

export const LanguageProvider = ({ children }) => {
  let saved = 'fr';
  try { saved = localStorage.getItem('lang') || 'fr'; } catch { /* localStorage not available */ }
  const [lang, setLangState] = useState(saved === 'en' ? 'en' : 'fr');

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  }, []);

  const langData = locales[lang] || fr;
  const value = useMemo(() => ({ lang, setLang, langData }), [lang, setLang, langData]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
