import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  fetchCuratedCatalog,
  fetchTrackLyrics,
  getBackupAudiusUrl,
  searchLyricsManual,
} from '../services/musicApi';
import { extractDominantColor } from '../utils/colorExtractor';
import { saveBlobToIDB, getBlobFromIDB, deleteBlobFromIDB } from '../utils/idbStorage';
import { ensureMusicFxGraph, applyMusicFxSettings } from '../utils/audioFxEngine';
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

const DEFAULT_FX = {
  preset: 'normal',
  speed: 1,
  preservesPitch: true,
  bassBoost: 0,
  trebleBoost: 0,
  reverb: 0,
  echo: 0,
  vocalCut: false,
};

export function AudioProvider({ children }) {
  const corsAudioRef = useRef(null);
  const plainAudioRef = useRef(null);
  const activeEngineRef = useRef('plain');
  const playSeqRef = useRef(0);
  const retriedTrackRef = useRef(null);

  const [catalog, setCatalog] = useState([]);
  const [fullCatalog, setFullCatalog] = useState([]);
  const [popCatalog, setPopCatalog] = useState([]);
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
  const [audioFx, setAudioFx] = useState(DEFAULT_FX);

  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [dominantColor, setDominantColor] = useState('#10b981');
  const [lyricsData, setLyricsData] = useState({
    synced: [],
    plain: null,
    matchedTitle: '',
    loading: false,
  });
  const [lyricsOffset, setLyricsOffset] = useState(0);

  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);

  const stateRef = useRef({});
  stateRef.current = { queue, currentTrack, shuffle, repeatMode, volume, audioFx };

  const getActiveAudio = useCallback(() => {
    return activeEngineRef.current === 'cors' ? corsAudioRef.current : plainAudioRef.current;
  }, []);

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
            restored.push({ ...item, isFullTrack: true, corsSafe: true, audioUrl: url });
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
    if (user?.uid) saveUserLibraryToCloud(user.uid, payload);
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
      .then((res) => {
        if (!mounted) return;
        setFullCatalog(res.fullTracks);
        setPopCatalog(res.popTracks);
        setCatalog(res.all);
        if (res.all.length > 0) {
          setQueue((prev) => (prev.length === 0 ? res.all : prev));
          setCurrentTrack((prev) => prev || res.all[0]);
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
    setLyricsOffset(0);

    extractDominantColor(currentTrack.cover, currentTrack.title + currentTrack.artist).then((c) => {
      if (active) setDominantColor(c);
    });

    setLyricsData({ synced: [], plain: null, matchedTitle: '', loading: true });
    fetchTrackLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration).then((res) => {
      if (active) {
        setLyricsData({
          synced: res.synced,
          plain: res.plain,
          matchedTitle: res.matchedTitle || '',
          loading: false,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [currentTrack?.id]);

  // Sinkronisasi Speed, Pitch, & Efek Web Audio secara real-time
  useEffect(() => {
    [corsAudioRef.current, plainAudioRef.current].forEach((el) => {
      if (!el) return;
      el.playbackRate = Number(audioFx.speed || 1);
      if ('preservesPitch' in el) el.preservesPitch = Boolean(audioFx.preservesPitch);
    });
    if (corsAudioRef.current) {
      applyMusicFxSettings(corsAudioRef.current, audioFx);
    }
  }, [audioFx]);

  const updateFx = useCallback((patch) => {
    setAudioFx((prev) => ({ ...prev, preset: 'custom', ...patch }));
  }, []);

  const applyFxPreset = useCallback((preset) => {
    const map = {
      normal: DEFAULT_FX,
      bass: { ...DEFAULT_FX, preset: 'bass', bassBoost: 11, trebleBoost: 3 },
      concert: { ...DEFAULT_FX, preset: 'concert', reverb: 0.48, bassBoost: 4 },
      slowed: {
        ...DEFAULT_FX,
        preset: 'slowed',
        speed: 0.84,
        preservesPitch: false,
        reverb: 0.55,
      },
      nightcore: {
        ...DEFAULT_FX,
        preset: 'nightcore',
        speed: 1.22,
        preservesPitch: false,
        trebleBoost: 4,
      },
      karaoke: { ...DEFAULT_FX, preset: 'karaoke', vocalCut: true, echo: 0.18 },
    };
    setAudioFx(map[preset] || DEFAULT_FX);
  }, []);

  const playTrack = useCallback(async (track, customQueue = null, forcePlain = false) => {
    if (!track || !track.audioUrl) {
      setAudioError('Sumber audio tidak tersedia.');
      return;
    }

    const useCors = Boolean(track.corsSafe) && !forcePlain;
    const targetAudio = useCors ? corsAudioRef.current : plainAudioRef.current;
    const otherAudio = useCors ? plainAudioRef.current : corsAudioRef.current;
    if (!targetAudio) return;

    if (otherAudio) otherAudio.pause();
    activeEngineRef.current = useCors ? 'cors' : 'plain';

    if (useCors) {
      ensureMusicFxGraph(targetAudio);
      applyMusicFxSettings(targetAudio, stateRef.current.audioFx);
    }

    const seq = ++playSeqRef.current;
    retriedTrackRef.current = null;
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
      if (targetAudio.error || targetAudio.src !== track.audioUrl) {
        targetAudio.pause();
        targetAudio.src = track.audioUrl;
        targetAudio.load();
      }
      targetAudio.volume = stateRef.current.volume;
      targetAudio.playbackRate = Number(stateRef.current.audioFx.speed || 1);
      if ('preservesPitch' in targetAudio) {
        targetAudio.preservesPitch = Boolean(stateRef.current.audioFx.preservesPitch);
      }
      await targetAudio.play();
      if (playSeqRef.current === seq) {
        setIsPlaying(true);
        setIsBuffering(false);
      }
    } catch (err) {
      if (playSeqRef.current === seq) {
        setIsPlaying(false);
        setIsBuffering(false);
        if (err?.name !== 'AbortError') {
          setAudioError('Ketuk tombol Play atau coba lagu lainnya.');
        }
      }
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = getActiveAudio();
    if (!audio || !currentTrack) return;

    if (audio.error || !audio.src || audio.src !== currentTrack.audioUrl) {
      await playTrack(currentTrack);
      return;
    }

    if (audio.paused) {
      try {
        if (activeEngineRef.current === 'cors') ensureMusicFxGraph(audio);
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
  }, [currentTrack, getActiveAudio, playTrack]);

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
    const audio = getActiveAudio();
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const { queue: q, currentTrack: curr } = stateRef.current;
    if (!q || q.length === 0) return;
    const idx = q.findIndex((t) => t.id === curr?.id);
    const prevIdx = idx <= 0 ? q.length - 1 : idx - 1;
    playTrack(q[prevIdx]);
  }, [getActiveAudio, playTrack]);

  const seekTo = useCallback(
    (timeSec, autoPlay = false) => {
      const audio = getActiveAudio();
      const curr = stateRef.current.currentTrack;
      if (!audio || Number.isNaN(timeSec)) return;

      const maxDur = audio.duration || curr?.duration || 30;
      const safeLimit = curr && !curr.isFullTrack && maxDur <= 35 ? Math.max(0, maxDur - 1) : maxDur;
      const clamped = Math.max(0, Math.min(timeSec, safeLimit));
      try {
        audio.currentTime = clamped;
        setCurrentTime(clamped);
        if (autoPlay && audio.paused) {
          audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      } catch {
        // abaikan jika audio belum siap
      }
    },
    [getActiveAudio]
  );

  const changeVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolume(v);
    if (corsAudioRef.current) corsAudioRef.current.volume = v;
    if (plainAudioRef.current) plainAudioRef.current.volume = v;
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  useEffect(() => {
    const corsAudio = new Audio();
    corsAudio.crossOrigin = 'anonymous';
    corsAudio.preload = 'metadata';

    const plainAudio = new Audio();
    plainAudio.preload = 'metadata';

    corsAudioRef.current = corsAudio;
    plainAudioRef.current = plainAudio;

    const bind = (audio, engineName) => {
      const isMine = () => activeEngineRef.current === engineName;

      const onTimeUpdate = () => isMine() && setCurrentTime(audio.currentTime || 0);
      const onLoaded = () => isMine() && setDuration(audio.duration || 0);
      const onPlay = () => {
        if (isMine()) {
          setIsPlaying(true);
          setIsBuffering(false);
        }
      };
      const onPause = () => isMine() && setIsPlaying(false);
      const onWaiting = () => isMine() && setIsBuffering(true);
      const onCanPlay = () => isMine() && setIsBuffering(false);
      const onError = async () => {
        if (!isMine()) return;
        const curr = stateRef.current.currentTrack;
        if (curr?.source === 'audius' && retriedTrackRef.current !== curr.id) {
          retriedTrackRef.current = curr.id;
          const backupUrl = await getBackupAudiusUrl(curr);
          if (backupUrl) {
            playTrack({ ...curr, audioUrl: backupUrl }, null, engineName === 'cors');
            return;
          }
        }
        setIsPlaying(false);
        setIsBuffering(false);
        setAudioError('Stream audio gagal dimuat. Coba lagu lainnya.');
      };
      const onEnded = () => {
        if (!isMine()) return;
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
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('waiting', onWaiting);
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      audio.addEventListener('ended', onEnded);

      return () => {
        audio.pause();
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('waiting', onWaiting);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('ended', onEnded);
      };
    };

    const unbindCors = bind(corsAudio, 'cors');
    const unbindPlain = bind(plainAudio, 'plain');
    return () => {
      unbindCors();
      unbindPlain();
    };
  }, [nextTrack, playTrack]);

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
          playbackRate: Number(audioFx.speed || 1),
          position: Math.min(currentTime, duration),
        });
      } catch {
        // abaikan
      }
    }
  }, [currentTime, duration, audioFx.speed]);

  const applyManualLyrics = useCallback((item) => {
    if (!item) return;
    setLyricsOffset(0);
    setLyricsData({
      synced: item.synced || [],
      plain: item.plain || null,
      matchedTitle: item.matchedTitle || `${item.artist} — ${item.title}`,
      loading: false,
    });
  }, []);

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
      f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i.test(f.name)
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
        isFullTrack: true,
        corsSafe: true,
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

  const loginGoogle = useCallback(async () => await signInWithGoogle(), []);
  const logoutGoogle = useCallback(async () => await signOutUser(), []);

  return (
    <AudioContext.Provider
      value={{
        catalog,
        fullCatalog,
        popCatalog,
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
        audioFx,
        isFullPlayerOpen,
        dominantColor,
        lyricsData,
        lyricsOffset,
        user,
        likedSongs,
        playlists,
        recentTracks,
        localTracks,
        setIsFullPlayerOpen,
        setLyricsOffset,
        setShuffle,
        updateFx,
        applyFxPreset,
        searchLyricsManual,
        applyManualLyrics,
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
