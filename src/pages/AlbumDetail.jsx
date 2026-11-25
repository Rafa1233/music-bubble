import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Play, Shuffle, Disc3 } from 'lucide-react';
import { MusicProviderManager } from '../services/music/MusicProviderManager';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

export default function AlbumDetail({ albumId, fallbackName, fallbackCover, onBack }) {
  const { playTrack, setShuffle, openArtist } = useAudio();
  const { settings } = useTheme();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    MusicProviderManager.fetchAlbumDetails(albumId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data) {
          setError('Detail album tidak ditemukan di provider.');
        } else {
          setAlbum(data);
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError('Gagal memuat detail album.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [albumId]);

  const tracks = album?.tracks || [];
  const totalMinutes = useMemo(() => {
    const totalSec = tracks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
    return totalSec > 0 ? Math.round(totalSec / 60) : 0;
  }, [tracks]);

  const handlePlayAll = (doShuffle = false) => {
    if (tracks.length === 0) return;
    setShuffle(doShuffle);
    const first = doShuffle ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[0];
    playTrack(first, tracks);
  };

  return (
    <div className="space-y-6 pb-8 text-main">
      <button
        type="button"
        onClick={onBack}
        className="glass-card px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 text-main"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {loading ? (
        <div className="glass-card rounded-3xl p-6 animate-pulse space-y-3">
          <div className="w-32 h-32 rounded-2xl bg-white/15" />
          <div className="h-6 w-52 rounded bg-white/15" />
        </div>
      ) : error && !album ? (
        <div className="glass-card rounded-3xl p-8 text-center text-muted">
          <Disc3 className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-main">{fallbackName || 'Album'}</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : (
        <>
          <section className="bubble-glass rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="w-36 h-36 rounded-2xl overflow-hidden bg-zinc-800 shrink-0 shadow-2xl flex items-center justify-center">
              {album.cover || fallbackCover ? (
                <img
                  src={album.cover || fallbackCover}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc3 className="w-12 h-12 text-white/60" />
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-bold text-muted">
                Album • {album.source}
              </span>
              <h2 className="text-2xl font-heading font-extrabold truncate text-main">
                {album.title}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-muted">
                <button
                  type="button"
                  onClick={() => album.artistId && openArtist(album.artistId, album.artist, album.cover)}
                  className={`font-semibold text-main ${album.artistId ? 'underline' : ''}`}
                >
                  {album.artist}
                </button>
                {album.releaseDate && <span>• {String(album.releaseDate).slice(0, 4)}</span>}
                <span>• {tracks.length} lagu</span>
                {totalMinutes > 0 && <span>• {totalMinutes} menit</span>}
              </div>

              {tracks.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePlayAll(false)}
                    className="px-5 py-2 rounded-full text-xs font-bold text-zinc-950 flex items-center gap-1.5"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-950" /> Putar Album
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayAll(true)}
                    className="glass-card px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 text-main"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Acak
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2.5">
            {tracks.map((t, idx) => (
              <SongCard key={t.id} track={t} queueList={tracks} layout="row" index={idx} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
