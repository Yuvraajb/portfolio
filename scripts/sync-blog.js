'use strict';

/**
 * Pulls posts from any RSS or Atom feed into content/blog-feed.json, which
 * build.js merges into the blog automatically -- no manual markdown files
 * needed once this is wired up. Not tied to one platform: anything that
 * exposes a feed works, no API key required. A few common ones:
 *
 *   Substack:  https://<yourname>.substack.com/feed
 *   Medium:    https://medium.com/feed/@<yourname>          (personal)
 *              https://medium.com/feed/<publication-name>   (publication)
 *   WordPress: https://yoursite.com/feed/
 *   Ghost:     https://yoursite.com/rss/
 *   Dev.to:    https://dev.to/feed/<username>
 *   Hashnode:  https://<yourname>.hashnode.dev/rss.xml
 *
 * Usage:
 *   node scripts/sync-blog.js <feed_url> [provider_label]
 *   BLOG_FEED_URL=https://you.substack.com/feed node scripts/sync-blog.js
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var OUT_PATH = path.join(ROOT, 'content', 'blog-feed.json');
var EXISTING_SLUGS_DIR = path.join(ROOT, 'content', 'posts');

function decodeXmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function (m, code) { return String.fromCharCode(Number(code)); })
    .replace(/&amp;/g, '&');
}

function extractField(itemXml, tag) {
  var re = new RegExp('<' + tag + '(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</' + tag + '>');
  var m = itemXml.match(re);
  if (!m) return '';
  var raw = m[1] !== undefined && m[1] !== null ? m[1] : m[2];
  return raw ? raw.trim() : '';
}

function extractPlainField(itemXml, tag) {
  var raw = extractField(itemXml, tag);
  return raw ? decodeXmlEntities(raw) : '';
}

function parseItems(rssXml) {
  var items = [];
  var re = /<item[\s\S]*?<\/item>/g;
  var m;
  while ((m = re.exec(rssXml))) {
    items.push(m[0]);
  }
  if (items.length === 0) {
    // Fall back to Atom <entry> in case the feed isn't RSS 2.0.
    re = /<entry[\s\S]*?<\/entry>/g;
    while ((m = re.exec(rssXml))) {
      items.push(m[0]);
    }
  }
  return items;
}

/** Strip the handful of things that shouldn't ride along from a third-party feed. */
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'");
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function existingSlugs() {
  var slugs = {};
  if (fs.existsSync(EXISTING_SLUGS_DIR)) {
    fs.readdirSync(EXISTING_SLUGS_DIR).forEach(function (f) {
      if (f.endsWith('.md')) {
        slugs[f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')] = true;
      }
    });
  }
  return slugs;
}

function uniqueSlug(base, taken) {
  var slug = base || 'post';
  var n = 2;
  while (taken[slug]) {
    slug = base + '-' + n;
    n++;
  }
  taken[slug] = true;
  return slug;
}

function toIsoDate(pubDate) {
  var d = new Date(pubDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function plainExcerpt(html) {
  var text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 200 ? text.slice(0, 197) + '...' : text;
}

async function main() {
  var feedUrl = process.argv[2] || process.env.BLOG_FEED_URL;
  var providerLabel = process.argv[3] || process.env.BLOG_PROVIDER || 'the source feed';

  if (!feedUrl || feedUrl.indexOf('PLACEHOLDER') !== -1) {
    console.log('No blog feed URL given. Skipping sync.');
    console.log('Usage: node scripts/sync-blog.js <feed_url> [provider_label]');
    console.log('   or: BLOG_FEED_URL=https://you.substack.com/feed node scripts/sync-blog.js');
    process.exit(0);
  }

  var res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site-blog-sync/1.0)' }
  });
  if (!res.ok) {
    console.error('HTTP ' + res.status + ' fetching ' + feedUrl);
    process.exit(1);
  }
  var xml = await res.text();
  if (!/<rss|<feed/i.test(xml)) {
    console.error('Response was not RSS/Atom -- check the feed URL: ' + feedUrl);
    process.exit(1);
  }

  var items = parseItems(xml);
  if (items.length === 0) {
    console.error('No items found in feed. Nothing written.');
    process.exit(1);
  }

  var taken = existingSlugs();
  var posts = items.map(function (item) {
    var title = extractPlainField(item, 'title');
    var link = extractPlainField(item, 'link') || extractPlainField(item, 'guid');
    var pubDate = extractPlainField(item, 'pubDate') || extractPlainField(item, 'published') || extractPlainField(item, 'updated');
    var contentEncoded = extractField(item, 'content:encoded');
    var description = extractField(item, 'description') || extractField(item, 'summary') || extractField(item, 'content');
    var html = sanitizeHtml(contentEncoded || description || '');

    return {
      title: title,
      slug: uniqueSlug(slugify(title), taken),
      date: toIsoDate(pubDate) || new Date().toISOString().slice(0, 10),
      link: link,
      excerpt: plainExcerpt(html),
      html: html,
      source: providerLabel,
      external: true
    };
  });

  posts.sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  fs.writeFileSync(OUT_PATH, JSON.stringify(posts, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + posts.length + ' post(s) from ' + providerLabel + ' to ' + path.relative(ROOT, OUT_PATH));
}

main().catch(function (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
});
