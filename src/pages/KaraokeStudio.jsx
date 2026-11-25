import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
  Plus,
  Volume2,
  Sparkles,
  Download,
  Sliders,
  Music2,
  Upload,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { playSpecialSfx, playVocalTakeWithFx } from '../utils/audioFxEngine';

const VOICE_EFFECTS = [
  { id: 'normal', label: 'Normal' },
  { id: 'echo', label: 'Echo Hall' },
  { id: 'reverb', label: 'Konser' },
  { id: 'chipmunk', label: 'Chipmunk' },
  { id: 'deep', label: 'Deep Bass' },
  { id: 'robot', label: 'Robot' },
  { id: 'radio', label: 'Radio LoFi' },
];

export default function KaraokeStudio() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    audioFx,
    lyricsData,
    lyricsOffset,
    togglePlay,
    seekTo,
    updateFx,
    uploadLocalAudioFiles,
    playTrack,
  } = useAudio();
  const { settings } = useTheme();

  const [recState, setRecState] = useState('idle'); // 'idle' | 'recording' | 'paused'
  const [recSeconds, setRecSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState('');
  const [syncMusic, setSyncMusic] = useState(true);
  const [takes, setTakes] = useState([]);
  const [mixPlaying, setMixPlaying] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const activeVocalElsRef = useRef([]);
  const extraAudioInputRef = useRef(null);
  const backingInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      activeVocalElsRef.current.forEach((el) => el.pause());
    };
  }, []);

  const activeLyricIndex = useMemo(() => {
    const synced = lyricsData.synced;
    if (!synced || synced.length === 0) return -1;
    const eff = currentTime + lyricsOffset;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (eff >= synced[i].time - 0.15) idx = i;
      else break;
    }
    return idx;
  }, [lyricsData.synced, currentTime, lyricsOffset]);

  const startMicMeter = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 140) * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // meter opsional
    }
  };

  const startRecording = async () => {
    setMicError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Browser/perangkat ini tidak mendukung perekam mikrofon.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setTakes((prev) => [
          ...prev,
          {
            id: `take-${Date.now()}`,
            name: `Suara Saya #${prev.length + 1}`,
            url,
            blob,
            muted: false,
            volume: 1.0,
            speed: 1.0,
            effect: 'normal',
            echo: 0,
            reverb: 0,
            bass: 0,
          },
        ]);
        stream.getTracks().forEach((t) => t.stop());
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setMicLevel(0);
      };

      recorderRef.current = recorder;
      recorder.start(250);
      startMicMeter(stream);
      setRecSeconds(0);
      setRecState('recording');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);

      if (syncMusic && currentTrack && !isPlaying) {
        togglePlay();
      }
    } catch {
      setMicError('Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan browser/HP.');
    }
  };

  const pauseOrResumeRecording = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (recState === 'recording' && typeof rec.pause === 'function') {
      rec.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecState('paused');
      if (syncMusic && isPlaying) togglePlay();
    } else if (recState === 'paused' && typeof rec.resume === 'function') {
      rec.resume();
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
      setRecState('recording');
      if (syncMusic && !isPlaying) togglePlay();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
    setRecState('idle');
    if (syncMusic && isPlaying) togglePlay();
  };

  const updateTake = (id, patch) => {
    setTakes((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...patch };
        if (patch.effect === 'chipmunk' && patch.speed === undefined) updated.speed = 1.28;
        if (patch.effect === 'deep' && patch.speed === undefined) updated.speed = 0.82;
        if (patch.effect === 'normal' && patch.speed === undefined) updated.speed = 1.0;
        return updated;
      })
    );
  };

  const deleteTake = (id) => {
    setTakes((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((t) => t.id !== id);
    });
  };

  const playSingleTake = (take) => {
    activeVocalElsRef.current.forEach((el) => el.pause());
    const el = playVocalTakeWithFx(take.url, take);
    activeVocalElsRef.current = [el];
  };

  const toggleMixPlayback = async () => {
    if (mixPlaying) {
      activeVocalElsRef.current.forEach((el) => el.pause());
      activeVocalElsRef.current = [];
      if (isPlaying) togglePlay();
      setMixPlaying(false);
      return;
    }

    if (currentTrack) {
      seekTo(0, true);
    }
    const els = takes
      .filter((t) => !t.muted)
      .map((t) => playVocalTakeWithFx(t.url, t));
    activeVocalElsRef.current = els;
    setMixPlaying(true);

    if (els.length > 0) {
      els[0].onended = () => setMixPlaying(false);
    }
  };

  const handleAddExtraAudio = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setTakes((prev) => [
        ...prev,
        {
          id: `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url,
          blob: file,
          muted: false,
          volume: 0.9,
          speed: 1.0,
          effect: 'normal',
          echo: 0,
          reverb: 0,
          bass: 0,
        },
      ]);
    });
    e.target.value = '';
  };

  const handleUploadBackingTrack = async (e) => {
    const added = await uploadLocalAudioFiles(e.target.files);
    if (added.length > 0) playTrack(added[0], added);
    e.target.value = '';
  };

  const saveTakeToLibrary = async (take) => {
    const file = new File([take.blob], `${take.name}.webm`, {
      type: take.blob.type || 'audio/webm',
    });
    await uploadLocalAudioFiles([file]);
    setMicError(`"${take.name}" berhasil disimpan ke Library -> Lokal.`);
  };

  return (
    <div className="space-y-5 pb-6 text-main">
      {/* Backing Track & Kontrol Karaoke */}
      <section className="bubble-glass rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
              {currentTrack?.cover ? (
                <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
              ) : (
                <Music2 className="w-6 h-6 text-white/70" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted">
                Musik Latar Karaoke
              </p>
              <p className="text-sm sm:text-base font-heading font-bold truncate text-main">
                {currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : 'Pilih lagu terlebih dahulu'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={backingInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUploadBackingTrack}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => backingInputRef.current?.click()}
              className="glass-card px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-main"
            >
              <Upload className="w-3.5 h-3.5" /> Ganti MP3
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 shadow-md"
              style={{ backgroundColor: settings.accentColor }}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Pengaturan Musik Latar: Kurangi Vokal Asli & Kecepatan Musik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => updateFx({ vocalCut: !audioFx.vocalCut })}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition ${
              audioFx.vocalCut ? 'text-zinc-950' : 'glass-subtle text-main'
            }`}
            style={audioFx.vocalCut ? { backgroundColor: settings.accentColor } : undefined}
          >
            <span>Mode Karaoke (Kurangi Vokal Asli)</span>
            <span>{audioFx.vocalCut ? 'ON' : 'OFF'}</span>
          </button>

          <div className="glass-subtle rounded-2xl px-3.5 py-2 flex items-center gap-3">
            <span className="text-xs font-semibold text-main shrink-0">
              Speed Musik: {audioFx.speed.toFixed(2)}x
            </span>
            <input
              type="range"
              min={0.65}
              max={1.45}
              step={0.05}
              value={audioFx.speed}
              onChange={(e) => updateFx({ speed: parseFloat(e.target.value) })}
              className="aura-slider flex-1 bg-black/20 rounded-full"
            />
          </div>
        </div>

        {/* Kotak Lirik Sing-Along */}
        <div className="glass-subtle rounded-2xl p-3 text-center min-h-[68px] flex flex-col justify-center">
          {lyricsData.synced.length > 0 ? (
            <>
              <p className="text-xs text-muted truncate">
                {activeLyricIndex > 0 ? lyricsData.synced[activeLyricIndex - 1]?.text : 'Siap bernyanyi...'}
              </p>
              <p className="text-sm sm:text-base font-heading font-bold my-0.5" style={{ color: settings.accentColor }}>
                {activeLyricIndex >= 0 ? lyricsData.synced[activeLyricIndex]?.text : lyricsData.synced[0]?.text}
              </p>
              <p className="text-xs text-muted truncate">
                {lyricsData.synced[activeLyricIndex + 1]?.text || ''}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">
              {lyricsData.plain ? lyricsData.plain.slice(0, 120) + '...' : 'Nyanyikan lagu favoritmu atau rekam suara bebas!'}
            </p>
          )}
        </div>
      </section>

      {/* Perekam Suara Karaoke + Jeda/Lanjut */}
      <section className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-heading font-bold text-main flex items-center gap-2">
              <Mic className="w-5 h-5" style={{ color: settings.accentColor }} />
              Rekam Suara & Tambah Layer Baru
            </h2>
            <p className="text-xs text-muted">
              Bisa jeda di tengah lagu, hapus, rekam lagi untuk harmoni, dan atur efek sesukamu.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-main cursor-pointer">
            <input
              type="checkbox"
              checked={syncMusic}
              onChange={(e) => setSyncMusic(e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
            Sinkron dengan Musik
          </label>
        </div>

        {/* Live Mic Bar */}
        <div className="w-full h-2.5 rounded-full glass-subtle overflow-hidden">
          <div
            className="h-full transition-all duration-75 rounded-full"
            style={{ width: `${micLevel}%`, backgroundColor: settings.accentColor }}
          />
        </div>

        {micError && <p className="text-xs text-amber-400">{micError}</p>}

        <div className="flex flex-wrap items-center gap-2.5">
          {recState === 'idle' ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-5 py-2.5 rounded-2xl font-bold text-sm text-zinc-950 flex items-center gap-2 shadow-lg active:scale-95 transition"
              style={{ backgroundColor: settings.accentColor }}
            >
              <Mic className="w-4 h-4" /> Rekam Suara Baru
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={pauseOrResumeRecording}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs glass-subtle text-main flex items-center gap-1.5"
              >
                {recState === 'recording' ? (
                  <>
                    <Pause className="w-4 h-4" /> Jeda ({recSeconds}d)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Lanjut ({recSeconds}d)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-rose-500 text-white flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-white" /> Selesai & Simpan Take
              </button>
            </>
          )}

          <input
            ref={extraAudioInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleAddExtraAudio}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => extraAudioInputRef.current?.click()}
            className="glass-subtle px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 text-main"
          >
            <Plus className="w-4 h-4" /> Tambah Audio/Beat Lain
          </button>

          {takes.length > 0 && (
            <button
              type="button"
              onClick={toggleMixPlayback}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-950 flex items-center gap-1.5 ml-auto"
              style={{ backgroundColor: settings.accentColor }}
            >
              {mixPlaying ? <Square className="w-3.5 h-3.5 fill-zinc-950" /> : <Play className="w-3.5 h-3.5 fill-zinc-950" />}
              {mixPlaying ? 'Stop Gabungan' : 'Putar Musik + Semua Suara'}
            </button>
          )}
        </div>
      </section>

      {/* Soundboard Audio Khusus Karaoke */}
      <section className="glass-card rounded-3xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: settings.accentColor }} />
          Audio & Efek Suara Khusus Instan (Gratis)
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'applause', label: 'Tepuk Tangan' },
            { id: 'chime', label: 'Sparkle Chime' },
            { id: 'bassdrop', label: 'Bass Drop 808' },
            { id: 'vinyl', label: 'Vinyl Lo-Fi' },
            { id: 'horn', label: 'DJ Airhorn' },
          ].map((sfx) => (
            <button
              key={sfx.id}
              type="button"
              onClick={() => playSpecialSfx(sfx.id)}
              className="glass-subtle px-3.5 py-2 rounded-xl text-xs font-semibold text-main active:scale-95 transition"
            >
              {sfx.label}
            </button>
          ))}
        </div>
      </section>

      {/* Daftar Layer Suara (Atur Efek, Kecepatan, Echo, Reverb, Hapus) */}
      <section className="space-y-3">
        <h3 className="text-sm font-heading font-bold text-main flex items-center gap-2">
          <Sliders className="w-4 h-4" style={{ color: settings.accentColor }} />
          Daftar Suara Anda ({takes.length} Layer)
        </h3>

        {takes.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-center text-xs text-muted">
            Belum ada rekaman suara. Tekan tombol "Rekam Suara Baru" di atas untuk mulai karaoke atau membuat lagu!
          </div>
        ) : (
          takes.map((take) => (
            <div key={take.id} className="glass-card rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={take.name}
                  onChange={(e) => updateTake(take.id, { name: e.target.value })}
                  className="glass-input rounded-xl px-3 py-1.5 text-sm font-semibold flex-1 min-w-0 outline-none"
                />
                <button
                  type="button"
                  onClick={() => playSingleTake(take)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 shrink-0"
                  style={{ backgroundColor: settings.accentColor }}
                  title="Dengarkan Layer Ini"
                >
                  <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => saveTakeToLibrary(take)}
                  className="p-2 rounded-xl glass-subtle text-main shrink-0"
                  title="Simpan ke Library Lokal"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTake(take.id)}
                  className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0"
                  title="Hapus Suara Ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Pilihan Efek Suara Khusus Vokal */}
              <div className="flex flex-wrap gap-1.5">
                {VOICE_EFFECTS.map((ef) => (
                  <button
                    key={ef.id}
                    type="button"
                    onClick={() => updateTake(take.id, { effect: ef.id })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      take.effect === ef.id ? 'text-zinc-950' : 'glass-subtle text-main opacity-80'
                    }`}
                    style={take.effect === ef.id ? { backgroundColor: settings.accentColor } : undefined}
                  >
                    {ef.label}
                  </button>
                ))}
              </div>

              {/* Kontrol Manual Suara Sendiri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-main">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5" /> Volume
                    </span>
                    <span>{Math.round(take.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.05}
                    value={take.volume}
                    onChange={(e) => updateTake(take.id, { volume: parseFloat(e.target.value) })}
                    className="aura-slider w-full bg-black/20 rounded-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Kecepatan Suara</span>
                    <span>{take.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.65}
                    max={1.5}
                    step={0.05}
                    value={take.speed}
                    onChange={(e) => updateTake(take.id, { speed: parseFloat(e.target.value) })}
                    className="aura-slider w-full bg-black/20 rounded-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Gema / Reverb</span>
                    <span>{Math.round(take.reverb * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.05}
                    value={take.reverb}
                    onChange={(e) => updateTake(take.id, { reverb: parseFloat(e.target.value) })}
                    className="aura-slider w-full bg-black/20 rounded-full"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
