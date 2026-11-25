export const AUDIO_STATUS = {
  FULL_TRACK: 'FULL_TRACK',
  PREVIEW: 'PREVIEW',
  EXTERNAL: 'EXTERNAL',
  UNAVAILABLE: 'UNAVAILABLE',
};

export function cleanText(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildTrackSignature(title = '', artist = '') {
  const t = cleanText(title);
  const a = cleanText(artist).split(' ').slice(0, 2).join(' ');
  return `${t}::${a}`;
}

export function normalizeTrack(raw = {}) {
  const status = raw.audioStatus || AUDIO_STATUS.UNAVAILABLE;
  const isFullTrack = status === AUDIO_STATUS.FULL_TRACK && Boolean(raw.audioUrl);

  return {
    id: String(raw.id || `${raw.source || 'track'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    rawId: raw.rawId || null,
    title: raw.title || 'Tanpa Judul',
    artist: raw.artist || 'Artis Tidak Diketahui',
    artistId: raw.artistId || null,
    album: raw.album || 'Single',
    albumId: raw.albumId || null,
    releaseDate: raw.releaseDate || null,
    cover: raw.cover || '',
    audioUrl: raw.audioUrl || '',
    externalUrl: raw.externalUrl || '',
    youtubeVideoId: raw.youtubeVideoId || null,
    duration: Math.max(0, Number(raw.duration || 0)),
    previewDuration: status === AUDIO_STATUS.PREVIEW ? 30 : null,
    audioStatus: status,
    isFullTrack,
    corsSafe: Boolean(raw.corsSafe),
    source: raw.source || 'unknown',
    sourceLabel: raw.sourceLabel || raw.source || 'Unknown',
    genre: raw.genre || 'Music',
    licenseInfo: raw.licenseInfo || null,
    popularity: typeof raw.popularity === 'number' ? raw.popularity : null,
  };
}

// Hapus duplikat HANYA jika judul DAN artis cocok; pertahankan jika artis berbeda
export function deduplicateTracks(tracks = []) {
  const map = new Map();
  const priority = {
    [AUDIO_STATUS.FULL_TRACK]: 4,
    [AUDIO_STATUS.PREVIEW]: 3,
    [AUDIO_STATUS.EXTERNAL]: 2,
    [AUDIO_STATUS.UNAVAILABLE]: 1,
  };

  for (const item of tracks) {
    if (!item) continue;
    const track = normalizeTrack(item);
    const sig = buildTrackSignature(track.title, track.artist);
    const existing = map.get(sig);

    if (!existing) {
      map.set(sig, track);
    } else {
      const currScore = priority[track.audioStatus] || 0;
      const prevScore = priority[existing.audioStatus] || 0;
      if (currScore > prevScore) {
        map.set(sig, track);
      }
    }
  }
  return Array.from(map.values());
}
