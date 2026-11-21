const { redis, safeEq, makeToken } = require('./_lib');
module.exports = async (req, res) => {
  const secure = '; HttpOnly; Secure; SameSite=Strict; Path=/';
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', 'sess=; Max-Age=0' + secure); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) return res.status(500).json({ error: 'env missing' });
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim(), k = 'rl:' + ip;
  const n = await redis('INCR', k); if (n === 1) await redis('EXPIRE', k, 900);
  if (n > 5) return res.status(429).json({ error: 'Too many attempts. 15 min baad try karo.' });
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEq((req.body || {}).password || '', process.env.ADMIN_PASSWORD)) return res.status(401).json({ error: 'Wrong password' });
  await redis('DEL', k);
  res.setHeader('Set-Cookie', `sess=${makeToken()}` + secure);
  res.status(200).json({ ok: true });
};
