import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  Mic2,
  Music2,
  Sliders,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { playSpecialSfx } from '../utils/audioFxEngine';

function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FullPlayerWithLyrics() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    audioError,
    currentTime,
    duration,
    volume,
    shuffle,
    repeatMode,
    audioFx,
    isFullPlayerOpen,
    dominantColor,
    lyricsData,
    lyricsOffset,
    setIsFullPlayerOpen,
    setLyricsOffset,
    setShuffle,
    updateFx,
    applyFxPreset,
    searchLyricsManual,
    applyManualLyrics,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    changeVolume,
    cycleRepeat,
    isLiked,
    toggleLike,
  } = useAudio();
  const { settings } = useTheme();

  const [mobilePane, setMobilePane] = useState('player'); // 'player' | 'lyrics' | 'fx'
  const [showFxDesktop, setShowFxDesktop] = useState(false);
  const [lyricSearchOpen, setLyricSearchOpen] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricResults, setLyricResults] = useState([]);
  const [searchingLyric, setSearchingLyric] = useState(false);

  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  const effectiveTime = currentTime + lyricsOffset;

  const activeLyricIndex = useMemo(() => {
    const synced = lyricsData.synced;
    if (!synced || synced.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (effectiveTime >= synced[i].time - 0.15) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyricsData.synced, effectiveTime]);

  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex]);

  useEffect(() => {
    if (currentTrack) {
      setLyricQuery(`${currentTrack.artist} ${currentTrack.title}`);
      setLyricResults([]);
      setLyricSearchOpen(false);
    }
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  const isLongTitle = currentTrack.title.length > 26;
  const liked = isLiked(currentTrack.id);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleManualLyricSearch = async (e) => {
    e.preventDefault();
    if (!lyricQuery.trim()) return;
    setSearchingLyric(true);
    const list = await searchLyricsManual(lyricQuery.trim());
    setLyricResults(list);
    setSearchingLyric(false);
  };

  const renderFxPanel = () => (
    <div className="rounded-3xl p-4 bg-black/45 backdrop-blur-xl border border-white/15 space-y-3 overflow-y-auto no-scrollbar max-h-[72vh]">
      <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-4 h-4" style={{ color: settings.accentColor }} />
        Efek Audio & Kecepatan Suara
      </p>

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'normal', label: 'Normal' },
          { id: 'bass', label: 'Bass Boost' },
          { id: 'concert', label: 'Konser' },
          { id: 'slowed', label: 'Slowed+Reverb' },
          { id: 'nightcore', label: 'Nightcore' },
          { id: 'karaoke', label: 'Karaoke Cut' },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyFxPreset(p.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              audioFx.preset === p.id ? 'text-zinc-950' : 'bg-white/10 text-white'
            }`}
            style={audioFx.preset === p.id ? { backgroundColor: settings.accentColor } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5 text-xs pt-1">
        <div>
          <div className="flex justify-between mb-1">
            <span>Kecepatan Lagu</span>
            <span className="font-mono">{audioFx.speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.65}
            max={1.5}
            step={0.05}
            value={audioFx.speed}
            onChange={(e) => updateFx({ speed: parseFloat(e.target.value) })}
            className="aura-slider w-full bg-white/20 rounded-full"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span>Bass Boost</span>
            <span className="font-mono">+{audioFx.bassBoost} dB</span>
          </div>
          <input
            type="range"
            min={0}
            max={14}
            step={1}
            value={audioFx.bassBoost}
            onChange={(e) => updateFx({ bassBoost: Number(e.target.value) })}
            className="aura-slider w-full bg-white/20 rounded-full"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span>Reverb / Gema Ruang</span>
            <span className="font-mono">{Math.round(audioFx.reverb * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.85}
            step={0.05}
            value={audioFx.reverb}
            onChange={(e) => updateFx({ reverb: parseFloat(e.target.value) })}
            className="aura-slider w-full bg-white/20 rounded-full"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span>Echo Delay</span>
            <span className="font-mono">{Math.round(audioFx.echo * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.7}
            step={0.05}
            value={audioFx.echo}
            onChange={(e) => updateFx({ echo: parseFloat(e.target.value) })}
            className="aura-slider w-full bg-white/20 rounded-full"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/15">
        <p className="text-[11px] opacity-75 mb-2">Tambah Efek Suara Khusus (Tap Langsung):</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'chime', label: 'Sparkle' },
            { id: 'bassdrop', label: 'Bass Drop' },
            { id: 'applause', label: 'Tepuk Tangan' },
            { id: 'vinyl', label: 'Vinyl' },
            { id: 'horn', label: 'DJ Horn' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => playSpecialSfx(s.id)}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold active:scale-95 transition"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isFullPlayerOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="fixed inset-0 z-50 flex flex-col text-white overflow-hidden gpu-layer"
          style={{
            background: `radial-gradient(circle at 50% 15%, ${dominantColor} 0%, #09090f 65%, #040406 100%)`,
          }}
        >
          <div className="flex items-center justify-between px-4 pt-5 pb-2 shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsFullPlayerOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 shrink-0"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center min-w-0">
              <p className="text-[11px] uppercase tracking-widest opacity-75 font-semibold">
                {currentTrack.isFullTrack ? 'Full Track' : 'Preview 30 Detik'}
              </p>
              <p className="text-xs font-medium opacity-85 truncate max-w-[160px]">
                {currentTrack.album}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMobilePane((p) => (p === 'fx' ? 'player' : 'fx'));
                  setShowFxDesktop((v) => !v);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                  mobilePane === 'fx' || showFxDesktop ? 'bg-white text-zinc-950' : 'bg-white/15 text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Efek
              </button>

              <button
                type="button"
                onClick={() => setMobilePane((p) => (p === 'lyrics' ? 'player' : 'lyrics'))}
                className={`md:hidden px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                  mobilePane === 'lyrics' ? 'bg-white text-zinc-950' : 'bg-white/15 text-white'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5" /> Lirik
              </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 px-5 py-3 max-w-6xl w-full mx-auto overflow-hidden">
            {/* Kolom Kiri: Artwork & Kontrol Utama */}
            <div
              className={`${
                mobilePane === 'player' ? 'flex' : 'hidden md:flex'
              } flex-col justify-between max-w-md w-full mx-auto`}
            >
              <div className="flex-1 flex items-center justify-center py-2">
                <div
                  className={`relative w-52 h-52 sm:w-68 sm:h-68 overflow-hidden shadow-2xl flex items-center justify-center bg-zinc-900/70 border border-white/20 ${
                    settings.artworkStyle === 'vinyl'
                      ? 'rounded-full disc-spin'
                      : settings.artworkStyle === 'float'
                      ? 'rounded-3xl animate-pulse'
                      : 'rounded-3xl'
                  }`}
                  style={
                    settings.artworkStyle === 'vinyl'
                      ? {
                          animationPlayState: isPlaying ? 'running' : 'paused',
                          boxShadow: `0 25px 60px -15px ${dominantColor}`,
                        }
                      : { boxShadow: `0 25px 60px -15px ${dominantColor}` }
                  }
                >
                  {currentTrack.cover ? (
                    <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-20 h-20 opacity-50" />
                  )}
                  {settings.artworkStyle === 'vinyl' && (
                    <div className="absolute w-14 h-14 rounded-full bg-zinc-950/90 border-4 border-white/25" />
                  )}
                </div>
              </div>

              {settings.visualizerEnabled && (
                <div className="h-8 flex items-end justify-center gap-1.5 my-2">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <motion.span
                      key={i}
                      animate={
                        isPlaying
                          ? {
                              scaleY: [
                                0.25 + ((i * 7) % 3) * 0.1,
                                0.65 + ((i * 11) % 4) * 0.1,
                                0.25 + ((i * 5) % 3) * 0.08,
                              ],
                            }
                          : { scaleY: 0.2 }
                      }
                      transition={{
                        repeat: Infinity,
                        duration: 0.42 + (i % 5) * 0.1,
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 h-full origin-bottom rounded-full opacity-85 gpu-layer"
                      style={{ backgroundColor: settings.accentColor }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 mt-1">
                <div className="flex-1 min-w-0">
                  {isLongTitle ? (
                    <div className="marquee-container">
                      <div className="marquee-track text-[20px] font-heading font-bold">
                        <span>{currentTrack.title}</span>
                        <span>{currentTrack.title}</span>
                      </div>
                    </div>
                  ) : (
                    <h2 className="text-[20px] font-heading font-bold truncate">{currentTrack.title}</h2>
                  )}
                  <p className="text-sm opacity-75 truncate">{currentTrack.artist}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleLike(currentTrack)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20"
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                </button>
              </div>

              {audioError && <p className="text-xs text-amber-300 mt-1">{audioError}</p>}

              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 30}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value), false)}
                  className="aura-slider w-full"
                  style={{
                    background: `linear-gradient(to right, ${settings.accentColor} ${progressPct}%, rgba(255,255,255,0.2) ${progressPct}%)`,
                    borderRadius: '9999px',
                    height: '6px',
                  }}
                />
                <div className="flex justify-between text-xs opacity-70 mt-1.5 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setShuffle((s) => !s)}
                  className={`p-2.5 rounded-full transition ${shuffle ? 'bg-white/20' : 'opacity-65 hover:opacity-100'}`}
                  style={shuffle ? { color: settings.accentColor } : undefined}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button type="button" onClick={prevTrack} className="p-3 rounded-full hover:bg-white/10 active:scale-90 transition">
                  <SkipBack className="w-7 h-7 fill-white" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-zinc-950 shadow-xl active:scale-95 transition-transform"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  {isBuffering ? (
                    <span className="w-6 h-6 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-7 h-7 fill-zinc-950" />
                  ) : (
                    <Play className="w-7 h-7 fill-zinc-950 ml-1" />
                  )}
                </button>

                <button type="button" onClick={nextTrack} className="p-3 rounded-full hover:bg-white/10 active:scale-90 transition">
                  <SkipForward className="w-7 h-7 fill-white" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  className={`p-2.5 rounded-full transition ${repeatMode !== 'off' ? 'bg-white/20' : 'opacity-65 hover:opacity-100'}`}
                  style={repeatMode !== 'off' ? { color: settings.accentColor } : undefined}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 pb-2">
                <Volume2 className="w-4 h-4 opacity-70 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step="0.02"
                  value={volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="aura-slider flex-1"
                  style={{
                    background: `linear-gradient(to right, ${settings.accentColor} ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                    borderRadius: '9999px',
                    height: '6px',
                  }}
                />
              </div>
            </div>

            {/* Panel FX di HP */}
            {mobilePane === 'fx' && <div className="md:hidden">{renderFxPanel()}</div>}

            {/* Kolom Kanan: Live Lirik + Pencarian Lirik Manual + FX Desktop */}
            <div
              className={`${
                mobilePane === 'lyrics' ? 'flex' : 'hidden md:flex'
              } flex-col rounded-3xl p-4 sm:p-5 overflow-hidden h-full max-h-[76vh] bg-black/35 backdrop-blur-xl border border-white/15`}
            >
              {showFxDesktop ? (
                renderFxPanel()
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-widest opacity-80 flex items-center gap-2">
                        <Mic2 className="w-4 h-4" style={{ color: settings.accentColor }} />
                        Live Lirik
                      </span>
                      {lyricsData.matchedTitle && (
                        <p className="text-[11px] opacity-65 truncate mt-0.5">{lyricsData.matchedTitle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLyricSearchOpen((v) => !v)}
                        className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" /> Cari Lirik
                      </button>

                      {lyricsData.synced.length > 0 && (
                        <div className="flex items-center gap-1">
                          {[-15, -1, 1, 15].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => setLyricsOffset((v) => v + delta)}
                              className="px-1.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono"
                            >
                              {delta > 0 ? `+${delta}s` : `${delta}s`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {lyricSearchOpen && (
                    <div className="mb-3 p-3 rounded-2xl bg-white/10 space-y-2 shrink-0">
                      <form onSubmit={handleManualLyricSearch} className="flex gap-2">
                        <input
                          type="text"
                          value={lyricQuery}
                          onChange={(e) => setLyricQuery(e.target.value)}
                          placeholder="Ketik judul / artis lirik..."
                          className="flex-1 rounded-xl bg-black/30 px-3 py-1.5 text-xs outline-none text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-950"
                          style={{ backgroundColor: settings.accentColor }}
                        >
                          {searchingLyric ? '...' : 'Cari'}
                        </button>
                      </form>
                      {lyricResults.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {lyricResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                applyManualLyrics(item);
                                setLyricSearchOpen(false);
                              }}
                              className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-white/20 truncate"
                            >
                              {item.matchedTitle} {item.synced.length > 0 ? '(Sinkron)' : '(Teks)'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    ref={lyricsContainerRef}
                    className="flex-1 overflow-y-auto no-scrollbar py-10 space-y-4 text-center"
                  >
                    {lyricsData.loading ? (
                      <p className="text-sm opacity-65 animate-pulse">Mencari lirik yang cocok...</p>
                    ) : lyricsData.synced.length > 0 ? (
                      lyricsData.synced.map((line, i) => {
                        const isActive = i === activeLyricIndex;
                        return (
                          <button
                            key={`${line.time}-${i}`}
                            ref={isActive ? activeLineRef : null}
                            type="button"
                            onClick={() => {
                              const target = Math.max(0, line.time - lyricsOffset);
                              seekTo(target, true);
                            }}
                            className="block w-full text-center px-3 py-1.5 transition-all duration-300 cursor-pointer active:scale-95"
                            style={{
                              opacity: isActive ? 1 : 0.38,
                              transform: isActive ? 'scale(1.06)' : 'scale(1)',
                              color: '#ffffff',
                              textShadow: isActive ? `0 0 22px ${settings.accentColor}` : 'none',
                            }}
                          >
                            <span
                              className={`text-base sm:text-lg leading-relaxed ${
                                isActive ? 'font-heading font-bold' : 'font-medium'
                              }`}
                            >
                              {line.text}
                            </span>
                          </button>
                        );
                      })
                    ) : lyricsData.plain ? (
                      <div className="text-sm sm:text-base leading-loose whitespace-pre-line opacity-90 px-2">
                        {lyricsData.plain}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-70 gap-2">
                        <Mic2 className="w-8 h-8" />
                        <p className="text-sm">Lirik belum ditemukan otomatis. Ketuk "Cari Lirik" di atas untuk mencari manual.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
