export type ThemeMode = 'dark' | 'light';

export interface AccentColorPreset {
  id: string;
  name: string;
  color: string;
}

export const PRESET_ACCENT_COLORS: AccentColorPreset[] = [
  { id: 'sky', name: 'Sky Blue', color: '#0ea5e9' },
  { id: 'cyan', name: 'Neon Cyan', color: '#06b6d4' },
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'amber', name: 'Sunset Amber', color: '#f59e0b' },
  { id: 'violet', name: 'Royal Violet', color: '#8b5cf6' },
  { id: 'pink', name: 'Neon Pink', color: '#ec4899' },
  { id: 'crimson', name: 'Crimson Red', color: '#ef4444' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(char => char + char).join('');
  }
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 150 ? '#090d16' : '#ffffff';
}

export function applyTheme(mode: ThemeMode, accentColor: string) {
  try {
    const root = document.documentElement;
    if (!root) return;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    const rgb = hexToRgb(accentColor) || { r: 14, g: 165, b: 233 };
    const contrast = getContrastColor(accentColor);

    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.style.setProperty('--accent-contrast', contrast);
    root.style.setProperty('--color-sky-50', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
    root.style.setProperty('--color-sky-100', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
    root.style.setProperty('--color-sky-200', accentColor);
    root.style.setProperty('--color-sky-300', accentColor);
    root.style.setProperty('--color-sky-400', accentColor);
    root.style.setProperty('--color-sky-500', accentColor);
    root.style.setProperty('--color-sky-600', accentColor);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hotdogdot_theme', mode);
      localStorage.setItem('hotdogdot_accent_color', accentColor);
    }
  } catch (err) {
    console.warn('Failed to apply theme:', err);
  }
}

export function getSavedTheme(): ThemeMode {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('hotdogdot_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
  } catch {}
  return 'dark';
}

export function getSavedAccentColor(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('hotdogdot_accent_color');
      if (saved && /^#[0-9A-Fa-f]{6}$/.test(saved)) return saved;
    }
  } catch {}
  return '#0ea5e9';
}
