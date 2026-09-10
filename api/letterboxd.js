'use strict';

/**
 * Vercel serverless function: fetches the Letterboxd diary + watchlist RSS
 * feeds server-side and hands the /reel/ page a small JSON payload to
 * render live, no rebuild or manual sync needed. The username comes from
 * content/site.json, not the request.
 */

var site = require('../content/site.json');
var letterboxdParser = require('../scripts/letterboxd-parser.js');

module.exports = async function handler(req, res) {
  var username = site.letterboxd && site.letterboxd.username;

  if (!username) {
    res.status(400).json({ ok: false, error: 'No letterboxd.username configured in content/site.json' });
    return;
  }

  try {
    var data = await letterboxdParser.fetchLetterboxd(username);
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ ok: true, journal: data.journal, watchlist: data.watchlist });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};
