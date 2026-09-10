'use strict';

var fs = require('fs');
var path = require('path');
var mdToHtml = require('./markdown.js').mdToHtml;
var parseFrontmatter = require('./frontmatter.js').parseFrontmatter;
var templates = require('./templates.js');

var ROOT = path.join(__dirname, '..');
var CONTENT_DIR = path.join(ROOT, 'content');
var ASSETS_DIR = path.join(ROOT, 'assets');
var OUT_DIR = path.join(ROOT, 'public');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function slugFromFilename(filename) {
  var base = path.basename(filename, '.md');
  // Files are named YYYY-MM-DD-slug.md; strip the date prefix for the URL.
  return base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

function dateFromFilename(filename) {
  var base = path.basename(filename, '.md');
  var m = base.match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}

function loadMarkdownEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(function (f) { return f.endsWith('.md'); })
    .map(function (filename) {
      var raw = fs.readFileSync(path.join(dir, filename), 'utf8');
      var parsed = parseFrontmatter(raw);
      var data = parsed.data;
      var date = data.date || dateFromFilename(filename);
      if (!date) {
        throw new Error('Missing date for ' + filename + ' (set "date:" in frontmatter or prefix the filename with YYYY-MM-DD-)');
      }
      var slug = data.slug || slugFromFilename(filename);
      var html = mdToHtml(parsed.content);
      var tags = Array.isArray(data.tags) ? data.tags : [];
      var excerpt = data.excerpt || plainExcerpt(parsed.content);
      return {
        title: data.title || slug,
        date: date,
        slug: slug,
        tags: tags,
        excerpt: excerpt,
        html: html,
        draft: data.draft === 'true' || data.draft === true
      };
    })
    .filter(function (entry) { return !entry.draft; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
}

function loadExternalPosts() {
  var feedPath = path.join(CONTENT_DIR, 'blog-feed.json');
  if (!fs.existsSync(feedPath)) return [];
  var entries = readJson(feedPath);
  return entries.map(function (e) {
    return {
      title: e.title,
      date: e.date,
      slug: e.slug,
      tags: [],
      excerpt: e.excerpt || '',
      html: e.html || '',
      external: true,
      link: e.link,
      source: e.source || 'elsewhere'
    };
  });
}

function mergePosts(localPosts, externalPosts) {
  var slugs = {};
  localPosts.forEach(function (p) { slugs[p.slug] = true; });
  // Local markdown posts win on a slug collision -- they're the ones you hand-authored.
  var deduped = externalPosts.filter(function (p) { return !slugs[p.slug]; });
  return localPosts.concat(deduped).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
}

function plainExcerpt(markdown) {
  var firstPara = markdown.split(/\n\s*\n/)[0] || '';
  var text = firstPara.replace(/[#>*_`\[\]()!-]/g, '').trim();
  return text.length > 180 ? text.slice(0, 177) + '...' : text;
}

function rimraf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (var entry of fs.readdirSync(src, { withFileTypes: true })) {
    var srcPath = path.join(src, entry.name);
    var destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function writeFile(relPath, contents) {
  var fullPath = path.join(OUT_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, contents, 'utf8');
}

function buildRssFeed(site, posts) {
  var siteUrl = 'https://' + site.domain;
  var items = posts.slice(0, 20).map(function (post) {
    var url = siteUrl + '/blog/' + post.slug + '/';
    var pubDate = new Date(post.date + 'T00:00:00Z').toUTCString();
    return (
      '<item>' +
      '<title>' + xmlEscape(post.title) + '</title>' +
      '<link>' + url + '</link>' +
      '<guid>' + url + '</guid>' +
      '<pubDate>' + pubDate + '</pubDate>' +
      '<description>' + xmlEscape(post.excerpt) + '</description>' +
      '</item>'
    );
  }).join('\n');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"><channel>' +
    '<title>' + xmlEscape(site.name) + '</title>' +
    '<link>' + siteUrl + '/</link>' +
    '<description>' + xmlEscape(site.tagline) + '</description>' +
    items +
    '</channel></rss>\n'
  );
}

function xmlEscape(str) {
  return String(str)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;');
}

function build() {
  var site = readJson(path.join(CONTENT_DIR, 'site.json'));
  var localPosts = loadMarkdownEntries(path.join(CONTENT_DIR, 'posts'));
  var externalPosts = loadExternalPosts();
  var posts = mergePosts(localPosts, externalPosts);

  var projectsPath = path.join(CONTENT_DIR, 'projects.json');
  var projects = fs.existsSync(projectsPath) ? readJson(projectsPath) : [];

  var aboutRaw = fs.readFileSync(path.join(CONTENT_DIR, 'about.md'), 'utf8');
  var aboutParsed = parseFrontmatter(aboutRaw);
  var aboutHtml = mdToHtml(aboutParsed.content);

  var bioHtml = mdToHtml(site.bio);

  rimraf(OUT_DIR);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  writeFile('index.html', templates.renderHome(site, projects, bioHtml));

  writeFile('blog/index.html', templates.renderPostList(site));
  posts.forEach(function (post) {
    writeFile('blog/' + post.slug + '/index.html', templates.renderPost(site, post));
  });

  writeFile('bookshelf/index.html', templates.renderBookshelfPage(site));
  writeFile('projects/index.html', templates.renderProjectsPage(site, projects));
  writeFile('about/index.html', templates.renderAboutPage(site, aboutHtml));
  writeFile('reel/index.html', templates.renderLetterboxdPage(site));
  writeFile('404.html', templates.render404(site));
  writeFile('feed.xml', buildRssFeed(site, posts));

  copyDir(ASSETS_DIR, path.join(OUT_DIR, 'assets'));

  var readmePath = path.join(ROOT, 'README.md');
  if (fs.existsSync(readmePath)) {
    fs.copyFileSync(readmePath, path.join(OUT_DIR, 'README.md'));
  }

  console.log(
    'Built ' + posts.length + ' post(s) (' + localPosts.length + ' local, ' + externalPosts.length + ' synced) -> ' +
    path.relative(ROOT, OUT_DIR) + '/'
  );
}

if (require.main === module) {
  build();
}

module.exports = { build: build };
