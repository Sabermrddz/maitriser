import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import en from '../locales/en.js';
import fr from '../locales/fr.js';

const locales = { en, fr };
const LanguageContext = createContext();
export { LanguageContext };

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    console.warn('[i18n] LanguageContext not found — using fallback');
    return { t: (key) => key, lang: 'en', setLang: () => {} };
  }
  const t = (key, params = {}) => {
    const str = ctx.langData[key] || key;
    if (str === key) console.warn(`[i18n] Missing key: "${key}" in lang "${ctx.lang}"`);
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

  console.log('[i18n] LanguageProvider rendered', { lang, keys: Object.keys(langData).length });

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
