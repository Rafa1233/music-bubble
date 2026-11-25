export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'YOUTUBE_API_KEY belum dikonfigurasi di server.' });
  }
  const q = String(req.query.q || '').trim();
  const limit = String(Math.min(15, Math.max(1, Number(req.query.limit || 8))));
  if (!q) return res.status(400).json({ error: 'Parameter q wajib diisi.' });

  const qs = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    maxResults: limit,
    q: `${q} official audio`,
    key: apiKey,
  }).toString();

  try {
    const upstream = await fetch(`https://www.googleapis.com/youtube/v3/search?${qs}`);
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Gagal menghubungi YouTube Data API.' });
  }
}
