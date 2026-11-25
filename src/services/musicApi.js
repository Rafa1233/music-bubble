const ITUNES_BASE = 'https://itunes.apple.com/search';
const LRCLIB_BASE = 'https://lrclib.net/api';
const AUDIUS_DISCOVERY_LIST = 'https://api.audius.co';
const AUDIUS_FALLBACK_HOST = 'https://discoveryprovider.audius.co';
const APP_NAME = 'AuraSound';

let cachedAudiusHost = null;

async function getAudiusHost() {
  if (cachedAudiusHost) return cachedAudiusHost;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(AUDIUS_DISCOVERY_LIST, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        cachedAudiusHost = json.data[0];
        return cachedAudiusHost;
      }
    }
  } catch {
    // gunakan fallback host
  }
  cachedAudiusHost = AUDIUS_FALLBACK_HOST;
  return cachedAudiusHost;
}

function mapAudiusTrack(item, host) {
  if (!item || !item.id || !item.title) return null;
  const cover =
    item.artwork?.['480x480'] ||
    item.artwork?.['150x150'] ||
    item.user?.profile_picture?.['480x480'] ||
    '';
  return {
    id: `audius-${item.id}`,
    title: item.title,
    artist: item.user?.name || item.user?.handle || 'Audius Artist',
    album: item.mood || item.genre || 'Audius Full Track',
    cover,
    audioUrl: `${host}/v1/tracks/${item.id}/stream?app_name=${APP_NAME}`,
    duration: Math.max(1, Number(item.duration || 180)),
    isFullTrack: true,
    source: 'audius',
    genre: item.genre || 'Open Music',
  };
}

export async function fetchAudiusTrending(limit = 16) {
  try {
    const host = await getAudiusHost();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `${host}/v1/tracks/trending?limit=${limit}&app_name=${APP_NAME}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((t) => mapAudiusTrack(t, host)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function searchAudius(query, limit = 16) {
  if (!query || !query.trim()) return [];
  try {
    const host = await getAudiusHost();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `${host}/v1/tracks/search?query=${encodeURIComponent(query.trim())}&limit=${limit}&app_name=${APP_NAME}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((t) => mapAudiusTrack(t, host)).filter(Boolean);
  } catch {
    return [];
  }
}

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `itunes_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 8000);

    function cleanup() {
      clearTimeout(timeout);
      if (window[callbackName]) delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP error'));
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

async function queryItunes(params) {
  const qs = new URLSearchParams({
    media: 'music',
    entity: 'song',
    country: 'ID',
    ...params,
  }).toString();

  const url = `${ITUNES_BASE}?${qs}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP error');
    return await res.json();
  } catch {
    return await jsonpRequest(url);
  }
}

export function mapItunesTrack(item) {
  if (!item || !item.previewUrl || !item.trackId) return null;
  const highResCover = (item.artworkUrl100 || '')
    .replace('100x100bb', '600x600bb')
    .replace('100x100', '600x600');
  return {
    id: `itunes-${item.trackId}`,
    title: item.trackName || 'Tanpa Judul',
    artist: item.artistName || 'Artis Tidak Diketahui',
    album: item.collectionName || 'Single',
    cover: highResCover || item.artworkUrl100 || '',
    audioUrl: item.previewUrl,
    duration: Math.max(1, Math.round((item.trackTimeMillis || 30000) / 1000)),
    isFullTrack: false,
    source: 'itunes',
    genre: item.primaryGenreName || 'Pop',
  };
}

export async function searchItunes(query, limit = 16) {
  if (!query || !query.trim()) return [];
  const data = await queryItunes({ term: query.trim(), limit: String(limit) });
  const list = Array.isArray(data?.results) ? data.results : [];
  const seen = new Set();
  const mapped = [];
  for (const item of list) {
    const track = mapItunesTrack(item);
    if (track && !seen.has(track.id)) {
      seen.add(track.id);
      mapped.push(track);
    }
  }
  return mapped;
}

export async function searchMusic(query, limit = 24) {
  const [audiusRes, itunesRes] = await Promise.allSettled([
    searchAudius(query, Math.ceil(limit / 2)),
    searchItunes(query, Math.ceil(limit / 2)),
  ]);
  const fullTracks = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
  const previews = itunesRes.status === 'fulfilled' ? itunesRes.value : [];
  return [...fullTracks, ...previews];
}

export async function fetchExactTrack(artist, title) {
  try {
    const data = await queryItunes({
      term: `${artist} ${title}`,
      limit: '10',
    });
    const results = (data?.results || []).map(mapItunesTrack).filter(Boolean);
    if (results.length === 0) return null;

    const aLower = artist.toLowerCase();
    const tLower = title.toLowerCase();

    const exact = results.find(
      (r) =>
        r.artist.toLowerCase().includes(aLower) &&
        r.title.toLowerCase().includes(tLower)
    );
    if (exact) return exact;

    const byMatch = results.find(
      (r) =>
        r.title.toLowerCase().includes(tLower) &&
        r.artist.toLowerCase().split(' ')[0] === aLower.split(' ')[0]
    );
    return byMatch || results[0];
  } catch {
    return null;
  }
}

const CURATED_SEEDS = [
  { artist: 'Mahalini', title: 'Sial' },
  { artist: 'Tulus', title: 'Hati-Hati di Jalan' },
  { artist: 'Bernadya', title: 'Satu Bulan' },
  { artist: 'Hindia', title: 'Evaluasi' },
  { artist: 'NIKI', title: 'lowkey' },
  { artist: 'Ed Sheeran', title: 'Perfect' },
  { artist: 'The Weeknd', title: 'Blinding Lights' },
  { artist: 'Bruno Mars', title: 'Die With A Smile' },
  { artist: 'Juicy Luicy', title: 'Lantas' },
  { artist: 'Coldplay', title: 'Yellow' },
];

export async function fetchCuratedCatalog() {
  const [audiusTrending, itunesSettled] = await Promise.all([
    fetchAudiusTrending(12),
    Promise.allSettled(CURATED_SEEDS.map((seed) => fetchExactTrack(seed.artist, seed.title))),
  ]);

  const popTracks = [];
  const seenIds = new Set();
  for (const res of itunesSettled) {
    if (res.status === 'fulfilled' && res.value && !seenIds.has(res.value.id)) {
      seenIds.add(res.value.id);
      popTracks.push(res.value);
    }
  }

  return {
    fullTracks: audiusTrending,
    popTracks,
    all: [...audiusTrending, ...popTracks],
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
    // lanjut ke pencarian ketat
  }

  try {
    const searchRes = await fetch(
      `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`
    );
    if (searchRes.ok) {
      const items = await searchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const targetTitle = normalizeText(cleanTitle);
        const targetArtist = normalizeText(cleanArtist);

        const strictMatches = items.filter((item) => {
          const t = normalizeText(item.trackName);
          const a = normalizeText(item.artistName);
          const titleOk = t === targetTitle || t.includes(targetTitle) || targetTitle.includes(t);
          const artistOk =
            !targetArtist ||
            a.includes(targetArtist) ||
            targetArtist.includes(a) ||
            a.split(' ')[0] === targetArtist.split(' ')[0];
          return titleOk && artistOk;
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
    // abaikan error jaringan
  }

  return { synced: [], plain: null, matchedTitle: '' };
}
