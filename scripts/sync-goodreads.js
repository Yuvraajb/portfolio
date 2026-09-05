'use strict';

/**
 * Pulls your public Goodreads shelves via RSS and writes content/bookshelf.json.
 *
 * Goodreads retired its public API in 2020 and hasn't issued new API keys
 * since, but every public profile still exposes a per-shelf RSS feed at
 * https://www.goodreads.com/review/list_rss/<user_id>?shelf=<shelf_name>
 * That's what this script scrapes -- no API key needed, but it also means
 * Goodreads could change the feed format without notice. If this script
 * ever starts coming back empty, that's the first thing to check.
 *
 * Usage:
 *   node scripts/sync-goodreads.js <goodreads_user_id>
 *   GOODREADS_USER_ID=12345678 node scripts/sync-goodreads.js
 *
 * Finding your user ID: open your Goodreads profile, look at the URL --
 * https://www.goodreads.com/user/show/12345678-your-name -- the number
 * right after /show/ is your user ID. Your profile and shelves must be
 * set to public (Settings -> Profile) for the RSS feeds to return data.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var BOOKSHELF_PATH = path.join(ROOT, 'content', 'bookshelf.json');

var SHELVES = [
  { goodreads: 'currently-reading', ours: 'currently-reading', limit: null },
  { goodreads: 'read', ours: 'read', limit: 15 },
  { goodreads: 'to-read', ours: 'want-to-read', limit: 10 }
];

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
  return raw ? decodeXmlEntities(raw.trim()) : '';
}

function firstNonEmpty() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i]) return arguments[i];
  }
  return '';
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

function itemToBook(itemXml, oursStatus) {
  var title = extractField(itemXml, 'title');
  var author = extractField(itemXml, 'author_name');
  var link = extractField(itemXml, 'link');
  var isbn = extractField(itemXml, 'isbn');
  var cover = firstNonEmpty(
    extractField(itemXml, 'book_large_image_url'),
    extractField(itemXml, 'book_medium_image_url'),
    extractField(itemXml, 'book_image_url')
  );
  var ratingRaw = extractField(itemXml, 'user_rating');
  var rating = Number(ratingRaw) || 0;
  var readAt = extractField(itemXml, 'user_read_at');
  var dateAdded = extractField(itemXml, 'user_date_added');

  var book = {
    title: title,
    author: author,
    status: oursStatus,
    cover: cover || 'https://covers.openlibrary.org/b/isbn/' + (isbn || '0') + '-M.jpg',
    link: link,
    isbn: isbn
  };
  if (rating > 0) book.rating = rating;
  if (oursStatus === 'read' && readAt) {
    book.dateFinished = goodreadsDateToIso(readAt);
  }
  book._sortDate = goodreadsDateToIso(readAt) || goodreadsDateToIso(dateAdded) || '';
  return book;
}

function goodreadsDateToIso(str) {
  if (!str) return '';
  var d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

async function fetchShelf(userId, shelfName) {
  var url = 'https://www.goodreads.com/review/list_rss/' + encodeURIComponent(userId) +
    '?shelf=' + encodeURIComponent(shelfName) + '&sort=date_updated';
  var res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site-bookshelf-sync/1.0)' }
  });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' fetching shelf "' + shelfName + '"');
  }
  var xml = await res.text();
  if (!/<rss/i.test(xml)) {
    throw new Error('Response for shelf "' + shelfName + '" was not RSS -- profile may be private or user ID is wrong');
  }
  return xml;
}

async function main() {
  var userId = process.argv[2] || process.env.GOODREADS_USER_ID;
  if (!userId) {
    console.log('No Goodreads user ID given. Skipping sync.');
    console.log('Usage: node scripts/sync-goodreads.js <goodreads_user_id>');
    console.log('   or: GOODREADS_USER_ID=12345678 node scripts/sync-goodreads.js');
    process.exit(0);
  }

  var allBooks = [];
  var failures = [];

  for (var i = 0; i < SHELVES.length; i++) {
    var shelf = SHELVES[i];
    try {
      var xml = await fetchShelf(userId, shelf.goodreads);
      var items = parseItems(xml);
      var books = items.map(function (item) { return itemToBook(item, shelf.ours); });
      books.sort(function (a, b) { return a._sortDate < b._sortDate ? 1 : -1; });
      if (shelf.limit) books = books.slice(0, shelf.limit);
      books.forEach(function (b) { delete b._sortDate; });
      allBooks = allBooks.concat(books);
      console.log('Fetched ' + books.length + ' book(s) from shelf "' + shelf.goodreads + '"');
    } catch (err) {
      failures.push(shelf.goodreads + ': ' + err.message);
      console.error('Failed to fetch shelf "' + shelf.goodreads + '": ' + err.message);
    }
  }

  if (allBooks.length === 0) {
    console.error('No books fetched from any shelf. Leaving content/bookshelf.json untouched.');
    if (failures.length) console.error(failures.join('\n'));
    process.exit(1);
  }

  fs.writeFileSync(BOOKSHELF_PATH, JSON.stringify(allBooks, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + allBooks.length + ' book(s) to ' + path.relative(ROOT, BOOKSHELF_PATH));
  if (failures.length) {
    console.warn('Some shelves failed and were skipped:\n' + failures.join('\n'));
  }
}

main().catch(function (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
});
