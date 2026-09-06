'use strict';

/**
 * Vercel serverless function: fetches the Goodreads shelf RSS feeds
 * server-side and hands the bookshelf page/widget a small JSON array to
 * render live, no rebuild or manual sync needed. The Goodreads user ID
 * comes from content/site.json, not the request.
 */

var site = require('../content/site.json');
var goodreadsParser = require('../scripts/goodreads-parser.js');

module.exports = async function handler(req, res) {
  var userId = site.goodreads && site.goodreads.userId;

  if (!userId) {
    res.status(400).json({ ok: false, error: 'No goodreads.userId configured in content/site.json' });
    return;
  }

  try {
    var books = await goodreadsParser.fetchBookshelf(userId);
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ ok: true, books: books });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};
