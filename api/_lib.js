const crypto = require('crypto');
const RU = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RT = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
async function redis(...cmd) {
  const r = await fetch(RU, { method: 'POST', headers: { Authorization: 'Bearer ' + RT }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
}
const loadState = async () => JSON.parse((await redis('GET', 'state')) || '{"sites":[]}');
const saveState = (s) => redis('SET', 'state', JSON.stringify(s));
const h = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(h(a), h(b));
const sign = (v) => crypto.createHmac('sha256', process.env.SESSION_SECRET).update(v).digest('hex');
const makeToken = () => { const e = String(Date.now() + 8 * 36e5); return e + '.' + sign(e); };
function isAuthed(req) {
  if (!process.env.SESSION_SECRET) return false;
  const m = (req.headers.cookie || '').match(/(?:^|; )sess=([^;]+)/); if (!m) return false;
  const [e, s] = m[1].split('.'); return !!s && safeEq(s, sign(e)) && Date.now() < +e;
}
async function tg(text) {
  const t = process.env.TELEGRAM_BOT_TOKEN, c = process.env.TELEGRAM_CHAT_ID; if (!t || !c) return;
  try { await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: c, text }) }); } catch (e) {}
}
async function ping(url) {
  const t0 = Date.now(), ac = new AbortController(), to = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(url, { signal: ac.signal, redirect: 'follow', headers: { 'User-Agent': 'MyUptimeBot/1.0' } });
    return { t: t0, up: r.ok, ms: Date.now() - t0, code: r.status };
  } catch (e) { return { t: t0, up: false, ms: Date.now() - t0, code: 0 }; } finally { clearTimeout(to); }
}
async function runChecks(force) {
  const st = await loadState(), now = Date.now();
  const due = st.sites.filter((s) => !s.paused && (force || !s.last || now - s.last >= (s.interval || 5) * 60000 - 20000));
  if (!due.length) return st;
  await Promise.all(due.map(async (s) => {
    const was = s.up, r = await ping(s.url);
    s.up = r.up; s.ms = r.ms; s.code = r.code; s.last = r.t;
    s.hist = [...(s.hist || []), { t: r.t, up: r.up, ms: r.ms }].slice(-100);
    if (was !== undefined && was !== r.up) await tg(r.up ? `✅ ${s.name} is UP again` : `🔴 ${s.name} is DOWN (code ${r.code})\n${s.url}`);
  }));
  await saveState(st); return st;
}
module.exports = { redis, loadState, saveState, safeEq, makeToken, isAuthed, runChecks };
