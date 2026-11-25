const crypto = require('crypto');
module.exports = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).send('GOOGLE_CLIENT_ID missing');
  const state = crypto.randomBytes(16).toString('hex');
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://' + req.headers.host + '/api/callback',
    response_type: 'code', scope: 'openid email', state, prompt: 'select_account',
  });
  res.setHeader('Set-Cookie', `ostate=${state}; Max-Age=600; HttpOnly; Secure; SameSite=Lax; Path=/`);
  res.statusCode = 302;
  res.setHeader('Location', 'https://accounts.google.com/o/oauth2/v2/auth?' + q);
  res.end();
};
