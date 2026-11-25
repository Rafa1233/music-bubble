import React, { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, Upload, Clock, X, Music } from 'lucide-react';
import { searchMusic } from '../services/musicApi';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/SongCard';

const HISTORY_KEY = 'aurasound_search_history_v1';
const CATEGORIES = ['Semua', 'Lagu', 'Artis', 'Lokal'];

export default function Search() {
  const { localTracks, uploadLocalAudioFiles, catalog } = useAudio();
  const { settings, isLightMode } = useTheme();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (category === 'Lokal') {
      const q = query.trim().toLowerCase();
      setResults(
        q
          ? localTracks.filter(
              (t) =>
                t.title.toLowerCase().includes(q) ||
                t.artist.toLowerCase().includes(q)
            )
          : localTracks
      );
      return;
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const fetched = await searchMusic(query.trim(), 24);
        let filtered = fetched;
        if (category === 'Artis') {
          const qLower = query.trim().toLowerCase();
          const byArtist = fetched.filter((t) => t.artist.toLowerCase().includes(qLower));
          filtered = byArtist.length > 0 ? byArtist : fetched;
        }
        setResults(filtered);
        setHistory((prev) => {
          const next = [query.trim(), ...prev.filter((h) => h !== query.trim())].slice(0, 6);
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, localTracks]);

  const handleLocalUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added = await uploadLocalAudioFiles(files);
    if (added.length > 0) {
      setUploadMsg(`${added.length} file audio lokal berhasil ditambahkan!`);
      setCategory('Lokal');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="glass-card flex-1 rounded-2xl px-4 py-3 flex items-center gap-3">
          <SearchIcon className="w-5 h-5 opacity-70 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari lagu, artis (contoh: Mahalini, Tulus, NIKI)..."
            className={`w-full bg-transparent outline-none text-sm ${
              isLightMode ? 'text-slate-900 placeholder:text-slate-500' : 'text-white placeholder:text-white/50'
            }`}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="opacity-70 hover:opacity-100">
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
          className="px-4 py-3 rounded-2xl font-semibold text-sm text-zinc-950 flex items-center justify-center gap-2 shrink-0 shadow-md hover:brightness-110 active:scale-95 transition"
          style={{ backgroundColor: settings.accentColor }}
        >
          <Upload className="w-4 h-4" /> Putar File MP3/FLAC
        </button>
      </div>

      {uploadMsg && (
        <div className="glass-card rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <span>{uploadMsg}</span>
          <button type="button" onClick={() => setUploadMsg('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                active ? 'text-zinc-950' : 'glass-card opacity-80 hover:opacity-100'
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
          <p className="text-xs font-semibold uppercase tracking-wider opacity-65 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pencarian Terakhir
          </p>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className="glass-card px-3 py-1.5 rounded-full text-xs hover:bg-white/15 transition"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card h-16 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2.5">
          {results.map((track, idx) => (
            <SongCard key={track.id} track={track} queueList={results} layout="row" index={idx} />
          ))}
        </div>
      ) : query.trim() ? (
        <div className="glass-card rounded-3xl p-8 text-center opacity-75">
          <Music className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm">Tidak ada lagu ditemukan untuk "{query}".</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-heading font-bold mb-3">Jelajahi Populer</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {catalog.slice(0, 8).map((track, idx) => (
              <SongCard key={track.id} track={track} queueList={catalog} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
