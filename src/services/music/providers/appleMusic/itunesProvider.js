import { AUDIO_STATUS, normalizeTrack } from '../../TrackNormalizer';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup';

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const cb = `itunes_v2_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 8000);

    function cleanup() {
      clearTimeout(timer);
      if (window[cb]) delete window[cb];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP error'));
    };
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}`;
    document.head.appendChild(script);
  });
}

async function callItunes(url, signal) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP error');
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError' && signal?.aborted) throw err;
    return await jsonpRequest(url);
  }
}

export function mapItunesTrack(item) {
  if (!item || !item.trackId) return null;
  const cover = (item.artworkUrl100 || '')
    .replace('100x100bb', '600x600bb')
    .replace('100x100', '600x600');

  const hasPreview = Boolean(item.previewUrl);

  return normalizeTrack({
    id: `itunes-${item.trackId}`,
    rawId: String(item.trackId),
    title: item.trackName || 'Tanpa Judul',
    artist: item.artistName || 'Artis Tidak Diketahui',
    artistId: item.artistId ? `itunes-artist-${item.artistId}` : null,
    album: item.collectionName || 'Single',
    albumId: item.collectionId ? `itunes-album-${item.collectionId}` : null,
    releaseDate: item.releaseDate || null,
    cover: cover || item.artworkUrl100 || '',
    audioUrl: item.previewUrl || '',
    externalUrl: item.trackViewUrl || '',
    duration: hasPreview ? 30 : Math.round((item.trackTimeMillis || 0) / 1000),
    audioStatus: hasPreview ? AUDIO_STATUS.PREVIEW : AUDIO_STATUS.EXTERNAL,
    corsSafe: false,
    source: 'itunes',
    sourceLabel: 'Apple Preview',
    genre: item.primaryGenreName || 'Pop',
  });
}

export async function searchItunesTracks(
  query,
  { country = 'ID', limit = 25, offset = 0, signal } = {}
) {
  if (!query || !query.trim()) return [];
  const qs = new URLSearchParams({
    term: query.trim(),
    media: 'music',
    entity: 'song',
    country,
    limit: String(limit),
    offset: String(offset),
  }).toString();

  const data = await callItunes(`${ITUNES_SEARCH}?${qs}`, signal);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map(mapItunesTrack).filter(Boolean);
}

export async function fetchItunesArtist(rawArtistId, { signal } = {}) {
  const id = String(rawArtistId || '').replace('itunes-artist-', '');
  if (!id) return null;

  const [songsData, albumsData] = await Promise.all([
    callItunes(`${ITUNES_LOOKUP}?id=${id}&entity=song&limit=25`, signal).catch(() => null),
    callItunes(`${ITUNES_LOOKUP}?id=${id}&entity=album&limit=15`, signal).catch(() => null),
  ]);

  const songRows = songsData?.results || [];
  const artistMeta = songRows.find((r) => r.wrapperType === 'artist') || albumsData?.results?.[0];
  const tracks = songRows
    .filter((r) => r.wrapperType === 'track')
    .map(mapItunesTrack)
    .filter(Boolean);

  const albums = (albumsData?.results || [])
    .filter((r) => r.wrapperType === 'collection')
    .map((al) => ({
      id: `itunes-album-${al.collectionId}`,
      title: al.collectionName,
      artist: al.artistName,
      cover: (al.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      releaseDate: al.releaseDate || null,
      source: 'itunes',
    }));

  if (!artistMeta && tracks.length === 0) return null;

  return {
    id: `itunes-artist-${id}`,
    name: artistMeta?.artistName || tracks[0]?.artist || 'Artis',
    avatar: albums[0]?.cover || tracks[0]?.cover || '',
    bio: artistMeta?.primaryGenreName ? `Genre Utama: ${artistMeta.primaryGenreName}` : '',
    followerCount: null,
    tracks,
    albums,
    source: 'itunes',
  };
}

export async function fetchItunesAlbum(rawAlbumId, { signal } = {}) {
  const id = String(rawAlbumId || '').replace('itunes-album-', '');
  if (!id) return null;

  const data = await callItunes(`${ITUNES_LOOKUP}?id=${id}&entity=song`, signal).catch(() => null);
  const rows = data?.results || [];
  const albumMeta = rows.find((r) => r.wrapperType === 'collection');
  const tracks = rows
    .filter((r) => r.wrapperType === 'track')
    .map(mapItunesTrack)
    .filter(Boolean);

  if (!albumMeta && tracks.length === 0) return null;

  return {
    id: `itunes-album-${id}`,
    title: albumMeta?.collectionName || tracks[0]?.album || 'Album',
    artist: albumMeta?.artistName || tracks[0]?.artist || 'Artis',
    artistId: albumMeta?.artistId ? `itunes-artist-${albumMeta.artistId}` : null,
    cover:
      (albumMeta?.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
      tracks[0]?.cover ||
      '',
    releaseDate: albumMeta?.releaseDate || null,
    tracks,
    source: 'itunes',
  };
}
