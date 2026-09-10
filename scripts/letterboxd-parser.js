'use strict';

/**
 * Minimal Letterboxd RSS parser shared by the live /reel/ embed
 * (api/letterboxd.js and the local dev server) and the optional one-off
 * sync-letterboxd.js script. Letterboxd doesn't require an API key --
 * every public profile exposes a diary feed and a watchlist feed:
 *
 *   Diary/journal: https://letterboxd.com/<username>/rss/
 *   Watchlist:      https://letterboxd.com/<username>/watchlist/rss/
 *
 * Both are plain RSS 2.0 with a few Letterboxd-specific namespaced fields
 * (letterboxd:filmTitle, letterboxd:memberRating, etc.). If this ever
 * starts coming back empty, that's the first thing to check (Letterboxd
 * could change the feed format without notice, same caveat as the
 * Goodreads parser), and that the profile is still set to public.
 */

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
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site-letterboxd/1.0)' }
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

/** Fetches both feeds and returns { journal, watchlist }. One feed failing
    doesn't take down the other -- it's just returned empty. Throws only
    if both fail. */
async function fetchLetterboxd(username) {
  var base = 'https://letterboxd.com/' + encodeURIComponent(username) + '/';
  var journal = [];
  var watchlist = [];
  var failures = [];

  try {
    var journalXml = await fetchFeed(base + 'rss/');
    journal = parseItems(journalXml).map(itemToJournalEntry).slice(0, JOURNAL_LIMIT);
  } catch (err) {
    failures.push('journal: ' + err.message);
  }

  try {
    var watchlistXml = await fetchFeed(base + 'watchlist/rss/');
    watchlist = parseItems(watchlistXml).map(itemToWatchlistEntry).slice(0, WATCHLIST_LIMIT);
  } catch (err) {
    failures.push('watchlist: ' + err.message);
  }

  if (journal.length === 0 && watchlist.length === 0 && failures.length) {
    throw new Error(failures.join('; '));
  }

  return { journal: journal, watchlist: watchlist };
}

module.exports = {
  decodeXmlEntities: decodeXmlEntities,
  extractField: extractField,
  extractPlainField: extractPlainField,
  parseItems: parseItems,
  itemToJournalEntry: itemToJournalEntry,
  itemToWatchlistEntry: itemToWatchlistEntry,
  fetchFeed: fetchFeed,
  fetchLetterboxd: fetchLetterboxd
};
