import { AUDIO_STATUS, normalizeTrack } from '../../TrackNormalizer.js';

const AUDIUS_DISCOVERY_API = 'https://api.audius.co';
const FALLBACK_HOSTS = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
];
const APP_NAME = 'AuraSound';

let cachedHosts = [];

export async function getAudiusHosts() {
  if (cachedHosts.length > 0) return cachedHosts;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(AUDIUS_DISCOVERY_API, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        cachedHosts = json.data.slice(0, 5);
        return cachedHosts;
      }
    }
  } catch {
    // fallback ke daftar node cadangan
  }
  cachedHosts = FALLBACK_HOSTS;
  return cachedHosts;
}

async function fetchFromAudius(pathAndQuery, signal) {
  const hosts = await getAudiusHosts();
  for (const host of hosts) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
      const res = await fetch(`${host}${pathAndQuery}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        return { host, json };
      }
    } catch (err) {
      if (err?.name === 'AbortError' && signal?.aborted) throw err;
    }
  }
  return null;
}

export async function getBackupAudiusStreamUrl(track) {
  if (!track?.rawId) return null;
  const hosts = await getAudiusHosts();
  for (const h of hosts) {
    const url = `${h}/v1/tracks/${track.rawId}/stream?app_name=${APP_NAME}`;
    if (url !== track.audioUrl) return url;
  }
  return null;
}

function parseTitleArtist(rawTitle = '', fallbackName = 'Independent Artist') {
  const clean = rawTitle.trim();
  if (clean.includes(' - ')) {
    const [left, ...rest] = clean.split(' - ');
    const right = rest.join(' - ').trim();
    if (left.trim().length > 1 && right.length > 1) {
      return { artist: left.trim(), title: right };
    }
  }
  return { artist: fallbackName, title: clean };
}

export function mapAudiusTrack(item, host) {
  if (!item || !item.id || !item.title || item.is_streamable === false) return null;
  const cover =
    item.artwork?.['480x480'] ||
    item.artwork?.['150x150'] ||
    item.user?.profile_picture?.['480x480'] ||
    '';
  const parsed = parseTitleArtist(
    item.title,
    item.user?.name || item.user?.handle || 'Audius Artist'
  );

  return normalizeTrack({
    id: `audius-${item.id}`,
    rawId: item.id,
    title: parsed.title,
    artist: parsed.artist,
    artistId: item.user?.id ? `audius-artist-${item.user.id}` : null,
    album: item.mood || item.genre || 'Audius Single',
    releaseDate: item.release_date || item.created_at || null,
    cover,
    audioUrl: `${host}/v1/tracks/${item.id}/stream?app_name=${APP_NAME}`,
    externalUrl: item.permalink ? `https://audius.co${item.permalink}` : '',
    duration: Number(item.duration || 0),
    audioStatus: AUDIO_STATUS.FULL_TRACK,
    corsSafe: true,
    source: 'audius',
    sourceLabel: 'Audius',
    genre: item.genre || 'Music',
    popularity: typeof item.play_count === 'number' ? item.play_count : null,
  });
}

export async function searchAudiusTracks(query, { limit = 25, offset = 0, signal } = {}) {
  if (!query || !query.trim()) return [];
  const data = await fetchFromAudius(
    `/v1/tracks/search?query=${encodeURIComponent(query.trim())}&limit=${limit}&offset=${offset}&app_name=${APP_NAME}`,
    signal
  );
  if (!data?.json?.data) return [];
  return data.json.data.map((item) => mapAudiusTrack(item, data.host)).filter(Boolean);
}

export async function fetchAudiusTrending({
  genre = '',
  time = 'week',
  limit = 25,
  offset = 0,
  signal,
} = {}) {
  const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
  const data = await fetchFromAudius(
    `/v1/tracks/trending?time=${encodeURIComponent(time)}&limit=${limit}&offset=${offset}${genreParam}&app_name=${APP_NAME}`,
    signal
  );
  if (!data?.json?.data) return [];
  return data.json.data.map((item) => mapAudiusTrack(item, data.host)).filter(Boolean);
}

export async function fetchAudiusArtist(rawArtistId, { signal } = {}) {
  const id = String(rawArtistId || '').replace('audius-artist-', '');
  if (!id) return null;

  const [userRes, tracksRes, albumsRes] = await Promise.all([
    fetchFromAudius(`/v1/users/${id}?app_name=${APP_NAME}`, signal),
    fetchFromAudius(`/v1/users/${id}/tracks?limit=30&app_name=${APP_NAME}`, signal),
    fetchFromAudius(`/v1/users/${id}/albums?limit=15&app_name=${APP_NAME}`, signal),
  ]);

  const u = userRes?.json?.data;
  if (!u) return null;

  const host = tracksRes?.host || userRes.host;
  const tracks = (tracksRes?.json?.data || [])
    .map((item) => mapAudiusTrack(item, host))
    .filter(Boolean);

  const albums = (albumsRes?.json?.data || []).map((al) => ({
    id: `audius-album-${al.id}`,
    rawId: al.id,
    title: al.playlist_name || 'Album',
    artist: u.name || u.handle || 'Artist',
    cover: al.artwork?.['480x480'] || al.artwork?.['150x150'] || '',
    releaseDate: al.release_date || al.created_at || null,
    source: 'audius',
  }));

  return {
    id: `audius-artist-${u.id}`,
    name: u.name || u.handle,
    handle: u.handle,
    bio: u.bio || '',
    avatar: u.profile_picture?.['480x480'] || u.profile_picture?.['150x150'] || '',
    followerCount: typeof u.follower_count === 'number' ? u.follower_count : null,
    tracks,
    albums,
    source: 'audius',
  };
}

export async function fetchAudiusAlbum(rawAlbumId, { signal } = {}) {
  const id = String(rawAlbumId || '').replace('audius-album-', '');
  if (!id) return null;

  const data = await fetchFromAudius(`/v1/playlists/${id}?app_name=${APP_NAME}`, signal);
  const pl = Array.isArray(data?.json?.data) ? data.json.data[0] : data?.json?.data;
  if (!pl) return null;

  const tracks = (pl.tracks || [])
    .map((item) => mapAudiusTrack(item, data.host))
    .filter(Boolean);

  return {
    id: `audius-album-${pl.id}`,
    title: pl.playlist_name || 'Album',
    artist: pl.user?.name || pl.user?.handle || 'Artist',
    artistId: pl.user?.id ? `audius-artist-${pl.user.id}` : null,
    cover: pl.artwork?.['480x480'] || pl.artwork?.['150x150'] || tracks[0]?.cover || '',
    releaseDate: pl.release_date || pl.created_at || null,
    tracks,
    source: 'audius',
  };
}
