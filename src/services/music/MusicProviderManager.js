import { deduplicateTracks } from './TrackNormalizer';
import { getCachedApi, setCachedApi } from './MusicCache';
import { findCategoryById } from './CatalogCategories';
import {
  fetchAudiusTrending,
  searchAudiusTracks,
  fetchAudiusArtist,
  fetchAudiusAlbum,
} from './providers/audius/audiusProvider';
import { searchArchiveTracks } from './providers/internetArchive/archiveProvider';
import {
  searchJamendoTracks,
  fetchJamendoArtist,
  fetchJamendoAlbum,
  isJamendoConfigured,
} from './providers/jamendo/jamendoProvider';
import {
  searchItunesTracks,
  fetchItunesArtist,
  fetchItunesAlbum,
} from './providers/appleMusic/itunesProvider';
import { searchYouTubeMusicVideos, isYouTubeConfigured } from './providers/youtube/youtubeProvider';

export const MusicProviderManager = {
  getProviderStatuses() {
    return {
      audius: { name: 'Audius', active: true, type: 'FULL_TRACK', needsKey: false },
      archive: { name: 'Internet Archive', active: true, type: 'FULL_TRACK', needsKey: false },
      itunes: { name: 'Apple iTunes', active: true, type: 'PREVIEW_30S', needsKey: false },
      jamendo: {
        name: 'Jamendo',
        active: isJamendoConfigured(),
        type: 'FULL_TRACK',
        needsKey: !isJamendoConfigured(),
      },
      youtube: {
        name: 'YouTube Embed',
        active: isYouTubeConfigured(),
        type: 'EXTERNAL_VIDEO',
        needsKey: !isYouTubeConfigured(),
      },
    };
  },

  async fetchCategoryTracks(categoryId, { page = 1, limit = 25, signal } = {}) {
    const cat = findCategoryById(categoryId);
    if (!cat) return [];

    const offset = (page - 1) * limit;
    const cacheKey = `cat:${categoryId}:p${page}:l${limit}`;
    const cached = await getCachedApi(cacheKey);
    if (cached) return cached;

    const tasks = [];

    if (cat.audiusTrending) {
      tasks.push(
        fetchAudiusTrending({
          genre: cat.audiusGenre || '',
          time: cat.audiusTime || 'week',
          limit,
          offset,
          signal,
        })
      );
    }
    if (cat.audiusQuery) {
      tasks.push(searchAudiusTracks(cat.audiusQuery, { limit, offset, signal }));
    }
    if (cat.jamendoTag && isJamendoConfigured()) {
      tasks.push(searchJamendoTracks('', { tag: cat.jamendoTag, limit: 20, offset, signal }));
    }
    if (cat.archiveQuery && page <= 3) {
      tasks.push(searchArchiveTracks(cat.archiveQuery, { limit: 8, page, signal }));
    }
    if (cat.itunesQuery) {
      tasks.push(
        searchItunesTracks(cat.itunesQuery, {
          country: cat.country || 'ID',
          limit: 20,
          offset,
          signal,
        })
      );
    }

    const settled = await Promise.allSettled(tasks);
    const raw = [];
    for (const r of settled) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        raw.push(...r.value);
      }
    }

    const unique = deduplicateTracks(raw);
    if (unique.length > 0) {
      await setCachedApi(cacheKey, unique, 15 * 60 * 1000);
    }
    return unique;
  },

  async searchAllProviders(query, { page = 1, limit = 25, signal } = {}) {
    const clean = (query || '').trim();
    if (!clean) return [];

    const offset = (page - 1) * limit;
    const cacheKey = `search:${clean.toLowerCase()}:p${page}`;
    const cached = await getCachedApi(cacheKey);
    if (cached) return cached;

    const tasks = [
      searchAudiusTracks(clean, { limit, offset, signal }),
      searchItunesTracks(clean, { country: 'ID', limit: 20, offset, signal }),
    ];

    if (isJamendoConfigured()) {
      tasks.push(searchJamendoTracks(clean, { limit: 20, offset, signal }));
    }
    if (page === 1) {
      tasks.push(searchArchiveTracks(clean, { limit: 8, page: 1, signal }));
    }
    if (isYouTubeConfigured() && page === 1) {
      tasks.push(searchYouTubeMusicVideos(clean, { limit: 8, signal }));
    }

    const settled = await Promise.allSettled(tasks);
    const merged = [];
    for (const res of settled) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        merged.push(...res.value);
      }
    }

    const unique = deduplicateTracks(merged);
    if (unique.length > 0) {
      await setCachedApi(cacheKey, unique, 10 * 60 * 1000);
    }
    return unique;
  },

  async fetchArtistDetails(artistId, { signal } = {}) {
    if (!artistId) return null;
    const cacheKey = `artist:${artistId}`;
    const cached = await getCachedApi(cacheKey);
    if (cached) return cached;

    let data = null;
    if (artistId.startsWith('audius-artist-')) {
      data = await fetchAudiusArtist(artistId, { signal });
    } else if (artistId.startsWith('itunes-artist-')) {
      data = await fetchItunesArtist(artistId, { signal });
    } else if (artistId.startsWith('jamendo-artist-')) {
      data = await fetchJamendoArtist(artistId, { signal });
    }

    if (data) await setCachedApi(cacheKey, data, 30 * 60 * 1000);
    return data;
  },

  async fetchAlbumDetails(albumId, { signal } = {}) {
    if (!albumId) return null;
    const cacheKey = `album:${albumId}`;
    const cached = await getCachedApi(cacheKey);
    if (cached) return cached;

    let data = null;
    if (albumId.startsWith('audius-album-')) {
      data = await fetchAudiusAlbum(albumId, { signal });
    } else if (albumId.startsWith('itunes-album-')) {
      data = await fetchItunesAlbum(albumId, { signal });
    } else if (albumId.startsWith('jamendo-album-')) {
      data = await fetchJamendoAlbum(albumId, { signal });
    }

    if (data) await setCachedApi(cacheKey, data, 30 * 60 * 1000);
    return data;
  },
};
