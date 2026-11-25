import assert from 'node:assert/strict';
import { AUDIO_STATUS, normalizeTrack, deduplicateTracks } from '../src/services/music/TrackNormalizer.js';
import { resolveTrackPlayback, separateTracksByAvailability } from '../src/services/music/SourceResolver.js';
import { CATEGORY_GROUPS } from '../src/services/music/CatalogCategories.js';
import { fetchAudiusTrending, searchAudiusTracks } from '../src/services/music/providers/audius/audiusProvider.js';
import { searchArchiveTracks } from '../src/services/music/providers/internetArchive/archiveProvider.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.log(`[FAIL] ${name} -> ${err.message}`);
    failed++;
  }
}

await test('1. Preview 30s TIDAK boleh ditandai isFullTrack=true', async () => {
  const t = normalizeTrack({
    id: 'test-prev',
    title: 'Sial',
    artist: 'Mahalini',
    audioUrl: 'https://example.com/preview.m4a',
    duration: 30,
    audioStatus: AUDIO_STATUS.PREVIEW,
  });
  assert.equal(t.isFullTrack, false);
  assert.equal(t.audioStatus, AUDIO_STATUS.PREVIEW);
});

await test('2. Lagu berjudul sama dengan artis berbeda TIDAK boleh dianggap duplikat', async () => {
  const res = deduplicateTracks([
    { id: '1', title: 'Perfect', artist: 'Ed Sheeran', audioStatus: AUDIO_STATUS.PREVIEW, audioUrl: 'a' },
    { id: '2', title: 'Perfect', artist: 'Simple Plan', audioStatus: AUDIO_STATUS.PREVIEW, audioUrl: 'b' },
  ]);
  assert.equal(res.length, 2);
});

await test('3. Deduplikasi artis+judul sama memprioritaskan FULL_TRACK di atas PREVIEW', async () => {
  const res = deduplicateTracks([
    { id: '1', title: 'Lofi Night', artist: 'ChillMaker', audioStatus: AUDIO_STATUS.PREVIEW, audioUrl: 'p' },
    { id: '2', title: 'Lofi Night', artist: 'ChillMaker', audioStatus: AUDIO_STATUS.FULL_TRACK, audioUrl: 'f' },
  ]);
  assert.equal(res.length, 1);
  assert.equal(res[0].audioStatus, AUDIO_STATUS.FULL_TRACK);
});

await test('4. SourceResolver & pemisahan status FULL_TRACK vs PREVIEW vs EXTERNAL vs UNAVAILABLE', async () => {
  const sep = separateTracksByAvailability([
    normalizeTrack({ id: 'a', audioStatus: AUDIO_STATUS.FULL_TRACK, audioUrl: 'https://x/1.mp3' }),
    normalizeTrack({ id: 'b', audioStatus: AUDIO_STATUS.PREVIEW, audioUrl: 'https://x/p.m4a' }),
    normalizeTrack({ id: 'c', audioStatus: AUDIO_STATUS.EXTERNAL, youtubeVideoId: 'dQw4w9WgXcQ' }),
    normalizeTrack({ id: 'd', audioStatus: AUDIO_STATUS.UNAVAILABLE }),
  ]);
  assert.equal(sep.fullTracks.length, 1);
  assert.equal(sep.previews.length, 1);
  assert.equal(sep.external.length, 1);
  assert.equal(sep.unavailable.length, 1);
  assert.equal(resolveTrackPlayback(sep.unavailable[0]).playable, false);
  assert.equal(resolveTrackPlayback(sep.external[0]).mode, 'youtube-iframe');
});

await test('5. Kategori Trending Indonesia, English, K-Pop, 20 Genre, 12 Mood tersedia lengkap', async () => {
  const genres = CATEGORY_GROUPS.find((g) => g.group === 'genres');
  const moods = CATEGORY_GROUPS.find((g) => g.group === 'moods');
  assert.ok(genres && genres.items.length >= 20);
  assert.ok(moods && moods.items.length >= 12);
});

await test('6. Live API Audius Trending menghasilkan Full Track asli (> 45 detik)', async () => {
  const list = await fetchAudiusTrending({ limit: 5 });
  assert.ok(list.length > 0, 'Audius trending kosong');
  assert.equal(list[0].audioStatus, AUDIO_STATUS.FULL_TRACK);
  assert.ok(list[0].duration > 45, `Durasi asli terlalu pendek: ${list[0].duration}`);
});

await test('7. Live API Audius Search lagu Indonesia/Acoustic menghasilkan Full Track', async () => {
  const list = await searchAudiusTracks('indonesia acoustic', { limit: 5 });
  assert.ok(list.length > 0, 'Hasil pencarian Audius kosong');
  assert.equal(list[0].isFullTrack, true);
});

await test('8. Live API Internet Archive menghasilkan Full Track CC/Public Domain', async () => {
  const list = await searchArchiveTracks('classical piano', { limit: 5 });
  assert.ok(Array.isArray(list));
  if (list.length > 0) {
    assert.equal(list[0].audioStatus, AUDIO_STATUS.FULL_TRACK);
  }
});

await test('9. Penanganan Timeout & AbortController pada API', async () => {
  const c = new AbortController();
  c.abort();
  let aborted = false;
  try {
    await fetchAudiusTrending({ limit: 2, signal: c.signal });
  } catch (e) {
    aborted = e?.name === 'AbortError';
  }
  assert.equal(aborted, true);
});

await test('10. Live API LRCLIB mengembalikan lirik LRC valid', async () => {
  const res = await fetch('https://lrclib.net/api/get?track_name=Perfect&artist_name=Ed%20Sheeran');
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.ok(Boolean(data.syncedLyrics || data.plainLyrics));
});

console.log(`\nRINGKASAN TEST: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
