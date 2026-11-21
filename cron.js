const { safeEq, runChecks } = require('./_lib');
module.exports = async (req, res) => {
  const a = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || !safeEq(a, 'Bearer ' + process.env.CRON_SECRET)) return res.status(401).end();
  const st = await runChecks(); res.json({ checked: st.sites.length });
};
