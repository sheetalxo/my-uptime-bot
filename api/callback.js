const { safeEq, makeToken } = require('./_lib');
const go = (res, to) => { res.statusCode = 302; res.setHeader('Location', to); res.end(); };
module.exports = async (req, res) => {
  try {
    const { code, state } = req.query || {};
    const m = (req.headers.cookie || '').match(/(?:^|; )ostate=([^;]+)/);
    if (!code || !state || !m || !safeEq(m[1], state)) return go(res, '/?err=denied');
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://' + req.headers.host + '/api/callback', grant_type: 'authorization_code',
      }),
    });
    const j = await r.json();
    if (!j.id_token) return go(res, '/?err=denied');
    const p = JSON.parse(Buffer.from(j.id_token.split('.')[1], 'base64url').toString());
    const admin = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const ok = !!admin && (p.email_verified === true || p.email_verified === 'true') &&
      p.aud === process.env.GOOGLE_CLIENT_ID && String(p.email).toLowerCase() === admin;
    if (!ok) return go(res, '/?err=denied');
    res.setHeader('Set-Cookie', [`sess=${makeToken()}; HttpOnly; Secure; SameSite=Strict; Path=/`, 'ostate=; Max-Age=0; Path=/']);
    go(res, '/');
  } catch (e) { go(res, '/?err=denied'); }
};
