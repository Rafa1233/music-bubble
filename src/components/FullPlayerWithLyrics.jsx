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
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';

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
    isFullPlayerOpen,
    dominantColor,
    lyricsData,
    lyricsOffset,
    setIsFullPlayerOpen,
    setLyricsOffset,
    setShuffle,
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

  const [showLyricsMobile, setShowLyricsMobile] = useState(false);
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

  if (!currentTrack) return null;

  const isLongTitle = currentTrack.title.length > 26;
  const liked = isLiked(currentTrack.id);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

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
          <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullPlayerOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widest opacity-70 font-semibold">
                {currentTrack.isFullTrack ? 'Full Track' : 'Preview 30 Detik'}
              </p>
              <p className="text-xs font-medium opacity-85 truncate max-w-[180px]">
                {currentTrack.album}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLyricsMobile((v) => !v)}
              className={`md:hidden px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                showLyricsMobile ? 'bg-white text-zinc-950' : 'bg-white/15 text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" /> Lirik
            </button>
            <div className="hidden md:block w-10" />
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4 max-w-6xl w-full mx-auto overflow-hidden">
            <div
              className={`${
                showLyricsMobile ? 'hidden md:flex' : 'flex'
              } flex-col justify-between max-w-md w-full mx-auto`}
            >
              <div className="flex-1 flex items-center justify-center py-2">
                <div
                  className={`relative w-56 h-56 sm:w-72 sm:h-72 overflow-hidden shadow-2xl flex items-center justify-center bg-zinc-900/70 border border-white/20 ${
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
                    <img
                      src={currentTrack.cover}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
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

              <div className="flex items-center justify-between gap-3 mt-2">
                <div className="flex-1 min-w-0">
                  {isLongTitle ? (
                    <div className="marquee-container">
                      <div className="marquee-track text-[20px] font-heading font-bold">
                        <span>{currentTrack.title}</span>
                        <span>{currentTrack.title}</span>
                      </div>
                    </div>
                  ) : (
                    <h2 className="text-[20px] font-heading font-bold truncate">
                      {currentTrack.title}
                    </h2>
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

              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={duration || 30}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
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

              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => setShuffle((s) => !s)}
                  className={`p-2.5 rounded-full transition ${
                    shuffle ? 'bg-white/20' : 'opacity-65 hover:opacity-100'
                  }`}
                  style={shuffle ? { color: settings.accentColor } : undefined}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={prevTrack}
                  className="p-3 rounded-full hover:bg-white/10 active:scale-90 transition"
                >
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

                <button
                  type="button"
                  onClick={nextTrack}
                  className="p-3 rounded-full hover:bg-white/10 active:scale-90 transition"
                >
                  <SkipForward className="w-7 h-7 fill-white" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  className={`p-2.5 rounded-full transition ${
                    repeatMode !== 'off' ? 'bg-white/20' : 'opacity-65 hover:opacity-100'
                  }`}
                  style={repeatMode !== 'off' ? { color: settings.accentColor } : undefined}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 mt-4 pb-2">
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

            <div
              className={`${
                showLyricsMobile ? 'flex' : 'hidden md:flex'
              } flex-col rounded-3xl p-5 overflow-hidden h-full max-h-[76vh] bg-black/35 backdrop-blur-xl border border-white/15`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-widest opacity-80 flex items-center gap-2">
                    <Mic2 className="w-4 h-4" style={{ color: settings.accentColor }} />
                    Live Lirik (LRCLIB)
                  </span>
                  {lyricsData.matchedTitle && (
                    <p className="text-[11px] opacity-65 truncate mt-0.5">{lyricsData.matchedTitle}</p>
                  )}
                </div>

                {lyricsData.synced.length > 0 && (
                  <div className="flex items-center gap-1">
                    {[-15, -1, 1, 15].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setLyricsOffset((v) => v + delta)}
                        className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono"
                      >
                        {delta > 0 ? `+${delta}s` : `${delta}s`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                ref={lyricsContainerRef}
                className="flex-1 overflow-y-auto no-scrollbar py-12 space-y-4 text-center"
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
                          seekTo(target);
                        }}
                        className="block w-full text-center px-3 py-1 transition-all duration-300 cursor-pointer"
                        style={{
                          opacity: isActive ? 1 : 0.36,
                          transform: isActive ? 'scale(1.07)' : 'scale(1)',
                          filter: isActive ? 'none' : 'blur(0.4px)',
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
                  <div className="h-full flex flex-col items-center justify-center opacity-65 gap-2">
                    <Mic2 className="w-8 h-8" />
                    <p className="text-sm">Lirik resmi untuk lagu ini tidak ditemukan di LRCLIB.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
