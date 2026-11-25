import React, { useState } from 'react';
import { Play, Sparkles, Disc3, Flame } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

const MOOD_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'full', label: 'Full Track Gratis' },
  { id: 'pop', label: 'Indo & Global Pop' },
  { id: 'local', label: 'Audio Lokal' },
];

export default function Home() {
  const {
    catalog,
    fullCatalog,
    popCatalog,
    localTracks,
    catalogLoading,
    recentTracks,
    playlists,
    playTrack,
    currentTrack,
  } = useAudio();
  const { settings } = useTheme();
  const [filter, setFilter] = useState('all');

  const activeList =
    filter === 'full'
      ? fullCatalog
      : filter === 'pop'
      ? popCatalog
      : filter === 'local'
      ? localTracks
      : catalog;

  const heroTrack = fullCatalog[0] || catalog[0] || currentTrack;
  const quickPicks = (activeList.length > 0 ? activeList : catalog).slice(0, 6);

  return (
    <div className="space-y-6 pb-6">
      <div data-no-tab-swipe className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {MOOD_FILTERS.map((m) => {
          const active = filter === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setFilter(m.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                active ? 'text-zinc-950 shadow-md' : 'glass-card text-main opacity-80 hover:opacity-100'
              }`}
              style={active ? { backgroundColor: settings.accentColor } : undefined}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {catalogLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card h-14 rounded-xl animate-pulse" />
              ))
            : quickPicks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => playTrack(track, activeList)}
                  className="glass-card rounded-xl overflow-hidden flex items-center gap-2.5 pr-2.5 hover:scale-[1.02] active:scale-[0.98] transition text-left"
                >
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-14 h-14 object-cover shrink-0 bg-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold truncate text-main">
                      {track.title}
                    </p>
                    <p className="text-[11px] truncate text-muted">{track.artist}</p>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {heroTrack && (
        <section>
          <div
            onClick={() => playTrack(heroTrack, catalog)}
            className="bubble-glass rounded-3xl p-5 sm:p-6 relative overflow-hidden cursor-pointer group"
            style={{
              boxShadow: `0 18px 46px -18px ${settings.accentColor}99`,
            }}
          >
            <div
              className="absolute -right-12 -top-12 w-56 h-56 rounded-full blur-[70px] opacity-35 pointer-events-none"
              style={{ backgroundColor: settings.accentColor }}
            />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <img
                src={heroTrack.cover}
                alt={heroTrack.title}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2 text-zinc-950"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {heroTrack.isFullTrack ? 'Full Track Pilihan' : 'Lagu Pilihan Utama'}
                </span>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold truncate text-main">
                  {heroTrack.title}
                </h2>
                <p className="text-sm text-muted mb-4 truncate">
                  {heroTrack.artist} • {heroTrack.album}
                </p>
                <span
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-zinc-950 shadow-lg group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Play className="w-4 h-4 fill-zinc-950" /> Putar Sekarang
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {recentTracks.length > 0 && (
        <section>
          <h3 className="text-lg font-heading font-bold mb-3 text-main">Baru Diputar</h3>
          <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
            {recentTracks.map((track, idx) => (
              <div key={track.id} className="w-36 sm:w-44 shrink-0">
                <SongCard track={track} queueList={recentTracks} index={idx} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(filter === 'all' || filter === 'full') && fullCatalog.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-heading font-bold text-main flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: settings.accentColor }} />
              Lagu Full Durasi (Gratis)
            </h3>
          </div>
          <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
            {fullCatalog.map((track, idx) => (
              <div key={track.id} className="w-36 sm:w-44 shrink-0">
                <SongCard track={track} queueList={fullCatalog} index={idx} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(filter === 'all' || filter === 'pop') && popCatalog.length > 0 && (
        <section>
          <h3 className="text-lg font-heading font-bold mb-3 text-main">
            Top Pop Indonesia & Global
          </h3>
          <div className="space-y-2.5">
            {popCatalog.map((track, idx) => (
              <SongCard key={track.id} track={track} queueList={popCatalog} layout="row" index={idx} />
            ))}
          </div>
        </section>
      )}

      {filter === 'local' && (
        <section className="space-y-2.5">
          {localTracks.length === 0 ? (
            <div className="glass-card rounded-3xl p-6 text-center text-sm text-muted">
              Belum ada lagu MP3/FLAC lokal. Tambahkan lewat tab Search!
            </div>
          ) : (
            localTracks.map((track, idx) => (
              <SongCard key={track.id} track={track} queueList={localTracks} layout="row" index={idx} />
            ))
          )}
        </section>
      )}

      <section>
        <h3 className="text-lg font-heading font-bold mb-3 text-main">Playlist Populer</h3>
        <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => pl.tracks[0] && playTrack(pl.tracks[0], pl.tracks)}
                className="glass-card w-44 shrink-0 rounded-2xl p-3 text-left hover:scale-[1.02] transition"
              >
                <div className="aspect-square rounded-xl glass-subtle flex items-center justify-center mb-2.5 overflow-hidden">
                  {pl.tracks[0]?.cover ? (
                    <img src={pl.tracks[0].cover} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 className="w-10 h-10 text-muted" />
                  )}
                </div>
                <p className="text-sm font-semibold truncate text-main">{pl.name}</p>
                <p className="text-xs text-muted">{pl.tracks.length} lagu</p>
              </button>
            ))
          ) : (
            [
              { title: 'Full Track Trending', query: fullCatalog.slice(0, 4) },
              { title: 'Indo Pop Hits', query: popCatalog.slice(0, 4) },
              { title: 'Global Chill Mix', query: popCatalog.slice(4, 8) },
            ].map((mix, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => mix.query[0] && playTrack(mix.query[0], mix.query)}
                className="glass-card w-44 shrink-0 rounded-2xl p-3 text-left hover:scale-[1.02] transition"
              >
                <div className="aspect-square rounded-xl glass-subtle overflow-hidden mb-2.5 grid grid-cols-2 gap-0.5">
                  {mix.query.slice(0, 4).map((t) => (
                    <img key={t.id} src={t.cover} alt={t.title} className="w-full h-full object-cover" />
                  ))}
                </div>
                <p className="text-sm font-semibold truncate text-main">{mix.title}</p>
                <p className="text-xs text-muted">{mix.query.length} lagu pilihan</p>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
