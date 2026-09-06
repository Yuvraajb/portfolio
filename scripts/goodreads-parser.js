'use strict';

/**
 * Minimal Goodreads shelf-RSS parser shared by the live bookshelf embed
 * (api/bookshelf.js and the local dev server) and the optional one-off
 * sync-goodreads.js script. Goodreads retired its public API in 2020,
 * but every public profile still exposes a per-shelf RSS feed at
 * https://www.goodreads.com/review/list_rss/<user_id>?shelf=<shelf_name>
 * -- no API key needed, but Goodreads could change the feed format
 * without notice. If this ever starts coming back empty, check that
 * first, and that the profile/shelves are still set to public.
 */

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

function goodreadsDateToIso(str) {
  if (!str) return '';
  var d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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

/** Fetches all shelves and returns a combined, per-shelf-limited book list.
    A single shelf failing (rate limit, transient error) doesn't take down
    the others -- it's just skipped. Throws only if every shelf fails. */
async function fetchBookshelf(userId) {
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
    } catch (err) {
      failures.push(shelf.goodreads + ': ' + err.message);
    }
  }
  if (allBooks.length === 0 && failures.length) {
    throw new Error(failures.join('; '));
  }
  return allBooks;
}

module.exports = {
  decodeXmlEntities: decodeXmlEntities,
  extractField: extractField,
  parseItems: parseItems,
  itemToBook: itemToBook,
  fetchShelf: fetchShelf,
  fetchBookshelf: fetchBookshelf
};
