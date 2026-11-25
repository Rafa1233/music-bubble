import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Music2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    setIsFullPlayerOpen,
  } = useAudio();
  const { settings } = useTheme();

  if (!currentTrack) return null;

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        drag="y"
        dragConstraints={{ top: -40, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y < -25) setIsFullPlayerOpen(true);
        }}
        className="fixed bottom-[88px] sm:bottom-[84px] inset-x-0 z-30 flex justify-center px-3 pointer-events-none"
      >
        <div
          onClick={() => setIsFullPlayerOpen(true)}
          className="bubble-glass gpu-layer pointer-events-auto w-full max-w-2xl rounded-2xl overflow-hidden cursor-pointer relative"
        >
          <div className="px-3 py-2 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center border border-white/25 disc-spin"
              style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
            >
              {currentTrack.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music2 className="w-5 h-5 text-white/70" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-main">
                {currentTrack.title}
              </p>
              <p className="text-xs truncate text-muted">
                {isBuffering ? 'Memuat audio...' : currentTrack.artist}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 shadow-md active:scale-90 transition-transform"
                style={{ backgroundColor: settings.accentColor }}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-zinc-950" />
                ) : (
                  <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                aria-label="Lagu Berikutnya"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 active:scale-90 transition text-main"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full h-[3px] bg-black/20">
            <div
              className="h-full transition-all duration-150"
              style={{ width: `${progress}%`, backgroundColor: settings.accentColor }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
