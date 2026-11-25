let sharedCtx = null;
const boundElements = new WeakMap();

export function getAudioContext() {
  if (!sharedCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedCtx = new AudioCtx();
    }
  }
  if (sharedCtx && sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

export function createReverbImpulse(ctx, seconds = 2.1, decay = 2.4) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export function ensureMusicFxGraph(audioEl) {
  const ctx = getAudioContext();
  if (!ctx || !audioEl) return null;

  if (boundElements.has(audioEl)) {
    return boundElements.get(audioEl);
  }

  try {
    const source = ctx.createMediaElementSource(audioEl);

    const masterGain = ctx.createGain();
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 120;
    bassFilter.gain.value = 0;

    const trebleFilter = ctx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 4200;
    trebleFilter.gain.value = 0;

    // Vocal Reducer (Mid Cut pada 300Hz - 3000Hz untuk mode Karaoke Instrumental)
    const vocalCutFilter = ctx.createBiquadFilter();
    vocalCutFilter.type = 'peaking';
    vocalCutFilter.frequency.value = 1250;
    vocalCutFilter.Q.value = 0.7;
    vocalCutFilter.gain.value = 0;

    // Reverb (Wet / Dry)
    const convolver = ctx.createConvolver();
    convolver.buffer = createReverbImpulse(ctx, 2.2, 2.5);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0;

    // Echo / Delay
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.28;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.32;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0;

    source.connect(bassFilter);
    bassFilter.connect(trebleFilter);
    trebleFilter.connect(vocalCutFilter);

    // Dry path
    vocalCutFilter.connect(masterGain);

    // Reverb path
    vocalCutFilter.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(masterGain);

    // Echo path
    vocalCutFilter.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(echoGain);
    echoGain.connect(masterGain);

    masterGain.connect(ctx.destination);

    const graph = {
      ctx,
      bassFilter,
      trebleFilter,
      vocalCutFilter,
      reverbGain,
      echoGain,
      masterGain,
    };
    boundElements.set(audioEl, graph);
    return graph;
  } catch {
    return null;
  }
}

export function applyMusicFxSettings(audioEl, fx) {
  const graph = boundElements.get(audioEl);
  if (!graph) return;
  const now = graph.ctx.currentTime;
  graph.bassFilter.gain.setTargetAtTime(Number(fx.bassBoost || 0), now, 0.04);
  graph.trebleFilter.gain.setTargetAtTime(Number(fx.trebleBoost || 0), now, 0.04);
  graph.vocalCutFilter.gain.setTargetAtTime(fx.vocalCut ? -18 : 0, now, 0.04);
  graph.reverbGain.gain.setTargetAtTime(Number(fx.reverb || 0), now, 0.04);
  graph.echoGain.gain.setTargetAtTime(Number(fx.echo || 0), now, 0.04);
}

// Efek Suara Khusus (Soundboard Instan Tanpa Download)
export function playSpecialSfx(type) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (type === 'chime') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.001, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.6);
    });
    return;
  }

  if (type === 'bassdrop') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.85);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.05);
    return;
  }

  if (type === 'horn') {
    [392, 415, 587].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    });
    return;
  }

  if (type === 'applause' || type === 'vinyl') {
    const dur = type === 'applause' ? 1.4 : 0.8;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = type === 'applause' ? Math.sin((i / bufferSize) * Math.PI) : 0.35;
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = type === 'applause' ? 1400 : 2800;
    filter.Q.value = type === 'applause' ? 0.6 : 2.5;
    const gain = ctx.createGain();
    gain.gain.value = type === 'applause' ? 0.35 : 0.18;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }
}

export function playVocalTakeWithFx(audioUrl, fx = {}) {
  const ctx = getAudioContext();
  const el = new Audio(audioUrl);
  el.volume = Math.max(0, Math.min(1, fx.volume ?? 1));
  el.playbackRate = Number(fx.speed || 1);
  if ('preservesPitch' in el) {
    el.preservesPitch = fx.effect !== 'chipmunk' && fx.effect !== 'deep';
  }

  if (ctx) {
    try {
      const src = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1.5, fx.volume ?? 1));

      const toneFilter = ctx.createBiquadFilter();
      if (fx.effect === 'radio') {
        toneFilter.type = 'bandpass';
        toneFilter.frequency.value = 1100;
        toneFilter.Q.value = 1.8;
      } else if (fx.effect === 'robot') {
        toneFilter.type = 'peaking';
        toneFilter.frequency.value = 600;
        toneFilter.Q.value = 6;
        toneFilter.gain.value = 14;
      } else {
        toneFilter.type = 'lowshelf';
        toneFilter.frequency.value = 180;
        toneFilter.gain.value = Number(fx.bass || 0);
      }

      src.connect(toneFilter);
      toneFilter.connect(gain);

      if (fx.effect === 'echo' || (fx.echo && fx.echo > 0)) {
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.24;
        const fb = ctx.createGain();
        fb.gain.value = 0.38;
        const wet = ctx.createGain();
        wet.gain.value = fx.effect === 'echo' ? 0.55 : Number(fx.echo || 0.3);
        toneFilter.connect(delay);
        delay.connect(fb);
        fb.connect(delay);
        delay.connect(wet);
        wet.connect(ctx.destination);
      }

      if (fx.effect === 'reverb' || (fx.reverb && fx.reverb > 0)) {
        const conv = ctx.createConvolver();
        conv.buffer = createReverbImpulse(ctx, 2.0, 2.2);
        const wetRev = ctx.createGain();
        wetRev.gain.value = fx.effect === 'reverb' ? 0.65 : Number(fx.reverb || 0.35);
        toneFilter.connect(conv);
        conv.connect(wetRev);
        wetRev.connect(ctx.destination);
      }

      gain.connect(ctx.destination);
    } catch {
      // tetap jalan lewat HTMLAudioElement standar
    }
  }

  el.play().catch(() => {});
  return el;
}
