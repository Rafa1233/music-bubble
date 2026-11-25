import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';
import { ForegroundService, ServiceType } from '@capawesome-team/capacitor-android-foreground-service';
import { resolveTrackPlayback } from './SourceResolver';
import { getBackupAudiusStreamUrl } from './providers/audius/audiusProvider';
import { ensureMusicFxGraph, applyMusicFxSettings } from '../../utils/audioFxEngine';

class MusicPlaybackEngine {
  constructor() {
    this.corsAudio = null;
    this.plainAudio = null;
    this.activeEngine = 'plain';
    this.currentTrack = null;
    this.playSeq = 0;
    this.retriedId = null;
    this.foregroundActive = false;
    this.listeners = {};
    this.volume = 0.85;
    this.fx = { speed: 1, preservesPitch: true, bassBoost: 0, trebleBoost: 0, reverb: 0, echo: 0, vocalCut: false };
  }

  init(callbacks = {}) {
    this.listeners = callbacks;
    if (this.corsAudio && this.plainAudio) return;

    this.corsAudio = new Audio();
    this.corsAudio.crossOrigin = 'anonymous';
    this.corsAudio.preload = 'metadata';

    this.plainAudio = new Audio();
    this.plainAudio.preload = 'metadata';

    this._bindEvents(this.corsAudio, 'cors');
    this._bindEvents(this.plainAudio, 'plain');
  }

  destroy() {
    [this.corsAudio, this.plainAudio].forEach((a) => {
      if (a) {
        a.pause();
        a.src = '';
      }
    });
    this.stopAndroidForeground();
  }

  getActiveAudio() {
    return this.activeEngine === 'cors' ? this.corsAudio : this.plainAudio;
  }

  _bindEvents(audio, name) {
    const isMine = () => this.activeEngine === name;

    audio.addEventListener('timeupdate', () => {
      if (isMine()) this.listeners.onTimeUpdate?.(audio.currentTime || 0);
    });
    audio.addEventListener('loadedmetadata', () => {
      if (isMine()) this.listeners.onDuration?.(audio.duration || 0);
    });
    audio.addEventListener('play', () => {
      if (isMine()) {
        this.listeners.onPlayState?.(true, false);
        this.startOrUpdateAndroidForeground(this.currentTrack);
      }
    });
    audio.addEventListener('pause', () => {
      if (isMine()) this.listeners.onPlayState?.(false, false);
    });
    audio.addEventListener('waiting', () => {
      if (isMine()) this.listeners.onPlayState?.(true, true);
    });
    audio.addEventListener('canplay', () => {
      if (isMine()) this.listeners.onPlayState?.(!audio.paused, false);
    });
    audio.addEventListener('error', async () => {
      if (!isMine()) return;
      if (this.currentTrack?.source === 'audius' && this.retriedId !== this.currentTrack.id) {
        this.retriedId = this.currentTrack.id;
        const backup = await getBackupAudiusStreamUrl(this.currentTrack);
        if (backup) {
          this.play({ ...this.currentTrack, audioUrl: backup }, { forcePlain: name === 'cors' });
          return;
        }
      }
      this.listeners.onPlayState?.(false, false);
      this.listeners.onError?.('Stream audio gagal dimuat. Coba lagu atau provider lain.');
    });
    audio.addEventListener('ended', () => {
      if (isMine()) this.listeners.onEnded?.();
    });
  }

  async play(track, { forcePlain = false } = {}) {
    const resolved = resolveTrackPlayback(track);
    if (!resolved.playable || resolved.mode === 'youtube-iframe' || resolved.mode === 'external-link') {
      this.stopBoth();
      this.currentTrack = track;
      return resolved;
    }

    const useCors = resolved.mode === 'cors-audio' && !forcePlain;
    const target = useCors ? this.corsAudio : this.plainAudio;
    const other = useCors ? this.plainAudio : this.corsAudio;
    if (!target) return resolved;

    if (other) {
      other.pause();
      other.currentTime = 0;
    }

    this.activeEngine = useCors ? 'cors' : 'plain';
    this.currentTrack = track;
    this.retriedId = null;
    const seq = ++this.playSeq;

    if (useCors) {
      ensureMusicFxGraph(target);
      applyMusicFxSettings(target, this.fx);
    }

    try {
      if (target.error || target.src !== resolved.url) {
        target.pause();
        target.src = resolved.url;
        target.load();
      }
      target.volume = this.volume;
      target.playbackRate = Number(this.fx.speed || 1);
      if ('preservesPitch' in target) {
        target.preservesPitch = Boolean(this.fx.preservesPitch);
      }
      await target.play();
      if (this.playSeq === seq) {
        this.publishMediaSession(track, true);
      }
    } catch (err) {
      if (this.playSeq === seq && err?.name !== 'AbortError') {
        this.listeners.onPlayState?.(false, false);
        this.listeners.onError?.('Ketuk Play untuk memulai audio.');
      }
    }
    return resolved;
  }

  stopBoth() {
    if (this.corsAudio) this.corsAudio.pause();
    if (this.plainAudio) this.plainAudio.pause();
    this.stopAndroidForeground();
  }

  async togglePlay() {
    const audio = this.getActiveAudio();
    if (!audio || !this.currentTrack) return;
    if (audio.error || !audio.src || audio.src !== this.currentTrack.audioUrl) {
      await this.play(this.currentTrack);
      return;
    }
    if (audio.paused) {
      if (this.activeEngine === 'cors') ensureMusicFxGraph(audio);
      await audio.play();
      this.publishMediaSession(this.currentTrack, true);
    } else {
      audio.pause();
      this.publishMediaSession(this.currentTrack, false);
    }
  }

  seekTo(timeSec, autoPlay = false) {
    const audio = this.getActiveAudio();
    if (!audio || Number.isNaN(timeSec)) return;
    const maxDur = audio.duration || this.currentTrack?.duration || 30;
    const isPreview = this.currentTrack && !this.currentTrack.isFullTrack;
    const limit = isPreview && maxDur <= 35 ? Math.max(0, maxDur - 0.8) : maxDur;
    const clamped = Math.max(0, Math.min(timeSec, limit));
    try {
      audio.currentTime = clamped;
      this.listeners.onTimeUpdate?.(clamped);
      if (autoPlay && audio.paused) {
        audio.play().catch(() => {});
      }
    } catch {
      // abaikan jika belum siap
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.corsAudio) this.corsAudio.volume = this.volume;
    if (this.plainAudio) this.plainAudio.volume = this.volume;
  }

  setFx(fx) {
    this.fx = { ...this.fx, ...fx };
    [this.corsAudio, this.plainAudio].forEach((el) => {
      if (!el) return;
      el.playbackRate = Number(this.fx.speed || 1);
      if ('preservesPitch' in el) el.preservesPitch = Boolean(this.fx.preservesPitch);
    });
    if (this.corsAudio) applyMusicFxSettings(this.corsAudio, this.fx);
  }

  async startOrUpdateAndroidForeground(track) {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android' || !track) return;
    try {
      const opts = {
        id: 7701,
        title: track.title || 'AuraSound',
        body: `${track.artist || 'Music'} • ${track.isFullTrack ? 'Full Track' : 'Preview'}`,
        smallIcon: 'ic_launcher',
        serviceType: ServiceType.MediaPlayback,
        silent: true,
      };
      if (!this.foregroundActive) {
        await ForegroundService.startForegroundService(opts);
        this.foregroundActive = true;
      } else {
        await ForegroundService.updateForegroundService(opts);
      }
    } catch {
      // tetap lanjut jika izin notifikasi belum diberikan
    }
  }

  async stopAndroidForeground() {
    if (!this.foregroundActive) return;
    this.foregroundActive = false;
    try {
      await ForegroundService.stopForegroundService();
    } catch {
      // abaikan
    }
  }

  async publishMediaSession(track, playing, handlers = null) {
    if (!track) return;
    const artwork = track.cover
      ? [
          { src: track.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: track.cover, sizes: '512x512', type: 'image/jpeg' },
        ]
      : [];

    if (Capacitor.isNativePlatform()) {
      try {
        await MediaSession.setMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'AuraSound',
          artwork,
        });
        await MediaSession.setPlaybackState({ playbackState: playing ? 'playing' : 'paused' });
        if (handlers) {
          for (const [action, fn] of Object.entries(handlers)) {
            await MediaSession.setActionHandler({ action }, fn);
          }
        }
      } catch {
        // fallback ke Web MediaSession di bawah
      }
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'AuraSound',
        artwork,
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      if (handlers) {
        for (const [action, fn] of Object.entries(handlers)) {
          try {
            navigator.mediaSession.setActionHandler(action, fn);
          } catch {
            // abaikan
          }
        }
      }
    }
  }

  updatePositionState(duration, currentTime) {
    if (!duration || duration <= 0) return;
    const state = {
      duration,
      playbackRate: Number(this.fx.speed || 1),
      position: Math.min(currentTime, duration),
    };
    if (Capacitor.isNativePlatform()) {
      MediaSession.setPositionState(state).catch(() => {});
    }
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState(state);
      } catch {
        // abaikan
      }
    }
  }
}

export const musicPlaybackService = new MusicPlaybackEngine();
