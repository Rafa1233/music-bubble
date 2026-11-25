import { AUDIO_STATUS, cleanText } from './TrackNormalizer';
import { separateTracksByAvailability } from './SourceResolver';
import { MusicProviderManager } from './MusicProviderManager';

function scoreTrackRelevance(track, query) {
  const q = cleanText(query);
  if (!q) return 0;

  const title = cleanText(track.title);
  const artist = cleanText(track.artist);
  let score = 0;

  if (title === q || `${artist} ${title}` === q) score += 100;
  else if (title.includes(q)) score += 60;
  else if (artist.includes(q)) score += 50;

  const words = q.split(' ').filter((w) => w.length > 1);
  for (const w of words) {
    if (title.includes(w)) score += 18;
    if (artist.includes(w)) score += 15;
  }

  // Prioritaskan sumber FULL_TRACK legal tanpa memalsukan metadata
  if (track.audioStatus === AUDIO_STATUS.FULL_TRACK) score += 35;
  else if (track.audioStatus === AUDIO_STATUS.PREVIEW) score += 10;

  return score;
}

export async function smartSearchMusic(query, { page = 1, limit = 25, signal } = {}) {
  const rawResults = await MusicProviderManager.searchAllProviders(query, {
    page,
    limit,
    signal,
  });

  const sorted = [...rawResults].sort(
    (a, b) => scoreTrackRelevance(b, query) - scoreTrackRelevance(a, query)
  );

  const grouped = separateTracksByAvailability(sorted);
  return {
    all: sorted,
    ...grouped,
    hasMore: rawResults.length >= 10,
  };
}
