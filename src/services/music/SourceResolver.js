import { AUDIO_STATUS } from './TrackNormalizer';

export function resolveTrackPlayback(track) {
  if (!track) {
    return {
      playable: false,
      status: AUDIO_STATUS.UNAVAILABLE,
      mode: 'none',
      reason: 'Data lagu tidak tersedia.',
    };
  }

  if (track.audioStatus === AUDIO_STATUS.FULL_TRACK && track.audioUrl) {
    return {
      playable: true,
      status: AUDIO_STATUS.FULL_TRACK,
      mode: track.corsSafe ? 'cors-audio' : 'plain-audio',
      url: track.audioUrl,
      reason: 'Full Track tersedia legal.',
    };
  }

  if (track.audioStatus === AUDIO_STATUS.PREVIEW && track.audioUrl) {
    return {
      playable: true,
      status: AUDIO_STATUS.PREVIEW,
      mode: 'plain-audio',
      url: track.audioUrl,
      reason: 'Hanya cuplikan 30 detik dari penyedia resmi.',
    };
  }

  if (track.audioStatus === AUDIO_STATUS.EXTERNAL && (track.youtubeVideoId || track.externalUrl)) {
    return {
      playable: Boolean(track.youtubeVideoId),
      status: AUDIO_STATUS.EXTERNAL,
      mode: track.youtubeVideoId ? 'youtube-iframe' : 'external-link',
      youtubeVideoId: track.youtubeVideoId || null,
      externalUrl: track.externalUrl || '',
      reason: 'Tersedia melalui pemutar resmi eksternal.',
    };
  }

  return {
    playable: false,
    status: AUDIO_STATUS.UNAVAILABLE,
    mode: 'none',
    reason: 'Audio tidak tersedia untuk diputar.',
  };
}

export function separateTracksByAvailability(tracks = []) {
  const fullTracks = [];
  const previews = [];
  const external = [];
  const unavailable = [];

  for (const t of tracks) {
    if (!t) continue;
    if (t.audioStatus === AUDIO_STATUS.FULL_TRACK && t.audioUrl) {
      fullTracks.push(t);
    } else if (t.audioStatus === AUDIO_STATUS.PREVIEW && t.audioUrl) {
      previews.push(t);
    } else if (t.audioStatus === AUDIO_STATUS.EXTERNAL) {
      external.push(t);
    } else {
      unavailable.push(t);
    }
  }

  return { fullTracks, previews, external, unavailable };
}
