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
    isLightMode,
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
      setBgStatus(`Video latar aktif! Durasi: ${m}m ${s}d (Maks 30 menit).`);
    } else {
      setBgStatus('Foto latar berhasil dipasang dan tersimpan otomatis!');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5 pb-4 max-w-3xl mx-auto">
      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className={`text-base font-heading font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Warna Aksen Dinamis
          </h2>
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
                  active ? 'border-white/60 bg-white/15 scale-105' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="w-7 h-7 rounded-full shadow-md" style={{ backgroundColor: preset.hex }} />
                <span className="text-[11px] font-medium truncate w-full text-center">
                  {preset.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs opacity-75">Atau pilih warna kustom bebas:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => updateSetting('accentColor', e.target.value)}
              className="w-9 h-9 rounded-full overflow-hidden border-0 bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono uppercase">{settings.accentColor}</span>
          </label>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <ImageIcon className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold">
            Latar Belakang & Media Kustom (Foto / Video Maks 30 Menit)
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
                  active ? 'border-white/60 bg-white/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div
                  className="w-full h-8 rounded-lg mb-2 border border-white/15"
                  style={{ background: t.gradient }}
                />
                <p className="text-xs font-semibold">{t.label}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white/5 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
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
            <span className="text-xs opacity-60">→</span>
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

        <div className="rounded-2xl bg-white/5 p-4 space-y-3 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Video className="w-4 h-4" style={{ color: settings.accentColor }} />
                Unggah Foto atau Video Latar
              </p>
              <p className="text-xs opacity-65">
                Mendukung JPG, PNG, GIF, MP4, WEBM (Video maks. 30 menit, tersimpan permanen di perangkat).
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
                  className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  title="Hapus Media Latar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {bgStatus && <p className="text-xs text-emerald-300">{bgStatus}</p>}

          {settings.customBgMeta && (
            <div className="space-y-2 pt-1">
              <p className="text-xs opacity-75 truncate">
                Aktif: <span className="font-semibold">{settings.customBgMeta.name}</span>
              </p>
              <div className="flex items-center justify-between text-xs">
                <span>Kegelapan Lapisan Video/Foto</span>
                <span>{settings.customBgDim}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={85}
                value={settings.customBgDim}
                onChange={(e) => updateSetting('customBgDim', Number(e.target.value))}
                className="aura-slider w-full bg-white/20 rounded-full"
              />
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold">Kustomisasi Kaca Bubble UI</h2>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Tingkat Blur Kaca</span>
            <span className="font-mono">{settings.glassBlur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={settings.glassBlur}
            onChange={(e) => updateSetting('glassBlur', Number(e.target.value))}
            className="aura-slider w-full bg-white/20 rounded-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Transparansi Bubble</span>
            <span className="font-mono">{settings.bubbleOpacity}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            value={settings.bubbleOpacity}
            onChange={(e) => updateSetting('bubbleOpacity', Number(e.target.value))}
            className="aura-slider w-full bg-white/20 rounded-full"
          />
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5" style={{ color: settings.accentColor }} />
          <h2 className="text-base font-heading font-bold">Studio Animasi & Efek Visual</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs opacity-75 mb-2">Efek Latar Ambient</p>
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
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    settings.bgEffect === opt.id ? 'bg-white/20 border-white/50' : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs opacity-75 mb-2">Transisi Halaman (Home / Search / dll)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'liquid', label: 'Liquid Slide' },
                { id: 'scale', label: 'Elastic Pop' },
                { id: 'drift', label: 'Soft Drift' },
                { id: 'fade', label: 'Clean Fade' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSetting('pageTransition', opt.id)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    settings.pageTransition === opt.id ? 'bg-white/20 border-white/50' : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs opacity-75 mb-2">Animasi Kartu Lagu</p>
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
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    settings.cardAnimation === opt.id ? 'bg-white/20 border-white/50' : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs opacity-75 mb-2">Gaya Cover Now Playing</p>
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
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    settings.artworkStyle === opt.id ? 'bg-white/20 border-white/50' : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4" style={{ color: settings.accentColor }} />
            <div>
              <p className="text-sm font-semibold">Audio Equalizer / Visualizer</p>
              <p className="text-xs opacity-65">Animasi gelombang suara pada layar pemutar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSetting('visualizerEnabled', !settings.visualizerEnabled)}
            className="w-12 h-6 rounded-full p-1 transition-colors flex items-center"
            style={{
              backgroundColor: settings.visualizerEnabled ? settings.accentColor : 'rgba(255,255,255,0.2)',
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
          className="glass-card px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 opacity-80 hover:opacity-100"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Tema ke Default
        </button>
      </div>
    </div>
  );
}
