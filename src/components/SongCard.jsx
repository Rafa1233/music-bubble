import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, MoreVertical, Music2, ExternalLink } from 'lucide-react';
import { AUDIO_STATUS } from '../services/music/TrackNormalizer';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';

function formatDur(sec) {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

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
    addToQueue,
    playNextInQueue,
    openArtist,
    openAlbum,
  } = useAudio();
  const { settings } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const activePlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const statusLabel =
    track.audioStatus === AUDIO_STATUS.FULL_TRACK
      ? 'FULL TRACK'
      : track.audioStatus === AUDIO_STATUS.PREVIEW
      ? 'PREVIEW'
      : track.audioStatus === AUDIO_STATUS.EXTERNAL
      ? 'EXTERNAL'
      : 'UNAVAILABLE';

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isCurrent && track.audioStatus !== AUDIO_STATUS.EXTERNAL) {
      togglePlay();
    } else {
      playTrack(track, queueList);
    }
  };

  const motionProps =
    settings.cardAnimation === 'calm' || !settings.highRefreshMode
      ? {}
      : {
          initial: settings.cardAnimation === 'cascade' ? { opacity: 0, y: 12 } : { opacity: 0, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.22, delay: Math.min(index * 0.02, 0.16) },
          whileTap: { scale: 0.98 },
        };

  const renderContextMenu = () =>
    menuOpen && (
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 bottom-10 z-40 w-52 rounded-2xl bg-zinc-900/95 border border-white/15 p-1.5 shadow-2xl text-white text-xs space-y-0.5"
      >
        <button
          type="button"
          onClick={() => {
            playNextInQueue(track);
            setMenuOpen(false);
          }}
          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10"
        >
          Putar Berikutnya
        </button>
        <button
          type="button"
          onClick={() => {
            addToQueue(track);
            setMenuOpen(false);
          }}
          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10"
        >
          Tambah ke Antrian (Queue)
        </button>
        {track.artistId && (
          <button
            type="button"
            onClick={() => {
              openArtist(track.artistId, track.artist, track.cover);
              setMenuOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10"
          >
            Lihat Profil Artis
          </button>
        )}
        {track.albumId && (
          <button
            type="button"
            onClick={() => {
              openAlbum(track.albumId, track.album, track.cover);
              setMenuOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10"
          >
            Lihat Album
          </button>
        )}
        {playlists.length > 0 && (
          <div className="pt-1 border-t border-white/10 mt-1">
            <p className="text-[10px] px-2.5 py-0.5 text-white/55">Simpan ke Playlist:</p>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => {
                  addTrackToPlaylist(pl.id, track);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 truncate"
              >
                + {pl.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );

  if (layout === 'row') {
    return (
      <motion.div
        {...motionProps}
        onClick={handlePlay}
        className={`glass-card gpu-layer relative rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer transition-all ${
          isCurrent ? 'ring-1' : ''
        }`}
        style={isCurrent ? { borderColor: settings.accentColor, boxShadow: `0 6px 22px -8px ${settings.accentColor}` } : undefined}
      >
        <div className="w-5 text-center shrink-0">
          {activePlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-4">
              {[0.5, 0.9, 0.65].map((_, b) => (
                <motion.span
                  key={b}
                  animate={{ scaleY: [0.35, 1, 0.45] }}
                  transition={{ repeat: Infinity, duration: 0.45 + b * 0.12 }}
                  className="w-1 h-full origin-bottom rounded-full"
                  style={{ backgroundColor: settings.accentColor }}
                />
              ))}
            </div>
          ) : (
            <span className="text-[11px] font-mono text-muted">{index + 1}</span>
          )}
        </div>

        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-800/80 shrink-0 flex items-center justify-center shadow-md">
          {track.cover ? (
            <img src={track.cover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Music2 className="w-5 h-5 text-white/70" />
          )}
          <div className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
            {track.audioStatus === AUDIO_STATUS.EXTERNAL ? (
              <ExternalLink className="w-4 h-4 text-white" />
            ) : activePlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-semibold truncate text-main" style={isCurrent ? { color: settings.accentColor } : undefined}>
              {track.title}
            </p>
            <span
              className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                track.isFullTrack ? 'text-zinc-950' : 'glass-subtle text-muted'
              }`}
              style={track.isFullTrack ? { backgroundColor: settings.accentColor } : undefined}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-[12px] truncate text-muted">
            <span
              onClick={(e) => {
                if (track.artistId) {
                  e.stopPropagation();
                  openArtist(track.artistId, track.artist, track.cover);
                }
              }}
              className={track.artistId ? 'hover:underline' : ''}
            >
              {track.artist}
            </span>
            {` • ${track.sourceLabel}`}
            {track.duration > 0 ? ` • ${formatDur(track.duration)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => toggleLike(track)} className="p-2 rounded-full hover:bg-black/10 text-muted">
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-2 rounded-full hover:bg-black/10 text-muted">
            <MoreVertical className="w-4 h-4" />
          </button>
          {renderContextMenu()}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps} onClick={handlePlay} className="glass-card gpu-layer rounded-2xl p-3 cursor-pointer group flex flex-col gap-2 w-full relative">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800/80 flex items-center justify-center shadow-md">
        {track.cover ? (
          <img src={track.cover} alt={track.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <Music2 className="w-10 h-10 text-white/50" />
        )}
        <span
          className={`absolute top-2 left-2 text-[8px] font-extrabold px-2 py-0.5 rounded-full backdrop-blur-md ${
            track.isFullTrack ? 'text-zinc-950' : 'bg-black/60 text-white'
          }`}
          style={track.isFullTrack ? { backgroundColor: settings.accentColor } : undefined}
        >
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={handlePlay}
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
            activePlaying ? 'opacity-100' : 'opacity-90 sm:opacity-0 group-hover:opacity-100'
          }`}
          style={{ backgroundColor: settings.accentColor }}
        >
          {activePlaying ? <Pause className="w-5 h-5 text-zinc-950 fill-zinc-950" /> : <Play className="w-5 h-5 text-zinc-950 fill-zinc-950 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold truncate text-main" style={isCurrent ? { color: settings.accentColor } : undefined}>
          {track.title}
        </p>
        <p className="text-[12px] truncate text-muted">{track.artist} • {track.sourceLabel}</p>
      </div>
    </motion.div>
  );
}
