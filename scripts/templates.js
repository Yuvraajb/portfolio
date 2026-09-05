'use strict';

var escapeHtml = require('./markdown.js').escapeHtml;

function fmtDate(iso) {
  var d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
}

function icon(name) {
  var icons = {
    github: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
    twitter: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16 3.04c-.59.26-1.22.44-1.88.52.68-.41 1.2-1.05 1.44-1.82-.63.38-1.34.65-2.08.8A3.28 3.28 0 0 0 7.86 5.5c0 .26.03.51.08.75-2.73-.14-5.15-1.44-6.77-3.43a3.28 3.28 0 0 0 1.01 4.37c-.53-.02-1.03-.16-1.47-.4v.04c0 1.6 1.14 2.94 2.65 3.24-.28.08-.57.12-.87.12-.21 0-.42-.02-.62-.06.42 1.31 1.64 2.27 3.09 2.29A6.59 6.59 0 0 1 0 13.85 9.3 9.3 0 0 0 5.03 15.4c6.03 0 9.33-5 9.33-9.33 0-.14 0-.28-.01-.42A6.68 6.68 0 0 0 16 3.04Z"/></svg>',
    book: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A1.5 1.5 0 0 1 3.5 1H8v14H3.5A1.5 1.5 0 0 1 2 13.5v-11Zm14 0v11a1.5 1.5 0 0 1-1.5 1.5H9V1h4.5A1.5 1.5 0 0 1 16 2.5Z"/></svg>',
    rss: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2a1 1 0 0 1 1-1c6.075 0 11 4.925 11 11a1 1 0 1 1-2 0A9 9 0 0 0 3 3a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1 6 6 0 0 1 6 6 1 1 0 1 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1-1-1Zm0 5.5A1.5 1.5 0 1 1 2 15.999 1.5 1.5 0 0 1 2 12.5Z"/></svg>',
    substack: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M1.5 1h13v2.3h-13V1Zm0 4h13v2.3h-13V5Zm0 4.3h13V15L8 11.2 1.5 15V9.3Z"/></svg>'
  };
  return icons[name] || '';
}

/* ---------- Abstract project icons ----------
   Deterministic, dependency-free "app icon" style marks for the
   Projects tiles -- a small generative visual per repo, derived from
   its name so it's stable across rebuilds. Grey-by-default / color-
   on-hover is handled in CSS (a grayscale filter), so the SVGs
   themselves can just be drawn in color. */

var ICON_PALETTE = ['#5b9df9', '#a78bfa', '#dcae5c', '#6bc4a6'];

function hashString(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  var a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var ICON_SHAPES = [
  function orbits(rng, c1, c2) {
    var r1 = (10 + rng() * 6).toFixed(1), r2 = (8 + rng() * 5).toFixed(1);
    var x1 = (15 + rng() * 8).toFixed(1), y1 = (15 + rng() * 8).toFixed(1);
    var x2 = (29 + rng() * 6).toFixed(1), y2 = (28 + rng() * 7).toFixed(1);
    return '<circle cx="' + x1 + '" cy="' + y1 + '" r="' + r1 + '" fill="' + c1 + '"/>' +
      '<circle cx="' + x2 + '" cy="' + y2 + '" r="' + r2 + '" fill="' + c2 + '" opacity="0.85"/>';
  },
  function bars(rng, c1, c2) {
    var out = '';
    var colors = [c1, c2, c1];
    for (var i = 0; i < 3; i++) {
      var x = 6 + i * 13 + rng() * 2;
      var h = 18 + rng() * 14;
      var y = 24 - h / 2 + (rng() - 0.5) * 6;
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="7" height="' + h.toFixed(1) + '" rx="3.5" fill="' + colors[i] + '" transform="rotate(-18 ' + (x + 3.5).toFixed(1) + ' ' + (y + h / 2).toFixed(1) + ')"/>';
    }
    return out;
  },
  function dots(rng, c1, c2) {
    var out = '';
    var n = 3, spacing = 12, offset = 8;
    var hi1 = Math.floor(rng() * 9);
    var hi2 = (hi1 + 4) % 9;
    for (var idx = 0; idx < 9; idx++) {
      var cx = offset + (idx % n) * spacing;
      var cy = offset + Math.floor(idx / n) * spacing;
      var isHi = idx === hi1 || idx === hi2;
      var fill = idx === hi1 ? c1 : (idx === hi2 ? c2 : 'currentColor');
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (isHi ? 3.4 : 2.1) + '" fill="' + fill + '" opacity="' + (isHi ? 1 : 0.3) + '"/>';
    }
    return out;
  },
  function triangles(rng, c1, c2) {
    function tri(cx, cy, size, rot, fill, op) {
      var pts = [[cx, cy - size], [cx - size * 0.87, cy + size * 0.5], [cx + size * 0.87, cy + size * 0.5]];
      var pointsAttr = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
      return '<polygon points="' + pointsAttr + '" fill="' + fill + '" opacity="' + op + '" transform="rotate(' + rot.toFixed(1) + ' ' + cx + ' ' + cy + ')"/>';
    }
    return tri(18, 30, 11, rng() * 30 - 15, c1, 1) + tri(31, 19, 9, rng() * 30 - 15, c2, 0.85);
  },
  function ring(rng, c1, c2) {
    var r = 13 + rng() * 3;
    var dx = (24 + r * 0.7).toFixed(1), dy = (24 - r * 0.4).toFixed(1);
    return '<circle cx="24" cy="24" r="' + r.toFixed(1) + '" fill="none" stroke="' + c1 + '" stroke-width="5"/>' +
      '<circle cx="' + dx + '" cy="' + dy + '" r="4" fill="' + c2 + '"/>';
  },
  function cross(rng, c1, c2) {
    var len = 16 + rng() * 6;
    var a = (24 - len).toFixed(1), b = (24 + len).toFixed(1);
    return '<line x1="' + a + '" y1="24" x2="' + b + '" y2="24" stroke="' + c1 + '" stroke-width="4" stroke-linecap="round" transform="rotate(20 24 24)"/>' +
      '<line x1="24" y1="' + a + '" x2="24" y2="' + b + '" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round" transform="rotate(20 24 24)"/>';
  }
];

function buildAbstractIcon(seedText) {
  var rng = mulberry32(hashString(seedText));
  var i1 = Math.floor(rng() * ICON_PALETTE.length);
  var remaining = ICON_PALETTE.filter(function (_, idx) { return idx !== i1; });
  var c1 = ICON_PALETTE[i1];
  var c2 = remaining[Math.floor(rng() * remaining.length)];
  var shapeFn = ICON_SHAPES[Math.floor(rng() * ICON_SHAPES.length)];
  var inner = shapeFn(rng, c1, c2);
  return '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true" focusable="false">' + inner + '</svg>';
}

function renderNav(site, activeUrl) {
  var items = site.nav.map(function (item) {
    var active = item.url === activeUrl ? ' aria-current="page"' : '';
    return '<li><a href="' + item.url + '"' + active + '>' + escapeHtml(item.label) + '</a></li>';
  }).join('');
  return '<nav class="site-nav"><ul>' + items + '</ul></nav>';
}

function renderSocial(site) {
  var items = site.social.map(function (s) {
    return '<a href="' + s.url + '" class="social-link" title="' + escapeHtml(s.label) + '" rel="me noopener noreferrer">' +
      icon(s.icon) + '<span class="visually-hidden">' + escapeHtml(s.label) + '</span></a>';
  }).join('');
  return '<div class="social-links">' + items + '</div>';
}

function renderHeader(site, activeUrl) {
  return (
    '<header class="site-header h-card">' +
    '<a href="/" class="site-brand">' +
    '<img class="avatar u-photo" src="' + site.avatar + '" alt="' + escapeHtml(site.name) + '" width="56" height="56">' +
    '<span class="site-title p-name">' + escapeHtml(site.name) + '</span>' +
    '</a>' +
    renderNav(site, activeUrl) +
    '</header>'
  );
}

function renderFooter(site) {
  var year = new Date().getFullYear();
  return (
    '<footer class="site-footer">' +
    renderSocial(site) +
    '<p class="footer-note">&copy; ' + year + ' ' + escapeHtml(site.name) + '. ' + escapeHtml(site.footerNote) + '</p>' +
    '<p class="footer-meta"><a href="/feed.xml">RSS feed</a> &middot; <a href="/projects/">Projects</a></p>' +
    '</footer>'
  );
}

function layout(opts) {
  var site = opts.site;
  var title = opts.title ? escapeHtml(opts.title) + ' — ' + escapeHtml(site.name) : escapeHtml(site.name);
  var description = escapeHtml(opts.description || site.bioShort);
  var canonicalTag = opts.canonicalUrl ? '<link rel="canonical" href="' + escapeHtml(opts.canonicalUrl) + '">\n' : '';
  return (
    '<!doctype html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + title + '</title>\n' +
    '<meta name="description" content="' + description + '">\n' +
    canonicalTag +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">\n' +
    '<link rel="stylesheet" href="/assets/css/style.css">\n' +
    '<link rel="alternate" type="application/rss+xml" title="' + escapeHtml(site.name) + '" href="/feed.xml">\n' +
    '<link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">\n' +
    '<meta name="theme-color" content="#0b0b0c">\n' +
    '<meta property="og:title" content="' + title + '">\n' +
    '<meta property="og:description" content="' + description + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta name="twitter:card" content="summary">\n' +
    '</head>\n' +
    '<body class="' + (opts.bodyClass || '') + '">\n' +
    '<div class="grid-motif" aria-hidden="true"></div>\n' +
    '<div class="page-wrap">\n' +
    renderHeader(site, opts.activeUrl || '') +
    '<main class="site-main">\n' +
    opts.content +
    '\n</main>\n' +
    renderFooter(site) +
    '</div>\n' +
    '</body>\n' +
    '</html>\n'
  );
}

function renderStreamItem(entry) {
  var sourceBadge = entry.external ? '<span class="source-badge">via ' + escapeHtml(entry.source) + '</span>' : '';
  var titleHtml = '<h3 class="stream-title"><a href="' + entry.url + '">' + escapeHtml(entry.title) + '</a></h3>' +
    (entry.excerpt ? '<p class="stream-excerpt">' + escapeHtml(entry.excerpt) + '</p>' : '');
  return (
    '<article class="stream-item stream-item--post">' +
    '<div class="stream-meta"><span class="stream-kind">Post</span> ' +
    '<time datetime="' + entry.date + '">' + fmtDate(entry.date) + '</time>' + sourceBadge + '</div>' +
    titleHtml +
    '</article>'
  );
}

var COVER_SHADOW_COLORS = ['purple', 'pink', 'teal', 'orange', 'yellow', 'green'];

function renderBookshelfWidget(bookshelf, limit) {
  var reading = bookshelf.filter(function (b) { return b.status === 'currently-reading'; });
  var list = (reading.length ? reading : bookshelf).slice(0, limit || 4);
  var items = list.map(function (b) {
    return (
      '<li class="bookshelf-item">' +
      '<img class="bookshelf-cover" src="' + b.cover + '" alt="Cover of ' + escapeHtml(b.title) + '" width="44" height="66" loading="lazy">' +
      '<span class="bookshelf-info"><strong>' + escapeHtml(b.title) + '</strong><span class="bookshelf-author">' + escapeHtml(b.author) + '</span></span>' +
      '</li>'
    );
  }).join('');
  return (
    '<aside class="widget bookshelf-widget">' +
    '<h2 class="widget-title"><a href="/bookshelf/">Bookshelf</a></h2>' +
    '<ul class="bookshelf-list">' + items + '</ul>' +
    '<p class="widget-footer"><a href="/bookshelf/">See the full shelf &rarr;</a></p>' +
    '</aside>'
  );
}

function renderGithubRepoItem(repo, compact, featured) {
  var meta = [];
  if (repo.language) meta.push(repo.language);
  meta.push(repo.action + ' ' + fmtDate(repo.pushedAt));
  var classes = 'github-repo' + (featured ? ' github-repo--featured' : '');
  return (
    '<li class="' + classes + '">' +
    '<a class="github-repo-name" href="' + repo.url + '" rel="noopener noreferrer">' +
    '<span class="github-repo-icon">' + buildAbstractIcon(repo.name) + '</span>' +
    escapeHtml(repo.name) +
    '</a>' +
    (!compact && repo.description ? '<p class="github-repo-desc">' + escapeHtml(repo.description) + '</p>' : '') +
    '<div class="github-repo-meta">' + meta.map(escapeHtml).join(' &middot; ') + '</div>' +
    '</li>'
  );
}

function renderGithubWidget(githubActivity) {
  if (!githubActivity || !githubActivity.repos || !githubActivity.repos.length) return '';
  var items = githubActivity.repos.slice(0, 4).map(function (r) { return renderGithubRepoItem(r, true); }).join('');
  return (
    '<aside class="widget github-widget">' +
    '<h2 class="widget-title"><a href="/projects/">Projects</a></h2>' +
    '<ul class="github-repo-list">' + items + '</ul>' +
    '<p class="widget-footer"><a href="/projects/">See all activity &rarr;</a></p>' +
    '</aside>'
  );
}

function renderProjectTile(repo, featured) {
  var meta = [];
  if (repo.language) meta.push(repo.language);
  meta.push(repo.action + ' ' + fmtDate(repo.pushedAt));
  var classes = 'project-tile' + (featured ? ' project-tile--featured' : '');
  return (
    '<li class="' + classes + '">' +
    '<a class="project-tile-link" href="' + repo.url + '" rel="noopener noreferrer">' +
    '<span class="project-tile-icon">' + buildAbstractIcon(repo.name) + '</span>' +
    '<span class="project-tile-body">' +
    '<span class="project-tile-name">' + escapeHtml(repo.name) + '</span>' +
    (repo.description ? '<span class="project-tile-desc">' + escapeHtml(repo.description) + '</span>' : '') +
    '<span class="project-tile-meta">' + meta.map(escapeHtml).join(' &middot; ') + '</span>' +
    '</span>' +
    '</a>' +
    '</li>'
  );
}

function renderGithubPage(site, githubActivity) {
  var items = githubActivity.repos.map(function (r, i) { return renderProjectTile(r, i === 0); }).join('');
  var content = (
    '<h1 class="page-title">Projects</h1>' +
    '<p class="page-lede">' +
    'Recently pushed public repos, synced from <a href="' + githubActivity.profileUrl + '" rel="noopener noreferrer">github.com/' + escapeHtml(githubActivity.username) + '</a> — ' +
    escapeHtml(String(githubActivity.publicRepos)) + ' public repos, ' + escapeHtml(String(githubActivity.followers)) + ' followers. ' +
    'Last synced ' + fmtDate(githubActivity.updatedAt) + '.' +
    '</p>' +
    '<ul class="project-tiles">' + items + '</ul>' +
    '<p class="view-all-wrap"><a class="view-all-btn" href="https://github.com/Yuvraajb?tab=repositories" rel="noopener noreferrer">View all repos &rarr;</a></p>'
  );
  return layout({ site: site, title: 'Projects', activeUrl: '/projects/', content: content, bodyClass: 'page-projects' });
}

function renderHome(site, streamEntries, bookshelf, githubActivity, bioHtml) {
  var stream = streamEntries.map(renderStreamItem).join('\n');
  var content = (
    '<section class="intro p-note">' +
    bioHtml +
    '</section>' +
    '<div class="home-grid">' +
    '<section class="stream">' + stream + '</section>' +
    '<div class="sidebar">' +
    renderGithubWidget(githubActivity) +
    renderBookshelfWidget(bookshelf, 4) +
    '</div>' +
    '</div>'
  );
  return layout({ site: site, title: '', description: site.bioShort, activeUrl: '', content: content, bodyClass: 'page-home' });
}

function renderPostList(site, posts) {
  var items = posts.map(renderStreamItem).join('\n');
  var content = '<h1 class="page-title">Blog</h1><p class="page-lede">Long-form posts. Also available as an <a href="/feed.xml">RSS feed</a>.</p><section class="stream">' + items + '</section>';
  return layout({ site: site, title: 'Blog', activeUrl: '/blog/', content: content, bodyClass: 'page-blog' });
}

function renderPost(site, post) {
  var originCallout = post.external
    ? '<p class="origin-callout">Originally published on <a href="' + post.link + '" rel="noopener noreferrer">' + escapeHtml(post.source) + ' &#8599;</a></p>'
    : '';
  var content = (
    '<article class="h-entry post">' +
    '<h1 class="p-name post-title">' + escapeHtml(post.title) + '</h1>' +
    '<div class="post-meta"><time class="dt-published" datetime="' + post.date + '">' + fmtDate(post.date) + '</time>' +
    (post.tags && post.tags.length ? ' &middot; ' + post.tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join(' ') : '') +
    '</div>' +
    originCallout +
    '<div class="e-content post-body">' + post.html + '</div>' +
    '</article>' +
    '<p class="post-nav"><a href="/blog/">&larr; Back to all posts</a></p>'
  );
  return layout({
    site: site,
    title: post.title,
    description: post.excerpt,
    activeUrl: '/blog/',
    content: content,
    canonicalUrl: post.external ? post.link : null,
    bodyClass: 'page-post'
  });
}

function renderBookshelfPage(site, bookshelf) {
  var groups = [
    { key: 'currently-reading', label: 'Currently Reading' },
    { key: 'read', label: 'Finished' },
    { key: 'want-to-read', label: 'Want to Read' }
  ];
  var sections = groups.map(function (g) {
    var books = bookshelf.filter(function (b) { return b.status === g.key; });
    if (!books.length) return '';
    var items = books.map(function (b, i) {
      var stars = b.rating ? '<span class="stars" aria-label="' + b.rating + ' out of 5 stars">' + '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) + '</span>' : '';
      var color = COVER_SHADOW_COLORS[i % COVER_SHADOW_COLORS.length];
      return (
        '<li class="cover-card cover-card--' + color + '">' +
        '<a href="' + (b.link || '#') + '" rel="noopener noreferrer">' +
        '<img class="cover-img" src="' + b.cover + '" alt="Cover of ' + escapeHtml(b.title) + '" width="140" height="210" loading="lazy">' +
        '</a>' +
        '<div class="cover-caption">' +
        '<strong>' + escapeHtml(b.title) + '</strong>' +
        '<span class="bookshelf-author">' + escapeHtml(b.author) + '</span>' +
        (stars ? stars : '') +
        (b.dateFinished ? '<span class="bookshelf-date">Finished ' + fmtDate(b.dateFinished) + '</span>' : '') +
        '</div>' +
        '</li>'
      );
    }).join('');
    return '<h2 class="shelf-heading">' + g.label + '</h2><ul class="cover-grid">' + items + '</ul>';
  }).join('\n');

  var content = (
    '<h1 class="page-title">Bookshelf</h1>' +
    '<p class="page-lede">What I’m reading, have read, and want to get to.</p>' +
    sections
  );
  return layout({ site: site, title: 'Bookshelf', activeUrl: '/bookshelf/', content: content, bodyClass: 'page-bookshelf' });
}

function renderAboutPage(site, bodyHtml) {
  var handle = (site.shortName || site.name).toLowerCase().replace(/\s+/g, '');
  var content = (
    '<div class="terminal">' +
    '<div class="terminal-titlebar">' +
    '<span class="terminal-dot terminal-dot--red"></span>' +
    '<span class="terminal-dot terminal-dot--yellow"></span>' +
    '<span class="terminal-dot terminal-dot--green"></span>' +
    '<span class="terminal-path">' + escapeHtml(handle) + '@site:~$ cat about.md</span>' +
    '</div>' +
    '<div class="terminal-body">' +
    '<h1 class="terminal-h1">About<span class="terminal-cursor" aria-hidden="true"></span></h1>' +
    '<div class="page-body">' + bodyHtml + '</div>' +
    '</div>' +
    '</div>'
  );
  return layout({ site: site, title: 'About', activeUrl: '/about/', content: content, bodyClass: 'page-about' });
}

function render404(site) {
  var content = '<h1 class="page-title">404</h1><p>There’s nothing here. <a href="/">Go home</a>.</p>';
  return layout({ site: site, title: 'Not Found', content: content });
}

module.exports = {
  layout: layout,
  renderHome: renderHome,
  renderPostList: renderPostList,
  renderPost: renderPost,
  renderBookshelfPage: renderBookshelfPage,
  renderGithubPage: renderGithubPage,
  renderAboutPage: renderAboutPage,
  render404: render404,
  fmtDate: fmtDate
};
