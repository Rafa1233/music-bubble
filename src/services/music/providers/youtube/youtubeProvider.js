import { AUDIO_STATUS, normalizeTrack } from '../../TrackNormalizer';

export function isYouTubeConfigured() {
  return Boolean(import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_YOUTUBE_API_KEY);
}

export async function searchYouTubeMusicVideos(query, { limit = 10, signal } = {}) {
  if (!query || !query.trim()) return [];
  const apiBase = (import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '');
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';

  let url = '';
  if (apiBase) {
    url = `${apiBase}/api/youtube?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
  } else if (apiKey) {
    const qs = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10',
      maxResults: String(limit),
      q: `${query.trim()} official audio`,
      key: apiKey,
    }).toString();
    url = `https://www.googleapis.com/youtube/v3/search?${qs}`;
  } else {
    return [];
  }

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];

    return items
      .map((item) => {
        const videoId = item.id?.videoId;
        if (!videoId) return null;
        const snip = item.snippet || {};
        return normalizeTrack({
          id: `yt-${videoId}`,
          rawId: videoId,
          title: snip.title || 'YouTube Music Video',
          artist: snip.channelTitle || 'YouTube Channel',
          album: 'YouTube Official Embed',
          releaseDate: snip.publishedAt || null,
          cover: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || '',
          audioUrl: '',
          youtubeVideoId: videoId,
          externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          duration: 0,
          audioStatus: AUDIO_STATUS.EXTERNAL,
          corsSafe: false,
          source: 'youtube',
          sourceLabel: 'YouTube Video',
          genre: 'Video',
        });
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
