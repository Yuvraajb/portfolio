'use strict';

/**
 * Zero-dependency static file server for local preview of public/.
 * Also serves /api/substack-feed, /api/bookshelf, and /api/letterboxd so
 * the blog, bookshelf, and hidden reel pages' live embeds work the same
 * way locally as they do on Vercel (see api/substack-feed.js,
 * api/bookshelf.js, api/letterboxd.js).
 * Usage: node scripts/server.js [port]
 */

var http = require('http');
var fs = require('fs');
var path = require('path');
var feedParser = require('./feed-parser.js');
var goodreadsParser = require('./goodreads-parser.js');
var letterboxdParser = require('./letterboxd-parser.js');

var PORT = Number(process.argv[2] || process.env.PORT || 4000);
var ROOT = path.join(__dirname, '..');
var PUBLIC_DIR = path.join(ROOT, 'public');

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

function safeJoin(base, requestPath) {
  var decoded = decodeURIComponent(requestPath.split('?')[0]);
  var normalized = path.normalize(decoded).replace(/^(\.\.[\/\\])+/, '');
  return path.join(base, normalized);
}

function readSiteJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8'));
}

function handleSubstackFeed(req, res) {
  var site;
  try {
    site = readSiteJson();
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Could not read content/site.json' }));
    return;
  }
  var feedUrl = site.externalBlog && site.externalBlog.feedUrl;
  var provider = (site.externalBlog && site.externalBlog.provider) || 'Substack';
  if (!feedUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'No externalBlog.feedUrl configured in content/site.json' }));
    return;
  }

  feedParser.fetchFeed(feedUrl).then(function (posts) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, provider: provider, posts: posts }));
  }).catch(function (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });
}

function handleBookshelf(req, res) {
  var site;
  try {
    site = readSiteJson();
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Could not read content/site.json' }));
    return;
  }
  var userId = site.goodreads && site.goodreads.userId;
  if (!userId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'No goodreads.userId configured in content/site.json' }));
    return;
  }

  goodreadsParser.fetchBookshelf(userId).then(function (books) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, books: books }));
  }).catch(function (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });
}

function handleLetterboxd(req, res) {
  var site;
  try {
    site = readSiteJson();
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Could not read content/site.json' }));
    return;
  }
  var username = site.letterboxd && site.letterboxd.username;
  if (!username) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'No letterboxd.username configured in content/site.json' }));
    return;
  }

  letterboxdParser.fetchLetterboxd(username).then(function (data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, journal: data.journal, watchlist: data.watchlist }));
  }).catch(function (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });
}

var server = http.createServer(function (req, res) {
  var routePath = req.url.split('?')[0];
  if (req.method === 'GET' && routePath === '/api/substack-feed') {
    handleSubstackFeed(req, res);
    return;
  }
  if (req.method === 'GET' && routePath === '/api/bookshelf') {
    handleBookshelf(req, res);
    return;
  }
  if (req.method === 'GET' && routePath === '/api/letterboxd') {
    handleLetterboxd(req, res);
    return;
  }

  if (!fs.existsSync(PUBLIC_DIR)) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('public/ does not exist yet. Run "node scripts/build.js" first.');
    return;
  }

  var requestedPath = req.url === '/' ? '/index.html' : req.url;
  var filePath = safeJoin(PUBLIC_DIR, requestedPath);

  fs.stat(filePath, function (err, stats) {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, function (readErr, data) {
      if (readErr) {
        var notFoundPath = path.join(PUBLIC_DIR, '404.html');
        fs.readFile(notFoundPath, function (nfErr, nfData) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(nfErr ? 'Not found' : nfData);
        });
        return;
      }

      var ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(PORT, function () {
  console.log('Serving ' + PUBLIC_DIR + ' at http://localhost:' + PORT + '/');
});
