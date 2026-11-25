import { MusicProviderManager } from './music/MusicProviderManager';
import { smartSearchMusic } from './music/MusicSearchService';
import { getBackupAudiusStreamUrl } from './music/providers/audius/audiusProvider';

const LRCLIB_BASE = 'https://lrclib.net/api';

export async function getBackupAudiusUrl(track) {
  return getBackupAudiusStreamUrl(track);
}

export async function searchMusic(query, limit = 25) {
  const res = await smartSearchMusic(query, { page: 1, limit });
  return res.all;
}

export async function fetchCuratedCatalog() {
  const [fullTracks, popTracks] = await Promise.all([
    MusicProviderManager.fetchCategoryTracks('audius-trending', { page: 1, limit: 25 }),
    MusicProviderManager.fetchCategoryTracks('indo-popular', { page: 1, limit: 25 }),
  ]);
  return {
    fullTracks: fullTracks.filter((t) => t.isFullTrack),
    popTracks,
    all: [...fullTracks, ...popTracks],
  };
}

export function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split(/\r?\n/);
  const parsed = [];
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = line.replace(timeRegex, '').trim();
    if (!text) continue;

    for (const m of matches) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const msRaw = m[3] || '0';
      const ms = parseInt(msRaw.padEnd(3, '0').slice(0, 3), 10);
      const time = min * 60 + sec + ms / 1000;
      parsed.push({ time, text });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
}

function normalizeText(str = '') {
  return str
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlapScore(a, b) {
  const wa = new Set(normalizeText(a).split(' ').filter((w) => w.length > 1));
  const wb = new Set(normalizeText(b).split(' ').filter((w) => w.length > 1));
  if (wa.size === 0 || wb.size === 0) return 0;
  let hits = 0;
  for (const w of wa) {
    if (wb.has(w)) hits++;
  }
  return hits / Math.max(wa.size, wb.size);
}

export async function fetchTrackLyrics(title, artist, durationSec = 0) {
  if (!title) return { synced: [], plain: null, matchedTitle: '' };
  const cleanTitle = title.replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g, '').trim();
  const cleanArtist = (artist || '').split(',')[0].split('&')[0].trim();

  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (durationSec > 40) {
      params.set('duration', String(Math.round(durationSec)));
    }
    const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.syncedLyrics || data?.plainLyrics) {
        return {
          synced: data.syncedLyrics ? parseLRC(data.syncedLyrics) : [],
          plain: data.plainLyrics || null,
          matchedTitle: `${data.artistName || cleanArtist} — ${data.trackName || cleanTitle}`,
        };
      }
    }
  } catch {
    // lanjut ke search ketat
  }

  try {
    const searchRes = await fetch(
      `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`
    );
    if (searchRes.ok) {
      const items = await searchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const strictMatches = items.filter((item) => {
          const tScore = wordOverlapScore(item.trackName, cleanTitle);
          const aScore = wordOverlapScore(item.artistName, cleanArtist);
          return tScore >= 0.6 && aScore >= 0.5;
        });

        const best =
          strictMatches.find((i) => i.syncedLyrics) ||
          strictMatches.find((i) => i.plainLyrics);

        if (best) {
          return {
            synced: best.syncedLyrics ? parseLRC(best.syncedLyrics) : [],
            plain: best.plainLyrics || null,
            matchedTitle: `${best.artistName} — ${best.trackName}`,
          };
        }
      }
    }
  } catch {
    // abaikan
  }

  return { synced: [], plain: null, matchedTitle: '' };
}

export async function searchLyricsManual(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${LRCLIB_BASE}/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return [];
    const items = await res.json();
    return (Array.isArray(items) ? items : [])
      .filter((i) => i.syncedLyrics || i.plainLyrics)
      .slice(0, 12)
      .map((i) => ({
        id: i.id,
        title: i.trackName,
        artist: i.artistName,
        duration: i.duration || 0,
        synced: i.syncedLyrics ? parseLRC(i.syncedLyrics) : [],
        plain: i.plainLyrics || null,
        matchedTitle: `${i.artistName} — ${i.trackName}`,
      }));
  } catch {
    return [];
  }
}
