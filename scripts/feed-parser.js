'use strict';

/**
 * Minimal RSS/Atom parser shared by the live Substack embed (api/substack-feed.js
 * and the local dev server) and the optional one-off sync-blog.js script.
 * No dependencies -- regex-based, good enough for the handful of fields we need.
 */

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

function extractLink(itemXml) {
  // RSS: <link>https://...</link>. Atom: <link href="https://..."/>.
  var plain = extractPlainField(itemXml, 'link');
  if (plain) return plain;
  var m = itemXml.match(/<link[^>]*\shref="([^"]+)"/);
  return m ? m[1] : '';
}

function parseItems(feedXml) {
  var items = [];
  var re = /<item[\s\S]*?<\/item>/g;
  var m;
  while ((m = re.exec(feedXml))) {
    items.push(m[0]);
  }
  if (items.length === 0) {
    // Fall back to Atom <entry> in case the feed isn't RSS 2.0.
    re = /<entry[\s\S]*?<\/entry>/g;
    while ((m = re.exec(feedXml))) {
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

function toIsoDate(pubDate) {
  var d = new Date(pubDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function plainExcerpt(html, maxLen) {
  var text = decodeXmlEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  var limit = maxLen || 200;
  return text.length > limit ? text.slice(0, limit - 3) + '...' : text;
}

/** Parses feed XML into a plain array of { title, link, date, excerpt }. */
function parseFeed(xml) {
  var items = parseItems(xml);
  return items.map(function (item) {
    var title = extractPlainField(item, 'title');
    var link = extractLink(item);
    var pubDate = extractPlainField(item, 'pubDate') || extractPlainField(item, 'published') || extractPlainField(item, 'updated');
    var contentEncoded = extractField(item, 'content:encoded');
    var description = extractField(item, 'description') || extractField(item, 'summary') || extractField(item, 'content');
    var html = sanitizeHtml(contentEncoded || description || '');

    return {
      title: title,
      link: link,
      date: toIsoDate(pubDate),
      excerpt: plainExcerpt(html)
    };
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
}

async function fetchFeed(feedUrl) {
  var res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site-blog-sync/1.0)' }
  });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' fetching ' + feedUrl);
  }
  var xml = await res.text();
  if (!/<rss|<feed/i.test(xml)) {
    throw new Error('Response was not RSS/Atom -- check the feed URL: ' + feedUrl);
  }
  return parseFeed(xml);
}

module.exports = {
  decodeXmlEntities: decodeXmlEntities,
  extractField: extractField,
  extractPlainField: extractPlainField,
  parseItems: parseItems,
  sanitizeHtml: sanitizeHtml,
  toIsoDate: toIsoDate,
  plainExcerpt: plainExcerpt,
  parseFeed: parseFeed,
  fetchFeed: fetchFeed
};
