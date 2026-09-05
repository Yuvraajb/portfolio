'use strict';

/**
 * Zero-dependency static file server for local preview of public/.
 * Usage: node scripts/server.js [port]
 */

var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = Number(process.argv[2] || process.env.PORT || 4000);
var PUBLIC_DIR = path.join(__dirname, '..', 'public');

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

var server = http.createServer(function (req, res) {
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
