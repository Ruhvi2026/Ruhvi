'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface PortalThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
}

const PortalThemeContext = createContext<PortalThemeContextValue>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
});

const STORAGE_KEY = 'ruhvi-portal-theme';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const isProduction =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('ruhvi.in');
  const domainPart = isProduction ? '; domain=.ruhvi.in' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax${domainPart}`;
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  // 1. Try reading cross-subdomain cookie
  const cookieVal = getCookie(STORAGE_KEY) as ThemeMode | null;
  if (cookieVal === 'light' || cookieVal === 'dark' || cookieVal === 'system') {
    return cookieVal;
  }

  // 2. Try reading origin localStorage
  try {
    const localVal = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (localVal === 'light' || localVal === 'dark' || localVal === 'system') {
      return localVal;
    }
  } catch {}

  // 3. Default to 'light' (flagship champagne luxury portal design)
  return 'light';
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function PortalThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('light');

  // On mount, read from shared cookie / localStorage
  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    try {
      localStorage.setItem(STORAGE_KEY, initial);
    } catch {}
    setCookie(STORAGE_KEY, initial);

    const resolved = initial === 'system' ? getSystemTheme() : initial;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
    setCookie(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return (
    <PortalThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}
