export type ThemeMode = 'light' | 'dark' | 'auto';
export type Field = 'cyan' | 'pink' | 'yellow' | 'lime';

const THEME_KEY = 'arcadia-theme';

/** Grava e aplica o tema (data-theme no <html>); sem argumento, restaura a escolha salva. */
export function applyTheme(mode?: ThemeMode): ThemeMode {
  const root = document.documentElement;
  let dark = false;
  try {
    if (mode) {
      localStorage.setItem(THEME_KEY, mode);
    } else {
      const urlTheme = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('theme') as ThemeMode | null : null;
      mode = (urlTheme === 'dark' || urlTheme === 'light' || urlTheme === 'auto')
        ? urlTheme
        : (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
    }
  } catch {
    mode = mode || 'light';
  }

  if (mode === 'auto') {
    dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else {
    dark = mode === 'dark';
  }

  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-mode', mode);
  return mode;
}

/** Grava e aplica "Reduzir movimento" (data-motion no <html>); sem argumento, restaura. */
export function applyMotion(reduced?: boolean): boolean {
  const root = document.documentElement;
  if (reduced == null) {
    try {
      reduced = localStorage.getItem(THEME_KEY + '-motion') === 'reduced';
    } catch {
      reduced = false;
    }
  } else {
    try {
      localStorage.setItem(THEME_KEY + '-motion', reduced ? 'reduced' : 'full');
    } catch {}
  }

  if (reduced) {
    root.setAttribute('data-motion', 'reduced');
  } else {
    root.removeAttribute('data-motion');
  }
  return !!reduced;
}

/** Grava e aplica o tamanho do texto (data-text no <html>); sem argumento, restaura. */
export function applyTextSize(size?: 'default' | 'large'): 'default' | 'large' {
  const root = document.documentElement;
  if (size == null) {
    try {
      size = (localStorage.getItem(THEME_KEY + '-text') as 'default' | 'large') || 'default';
    } catch {
      size = 'default';
    }
  } else {
    try {
      localStorage.setItem(THEME_KEY + '-text', size);
    } catch {}
  }

  if (size === 'large') {
    root.setAttribute('data-text', 'large');
  } else {
    root.removeAttribute('data-text');
  }
  return size;
}

/** Grava e aplica a cor de destaque (data-accent no <html>). */
export function applyAccent(tone: Field): Field {
  const root = document.documentElement;
  if (tone) {
    root.setAttribute('data-accent', tone);
    try {
      localStorage.setItem(THEME_KEY + '-accent', tone);
    } catch {}
  }
  return tone;
}

export function getStoredTheme(): ThemeMode {
  try {
    return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
  } catch {
    return 'light';
  }
}

export function getStoredAccent(): Field {
  try {
    return (localStorage.getItem(THEME_KEY + '-accent') as Field) || 'cyan';
  } catch {
    return 'cyan';
  }
}

export function getStoredMotion(): boolean {
  try {
    return localStorage.getItem(THEME_KEY + '-motion') === 'reduced';
  } catch {
    return false;
  }
}

export function getStoredTextSize(): 'default' | 'large' {
  try {
    return (localStorage.getItem(THEME_KEY + '-text') as 'default' | 'large') || 'default';
  } catch {
    return 'default';
  }
}
