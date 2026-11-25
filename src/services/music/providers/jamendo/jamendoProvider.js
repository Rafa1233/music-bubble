import { AUDIO_STATUS, normalizeTrack } from '../../TrackNormalizer';

const JAMENDO_API = 'https://api.jamendo.com/v3.0';

function getJamendoEndpoint(resource, paramsObj) {
  const apiBase = (import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '');
  const clientId = import.meta.env.VITE_JAMENDO_CLIENT_ID || '';

  if (apiBase) {
    const qs = new URLSearchParams({ resource, ...paramsObj }).toString();
    return { url: `${apiBase}/api/jamendo?${qs}`, configured: true };
  }
  if (clientId) {
    const qs = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      ...paramsObj,
    }).toString();
    return { url: `${JAMENDO_API}/${resource}/?${qs}`, configured: true };
  }
  return { url: '', configured: false };
}

function mapJamendoTrack(item) {
  if (!item || !item.id || !item.audio) return null;
  return normalizeTrack({
    id: `jamendo-${item.id}`,
    rawId: String(item.id),
    title: item.name || 'Untitled',
    artist: item.artist_name || 'Jamendo Artist',
    artistId: item.artist_id ? `jamendo-artist-${item.artist_id}` : null,
    album: item.album_name || 'Jamendo Release',
    albumId: item.album_id ? `jamendo-album-${item.album_id}` : null,
    releaseDate: item.releasedate || null,
    cover: item.album_image || item.image || '',
    audioUrl: item.audio,
    externalUrl: item.shareurl || `https://www.jamendo.com/track/${item.id}`,
    duration: Number(item.duration || 0),
    audioStatus: AUDIO_STATUS.FULL_TRACK,
    corsSafe: true,
    source: 'jamendo',
    sourceLabel: 'Jamendo',
    genre: item.musicinfo?.tags?.genres?.[0] || 'Independent',
    licenseInfo: item.license_ccurl || 'Creative Commons (Jamendo)',
  });
}

export function isJamendoConfigured() {
  return Boolean(import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_JAMENDO_CLIENT_ID);
}

export async function searchJamendoTracks(query, { tag = '', limit = 25, offset = 0, signal } = {}) {
  const params = {
    limit: String(limit),
    offset: String(offset),
    audioformat: 'mp32',
    include: 'musicinfo+licenses',
    order: 'popularity_total',
  };
  if (query && query.trim()) params.namesearch = query.trim();
  if (tag && tag.trim()) params.fuzzytags = tag.trim();

  const { url, configured } = getJamendoEndpoint('tracks', params);
  if (!configured) return [];

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json?.results) ? json.results : [];
    return list.map(mapJamendoTrack).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchJamendoArtist(rawArtistId, { signal } = {}) {
  const id = String(rawArtistId || '').replace('jamendo-artist-', '');
  if (!id) return null;

  const { url, configured } = getJamendoEndpoint('tracks', {
    artist_id: id,
    limit: '30',
    audioformat: 'mp32',
    include: 'musicinfo+licenses',
  });
  if (!configured) return null;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    const tracks = (json?.results || []).map(mapJamendoTrack).filter(Boolean);
    if (tracks.length === 0) return null;
    return {
      id: `jamendo-artist-${id}`,
      name: tracks[0].artist,
      avatar: tracks[0].cover,
      bio: '',
      followerCount: null,
      tracks,
      albums: [],
      source: 'jamendo',
    };
  } catch {
    return null;
  }
}

export async function fetchJamendoAlbum(rawAlbumId, { signal } = {}) {
  const id = String(rawAlbumId || '').replace('jamendo-album-', '');
  if (!id) return null;

  const { url, configured } = getJamendoEndpoint('tracks', {
    album_id: id,
    limit: '40',
    audioformat: 'mp32',
    include: 'musicinfo+licenses',
  });
  if (!configured) return null;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    const tracks = (json?.results || []).map(mapJamendoTrack).filter(Boolean);
    if (tracks.length === 0) return null;
    return {
      id: `jamendo-album-${id}`,
      title: tracks[0].album,
      artist: tracks[0].artist,
      artistId: tracks[0].artistId,
      cover: tracks[0].cover,
      releaseDate: tracks[0].releaseDate,
      tracks,
      source: 'jamendo',
    };
  } catch {
    return null;
  }
}
