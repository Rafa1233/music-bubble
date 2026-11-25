import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { saveBlobToIDB, getBlobFromIDB, deleteBlobFromIDB } from '../utils/idbStorage';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'aurasound_theme_settings_v3';
const CUSTOM_BG_IDB_KEY = 'custom_bg_media_blob';
export const MAX_BG_VIDEO_SECONDS = 30 * 60;

export const ACCENT_PRESETS = [
  { name: 'Emerald Spotify', hex: '#10b981' },
  { name: 'Electric Violet', hex: '#8b5cf6' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
  { name: 'Sunset Coral', hex: '#f97316' },
  { name: 'Royal Gold', hex: '#eab308' },
  { name: 'Rose Pink', hex: '#ec4899' },
];

export const BASE_THEMES = {
  amoled: {
    id: 'amoled',
    label: 'Deep Dark (AMOLED)',
    bg: '#040406',
    gradient: 'radial-gradient(circle at 20% 20%, #111827 0%, #040406 60%, #000000 100%)',
    isLight: false,
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Glass',
    bg: '#090d1a',
    gradient: 'linear-gradient(135deg, #090d1a 0%, #131b36 50%, #0b1120 100%)',
    isLight: false,
  },
  light: {
    id: 'light',
    label: 'Soft Light Glass (Putih)',
    bg: '#f1f5f9',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #e0ecff 50%, #f3e8ff 100%)',
    isLight: true,
  },
};

const DEFAULT_SETTINGS = {
  accentColor: '#10b981',
  baseTheme: 'midnight',
  textContrastMode: 'auto',
  customGradientStart: '#0f172a',
  customGradientEnd: '#1e1b4b',
  useCustomGradient: false,
  glassBlur: 22,
  bubbleOpacity: 12,
  visualizerEnabled: true,
  bgEffect: 'orbs',
  pageTransition: 'liquid',
  cardAnimation: 'spring',
  profileAnimation: 'aurora',
  artworkStyle: 'glass',
  highRefreshMode: true,
  customBgMeta: null,
  customBgDim: 40,
};

function hexToRgbTuple(hex) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return '16, 185, 129';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function isHexLight(hex) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62;
}

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [customBgUrl, setCustomBgUrl] = useState(null);

  useEffect(() => {
    let activeUrl = null;
    if (settings.customBgMeta) {
      getBlobFromIDB(CUSTOM_BG_IDB_KEY)
        .then((blob) => {
          if (blob) {
            activeUrl = URL.createObjectURL(blob);
            setCustomBgUrl(activeUrl);
          }
        })
        .catch(() => {});
    } else {
      setCustomBgUrl(null);
    }
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [settings.customBgMeta]);

  const computeIsLightMode = () => {
    if (settings.textContrastMode === 'dark') return true;
    if (settings.textContrastMode === 'light') return false;
    if (settings.customBgMeta) return false;
    if (settings.useCustomGradient) {
      return isHexLight(settings.customGradientStart) || isHexLight(settings.customGradientEnd);
    }
    return Boolean(BASE_THEMES[settings.baseTheme]?.isLight);
  };

  const isLightMode = computeIsLightMode();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // abaikan
    }

    const root = document.documentElement;
    root.style.setProperty('--accent-color', settings.accentColor);
    root.style.setProperty('--accent-rgb', hexToRgbTuple(settings.accentColor));
    root.style.setProperty('--glass-blur', `${settings.glassBlur}px`);
    root.style.setProperty('--bubble-opacity', String(settings.bubbleOpacity / 100));
    root.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
  }, [settings, isLightMode]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const uploadCustomBackground = useCallback(async (file) => {
    if (!file) return { ok: false, error: 'Tidak ada file dipilih.' };
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      return { ok: false, error: 'Format harus gambar (JPG/PNG/WEBP/GIF) atau video (MP4/WEBM).' };
    }

    let duration = 0;
    if (isVideo) {
      duration = await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const tempUrl = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          const dur = video.duration || 0;
          URL.revokeObjectURL(tempUrl);
          resolve(dur);
        };
        video.onerror = () => {
          URL.revokeObjectURL(tempUrl);
          reject(new Error('Gagal membaca video.'));
        };
        video.src = tempUrl;
      }).catch(() => -1);

      if (duration < 0) {
        return { ok: false, error: 'Video tidak dapat diputar oleh browser.' };
      }
      if (duration > MAX_BG_VIDEO_SECONDS) {
        return {
          ok: false,
          error: `Durasi video (${Math.round(duration / 60)} menit) melebihi batas maksimal 30 menit.`,
        };
      }
    }

    await saveBlobToIDB(CUSTOM_BG_IDB_KEY, file);
    setSettings((prev) => ({
      ...prev,
      customBgMeta: {
        type: isVideo ? 'video' : 'image',
        name: file.name,
        duration: Math.round(duration),
      },
    }));

    return { ok: true, type: isVideo ? 'video' : 'image', duration };
  }, []);

  const clearCustomBackground = useCallback(async () => {
    await deleteBlobFromIDB(CUSTOM_BG_IDB_KEY).catch(() => {});
    setCustomBgUrl(null);
    setSettings((prev) => ({ ...prev, customBgMeta: null }));
  }, []);

  const resetAllSettings = useCallback(async () => {
    await deleteBlobFromIDB(CUSTOM_BG_IDB_KEY).catch(() => {});
    setCustomBgUrl(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        settings,
        customBgUrl,
        isLightMode,
        updateSetting,
        uploadCustomBackground,
        clearCustomBackground,
        resetAllSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus digunakan di dalam ThemeProvider');
  return ctx;
}
