import React, { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, Upload, Clock, X, Music, ChevronRight } from 'lucide-react';
import { smartSearchMusic } from '../services/music/MusicSearchService';
import { MusicProviderManager } from '../services/music/MusicProviderManager';
import { AUDIO_STATUS } from '../services/music/TrackNormalizer';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

const HISTORY_KEY = 'aurasound_search_history_v1';
const CATEGORIES = ['Semua', 'Full Track', 'Preview 30s', 'External', 'Lokal'];

export default function Search() {
  const { localTracks, uploadLocalAudioFiles, catalog } = useAudio();
  const { settings } = useTheme();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [data, setData] = useState({ all: [], fullTracks: [], previews: [], external: [], hasMore: false });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  const providerStatuses = MusicProviderManager.getProviderStatuses();

  const runSearch = async (qStr, pageNum = 1, append = false) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError('');
    }

    try {
      const res = await smartSearchMusic(qStr, { page: pageNum, limit: 25, signal: controller.signal });
      if (controller.signal.aborted) return;

      if (!append) {
        setData(res);
        setHistory((prev) => {
          const next = [qStr, ...prev.filter((h) => h !== qStr)].slice(0, 8);
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else {
        setData((prev) => {
          const mergeUnique = (a, b) => [...a, ...b.filter((item) => !a.some((x) => x.id === item.id))];
          return {
            all: mergeUnique(prev.all, res.all),
            fullTracks: mergeUnique(prev.fullTracks, res.fullTracks),
            previews: mergeUnique(prev.previews, res.previews),
            external: mergeUnique(prev.external, res.external),
            hasMore: res.hasMore,
          };
        });
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Pencarian gagal sementara. Periksa koneksi Anda.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (category === 'Lokal') return;
    if (!query.trim()) {
      setData({ all: [], fullTracks: [], previews: [], external: [], hasMore: false });
      return;
    }

    setPage(1);
    const timer = setTimeout(() => runSearch(query.trim(), 1, false), 320);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, category]);

  const handleLocalUpload = async (e) => {
    const added = await uploadLocalAudioFiles(e.target.files);
    if (added.length > 0) {
      setUploadMsg(`${added.length} file audio lokal ditambahkan.`);
      setCategory('Lokal');
    }
    e.target.value = '';
  };

  const localFiltered = query.trim()
    ? localTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.trim().toLowerCase()) ||
          t.artist.toLowerCase().includes(query.trim().toLowerCase())
      )
    : localTracks;

  const visibleTracks =
    category === 'Lokal'
      ? localFiltered
      : category === 'Full Track'
      ? data.fullTracks
      : category === 'Preview 30s'
      ? data.previews
      : category === 'External'
      ? data.external
      : data.all;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="glass-input flex-1 rounded-2xl px-4 py-3 flex items-center gap-3">
          <SearchIcon className="w-5 h-5 text-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, artis, album, genre (Mahalini, NIKI, Jazz, Lofi)..."
            className="w-full bg-transparent outline-none text-sm text-main placeholder:opacity-60"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-muted hover:text-main">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.flac,.m4a,.aac,audio/*"
          multiple
          onChange={handleLocalUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-3 rounded-2xl font-semibold text-sm text-zinc-950 flex items-center justify-center gap-2 shrink-0 shadow-md"
          style={{ backgroundColor: settings.accentColor }}
        >
          <Upload className="w-4 h-4" /> File MP3/FLAC
        </button>
      </div>

      {/* Status Provider Aktif */}
      <div data-no-tab-swipe className="flex gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
        {Object.values(providerStatuses).map((p) => (
          <span key={p.name} className={`px-2.5 py-1 rounded-full glass-subtle shrink-0 ${p.active ? 'text-main' : 'text-muted opacity-60'}`}>
            {p.name}: {p.active ? p.type : 'Butuh API Key'}
          </span>
        ))}
      </div>

      {uploadMsg && (
        <div className="glass-card rounded-2xl px-4 py-2 text-xs flex items-center justify-between text-main">
          <span>{uploadMsg}</span>
          <button type="button" onClick={() => setUploadMsg('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div data-no-tab-swipe className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                active ? 'text-zinc-950' : 'glass-card text-main opacity-80'
              }`}
              style={active ? { backgroundColor: settings.accentColor } : undefined}
            >
              {cat} {cat === 'Lokal' ? `(${localTracks.length})` : ''}
            </button>
          );
        })}
      </div>

      {!query && category !== 'Lokal' && history.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pencarian Terakhir
          </p>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)} className="glass-card px-3 py-1.5 rounded-full text-xs text-main">
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-amber-400">{error}</p>}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-16 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : visibleTracks.length > 0 ? (
        <div className="space-y-5">
          {category === 'Semua' ? (
            <>
              {data.fullTracks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Full Track Legal ({data.fullTracks.length})
                  </p>
                  {data.fullTracks.map((t, idx) => (
                    <SongCard key={t.id} track={t} queueList={data.fullTracks} layout="row" index={idx} />
                  ))}
                </div>
              )}
              {data.previews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Preview 30 Detik — Apple iTunes ({data.previews.length})
                  </p>
                  {data.previews.map((t, idx) => (
                    <SongCard key={t.id} track={t} queueList={data.previews} layout="row" index={idx} />
                  ))}
                </div>
              )}
              {data.external.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Tersedia via Pemutar Resmi Eksternal ({data.external.length})
                  </p>
                  {data.external.map((t, idx) => (
                    <SongCard key={t.id} track={t} queueList={data.external} layout="row" index={idx} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {visibleTracks.map((t, idx) => (
                <SongCard key={t.id} track={t} queueList={visibleTracks} layout="row" index={idx} />
              ))}
            </div>
          )}

          {category !== 'Lokal' && data.hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                runSearch(query.trim(), next, true);
              }}
              className="w-full py-3 rounded-2xl glass-card text-xs font-bold text-main flex items-center justify-center gap-1.5"
            >
              {loadingMore ? 'Memuat...' : 'Muat Hasil Berikutnya'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : query.trim() ? (
        <div className="glass-card rounded-3xl p-8 text-center text-muted">
          <Music className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm">Tidak ada hasil untuk "{query}" pada filter ini.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-heading font-bold mb-3 text-main">Rekomendasi Full Track</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {catalog.filter((t) => t.audioStatus === AUDIO_STATUS.FULL_TRACK).slice(0, 8).map((track, idx) => (
              <SongCard key={track.id} track={track} queueList={catalog} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
