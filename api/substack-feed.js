'use strict';

/**
 * Vercel serverless function: proxies the Substack RSS feed server-side
 * (the browser can't fetch it directly -- Substack sends no CORS headers)
 * and hands the blog page a small JSON array to render live, no rebuild
 * or manual sync needed. Feed URL comes from content/site.json, not the
 * request, so this can't be pointed at an arbitrary URL by a client.
 */

var site = require('../content/site.json');
var feedParser = require('../scripts/feed-parser.js');

module.exports = async function handler(req, res) {
  var feedUrl = site.externalBlog && site.externalBlog.feedUrl;
  var provider = (site.externalBlog && site.externalBlog.provider) || 'Substack';

  if (!feedUrl) {
    res.status(400).json({ ok: false, error: 'No externalBlog.feedUrl configured in content/site.json' });
    return;
  }

  try {
    var posts = await feedParser.fetchFeed(feedUrl);
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ ok: true, provider: provider, posts: posts });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};
