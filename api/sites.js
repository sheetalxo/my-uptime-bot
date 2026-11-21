const crypto = require('crypto');
const { loadState, saveState, isAuthed, runChecks } = require('./_lib');
const clamp = (v) => Math.min(60, Math.max(1, parseInt(v) || 5));
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) return res.status(401).json({ error: 'unauthorized' });
  if (req.method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) return res.status(415).end();
  const b = req.body || {};
  if (req.method === 'GET') return res.json(await loadState());
  if (req.method === 'POST' && b.action === 'check') return res.json(await runChecks(true));
  const st = await loadState();
  if (req.method === 'POST') {
    let u; try { u = new URL(b.url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
    if (!/^https?:$/.test(u.protocol)) return res.status(400).json({ error: 'Only http/https' });
    if (st.sites.length >= 50) return res.status(400).json({ error: 'Limit reached' });
    st.sites.push({ id: crypto.randomBytes(6).toString('hex'), name: String(b.name || u.hostname).slice(0, 60), url: u.href, interval: clamp(b.interval), hist: [] });
  } else if (req.method === 'PATCH') {
    const s = st.sites.find((x) => x.id === b.id); if (s) { if (b.paused !== undefined) s.paused = !!b.paused; if (b.interval) s.interval = clamp(b.interval); }
  } else if (req.method === 'DELETE') {
    st.sites = st.sites.filter((x) => x.id !== b.id);
  } else return res.status(405).end();
  await saveState(st); res.json(st);
};
