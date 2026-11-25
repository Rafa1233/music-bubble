import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, UserPlus, UserCheck, Disc3, User } from 'lucide-react';
import { MusicProviderManager } from '../services/music/MusicProviderManager';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

export default function ArtistDetail({ artistId, fallbackName, fallbackCover, onBack }) {
  const { playTrack, setShuffle, isArtistFollowed, toggleFollowArtist, openAlbum } = useAudio();
  const { settings } = useTheme();

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    MusicProviderManager.fetchArtistDetails(artistId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data) {
          setError('Detail artis tidak tersedia dari provider saat ini.');
        } else {
          setArtist(data);
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError('Gagal memuat profil artis.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [artistId]);

  const followed = isArtistFollowed(artist?.id || artistId);
  const tracks = artist?.tracks || [];
  const albums = artist?.albums || [];

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
        <div className="glass-card rounded-3xl p-6 space-y-4 animate-pulse">
          <div className="w-28 h-28 rounded-full bg-white/15 mx-auto sm:mx-0" />
          <div className="h-6 w-48 rounded bg-white/15" />
          <div className="h-4 w-64 rounded bg-white/10" />
        </div>
      ) : error && !artist ? (
        <div className="glass-card rounded-3xl p-8 text-center text-muted">
          <User className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-main">{fallbackName || 'Artis'}</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : (
        <>
          <section className="bubble-glass rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center border-2 border-white/25 shadow-2xl">
              {artist.avatar || fallbackCover ? (
                <img
                  src={artist.avatar || fallbackCover}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-white/60" />
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-bold text-muted">
                Profil Artis • {artist.source}
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold truncate text-main">
                {artist.name}
              </h2>
              {artist.bio && <p className="text-xs text-muted line-clamp-2">{artist.bio}</p>}
              {typeof artist.followerCount === 'number' && (
                <p className="text-xs text-muted">
                  {artist.followerCount.toLocaleString('id-ID')} pengikut
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                {tracks.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePlayAll(false)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-zinc-950 flex items-center gap-1.5"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      <Play className="w-3.5 h-3.5 fill-zinc-950" /> Putar
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlayAll(true)}
                      className="glass-card px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 text-main"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> Acak
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() =>
                    toggleFollowArtist({
                      id: artist.id,
                      name: artist.name,
                      avatar: artist.avatar || fallbackCover || '',
                      source: artist.source,
                    })
                  }
                  className="glass-card px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 text-main"
                >
                  {followed ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" style={{ color: settings.accentColor }} /> Mengikuti
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Ikuti
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {tracks.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-lg font-heading font-bold text-main">
                Lagu dari {artist.name} ({tracks.length})
              </h3>
              {tracks.map((t, idx) => (
                <SongCard key={t.id} track={t} queueList={tracks} layout="row" index={idx} />
              ))}
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h3 className="text-lg font-heading font-bold text-main mb-3">
                Album & Rilisan ({albums.length})
              </h3>
              <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
                {albums.map((al) => (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => openAlbum(al.id, al.title, al.cover)}
                    className="glass-card w-40 shrink-0 rounded-2xl p-3 text-left hover:scale-[1.02] transition"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2 flex items-center justify-center">
                      {al.cover ? (
                        <img src={al.cover} alt={al.title} className="w-full h-full object-cover" />
                      ) : (
                        <Disc3 className="w-8 h-8 text-white/60" />
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate text-main">{al.title}</p>
                    {al.releaseDate && (
                      <p className="text-[11px] text-muted">{String(al.releaseDate).slice(0, 4)}</p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
