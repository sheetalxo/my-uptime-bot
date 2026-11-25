module.exports = (req, res) => {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'sess=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/');
    return res.status(200).json({ ok: true });
  }
  res.status(410).json({ error: 'Use Google login' });
};
