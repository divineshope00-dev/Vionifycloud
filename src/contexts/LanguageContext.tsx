import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { db } from '../services/supabaseService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const user = db.getCurrentUser();
    if (user && user.language) {
      return user.language as Language;
    }
    const saved = localStorage.getItem('vionify_lang');
    return (saved === 'fr' || saved === 'en') ? saved : 'fr';
  });

  // Listen for user changes to update language if needed
  useEffect(() => {
    const handleUserChange = () => {
      const user = db.getCurrentUser();
      if (user && user.language) {
        setLanguageState(user.language as Language);
      } else {
        // Fallback to global setting when logged out or user has no language preference
        const saved = localStorage.getItem('vionify_lang');
        setLanguageState((saved === 'fr' || saved === 'en') ? saved as Language : 'fr');
      }
    };

    // We need a way to know when the user logs in/out. 
    // Since db uses localStorage, we can listen to storage events
    // or custom events if we dispatch them.
    window.addEventListener('user-changed', handleUserChange);
    window.addEventListener('storage', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const user = db.getCurrentUser();
    if (user) {
      db.updateUser({ language: lang });
    } else {
      localStorage.setItem('vionify_lang', lang);
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations['fr'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
