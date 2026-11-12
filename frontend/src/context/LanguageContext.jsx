import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TRANSLATIONS } from '../i18n/translations';

const STORAGE_KEY = 'mediconnect_lang';
const DEFAULT_LANGUAGE = 'te'; // Telugu as default per project requirements

const LanguageContext = createContext(null);

/**
 * Resolves a dotted path (e.g., 'welcome.heroTitle') within an object.
 */
const resolvePath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'te' || stored === 'en') {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read language preference from localStorage:', e);
    }
    return DEFAULT_LANGUAGE;
  });

  // Synchronize document attributes whenever language changes
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      if (document.body) {
        document.body.classList.remove('lang-te', 'lang-en');
        document.body.classList.add(`lang-${language}`);
      }
      localStorage.setItem(STORAGE_KEY, language);
    } catch (e) {
      console.warn('Failed to persist language preference:', e);
    }
  }, [language]);

  const setLanguage = useCallback((newLang) => {
    if (newLang === 'te' || newLang === 'en') {
      setLanguageState(newLang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'te' ? 'en' : 'te'));
  }, []);

  /**
   * Safe translation getter with fallback guarantee.
   * 1. Check active language dictionary.
   * 2. Fall back to English dictionary.
   * 3. Fall back to key itself.
   * Missing translations never throw or crash the UI.
   */
  const t = useCallback((key, params = null) => {
    if (!key) return '';

    let text = resolvePath(TRANSLATIONS[language], key);

    // Fallback to English if missing in current language
    if (text === undefined && language !== 'en') {
      text = resolvePath(TRANSLATIONS['en'], key);
    }

    // Ultimate fallback to key itself
    if (text === undefined) {
      text = key;
    }

    // Interpolate dynamic parameters if provided (e.g. {name: 'Dr. Rao'})
    if (params && typeof params === 'object' && typeof text === 'string') {
      return Object.entries(params).reduce((acc, [pKey, pVal]) => {
        return acc.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }, text);
    }

    return text;
  }, [language]);

  const value = useMemo(() => ({
    language,
    isTelugu: language === 'te',
    isEnglish: language === 'en',
    setLanguage,
    toggleLanguage,
    t
  }), [language, setLanguage, toggleLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;

