export default async function handler(req, res) {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'JAMENDO_CLIENT_ID belum dikonfigurasi di server.' });
  }
  const { resource = 'tracks', ...rest } = req.query;
  const qs = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    ...rest,
  }).toString();

  try {
    const upstream = await fetch(`https://api.jamendo.com/v3.0/${encodeURIComponent(resource)}/?${qs}`);
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Gagal menghubungi Jamendo API.' });
  }
}
