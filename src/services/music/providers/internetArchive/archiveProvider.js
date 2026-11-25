import { AUDIO_STATUS, normalizeTrack } from '../../TrackNormalizer.js';

const IA_SEARCH = 'https://archive.org/advancedsearch.php';

function parseLengthToSec(val) {
  if (!val) return 0;
  if (!Number.isNaN(Number(val))) return Math.round(Number(val));
  const parts = String(val).split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function resolveArchiveItemTracks(doc, signal) {
  if (!doc?.identifier) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const meta = await res.json();
    const files = Array.isArray(meta?.files) ? meta.files : [];
    const audioFile = files.find(
      (f) => f.name && /\.(mp3|m4a|ogg)$/i.test(f.name) && f.source === 'original'
    ) || files.find((f) => f.name && /\.(mp3|m4a|ogg)$/i.test(f.name));

    if (!audioFile) return null;

    const rawTitle = audioFile.title || doc.title || doc.identifier;
    const creator = Array.isArray(doc.creator) ? doc.creator[0] : doc.creator;
    const duration = parseLengthToSec(audioFile.length);

    return normalizeTrack({
      id: `ia-${doc.identifier}`,
      rawId: doc.identifier,
      title: String(rawTitle),
      artist: String(creator || meta?.metadata?.creator || 'Archive Artist'),
      album: String(meta?.metadata?.album || doc.title || 'Public Domain / CC Audio'),
      releaseDate: doc.date || meta?.metadata?.date || null,
      cover: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
      audioUrl: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(audioFile.name)}`,
      externalUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
      duration,
      audioStatus: AUDIO_STATUS.FULL_TRACK,
      corsSafe: false,
      source: 'archive',
      sourceLabel: 'Internet Archive',
      genre: Array.isArray(meta?.metadata?.subject)
        ? meta.metadata.subject[0]
        : meta?.metadata?.subject || 'Open Audio',
      licenseInfo: meta?.metadata?.licenseurl || 'Public Domain / Creative Commons',
    });
  } catch {
    return null;
  }
}

export async function searchArchiveTracks(query, { limit = 12, page = 1, signal } = {}) {
  if (!query || !query.trim()) return [];
  try {
    const cleanQ = query.trim().replace(/[()"]/g, ' ');
    const q = `(mediatype:(audio) AND (collection:(opensource_audio) OR collection:(freemusicarchive) OR collection:(netlabels) OR subject:(music))) AND (${cleanQ})`;
    const url = `${IA_SEARCH}?q=${encodeURIComponent(q)}&fl[]=identifier,title,creator,date&sort[]=downloads+desc&rows=${limit}&page=${page}&output=json`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];

    const json = await res.json();
    const docs = Array.isArray(json?.response?.docs) ? json.response.docs : [];
    const settled = await Promise.allSettled(
      docs.slice(0, 8).map((d) => resolveArchiveItemTracks(d, signal))
    );
    return settled
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);
  } catch {
    return [];
  }
}
