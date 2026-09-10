'use strict';

/**
 * Pulls your public Letterboxd diary and watchlist via RSS and writes
 * content/letterboxd.json. Letterboxd doesn't require an API key for this --
 * every public profile exposes:
 *
 *   Diary/journal: https://letterboxd.com/<username>/rss/
 *   Watchlist:      https://letterboxd.com/<username>/watchlist/rss/
 *
 * Both are plain RSS 2.0 with a few Letterboxd-specific namespaced fields
 * (letterboxd:filmTitle, letterboxd:memberRating, etc.) -- that's what this
 * scrapes. If it ever starts coming back empty, that's the first thing to
 * check (Letterboxd could change the feed format without notice, same
 * caveat as the Goodreads sync).
 *
 * Usage:
 *   node scripts/sync-letterboxd.js <letterboxd_username>
 *   LETTERBOXD_USERNAME=yourname node scripts/sync-letterboxd.js
 *
 * Your profile must be public (Settings -> Privacy) for the RSS feeds to
 * return anything.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var OUT_PATH = path.join(ROOT, 'content', 'letterboxd.json');

var JOURNAL_LIMIT = 12;
var WATCHLIST_LIMIT = 18;

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
  var re = new RegExp('<' + tag + '>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</' + tag + '>');
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
  var re = /<item>([\s\S]*?)<\/item>/g;
  var m;
  while ((m = re.exec(rssXml))) {
    items.push(m[1]);
  }
  return items;
}

function firstPosterUrl(descriptionHtml) {
  var m = descriptionHtml.match(/<img[^>]*src="([^"]+)"/);
  return m ? m[1] : '';
}

function reviewExcerpt(descriptionHtml) {
  var withoutImg = descriptionHtml.replace(/<img[^>]*>/g, '');
  var text = decodeXmlEntities(withoutImg.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text.length > 220 ? text.slice(0, 217) + '...' : text;
}

function toIsoDate(str) {
  if (!str) return '';
  var d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function itemToJournalEntry(itemXml) {
  var description = extractField(itemXml, 'description');
  var ratingRaw = extractPlainField(itemXml, 'letterboxd:memberRating');
  return {
    title: extractPlainField(itemXml, 'letterboxd:filmTitle'),
    year: extractPlainField(itemXml, 'letterboxd:filmYear'),
    link: extractPlainField(itemXml, 'link'),
    watchedDate: extractPlainField(itemXml, 'letterboxd:watchedDate') || toIsoDate(extractPlainField(itemXml, 'pubDate')),
    rating: ratingRaw ? Number(ratingRaw) : 0,
    rewatch: extractPlainField(itemXml, 'letterboxd:rewatch').toLowerCase() === 'yes',
    poster: firstPosterUrl(description),
    review: reviewExcerpt(description)
  };
}

function itemToWatchlistEntry(itemXml) {
  var description = extractField(itemXml, 'description');
  return {
    title: extractPlainField(itemXml, 'letterboxd:filmTitle'),
    year: extractPlainField(itemXml, 'letterboxd:filmYear'),
    link: extractPlainField(itemXml, 'link'),
    poster: firstPosterUrl(description)
  };
}

async function fetchFeed(url) {
  var res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site-letterboxd-sync/1.0)' }
  });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' fetching ' + url);
  }
  var xml = await res.text();
  if (!/<rss/i.test(xml)) {
    throw new Error('Response was not RSS -- profile may be private or the username is wrong: ' + url);
  }
  return xml;
}

async function main() {
  var username = process.argv[2] || process.env.LETTERBOXD_USERNAME;
  if (!username) {
    console.log('No Letterboxd username given. Skipping sync.');
    console.log('Usage: node scripts/sync-letterboxd.js <letterboxd_username>');
    console.log('   or: LETTERBOXD_USERNAME=yourname node scripts/sync-letterboxd.js');
    process.exit(0);
  }

  var base = 'https://letterboxd.com/' + encodeURIComponent(username) + '/';
  var journal = [];
  var watchlist = [];
  var failures = [];

  try {
    var journalXml = await fetchFeed(base + 'rss/');
    journal = parseItems(journalXml).map(itemToJournalEntry).slice(0, JOURNAL_LIMIT);
    console.log('Fetched ' + journal.length + ' journal entr(y/ies)');
  } catch (err) {
    failures.push('journal: ' + err.message);
    console.error('Failed to fetch journal: ' + err.message);
  }

  try {
    var watchlistXml = await fetchFeed(base + 'watchlist/rss/');
    watchlist = parseItems(watchlistXml).map(itemToWatchlistEntry).slice(0, WATCHLIST_LIMIT);
    console.log('Fetched ' + watchlist.length + ' watchlist entr(y/ies)');
  } catch (err) {
    failures.push('watchlist: ' + err.message);
    console.error('Failed to fetch watchlist: ' + err.message);
  }

  if (journal.length === 0 && watchlist.length === 0) {
    console.error('Nothing fetched from either feed. Leaving content/letterboxd.json untouched.');
    if (failures.length) console.error(failures.join('\n'));
    process.exit(1);
  }

  var out = {
    username: username,
    profileUrl: base,
    updatedAt: new Date().toISOString().slice(0, 10),
    journal: journal,
    watchlist: watchlist
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + journal.length + ' journal + ' + watchlist.length + ' watchlist entr(y/ies) to ' + path.relative(ROOT, OUT_PATH));
  if (failures.length) {
    console.warn('One feed failed and was left empty:\n' + failures.join('\n'));
  }
}

main().catch(function (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
});
