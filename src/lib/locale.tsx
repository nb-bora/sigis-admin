import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { messagesFr } from "@/locales/messages.fr";
import { messagesEn } from "@/locales/messages.en";

export type AppLocale = "fr" | "en";

const STORAGE_KEY = "sigis_locale";

const messagesByLocale: Record<AppLocale, Record<string, string>> = {
  fr: messagesFr,
  en: messagesEn,
};

function readStoredLocale(): AppLocale {
  try {
    const s = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (s === "en" || s === "fr") return s;
  } catch {
    /* ignore */
  }
  return "fr";
}

/** Pour l’API hors React (erreurs 401, etc.). */
export function getStoredLocale(): AppLocale {
  return readStoredLocale();
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

/**
 * Traduction hors composant (ex. `api.ts`).
 * Retourne la clé si absente du catalogue (repli sûr).
 */
export function translate(
  locale: AppLocale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = messagesByLocale[locale];
  const raw = dict[key] ?? key;
  return interpolate(raw, vars);
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  readonly children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  useEffect(() => {
    document.documentElement.lang = locale === "fr" ? "fr" : "en";
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
