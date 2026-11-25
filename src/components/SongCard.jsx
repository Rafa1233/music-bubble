import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, ListPlus, Music2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';

export default function SongCard({ track, queueList, layout = 'card', index = 0 }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    isLiked,
    toggleLike,
    playlists,
    addTrackToPlaylist,
  } = useAudio();
  const { settings, isLightMode } = useTheme();
  const [showPlMenu, setShowPlMenu] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const activePlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueList);
    }
  };

  const motionProps =
    settings.cardAnimation === 'calm'
      ? {}
      : {
          initial: settings.cardAnimation === 'cascade' ? { opacity: 0, y: 14 } : { opacity: 0, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.28, delay: Math.min(index * 0.03, 0.25) },
          whileHover: { scale: layout === 'card' ? 1.03 : 1.01 },
        };

  if (layout === 'row') {
    return (
      <motion.div
        {...motionProps}
        onClick={handlePlay}
        className={`glass-card relative rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer transition-all ${
          isCurrent ? 'ring-1' : ''
        }`}
        style={isCurrent ? { borderColor: settings.accentColor, boxShadow: `0 0 18px -6px ${settings.accentColor}` } : {}}
      >
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-800/80 shrink-0 flex items-center justify-center">
          {track.cover ? (
            <img src={track.cover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Music2 className="w-5 h-5 opacity-70 text-white" />
          )}
          <div
            className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
              isCurrent ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}
          >
            {activePlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-[15px] font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}
            style={isCurrent ? { color: settings.accentColor } : undefined}
          >
            {track.title}
          </p>
          <p className={`text-[13px] truncate opacity-70 ${isLightMode ? 'text-slate-700' : 'text-white'}`}>
            {track.artist} {track.source === 'local' ? '• Lokal' : ''}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggleLike(track)}
            aria-label="Sukai lagu"
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <Heart
              className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : isLightMode ? 'text-slate-600' : 'text-white/70'}`}
            />
          </button>

          {playlists.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlMenu((v) => !v)}
                aria-label="Tambah ke Playlist"
                className="p-2 rounded-full hover:bg-white/10 transition"
              >
                <ListPlus className={`w-4 h-4 ${isLightMode ? 'text-slate-600' : 'text-white/70'}`} />
              </button>
              {showPlMenu && (
                <div className="absolute right-0 bottom-10 z-40 w-44 rounded-2xl bg-zinc-900/95 border border-white/15 p-1.5 shadow-xl">
                  <p className="text-[11px] px-2 py-1 text-white/60 font-medium">Tambah ke Playlist:</p>
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => {
                        addTrackToPlaylist(pl.id, track);
                        setShowPlMenu(false);
                      }}
                      className="w-full text-left text-xs text-white px-2.5 py-1.5 rounded-xl hover:bg-white/10 truncate"
                    >
                      + {pl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      onClick={handlePlay}
      className="glass-card rounded-2xl p-3 cursor-pointer group flex flex-col gap-2.5 w-full"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800/80 flex items-center justify-center">
        {track.cover ? (
          <img
            src={track.cover}
            alt={track.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Music2 className="w-10 h-10 text-white/50" />
        )}

        <button
          type="button"
          onClick={handlePlay}
          aria-label={activePlaying ? 'Jeda' : 'Putar'}
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
            activePlaying
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          style={{ backgroundColor: settings.accentColor }}
        >
          {activePlaying ? (
            <Pause className="w-5 h-5 text-zinc-950 fill-zinc-950" />
          ) : (
            <Play className="w-5 h-5 text-zinc-950 fill-zinc-950 ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center opacity-85 hover:opacity-100"
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>
      </div>

      <div className="min-w-0">
        <p
          className={`text-[15px] font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}
          style={isCurrent ? { color: settings.accentColor } : undefined}
        >
          {track.title}
        </p>
        <p className={`text-[13px] truncate opacity-70 ${isLightMode ? 'text-slate-700' : 'text-white'}`}>
          {track.artist}
        </p>
      </div>
    </motion.div>
  );
}
