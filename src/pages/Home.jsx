import React, { useEffect, useRef, useState } from 'react';
import { Play, Sparkles, Flame, WifiOff, ChevronRight, User } from 'lucide-react';
import { CATEGORY_GROUPS, findCategoryById } from '../services/music/CatalogCategories';
import { MusicProviderManager } from '../services/music/MusicProviderManager';
import { separateTracksByAvailability } from '../services/music/SourceResolver';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

export default function Home() {
  const {
    catalog,
    fullCatalog,
    recentTracks,
    localTracks,
    isOnline,
    playTrack,
    currentTrack,
    openArtist,
  } = useAudio();
  const { settings } = useTheme();

  const [selectedGroup, setSelectedGroup] = useState('discover');
  const [selectedCategoryId, setSelectedCategoryId] = useState('audius-trending');
  const [tracks, setTracks] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const currentGroupObj = CATEGORY_GROUPS.find((g) => g.group === selectedGroup) || CATEGORY_GROUPS[0];
  const activeCatMeta = findCategoryById(selectedCategoryId);

  const loadCategory = async (catId, pageNum = 1, append = false) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError('');
    }

    try {
      const res = await MusicProviderManager.fetchCategoryTracks(catId, {
        page: pageNum,
        limit: 25,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      setTracks((prev) => (append ? [...prev, ...res.filter((r) => !prev.some((p) => p.id === r.id))] : res));
      setHasMore(res.length >= 12);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError('Gagal mengambil katalog dari server. Menampilkan cache/lokal jika ada.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setPage(1);
    loadCategory(selectedCategoryId, 1, false);
    return () => abortRef.current?.abort();
  }, [selectedCategoryId]);

  const handleGroupChange = (groupId) => {
    setSelectedGroup(groupId);
    const g = CATEGORY_GROUPS.find((x) => x.group === groupId);
    if (g?.items?.[0]) setSelectedCategoryId(g.items[0].id);
  };

  const { fullTracks: catFullTracks, previews: catPreviews } = separateTracksByAvailability(tracks);
  const heroTrack = fullCatalog[0] || catFullTracks[0] || catalog[0] || currentTrack;

  const uniqueArtists = Array.from(
    new Map(
      [...catFullTracks, ...fullCatalog]
        .filter((t) => t.artistId)
        .map((t) => [t.artistId, { id: t.artistId, name: t.artist, cover: t.cover }])
    ).values()
  ).slice(0, 10);

  return (
    <div className="space-y-6 pb-6">
      {!isOnline && (
        <div className="glass-card rounded-2xl p-3 text-xs font-semibold flex items-center gap-2 text-amber-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          Mode Offline aktif — memutar lagu lokal dan cache tersimpan.
        </div>
      )}

      {/* Hero Card Pilihan Utama */}
      {heroTrack && (
        <section>
          <div
            onClick={() => playTrack(heroTrack, fullCatalog.length > 0 ? fullCatalog : catalog)}
            className="bubble-glass rounded-3xl p-5 relative overflow-hidden cursor-pointer group"
            style={{ boxShadow: `0 18px 46px -18px ${settings.accentColor}99` }}
          >
            <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full blur-[70px] opacity-35 pointer-events-none" style={{ backgroundColor: settings.accentColor }} />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <img src={heroTrack.cover} alt={heroTrack.title} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-2xl shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-1.5 text-zinc-950" style={{ backgroundColor: settings.accentColor }}>
                  <Sparkles className="w-3 h-3" /> {heroTrack.isFullTrack ? 'Full Track Legal' : 'Preview 30s'}
                </span>
                <h2 className="text-xl font-heading font-extrabold truncate text-main">{heroTrack.title}</h2>
                <p className="text-xs sm:text-sm text-muted mb-3 truncate">{heroTrack.artist} • {heroTrack.sourceLabel}</p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-zinc-950 shadow-lg" style={{ backgroundColor: settings.accentColor }}>
                  <Play className="w-3.5 h-3.5 fill-zinc-950" /> Putar Sekarang
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Baru Diputar */}
      {recentTracks.length > 0 && (
        <section>
          <h3 className="text-base font-heading font-bold mb-2.5 text-main">Baru Diputar</h3>
          <div data-no-tab-swipe className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {recentTracks.slice(0, 12).map((t, idx) => (
              <div key={t.id} className="w-36 shrink-0">
                <SongCard track={t} queueList={recentTracks} index={idx} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Artis Populer (Klik untuk Detail Artis) */}
      {uniqueArtists.length > 0 && (
        <section>
          <h3 className="text-base font-heading font-bold mb-2.5 text-main">Artis Populer</h3>
          <div data-no-tab-swipe className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {uniqueArtists.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => openArtist(ar.id, ar.name, ar.cover)}
                className="glass-card w-28 shrink-0 rounded-2xl p-2.5 flex flex-col items-center text-center gap-2 hover:scale-[1.03] transition"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                  {ar.cover ? <img src={ar.cover} alt={ar.name} className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-white/60" />}
                </div>
                <p className="text-xs font-semibold truncate w-full text-main">{ar.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Navigasi Kategori Trending Indonesia / English / K-Pop / 20 Genre / 12 Mood */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-heading font-bold text-main flex items-center gap-1.5">
            <Flame className="w-4 h-4" style={{ color: settings.accentColor }} /> Jelajahi Katalog & Trending
          </h3>
        </div>

        <div data-no-tab-swipe className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORY_GROUPS.map((g) => {
            const active = selectedGroup === g.group;
            return (
              <button
                key={g.group}
                type="button"
                onClick={() => handleGroupChange(g.group)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                  active ? 'text-zinc-950' : 'glass-card text-main opacity-80'
                }`}
                style={active ? { backgroundColor: settings.accentColor } : undefined}
              >
                {g.title}
              </button>
            );
          })}
        </div>

        <div data-no-tab-swipe className="flex gap-2 overflow-x-auto no-scrollbar">
          {currentGroupObj.items.map((item) => {
            const active = selectedCategoryId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCategoryId(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  active ? 'glass-card ring-1 text-main' : 'glass-subtle text-muted'
                }`}
                style={active ? { borderColor: settings.accentColor } : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {activeCatMeta?.groupNote && (
          <p className="text-[11px] text-muted glass-subtle rounded-xl px-3 py-2">{activeCatMeta.groupNote}</p>
        )}

        {error && <p className="text-xs text-amber-400">{error}</p>}

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card h-16 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center text-xs text-muted">
            Belum ada hasil untuk kategori ini. Coba kategori lain atau putar Audio Lokal ({localTracks.length} lagu).
          </div>
        ) : (
          <div className="space-y-5">
            {catFullTracks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Full Track Legal ({catFullTracks.length})
                </p>
                {catFullTracks.map((t, idx) => (
                  <SongCard key={t.id} track={t} queueList={catFullTracks} layout="row" index={idx} />
                ))}
              </div>
            )}

            {catPreviews.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Katalog Preview 30 Detik — Apple iTunes ({catPreviews.length})
                </p>
                {catPreviews.map((t, idx) => (
                  <SongCard key={t.id} track={t} queueList={catPreviews} layout="row" index={idx} />
                ))}
              </div>
            )}

            {hasMore && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  loadCategory(selectedCategoryId, next, true);
                }}
                className="w-full py-3 rounded-2xl glass-card text-xs font-bold text-main flex items-center justify-center gap-1.5"
              >
                {loadingMore ? 'Memuat lebih banyak...' : 'Muat Lebih Banyak Lagu'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
