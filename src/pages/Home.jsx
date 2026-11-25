import React from 'react';
import { Play, Sparkles, Disc3 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

export default function Home() {
  const { catalog, catalogLoading, recentTracks, playlists, playTrack, currentTrack } = useAudio();
  const { settings, isLightMode } = useTheme();

  const heroTrack = catalog[0] || currentTrack;
  const quickPicks = catalog.slice(0, 6);
  const recommended = catalog.slice(2, 12);

  return (
    <div className="space-y-7 pb-4">
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
                  onClick={() => playTrack(track, catalog)}
                  className="glass-card rounded-xl overflow-hidden flex items-center gap-2.5 pr-2.5 hover:scale-[1.02] active:scale-[0.98] transition text-left"
                >
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-14 h-14 object-cover shrink-0 bg-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs sm:text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className={`text-[11px] truncate opacity-70 ${isLightMode ? 'text-slate-700' : 'text-white'}`}>
                      {track.artist}
                    </p>
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
              boxShadow: `0 20px 50px -18px ${settings.accentColor}99`,
            }}
          >
            <div
              className="absolute -right-12 -top-12 w-56 h-56 rounded-full blur-[70px] opacity-40 pointer-events-none"
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
                  <Sparkles className="w-3.5 h-3.5" /> Lagu Pilihan Utama
                </span>
                <h2 className={`text-xl sm:text-2xl font-heading font-extrabold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  {heroTrack.title}
                </h2>
                <p className={`text-sm opacity-75 mb-4 truncate ${isLightMode ? 'text-slate-700' : 'text-white'}`}>
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
          <h3 className={`text-lg font-heading font-bold mb-3 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Baru Diputar
          </h3>
          <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
            {recentTracks.map((track, idx) => (
              <div key={track.id} className="w-36 sm:w-44 shrink-0">
                <SongCard track={track} queueList={recentTracks} index={idx} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className={`text-lg font-heading font-bold mb-3 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          Rekomendasi Untukmu
        </h3>
        <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
          {recommended.map((track, idx) => (
            <div key={track.id} className="w-36 sm:w-44 shrink-0">
              <SongCard track={track} queueList={catalog} index={idx} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className={`text-lg font-heading font-bold mb-3 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          Playlist Populer
        </h3>
        <div data-no-tab-swipe className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => pl.tracks[0] && playTrack(pl.tracks[0], pl.tracks)}
                className="glass-card w-44 shrink-0 rounded-2xl p-3 text-left hover:scale-[1.02] transition"
              >
                <div className="aspect-square rounded-xl bg-white/10 flex items-center justify-center mb-2.5 overflow-hidden">
                  {pl.tracks[0]?.cover ? (
                    <img src={pl.tracks[0].cover} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 className="w-10 h-10 opacity-60" />
                  )}
                </div>
                <p className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  {pl.name}
                </p>
                <p className="text-xs opacity-65">{pl.tracks.length} lagu</p>
              </button>
            ))
          ) : (
            [
              { title: 'Hits Indonesia Kini', query: catalog.slice(0, 4) },
              { title: 'Chill Night Drive', query: catalog.slice(4, 8) },
              { title: 'Global Top Pop', query: catalog.slice(6, 12) },
            ].map((mix, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => mix.query[0] && playTrack(mix.query[0], mix.query)}
                className="glass-card w-44 shrink-0 rounded-2xl p-3 text-left hover:scale-[1.02] transition"
              >
                <div className="aspect-square rounded-xl bg-white/10 overflow-hidden mb-2.5 grid grid-cols-2 gap-0.5">
                  {mix.query.slice(0, 4).map((t) => (
                    <img key={t.id} src={t.cover} alt={t.title} className="w-full h-full object-cover" />
                  ))}
                </div>
                <p className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  {mix.title}
                </p>
                <p className="text-xs opacity-65">{mix.query.length} lagu pilihan</p>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
