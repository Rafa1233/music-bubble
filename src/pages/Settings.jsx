import React, { useRef, useState } from 'react';
import {
  Palette,
  Sliders,
  Sparkles,
  Image as ImageIcon,
  Video,
  Trash2,
  RotateCcw,
  Activity,
  Gauge,
} from 'lucide-react';
import {
  useTheme,
  ACCENT_PRESETS,
  BASE_THEMES,
} from '../context/ThemeContext';

export default function Settings() {
  const {
    settings,
    updateSetting,
    uploadCustomBackground,
    clearCustomBackground,
    resetAllSettings,
  } = useTheme();

  const [bgStatus, setBgStatus] = useState('');
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileRef = useRef(null);

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    setBgStatus('');
    const res = await uploadCustomBackground(file);
    setUploadingBg(false);
    if (!res.ok) {
      setBgStatus(res.error);
    } else if (res.type === 'video') {
      const m = Math.floor(res.duration / 60);
      const s = Math.round(res.duration % 60);
      setBgStatus(`Video latar aktif. Durasi: ${m}m ${s}d (Maks 30 menit).`);
    } else {
      setBgStatus('Foto latar berhasil dipasang dan tersimpan otomatis.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5 pb-6 max-w-3xl mx-auto text-main">
      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold text-main">Warna Aksen Dinamis</h2>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {ACCENT_PRESETS.map((preset) => {
            const active = settings.accentColor.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => updateSetting('accentColor', preset.hex)}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                  active
                    ? 'scale-105 ring-2 ring-emerald-400/60 glass-subtle'
                    : 'glass-subtle opacity-85 hover:opacity-100'
                }`}
              >
                <span className="w-7 h-7 rounded-full shadow-md" style={{ backgroundColor: preset.hex }} />
                <span className="text-[11px] font-medium truncate w-full text-center text-main">
                  {preset.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted">Atau pilih warna kustom bebas:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => updateSetting('accentColor', e.target.value)}
              className="w-9 h-9 rounded-full overflow-hidden border-0 bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono uppercase text-main">{settings.accentColor}</span>
          </label>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <ImageIcon className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold text-main">
            Latar Belakang, Kontras Teks & Media (Foto/Video Maks 30 Menit)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {Object.values(BASE_THEMES).map((t) => {
            const active = settings.baseTheme === t.id && !settings.useCustomGradient;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  updateSetting('useCustomGradient', false);
                  updateSetting('baseTheme', t.id);
                }}
                className={`p-3 rounded-2xl border text-left transition ${
                  active ? 'ring-2 ring-emerald-400/70 glass-subtle' : 'glass-subtle opacity-85 hover:opacity-100'
                }`}
              >
                <div
                  className="w-full h-8 rounded-lg mb-2 border border-black/15"
                  style={{ background: t.gradient }}
                />
                <p className="text-xs font-semibold text-main">{t.label}</p>
              </button>
            );
          })}
        </div>

        <div className="glass-subtle rounded-2xl p-3.5 space-y-2">
          <p className="text-xs font-semibold text-main">
            Kontras Warna Teks (Solusi Background Putih / Cerah)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'auto', label: 'Otomatis' },
              { id: 'dark', label: 'Teks Gelap' },
              { id: 'light', label: 'Teks Putih' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSetting('textContrastMode', opt.id)}
                className={`py-2 rounded-xl text-xs font-semibold transition ${
                  settings.textContrastMode === opt.id
                    ? 'text-zinc-950'
                    : 'glass-card text-main opacity-80'
                }`}
                style={
                  settings.textContrastMode === opt.id
                    ? { backgroundColor: settings.accentColor }
                    : undefined
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-subtle rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-main">
            <input
              type="checkbox"
              checked={settings.useCustomGradient}
              onChange={(e) => updateSetting('useCustomGradient', e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
            Gunakan Gradien Latar Kustom
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.customGradientStart}
              onChange={(e) => {
                updateSetting('useCustomGradient', true);
                updateSetting('customGradientStart', e.target.value);
              }}
              className="w-8 h-8 rounded cursor-pointer bg-transparent"
            />
            <span className="text-xs text-muted">→</span>
            <input
              type="color"
              value={settings.customGradientEnd}
              onChange={(e) => {
                updateSetting('useCustomGradient', true);
                updateSetting('customGradientEnd', e.target.value);
              }}
              className="w-8 h-8 rounded cursor-pointer bg-transparent"
            />
          </div>
        </div>

        <div className="glass-subtle rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 text-main">
                <Video className="w-4 h-4" style={{ color: settings.accentColor }} />
                Unggah Foto atau Video Latar
              </p>
              <p className="text-xs text-muted">
                JPG, PNG, GIF, MP4, WEBM (Video maks. 30 menit, tersimpan permanen).
              </p>
            </div>

            <input
              ref={bgFileRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleBgUpload}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploadingBg}
                onClick={() => bgFileRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-950"
                style={{ backgroundColor: settings.accentColor }}
              >
                {uploadingBg ? 'Memproses...' : 'Pilih Foto / Video'}
              </button>
              {settings.customBgMeta && (
                <button
                  type="button"
                  onClick={clearCustomBackground}
                  className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                  title="Hapus Media Latar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {bgStatus && <p className="text-xs text-emerald-400">{bgStatus}</p>}

          {settings.customBgMeta && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted truncate">
                Aktif: <span className="font-semibold text-main">{settings.customBgMeta.name}</span>
              </p>
              <div className="flex items-center justify-between text-xs text-main">
                <span>Kegelapan Lapisan Video/Foto</span>
                <span>{settings.customBgDim}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={85}
                value={settings.customBgDim}
                onChange={(e) => updateSetting('customBgDim', Number(e.target.value))}
                className="aura-slider w-full bg-black/20 rounded-full"
              />
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold text-main">Kustomisasi Kaca iOS Liquid Glass</h2>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-main">
            <span>Tingkat Blur Kaca</span>
            <span className="font-mono">{settings.glassBlur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={settings.glassBlur}
            onChange={(e) => updateSetting('glassBlur', Number(e.target.value))}
            className="aura-slider w-full bg-black/20 rounded-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-main">
            <span>Transparansi Bubble</span>
            <span className="font-mono">{settings.bubbleOpacity}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            value={settings.bubbleOpacity}
            onChange={(e) => updateSetting('bubbleOpacity', Number(e.target.value))}
            className="aura-slider w-full bg-black/20 rounded-full"
          />
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold text-main">Studio Animasi & Performa 120 FPS</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted mb-2">Efek Latar Ambient</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'orbs', label: 'Mesh Orbs' },
                { id: 'aurora', label: 'Aurora' },
                { id: 'particles', label: 'Bokeh' },
                { id: 'minimal', label: 'Minimal' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSetting('bgEffect', opt.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    settings.bgEffect === opt.id ? 'text-zinc-950' : 'glass-subtle text-main opacity-80'
                  }`}
                  style={settings.bgEffect === opt.id ? { backgroundColor: settings.accentColor } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Transisi Halaman (Home / Search / dll)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'liquid', label: 'iOS Liquid' },
                { id: 'scale', label: 'Elastic Pop' },
                { id: 'drift', label: 'Soft Drift' },
                { id: 'fade', label: 'Clean Fade' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSetting('pageTransition', opt.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    settings.pageTransition === opt.id ? 'text-zinc-950' : 'glass-subtle text-main opacity-80'
                  }`}
                  style={
                    settings.pageTransition === opt.id ? { backgroundColor: settings.accentColor } : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Animasi Kartu Lagu</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'spring', label: 'Spring' },
                { id: 'cascade', label: 'Cascade' },
                { id: 'calm', label: 'Tenang' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSetting('cardAnimation', opt.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    settings.cardAnimation === opt.id ? 'text-zinc-950' : 'glass-subtle text-main opacity-80'
                  }`}
                  style={
                    settings.cardAnimation === opt.id ? { backgroundColor: settings.accentColor } : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Gaya Cover Now Playing</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'glass', label: 'Glass' },
                { id: 'vinyl', label: 'Vinyl' },
                { id: 'float', label: 'Breathing' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSetting('artworkStyle', opt.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    settings.artworkStyle === opt.id ? 'text-zinc-950' : 'glass-subtle text-main opacity-80'
                  }`}
                  style={
                    settings.artworkStyle === opt.id ? { backgroundColor: settings.accentColor } : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-black/10">
          <div className="flex items-center gap-2.5">
            <Gauge className="w-4 h-4" style={{ color: settings.accentColor }} />
            <div>
              <p className="text-sm font-semibold text-main">Mode GPU 120 FPS Turbo</p>
              <p className="text-xs text-muted">Akselerasi animasi mulus 120Hz untuk HP modern</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSetting('highRefreshMode', !settings.highRefreshMode)}
            className="w-12 h-6 rounded-full p-1 transition-colors flex items-center"
            style={{
              backgroundColor: settings.highRefreshMode ? settings.accentColor : 'rgba(120,120,120,0.35)',
              justifyContent: settings.highRefreshMode ? 'flex-end' : 'flex-start',
            }}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow" />
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-black/10">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4" style={{ color: settings.accentColor }} />
            <div>
              <p className="text-sm font-semibold text-main">Audio Equalizer / Visualizer</p>
              <p className="text-xs text-muted">Animasi gelombang suara pada layar pemutar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSetting('visualizerEnabled', !settings.visualizerEnabled)}
            className="w-12 h-6 rounded-full p-1 transition-colors flex items-center"
            style={{
              backgroundColor: settings.visualizerEnabled ? settings.accentColor : 'rgba(120,120,120,0.35)',
              justifyContent: settings.visualizerEnabled ? 'flex-end' : 'flex-start',
            }}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow" />
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={resetAllSettings}
          className="glass-card px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 text-main"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Tema ke Default
        </button>
      </div>
    </div>
  );
}
