const ITUNES_BASE = 'https://itunes.apple.com/search';
const LRCLIB_BASE = 'https://lrclib.net/api';
const AUDIUS_DISCOVERY_LIST = 'https://api.audius.co';
const FALLBACK_AUDIUS_HOSTS = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
];
const APP_NAME = 'AuraSound';

let cachedAudiusHosts = [];

async function getAudiusHosts() {
  if (cachedAudiusHosts.length > 0) return cachedAudiusHosts;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(AUDIUS_DISCOVERY_LIST, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        cachedAudiusHosts = json.data.slice(0, 4);
        return cachedAudiusHosts;
      }
    }
  } catch {
    // fallback ke daftar host cadangan
  }
  cachedAudiusHosts = FALLBACK_AUDIUS_HOSTS;
  return cachedAudiusHosts;
}

export async function getBackupAudiusUrl(track) {
  if (!track?.rawId) return null;
  const hosts = await getAudiusHosts();
  for (const h of hosts) {
    const candidate = `${h}/v1/tracks/${track.rawId}/stream?app_name=${APP_NAME}`;
    if (candidate !== track.audioUrl) return candidate;
  }
  return null;
}

function parseAudiusTitleArtist(rawTitle = '', fallbackUser = 'Independent Artist') {
  const clean = rawTitle.trim();
  if (clean.includes(' - ')) {
    const [left, ...rest] = clean.split(' - ');
    const right = rest.join(' - ').trim();
    if (left.trim().length > 1 && right.length > 1) {
      return { artist: left.trim(), title: right };
    }
  }
  return { artist: fallbackUser, title: clean };
}

function mapAudiusTrack(item, host) {
  if (!item || !item.id || !item.title || item.is_streamable === false) return null;
  const cover =
    item.artwork?.['480x480'] ||
    item.artwork?.['150x150'] ||
    item.user?.profile_picture?.['480x480'] ||
    '';
  const parsed = parseAudiusTitleArtist(
    item.title,
    item.user?.name || item.user?.handle || 'Audius Artist'
  );
  return {
    id: `audius-${item.id}`,
    rawId: item.id,
    title: parsed.title,
    artist: parsed.artist,
    album: item.mood || item.genre || 'Full Track',
    cover,
    audioUrl: `${host}/v1/tracks/${item.id}/stream?app_name=${APP_NAME}`,
    duration: Math.max(30, Number(item.duration || 210)),
    isFullTrack: true,
    corsSafe: true,
    source: 'audius',
    genre: item.genre || 'Music',
  };
}

export async function fetchAudiusTrending(limit = 18, genre = '') {
  const hosts = await getAudiusHosts();
  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const genreQs = genre ? `&genre=${encodeURIComponent(genre)}` : '';
      const res = await fetch(
        `${host}/v1/tracks/trending?limit=${limit}${genreQs}&app_name=${APP_NAME}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const mapped = list.map((t) => mapAudiusTrack(t, host)).filter(Boolean);
      if (mapped.length > 0) return mapped;
    } catch {
      // coba host berikutnya
    }
  }
  return [];
}

export async function searchAudius(query, limit = 20) {
  if (!query || !query.trim()) return [];
  const hosts = await getAudiusHosts();
  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const res = await fetch(
        `${host}/v1/tracks/search?query=${encodeURIComponent(query.trim())}&limit=${limit}&app_name=${APP_NAME}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const mapped = list.map((t) => mapAudiusTrack(t, host)).filter(Boolean);
      if (mapped.length > 0) return mapped;
    } catch {
      // coba host berikutnya
    }
  }
  return [];
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
    const timer = setTimeout(() => controller.abort(), 4500);
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
    corsSafe: false,
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

export async function searchMusic(query, limit = 30) {
  const [audiusRes, itunesRes] = await Promise.allSettled([
    searchAudius(query, Math.ceil(limit * 0.65)),
    searchItunes(query, Math.ceil(limit * 0.45)),
  ]);
  const fullTracks = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
  const previews = itunesRes.status === 'fulfilled' ? itunesRes.value : [];
  const merged = [...fullTracks, ...previews];
  const seen = new Set();
  return merged.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
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
  { artist: 'Pamungkas', title: 'To the Bone' },
  { artist: 'Billie Eilish', title: 'BIRDS OF A FEATHER' },
];

export async function fetchCuratedCatalog() {
  const [
    audiusGlobal,
    audiusIndo,
    audiusPop,
    audiusLofi,
    itunesSettled,
  ] = await Promise.all([
    fetchAudiusTrending(14),
    searchAudius('indonesia acoustic pop cover', 12),
    fetchAudiusTrending(10, 'Pop'),
    searchAudius('lofi chill slow reverb', 10),
    Promise.allSettled(CURATED_SEEDS.map((seed) => fetchExactTrack(seed.artist, seed.title))),
  ]);

  const fullMap = new Map();
  for (const t of [...audiusGlobal, ...audiusIndo, ...audiusPop, ...audiusLofi]) {
    if (t && !fullMap.has(t.id)) fullMap.set(t.id, t);
  }
  const fullTracks = Array.from(fullMap.values());

  const popTracks = [];
  const seenIds = new Set();
  for (const res of itunesSettled) {
    if (res.status === 'fulfilled' && res.value && !seenIds.has(res.value.id)) {
      seenIds.add(res.value.id);
      popTracks.push(res.value);
    }
  }

  return {
    fullTracks,
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
    // lanjut ke pencarian ketat
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
    // abaikan error jaringan
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
