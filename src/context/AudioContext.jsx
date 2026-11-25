import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { fetchCuratedCatalog, fetchTrackLyrics } from '../services/musicApi';
import { extractDominantColor } from '../utils/colorExtractor';
import { saveBlobToIDB, getBlobFromIDB, deleteBlobFromIDB } from '../utils/idbStorage';
import {
  subscribeAuth,
  signInWithGoogle,
  signOutUser,
  loadUserLibraryFromCloud,
  saveUserLibraryToCloud,
} from '../firebase';

const AudioContext = createContext(null);

const LIB_STORAGE_KEY = 'aurasound_library_v2';
const LOCAL_TRACKS_KEY = 'aurasound_local_tracks_meta_v2';

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const playSeqRef = useRef(0);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [queue, setQueue] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioError, setAudioError] = useState('');

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');

  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [dominantColor, setDominantColor] = useState('#10b981');
  const [lyricsData, setLyricsData] = useState({ synced: [], plain: null, loading: false });

  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);

  const stateRef = useRef({});
  stateRef.current = { queue, currentTrack, shuffle, repeatMode };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LIB_STORAGE_KEY) || '{}');
      if (Array.isArray(saved.likedSongs)) setLikedSongs(saved.likedSongs);
      if (Array.isArray(saved.playlists)) setPlaylists(saved.playlists);
      if (Array.isArray(saved.recentTracks)) setRecentTracks(saved.recentTracks);
    } catch {
      // abaikan
    }
  }, []);

  useEffect(() => {
    const createdUrls = [];
    async function restoreLocalAudio() {
      try {
        const metaList = JSON.parse(localStorage.getItem(LOCAL_TRACKS_KEY) || '[]');
        const restored = [];
        for (const item of metaList) {
          const blob = await getBlobFromIDB(item.id);
          if (blob) {
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            restored.push({ ...item, audioUrl: url });
          }
        }
        setLocalTracks(restored);
      } catch {
        // abaikan
      }
    }
    restoreLocalAudio();
    return () => {
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    const payload = { likedSongs, playlists, recentTracks: recentTracks.slice(0, 20) };
    try {
      localStorage.setItem(LIB_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
    if (user?.uid) {
      saveUserLibraryToCloud(user.uid, payload);
    }
  }, [likedSongs, playlists, recentTracks, user]);

  useEffect(() => {
    const unsub = subscribeAuth(async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (firebaseUser?.uid) {
        const cloud = await loadUserLibraryFromCloud(firebaseUser.uid);
        if (cloud) {
          if (Array.isArray(cloud.likedSongs)) setLikedSongs(cloud.likedSongs);
          if (Array.isArray(cloud.playlists)) setPlaylists(cloud.playlists);
          if (Array.isArray(cloud.recentTracks)) setRecentTracks(cloud.recentTracks);
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    let mounted = true;
    setCatalogLoading(true);
    fetchCuratedCatalog()
      .then((tracks) => {
        if (!mounted) return;
        setCatalog(tracks);
        if (tracks.length > 0) {
          setQueue((prev) => (prev.length === 0 ? tracks : prev));
          setCurrentTrack((prev) => prev || tracks[0]);
        }
      })
      .finally(() => {
        if (mounted) setCatalogLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    let active = true;

    extractDominantColor(currentTrack.cover, currentTrack.title + currentTrack.artist).then((c) => {
      if (active) setDominantColor(c);
    });

    setLyricsData({ synced: [], plain: null, loading: true });
    fetchTrackLyrics(currentTrack.title, currentTrack.artist).then((res) => {
      if (active) {
        setLyricsData({ synced: res.synced, plain: res.plain, loading: false });
      }
    });

    return () => {
      active = false;
    };
  }, [currentTrack?.id]);

  const playTrack = useCallback(async (track, customQueue = null) => {
    if (!track || !track.audioUrl) {
      setAudioError('Sumber audio tidak tersedia.');
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const seq = ++playSeqRef.current;
    setAudioError('');
    setIsBuffering(true);

    if (Array.isArray(customQueue) && customQueue.length > 0) {
      setQueue(customQueue);
    } else {
      setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [track, ...prev]));
    }

    setCurrentTrack(track);
    setRecentTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 20));

    try {
      if (audio.error || audio.src !== track.audioUrl) {
        audio.pause();
        audio.src = track.audioUrl;
        audio.load();
      }
      audio.volume = volume;
      await audio.play();
      if (playSeqRef.current === seq) {
        setIsPlaying(true);
        setIsBuffering(false);
      }
    } catch (err) {
      if (playSeqRef.current === seq) {
        setIsPlaying(false);
        setIsBuffering(false);
        if (err?.name !== 'AbortError') {
          setAudioError('Ketuk tombol Play untuk memulai audio.');
        }
      }
    }
  }, [volume]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (audio.error || !audio.src || audio.src !== currentTrack.audioUrl) {
      await playTrack(currentTrack);
      return;
    }

    if (audio.paused) {
      try {
        setAudioError('');
        await audio.play();
        setIsPlaying(true);
      } catch {
        setAudioError('Gagal memutar audio.');
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, playTrack]);

  const nextTrack = useCallback(() => {
    const { queue: q, currentTrack: curr, shuffle: isShuffle } = stateRef.current;
    if (!q || q.length === 0) return;
    if (isShuffle && q.length > 1) {
      const others = q.filter((t) => t.id !== curr?.id);
      const randomTrack = others[Math.floor(Math.random() * others.length)];
      if (randomTrack) playTrack(randomTrack);
      return;
    }
    const idx = q.findIndex((t) => t.id === curr?.id);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % q.length;
    playTrack(q[nextIdx]);
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const { queue: q, currentTrack: curr } = stateRef.current;
    if (!q || q.length === 0) return;
    const idx = q.findIndex((t) => t.id === curr?.id);
    const prevIdx = idx <= 0 ? q.length - 1 : idx - 1;
    playTrack(q[prevIdx]);
  }, [playTrack]);

  const seekTo = useCallback((timeSec) => {
    const audio = audioRef.current;
    if (!audio || Number.isNaN(timeSec)) return;
    const clamped = Math.max(0, Math.min(timeSec, audio.duration || timeSec));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const changeVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onError = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setAudioError('Stream audio gagal dimuat. Coba lagu lain.');
    };
    const onEnded = () => {
      const { repeatMode: rep, queue: q, currentTrack: curr } = stateRef.current;
      if (rep === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const idx = q.findIndex((t) => t.id === curr?.id);
      const isLast = idx === q.length - 1;
      if (rep === 'off' && isLast && !stateRef.current.shuffle) {
        setIsPlaying(false);
        return;
      }
      nextTrack();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, [nextTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const artwork = currentTrack.cover
      ? [
          { src: currentTrack.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.cover, sizes: '512x512', type: 'image/jpeg' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || 'AuraSound',
      artwork,
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const handlers = [
      ['play', () => togglePlay()],
      ['pause', () => togglePlay()],
      ['previoustrack', () => prevTrack()],
      ['nexttrack', () => nextTrack()],
      ['seekto', (details) => details?.seekTime != null && seekTo(details.seekTime)],
    ];

    handlers.forEach(([action, fn]) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn);
      } catch {
        // abaikan
      }
    });
  }, [currentTrack, isPlaying, togglePlay, prevTrack, nextTrack, seekTo]);

  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(currentTime, duration),
        });
      } catch {
        // abaikan
      }
    }
  }, [currentTime, duration]);

  const isLiked = useCallback(
    (trackId) => likedSongs.some((t) => t.id === trackId),
    [likedSongs]
  );

  const toggleLike = useCallback((track) => {
    if (!track) return;
    setLikedSongs((prev) =>
      prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [track, ...prev]
    );
  }, []);

  const createPlaylist = useCallback((name, description = '') => {
    if (!name.trim()) return null;
    const newPl = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      tracks: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => [newPl, ...prev]);
    return newPl;
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      })
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) }
          : pl
      )
    );
  }, []);

  const uploadLocalAudioFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f.name)
    );
    if (files.length === 0) return [];

    const added = [];
    for (const file of files) {
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Audio Lokal';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName;

      await saveBlobToIDB(id, file);
      const url = URL.createObjectURL(file);

      const meta = {
        id,
        title,
        artist,
        album: 'Perangkat Saya',
        cover: '',
        duration: 0,
        source: 'local',
        genre: 'Lokal',
      };
      added.push({ ...meta, audioUrl: url });
    }

    setLocalTracks((prev) => {
      const updated = [...added, ...prev];
      const metaOnly = updated.map(({ audioUrl, ...rest }) => rest);
      try {
        localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(metaOnly));
      } catch {
        // ignore
      }
      return updated;
    });

    return added;
  }, []);

  const removeLocalTrack = useCallback(async (trackId) => {
    await deleteBlobFromIDB(trackId).catch(() => {});
    setLocalTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackId);
      const metaOnly = updated.map(({ audioUrl, ...rest }) => rest);
      try {
        localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(metaOnly));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const loginGoogle = useCallback(async () => {
    return await signInWithGoogle();
  }, []);

  const logoutGoogle = useCallback(async () => {
    await signOutUser();
  }, []);

  return (
    <AudioContext.Provider
      value={{
        catalog,
        catalogLoading,
        queue,
        currentTrack,
        isPlaying,
        isBuffering,
        audioError,
        currentTime,
        duration,
        volume,
        shuffle,
        repeatMode,
        isFullPlayerOpen,
        dominantColor,
        lyricsData,
        user,
        likedSongs,
        playlists,
        recentTracks,
        localTracks,
        setIsFullPlayerOpen,
        setShuffle,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        changeVolume,
        cycleRepeat,
        isLiked,
        toggleLike,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        uploadLocalAudioFiles,
        removeLocalTrack,
        loginGoogle,
        logoutGoogle,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio harus digunakan di dalam AudioProvider');
  return ctx;
}
EOFnah MB nah MB.n
cat << 'EOF' > src/utils/idbStorage.js
const DB_NAME = 'AuraSoundMediaDB';
const DB_VERSION = 1;
const STORE_MEDIA = 'media_blobs';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBlobToIDB(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    tx.objectStore(STORE_MEDIA).put(blob, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlobFromIDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const req = tx.objectStore(STORE_MEDIA).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBlobFromIDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    tx.objectStore(STORE_MEDIA).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
