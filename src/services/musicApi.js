const ITUNES_BASE = 'https://itunes.apple.com/search';
const LRCLIB_BASE = 'https://lrclib.net/api';

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
    previewDuration: 30,
    source: 'itunes',
    genre: item.primaryGenreName || 'Pop',
  };
}

export async function searchMusic(query, limit = 24) {
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
        r.title.toLowerCase().includes(tLower) ||
        r.artist.toLowerCase().includes(aLower)
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
  { artist: 'Rizky Febian', title: 'Bermuara' },
  { artist: 'Billie Eilish', title: 'BIRDS OF A FEATHER' },
  { artist: 'Juicy Luicy', title: 'Lantas' },
  { artist: 'Coldplay', title: 'Yellow' },
];

export async function fetchCuratedCatalog() {
  const settled = await Promise.allSettled(
    CURATED_SEEDS.map((seed) => fetchExactTrack(seed.artist, seed.title))
  );
  const tracks = [];
  const seenIds = new Set();
  for (const res of settled) {
    if (res.status === 'fulfilled' && res.value && !seenIds.has(res.value.id)) {
      seenIds.add(res.value.id);
      tracks.push(res.value);
    }
  }
  return tracks;
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

export async function fetchTrackLyrics(title, artist) {
  if (!title) return { synced: [], plain: null };
  const cleanTitle = title.replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g, '').trim();
  const cleanArtist = (artist || '').split(',')[0].split('&')[0].trim();

  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.syncedLyrics) {
        return { synced: parseLRC(data.syncedLyrics), plain: data.plainLyrics || null };
      }
      if (data?.plainLyrics) {
        return { synced: [], plain: data.plainLyrics };
      }
    }
  } catch {
    // fallback ke search endpoint
  }

  try {
    const searchRes = await fetch(
      `${LRCLIB_BASE}/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`
    );
    if (searchRes.ok) {
      const items = await searchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const withSynced = items.find((i) => i.syncedLyrics);
        if (withSynced) {
          return {
            synced: parseLRC(withSynced.syncedLyrics),
            plain: withSynced.plainLyrics || null,
          };
        }
        const withPlain = items.find((i) => i.plainLyrics);
        if (withPlain) {
          return { synced: [], plain: withPlain.plainLyrics };
        }
      }
    }
  } catch {
    // abaikan error jaringan
  }

  return { synced: [], plain: null };
}
