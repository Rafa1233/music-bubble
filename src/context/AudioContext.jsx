import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { fetchCuratedCatalog, fetchTrackLyrics, searchLyricsManual } from '../services/musicApi';
import { AUDIO_STATUS } from '../services/music/TrackNormalizer';
import { musicPlaybackService } from '../services/music/MusicPlaybackService';
import { loadLibraryState, saveLibraryState, clearExpiredCache } from '../services/music/MusicCache';
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

const OLD_LIB_KEY = 'aurasound_library_v2';
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
  const [catalog, setCatalog] = useState([]);
  const [fullCatalog, setFullCatalog] = useState([]);
  const [popCatalog, setPopCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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

  const [detailRoute, setDetailRoute] = useState(null); // { type: 'artist' | 'album', id, fallbackName, fallbackCover }

  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [libraryReady, setLibraryReady] = useState(false);

  const stateRef = useRef({});
  stateRef.current = { queue, currentTrack, shuffle, repeatMode };

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    clearExpiredCache();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Muat Library dari IndexedDB (migrasi otomatis dari localStorage lama jika ada)
  useEffect(() => {
    async function initLibrary() {
      const idbData = await loadLibraryState('user_library_v2', null);
      if (idbData) {
        if (Array.isArray(idbData.likedSongs)) setLikedSongs(idbData.likedSongs);
        if (Array.isArray(idbData.playlists)) setPlaylists(idbData.playlists);
        if (Array.isArray(idbData.recentTracks)) setRecentTracks(idbData.recentTracks);
        if (Array.isArray(idbData.followedArtists)) setFollowedArtists(idbData.followedArtists);
      } else {
        try {
          const old = JSON.parse(localStorage.getItem(OLD_LIB_KEY) || '{}');
          if (Array.isArray(old.likedSongs)) setLikedSongs(old.likedSongs);
          if (Array.isArray(old.playlists)) setPlaylists(old.playlists);
          if (Array.isArray(old.recentTracks)) setRecentTracks(old.recentTracks);
        } catch {
          // abaikan
        }
      }
      setLibraryReady(true);
    }
    initLibrary();
  }, []);

  // Muat Ulang Audio Lokal dari IndexedDB
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
            restored.push({
              ...item,
              audioStatus: AUDIO_STATUS.FULL_TRACK,
              isFullTrack: true,
              corsSafe: true,
              audioUrl: url,
            });
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

  // Simpan Library Persisten ke IndexedDB & Cloud Firestore
  useEffect(() => {
    if (!libraryReady) return;
    const payload = {
      likedSongs,
      playlists,
      recentTracks: recentTracks.slice(0, 30),
      followedArtists,
    };
    saveLibraryState('user_library_v2', payload);
    if (user?.uid) saveUserLibraryToCloud(user.uid, payload);
  }, [likedSongs, playlists, recentTracks, followedArtists, user, libraryReady]);

  useEffect(() => {
    const unsub = subscribeAuth(async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (firebaseUser?.uid) {
        const cloud = await loadUserLibraryFromCloud(firebaseUser.uid);
        if (cloud) {
          if (Array.isArray(cloud.likedSongs)) setLikedSongs(cloud.likedSongs);
          if (Array.isArray(cloud.playlists)) setPlaylists(cloud.playlists);
          if (Array.isArray(cloud.recentTracks)) setRecentTracks(cloud.recentTracks);
          if (Array.isArray(cloud.followedArtists)) setFollowedArtists(cloud.followedArtists);
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

  useEffect(() => {
    musicPlaybackService.setFx(audioFx);
  }, [audioFx]);

  const updateFx = useCallback((patch) => {
    setAudioFx((prev) => ({ ...prev, preset: 'custom', ...patch }));
  }, []);

  const applyFxPreset = useCallback((preset) => {
    const map = {
      normal: DEFAULT_FX,
      bass: { ...DEFAULT_FX, preset: 'bass', bassBoost: 11, trebleBoost: 3 },
      concert: { ...DEFAULT_FX, preset: 'concert', reverb: 0.48, bassBoost: 4 },
      slowed: { ...DEFAULT_FX, preset: 'slowed', speed: 0.84, preservesPitch: false, reverb: 0.55 },
      nightcore: { ...DEFAULT_FX, preset: 'nightcore', speed: 1.22, preservesPitch: false, trebleBoost: 4 },
      karaoke: { ...DEFAULT_FX, preset: 'karaoke', vocalCut: true, echo: 0.18 },
    };
    setAudioFx(map[preset] || DEFAULT_FX);
  }, []);

  const playTrack = useCallback(async (track, customQueue = null) => {
    if (!track) return;
    setAudioError('');

    if (Array.isArray(customQueue) && customQueue.length > 0) {
      setQueue(customQueue);
    } else {
      setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [track, ...prev]));
    }

    setCurrentTrack(track);
    setRecentTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 30));

    if (track.audioStatus === AUDIO_STATUS.EXTERNAL) {
      musicPlaybackService.stopBoth();
      setIsPlaying(false);
      setIsBuffering(false);
      setIsFullPlayerOpen(true);
      return;
    }

    if (track.audioStatus === AUDIO_STATUS.UNAVAILABLE || !track.audioUrl) {
      musicPlaybackService.stopBoth();
      setIsPlaying(false);
      setIsBuffering(false);
      setAudioError('Audio tidak tersedia untuk lagu ini.');
      return;
    }

    setIsBuffering(true);
    setCurrentTime(0);
    await musicPlaybackService.play(track);
  }, []);

  const togglePlay = useCallback(async () => {
    await musicPlaybackService.togglePlay();
  }, []);

  const nextTrack = useCallback(() => {
    const { queue: q, currentTrack: curr, shuffle: isShuffle } = stateRef.current;
    if (!q || q.length === 0) return;
    if (isShuffle && q.length > 1) {
      const others = q.filter((t) => t.id !== curr?.id);
      const pick = others[Math.floor(Math.random() * others.length)];
      if (pick) playTrack(pick);
      return;
    }
    const idx = q.findIndex((t) => t.id === curr?.id);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % q.length;
    playTrack(q[nextIdx]);
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const audio = musicPlaybackService.getActiveAudio();
    if (audio && audio.currentTime > 3) {
      musicPlaybackService.seekTo(0);
      return;
    }
    const { queue: q, currentTrack: curr } = stateRef.current;
    if (!q || q.length === 0) return;
    const idx = q.findIndex((t) => t.id === curr?.id);
    const prevIdx = idx <= 0 ? q.length - 1 : idx - 1;
    playTrack(q[prevIdx]);
  }, [playTrack]);

  const seekTo = useCallback((timeSec, autoPlay = false) => {
    musicPlaybackService.seekTo(timeSec, autoPlay);
  }, []);

  const changeVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolume(v);
    musicPlaybackService.setVolume(v);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  useEffect(() => {
    musicPlaybackService.init({
      onTimeUpdate: (t) => setCurrentTime(t),
      onDuration: (d) => setDuration(d),
      onPlayState: (playing, buffering) => {
        setIsPlaying(playing);
        setIsBuffering(buffering);
      },
      onError: (msg) => setAudioError(msg),
      onEnded: () => {
        const { repeatMode: rep, queue: q, currentTrack: curr } = stateRef.current;
        if (rep === 'one') {
          musicPlaybackService.seekTo(0, true);
          return;
        }
        const idx = q.findIndex((t) => t.id === curr?.id);
        const isLast = idx === q.length - 1;
        if (rep === 'off' && isLast && !stateRef.current.shuffle) {
          setIsPlaying(false);
          musicPlaybackService.stopAndroidForeground();
          return;
        }
        nextTrack();
      },
    });
    return () => musicPlaybackService.destroy();
  }, [nextTrack]);

  useEffect(() => {
    if (!currentTrack) return;
    musicPlaybackService.publishMediaSession(currentTrack, isPlaying, {
      play: () => togglePlay(),
      pause: () => togglePlay(),
      previoustrack: () => prevTrack(),
      nexttrack: () => nextTrack(),
      seekto: (d) => d?.seekTime != null && seekTo(d.seekTime),
    });
  }, [currentTrack, isPlaying, togglePlay, prevTrack, nextTrack, seekTo]);

  useEffect(() => {
    if (duration > 0) {
      musicPlaybackService.updatePositionState(duration, currentTime);
    }
  }, [currentTime, duration]);

  // Manajemen Antrian (Queue)
  const addToQueue = useCallback((track) => {
    if (!track) return;
    setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const playNextInQueue = useCallback((track) => {
    if (!track) return;
    setQueue((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const currIdx = filtered.findIndex((t) => t.id === stateRef.current.currentTrack?.id);
      if (currIdx === -1) return [track, ...filtered];
      return [...filtered.slice(0, currIdx + 1), track, ...filtered.slice(currIdx + 1)];
    });
  }, []);

  const removeFromQueue = useCallback((trackId) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  // Manajemen Library & Artis
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

  const isLiked = useCallback((id) => likedSongs.some((t) => t.id === id), [likedSongs]);
  const toggleLike = useCallback((track) => {
    if (!track) return;
    setLikedSongs((prev) =>
      prev.some((t) => t.id === track.id) ? prev.filter((t) => t.id !== track.id) : [track, ...prev]
    );
  }, []);

  const isArtistFollowed = useCallback(
    (artistId) => followedArtists.some((a) => a.id === artistId),
    [followedArtists]
  );
  const toggleFollowArtist = useCallback((artistObj) => {
    if (!artistObj?.id) return;
    setFollowedArtists((prev) =>
      prev.some((a) => a.id === artistObj.id)
        ? prev.filter((a) => a.id !== artistObj.id)
        : [artistObj, ...prev]
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

  const editPlaylist = useCallback((playlistId, { name, description }) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? {
              ...pl,
              name: name?.trim() || pl.name,
              description: description !== undefined ? description.trim() : pl.description,
            }
          : pl
      )
    );
  }, []);

  const sortPlaylist = useCallback((playlistId, mode = 'title') => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const sorted = [...pl.tracks].sort((a, b) => {
          if (mode === 'artist') return a.artist.localeCompare(b.artist);
          if (mode === 'duration') return (b.duration || 0) - (a.duration || 0);
          return a.title.localeCompare(b.title);
        });
        return { ...pl, tracks: sorted };
      })
    );
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId || pl.tracks.some((t) => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      })
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) } : pl
      )
    );
  }, []);

  const uploadLocalAudioFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i.test(f.name)
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
      added.push({
        id,
        title,
        artist,
        album: 'Perangkat Saya',
        cover: '',
        duration: 0,
        audioStatus: AUDIO_STATUS.FULL_TRACK,
        isFullTrack: true,
        corsSafe: true,
        source: 'local',
        sourceLabel: 'Lokal',
        genre: 'Lokal',
        audioUrl: url,
      });
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

  const openArtist = useCallback((artistId, fallbackName = '', fallbackCover = '') => {
    if (!artistId) return;
    setDetailRoute({ type: 'artist', id: artistId, fallbackName, fallbackCover });
  }, []);

  const openAlbum = useCallback((albumId, fallbackName = '', fallbackCover = '') => {
    if (!albumId) return;
    setDetailRoute({ type: 'album', id: albumId, fallbackName, fallbackCover });
  }, []);

  const closeDetail = useCallback(() => setDetailRoute(null), []);

  const loginGoogle = useCallback(async () => await signInWithGoogle(), []);
  const logoutGoogle = useCallback(async () => await signOutUser(), []);

  return (
    <AudioContext.Provider
      value={{
        catalog,
        fullCatalog,
        popCatalog,
        catalogLoading,
        isOnline,
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
        detailRoute,
        user,
        likedSongs,
        playlists,
        recentTracks,
        followedArtists,
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
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        isLiked,
        toggleLike,
        isArtistFollowed,
        toggleFollowArtist,
        createPlaylist,
        editPlaylist,
        sortPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        uploadLocalAudioFiles,
        removeLocalTrack,
        openArtist,
        openAlbum,
        closeDetail,
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
