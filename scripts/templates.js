'use strict';

var escapeHtml = require('./markdown.js').escapeHtml;

/* No project screenshots/logos exist yet, so the light-mode tile (see
   style.css) gets a small abstract composition instead of a wordmark --
   three fixed variants, rotated by index, built from the site's own
   palette so they read as one system rather than random clip art. */
var ABSTRACT_ART_VARIANTS = [
  '<circle cx="40" cy="45" r="30" fill="var(--purple)" opacity="0.85"/>' +
  '<polygon points="85,20 115,80 55,80" fill="var(--teal)" opacity="0.85"/>' +
  '<rect x="55" y="60" width="35" height="35" rx="8" fill="var(--pink)" opacity="0.85" transform="rotate(12 72 77)"/>',

  '<ellipse cx="55" cy="60" rx="45" ry="30" fill="var(--pink)" opacity="0.85" transform="rotate(-15 55 60)"/>' +
  '<circle cx="85" cy="35" r="22" fill="var(--yellow)" opacity="0.9"/>' +
  '<circle cx="30" cy="85" r="18" fill="var(--purple)" opacity="0.85"/>',

  '<rect x="15" y="20" width="30" height="80" rx="10" fill="var(--teal)" opacity="0.85"/>' +
  '<rect x="55" y="45" width="30" height="55" rx="10" fill="var(--orange)" opacity="0.85"/>' +
  '<circle cx="90" cy="30" r="20" fill="var(--green)" opacity="0.9"/>'
];

function renderAbstractArt(index) {
  var shapes = ABSTRACT_ART_VARIANTS[index % ABSTRACT_ART_VARIANTS.length];
  return '<svg class="github-repo-art" viewBox="0 0 120 120" aria-hidden="true">' + shapes + '</svg>';
}

function fmtDate(iso) {
  var d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
}

/* Runs synchronously in <head>, before first paint, so there's no
   flash of the wrong theme. Reads a saved preference (or falls back
   to dark, the site's default) and stamps it on <html> immediately. Once the
   Shoelace <sl-switch> (loaded async as a module, see layout() head)
   has upgraded and the DOM is ready, its checked state is synced and
   its "sl-change" event drives the theme, with a quick opacity fade
   so the switch doesn't look instantaneous/jarring. Setting .checked
   pre-upgrade is safe -- Lit-based elements (which Shoelace is built
   on) capture instance properties set before upgrade and re-apply
   them once defined. */
var THEME_BOOTSTRAP_JS = (
  '(function(){' +
  'var root=document.documentElement;' +
  'var saved=null;try{saved=localStorage.getItem("theme");}catch(e){}' +
  'var initial=saved||"dark";' +
  'root.setAttribute("data-theme",initial);' +
  'function apply(t){' +
  'root.setAttribute("data-theme",t);' +
  'try{localStorage.setItem("theme",t);}catch(e){}' +
  '}' +
  'document.addEventListener("DOMContentLoaded",function(){' +
  'var sw=document.getElementById("theme-toggle");' +
  'if(!sw)return;' +
  'sw.checked=root.getAttribute("data-theme")==="light";' +
  'sw.addEventListener("sl-change",function(){' +
  'var next=sw.checked?"light":"dark";' +
  'var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;' +
  'if(reduce){apply(next);return;}' +
  'document.body.style.transition="opacity 140ms ease";' +
  'document.body.style.opacity="0.35";' +
  'setTimeout(function(){' +
  'apply(next);' +
  'requestAnimationFrame(function(){document.body.style.opacity="1";});' +
  '},140);' +
  '});' +
  '});' +
  'window.__cachedFetch=function(key,url,render){' +
  'var cached=null;' +
  'try{var raw=sessionStorage.getItem(key);if(raw)cached=JSON.parse(raw);}catch(e){}' +
  'if(cached){render(cached);return;}' +
  'fetch(url).then(function(r){return r.json();}).then(function(data){' +
  'if(data&&data.ok){try{sessionStorage.setItem(key,JSON.stringify(data));}catch(e){}}' +
  'render(data);' +
  '}).catch(function(){render(null);});' +
  '};' +
  '})();'
);

/* Site-wide cursor trail: an ASCII glyph trail in dark mode, a glowing
   RGB line in light mode -- switches live off document.documentElement's
   data-theme attribute every frame, no separate listener needed.
   Reimplemented from scratch as plain canvas code (no React/Framer
   runtime, which this zero-dependency static site doesn't have) --
   inspired by two Framer marketplace components (Ascii FlowTrail,
   RGB string mouse trail) rather than importing them directly, since
   both are React components built against Framer's own "framer"
   package and can't run outside Framer's site runtime. Skipped
   entirely for reduced-motion or coarse (touch) pointers. */
var CURSOR_TRAIL_JS = (
  '(function(){' +
  'if(window.matchMedia&&(matchMedia("(prefers-reduced-motion: reduce)").matches||matchMedia("(pointer: coarse)").matches))return;' +
  'var canvas=document.createElement("canvas");' +
  'canvas.style.position="fixed";' +
  'canvas.style.inset="0";' +
  'canvas.style.width="100vw";' +
  'canvas.style.height="100vh";' +
  'canvas.style.pointerEvents="none";' +
  'canvas.style.zIndex="9999";' +
  'document.body.appendChild(canvas);' +
  'var ctx=canvas.getContext("2d");' +
  'function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}' +
  'resize();' +
  'addEventListener("resize",resize);' +
  'var mouse={x:innerWidth/2,y:innerHeight/2,active:false};' +
  'var scribbleMoving=false;' +
  'var scribbleIdleTimer=null;' +
  'addEventListener("mousemove",function(e){' +
  'mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;' +
  'scribbleMoving=true;' +
  'if(scribbleIdleTimer)clearTimeout(scribbleIdleTimer);' +
  'scribbleIdleTimer=setTimeout(function(){scribbleMoving=false;},100);' +
  '});' +
  'var ramp="@%#*+=-:. ";' +
  'var asciiTrail=[];' +
  'var lastAsciiPoint=null;' +
  'var scribbleTrail=[];' +
  'function isDark(){return document.documentElement.getAttribute("data-theme")!=="light";}' +
  'function drawAscii(){' +
  'if(mouse.active&&(!lastAsciiPoint||Math.hypot(mouse.x-lastAsciiPoint.x,mouse.y-lastAsciiPoint.y)>10)){' +
  'asciiTrail.push({x:mouse.x,y:mouse.y,age:0});' +
  'lastAsciiPoint={x:mouse.x,y:mouse.y};' +
  '}' +
  'var maxAge=26;' +
  'ctx.font="13px "+(getComputedStyle(document.body).getPropertyValue("--font-mono")||"monospace");' +
  'ctx.textAlign="center";' +
  'ctx.textBaseline="middle";' +
  'asciiTrail.forEach(function(p){' +
  'var t=p.age/maxAge;' +
  'var idx=Math.min(ramp.length-1,Math.floor(t*ramp.length));' +
  'ctx.fillStyle="rgba(91,157,249,"+(1-t)*0.85+")";' +
  'ctx.fillText(ramp.charAt(idx),p.x,p.y);' +
  'p.age++;' +
  '});' +
  'asciiTrail=asciiTrail.filter(function(p){return p.age<maxAge;});' +
  '}' +
  /* Hand-drawn "scribble" trail -- vanilla port of the physics in
     https://framer.com/m/ScribbleTrailCursor-PxeYCm.js (spring-follow
     points with random jitter, drawn as overlapping quadratic curves).
     Same defaults as that component: 4 points, tension 0.3, friction
     0.5, jitter 50px, blue stroke. */
  'var SCRIB_POINTS=4,SCRIB_TENSION=0.3,SCRIB_FRICTION=0.5,SCRIB_JITTER=50;' +
  'function drawScribble(){' +
  'if(!scribbleMoving||!mouse.active){scribbleTrail=[];return;}' +
  'if(scribbleTrail.length===0){' +
  'for(var i=0;i<SCRIB_POINTS;i++)scribbleTrail.push({x:mouse.x,y:mouse.y,dx:0,dy:0});' +
  '}' +
  'var trail=scribbleTrail;' +
  'trail.forEach(function(p,i){' +
  'var target=i===0?mouse:trail[i-1];' +
  'p.dx+=SCRIB_TENSION*(target.x-p.x)+2*Math.random();' +
  'p.dy+=SCRIB_TENSION*(target.y-p.y)+2*Math.random();' +
  'p.dx*=SCRIB_FRICTION;p.dy*=SCRIB_FRICTION;' +
  'p.x+=p.dx;p.y+=p.dy;' +
  '});' +
  'ctx.strokeStyle="#3DA8FF";' +
  'ctx.lineWidth=2;' +
  'ctx.lineCap="round";' +
  'ctx.lineJoin="round";' +
  'ctx.beginPath();' +
  'ctx.moveTo(trail[0].x+Math.random()*2,trail[0].y+Math.random()*2);' +
  'for(var i=0;i<trail.length-1;i++){' +
  'var mx=0.5*(trail[i].x+trail[i+1].x+Math.random()*2);' +
  'var my=0.5*(trail[i].y+trail[i+1].y+Math.random()*2);' +
  'ctx.quadraticCurveTo(trail[i].x+Math.random()*SCRIB_JITTER-SCRIB_JITTER/2,trail[i].y+Math.random()*SCRIB_JITTER-SCRIB_JITTER/2,mx,my);' +
  'ctx.stroke();' +
  '}' +
  'ctx.lineTo(trail[trail.length-1].x,trail[trail.length-1].y);' +
  'ctx.stroke();' +
  '}' +
  'function frame(){' +
  'ctx.clearRect(0,0,canvas.width,canvas.height);' +
  'if(isDark()){drawAscii();}else{drawScribble();}' +
  'requestAnimationFrame(frame);' +
  '}' +
  'requestAnimationFrame(frame);' +
  '})();'
);

/* A small easter egg leading to a hidden page (/reel/, not linked from
   nav or footer) with a Letterboxd journal + watchlist. Two ways in,
   sharing one reveal():
   - Five taps/clicks on the footer's copyright line (#footer-secret)
     within ~1.2s of each other -- works identically via mouse click or
     touch tap, so it's the one that actually works on a phone. Each
     tap pulses the line (.egg-tapped, see style.css) as tactile
     feedback once you've started, with zero visual hint beforehand.
   - The Konami code (keyboard), kept as a bonus for desktop users --
     inert on touch-only devices since there's no keydown there, not
     broken, just unavailable, same as the physical keyboard it needs.
   The wipe itself is a plain CSS clip-path transition on a fixed
   overlay -- no experimental cross-document View Transitions API
   needed, and it doubles as a nod to an actual film transition (an
   iris wipe) given the subject. z-index is set above CURSOR_TRAIL_JS's
   canvas (also 9999, appended later in the DOM) so the wipe isn't
   drawn over mid-transition. Logged to the console as the only
   explicit hint, for anyone poking around devtools. */
var EASTER_EGG_JS = (
  '(function(){' +
  'function reveal(){' +
  'var overlay=document.getElementById("egg-wipe");' +
  'var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;' +
  'if(overlay&&!reduce){' +
  'var r=Math.hypot(innerWidth,innerHeight);' +
  'overlay.style.clipPath="circle("+r+"px at 50% 50%)";' +
  'setTimeout(function(){location.href="/reel/";},550);' +
  '}else{' +
  'location.href="/reel/";' +
  '}' +
  '}' +
  'console.log("%cThere\'s a hidden reel of what I\'ve been watching somewhere on this site. Five taps in the right place will get you there.","color:#5b9df9;font-family:monospace;font-size:12px;");' +
  'var seq=["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];' +
  'var pos=0;' +
  'document.addEventListener("keydown",function(e){' +
  'var key=e.key.length===1?e.key.toLowerCase():e.key;' +
  'if(key===seq[pos]){pos++;if(pos===seq.length){pos=0;reveal();}}' +
  'else{pos=(key===seq[0])?1:0;}' +
  '});' +
  'document.addEventListener("DOMContentLoaded",function(){' +
  'var spot=document.getElementById("footer-secret");' +
  'if(!spot)return;' +
  'var taps=0,lastTap=0;' +
  'spot.addEventListener("click",function(){' +
  'var now=Date.now();' +
  'if(now-lastTap>1200)taps=0;' +
  'lastTap=now;' +
  'taps++;' +
  'spot.classList.remove("egg-tapped");' +
  'void spot.offsetWidth;' +
  'spot.classList.add("egg-tapped");' +
  'if(taps>=5){taps=0;reveal();}' +
  '});' +
  '});' +
  '})();'
);

/* Shared by every live-embed page script below: checks sessionStorage
   for a cached API response before hitting the network, and caches a
   successful response for reuse. Scoped to the browser tab/session --
   navigating between pages (home <-> bookshelf, say) reuses the same
   fetch instead of re-hitting Goodreads/Substack on every visit;
   closing the tab clears it, a plain refresh does not. See
   window.__cachedFetch in THEME_BOOTSTRAP_JS above. */

function icon(name) {
  var icons = {
    github: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
    linkedin: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M14.82 0H1.18C.53 0 0 .52 0 1.16v13.68C0 15.48.53 16 1.18 16h13.64c.65 0 1.18-.52 1.18-1.16V1.16C16 .52 15.47 0 14.82 0ZM4.75 13.65H2.4V6.14h2.36v7.51ZM3.58 5.1c-.76 0-1.37-.61-1.37-1.37 0-.75.61-1.37 1.37-1.37.75 0 1.37.62 1.37 1.37 0 .76-.62 1.37-1.37 1.37Zm10.07 8.55h-2.35V10c0-.87-.02-1.99-1.21-1.99-1.22 0-1.4.95-1.4 1.93v3.71H6.34V6.14h2.26v1.03h.03c.31-.6 1.09-1.23 2.24-1.23 2.4 0 2.84 1.58 2.84 3.63v4.08Z"/></svg>',
    book: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A1.5 1.5 0 0 1 3.5 1H8v14H3.5A1.5 1.5 0 0 1 2 13.5v-11Zm14 0v11a1.5 1.5 0 0 1-1.5 1.5H9V1h4.5A1.5 1.5 0 0 1 16 2.5Z"/></svg>',
    rss: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2a1 1 0 0 1 1-1c6.075 0 11 4.925 11 11a1 1 0 1 1-2 0A9 9 0 0 0 3 3a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1 6 6 0 0 1 6 6 1 1 0 1 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1-1-1Zm0 5.5A1.5 1.5 0 1 1 2 15.999 1.5 1.5 0 0 1 2 12.5Z"/></svg>',
    substack: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M1.5 1h13v2.3h-13V1Zm0 4h13v2.3h-13V5Zm0 4.3h13V15L8 11.2 1.5 15V9.3Z"/></svg>'
  };
  return icons[name] || '';
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
    return '<a href="' + s.url + '" class="social-link" title="' + escapeHtml(s.label) + '" target="_blank" rel="me noopener noreferrer">' +
      icon(s.icon) + '<span class="visually-hidden">' + escapeHtml(s.label) + '</span></a>';
  }).join('');
  return '<div class="social-links">' + items + '</div>';
}

function renderThemeToggle() {
  return '<sl-switch id="theme-toggle" class="theme-toggle" aria-label="Switch color theme"></sl-switch>';
}

/* Cute peeking-face SVG (blink/look-around loop is pure CSS keyframes,
   no JS) -- adapted from https://uiverse.io/preet_7613/new-cougar-63,
   scaled down and recolored. Doubles as the site's home link/logo, in
   the navbar's top-left where the avatar+name used to sit (that pair
   now lives as a static, non-interactive block on the homepage --
   see renderHome). */
function renderNavFace() {
  return (
    '<a href="/" class="nav-face" aria-label="Home">' +
    '<svg class="nav-face-svg" viewBox="0 0 320 380" aria-hidden="true">' +
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="25">' +
    '<g class="nav-face__eyes" transform="translate(0,112.5)">' +
    '<g transform="translate(15,0)">' +
    '<polyline class="nav-face__eye-lid" points="37,0 0,120 75,120"></polyline>' +
    '<polyline class="nav-face__pupil" points="55,120 55,155" stroke-dasharray="35 35"></polyline>' +
    '</g>' +
    '<g transform="translate(230,0)">' +
    '<polyline class="nav-face__eye-lid" points="37,0 0,120 75,120"></polyline>' +
    '<polyline class="nav-face__pupil" points="55,120 55,155" stroke-dasharray="35 35"></polyline>' +
    '</g>' +
    '</g>' +
    '<rect class="nav-face__nose" x="132.5" y="112.5" width="55" height="155" rx="4" ry="4"></rect>' +
    '<g transform="translate(65,334)" stroke-dasharray="102 102">' +
    '<path class="nav-face__mouth-left" d="M 0 30 C 0 30 40 0 95 0"></path>' +
    '<path class="nav-face__mouth-right" d="M 95 0 C 150 0 190 30 190 30"></path>' +
    '</g>' +
    '</g>' +
    '</svg>' +
    '</a>'
  );
}

function renderHeader(site, activeUrl) {
  return (
    '<header class="site-header">' +
    renderNavFace() +
    '<div class="site-header-right">' +
    renderNav(site, activeUrl) +
    renderThemeToggle() +
    '</div>' +
    '</header>'
  );
}

function renderFooter(site) {
  var year = new Date().getFullYear();
  return (
    '<footer class="site-footer">' +
    renderSocial(site) +
    '<p class="footer-note" id="footer-secret">&copy; ' + year + ' ' + escapeHtml(site.name) + '</p>' +
    '</footer>'
  );
}

function layout(opts) {
  var site = opts.site;
  var title = opts.title ? escapeHtml(opts.title) + ' — ' + escapeHtml(site.name) : escapeHtml(site.name);
  var description = escapeHtml(opts.description || site.bioShort);
  var canonicalTag = opts.canonicalUrl ? '<link rel="canonical" href="' + escapeHtml(opts.canonicalUrl) + '">\n' : '';
  var robotsTag = opts.robotsNoindex ? '<meta name="robots" content="noindex, nofollow">\n' : '';
  return (
    '<!doctype html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + title + '</title>\n' +
    '<meta name="description" content="' + description + '">\n' +
    canonicalTag +
    robotsTag +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@500;600;700&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap">\n' +
    '<link rel="stylesheet" href="/assets/css/style.css">\n' +
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2/cdn/themes/light.css">\n' +
    '<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2/cdn/components/switch/switch.js">\n' +
    '<script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2/cdn/components/switch/switch.js"></script>\n' +
    '<link rel="alternate" type="application/rss+xml" title="' + escapeHtml(site.name) + '" href="/feed.xml">\n' +
    '<link rel="icon" href="/assets/images/favicon/icons8-obsidian-block-windows-11-color-32.png" sizes="32x32" type="image/png">\n' +
    '<link rel="icon" href="/assets/images/favicon/icons8-obsidian-block-windows-11-color-16.png" sizes="16x16" type="image/png">\n' +
    '<link rel="apple-touch-icon" href="/assets/images/favicon/icons8-obsidian-block-windows-11-color-96.png">\n' +
    '<meta name="theme-color" content="#0b0b0c">\n' +
    '<meta property="og:title" content="' + title + '">\n' +
    '<meta property="og:description" content="' + description + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta name="twitter:card" content="summary">\n' +
    '<script>' + THEME_BOOTSTRAP_JS + '</script>\n' +
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
    '<div id="egg-wipe" class="egg-wipe" aria-hidden="true"></div>\n' +
    '<script>' + CURSOR_TRAIL_JS + '</script>\n' +
    '<script>' + EASTER_EGG_JS + '</script>\n' +
    '</body>\n' +
    '</html>\n'
  );
}

/* Fetches the Goodreads shelves client-side, live, on every page load --
   same pattern as renderSubstackEmbed below: a same-origin API route
   (api/bookshelf.js in production, the matching handler in
   scripts/server.js for local dev) proxies Goodreads server-side. */
function renderBookshelfWidget() {
  return (
    '<aside class="widget bookshelf-widget" id="bookshelf-widget">' +
    '<h2 class="widget-title"><a href="/bookshelf/">Bookshelf</a></h2>' +
    '<ul class="bookshelf-list" id="bookshelf-widget-list"><li class="feed-status">Loading&hellip;</li></ul>' +
    '<p class="widget-footer"><a href="/bookshelf/">See the full shelf &rarr;</a></p>' +
    '</aside>' +
    '<script>(function(){' +
    'function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' +
    'var list=document.getElementById("bookshelf-widget-list");' +
    'if(!list)return;' +
    'window.__cachedFetch("bookshelf-cache","/api/bookshelf",function(data){' +
    'if(!data||!data.ok||!data.books||!data.books.length){list.innerHTML="<li class=\\"feed-status\\">Couldn’t load the shelf right now.</li>";return;}' +
    'var reading=data.books.filter(function(b){return b.status==="currently-reading";});' +
    'var picks=(reading.length?reading:data.books).slice(0,4);' +
    'list.innerHTML=picks.map(function(b){' +
    'return "<li class=\\"bookshelf-item\\"><img class=\\"bookshelf-cover\\" src=\\""+esc(b.cover)+"\\" alt=\\"Cover of "+esc(b.title)+"\\" width=\\"44\\" height=\\"66\\" loading=\\"lazy\\"><span class=\\"bookshelf-info\\"><strong>"+esc(b.title)+"</strong><span class=\\"bookshelf-author\\">"+esc(b.author)+"</span></span></li>";' +
    '}).join("");' +
    '});' +
    '})();</script>'
  );
}

/* Curated highlights, not a live GitHub sync -- see content/projects.json.
   Kept the github-repo-* class names since dark mode's list styling
   still applies unchanged; only light mode gets a new card-grid look
   (see html[data-theme="light"] .github-repo-list--page in style.css). */
function parseGithubRepo(url) {
  var m = String(url || '').match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/?#]+)/);
  return m ? m[1] + '/' + m[2] : '';
}

function renderProjectItem(project, compact, featured, index) {
  var classes = 'github-repo' + (featured ? ' github-repo--featured' : '');
  var preview = project.image
    ? '<img class="github-repo-preview" src="' + escapeHtml(project.image) + '" alt="" loading="lazy">'
    : '';
  return (
    '<li class="' + classes + '">' +
    '<a class="github-repo-name" href="' + escapeHtml(project.url) + '" target="_blank" rel="noopener noreferrer" ' +
    'data-name="' + escapeHtml(project.name) + '" ' +
    'data-description="' + escapeHtml(project.description || '') + '" ' +
    'data-tag="' + escapeHtml(project.tag || '') + '" ' +
    'data-url="' + escapeHtml(project.url) + '" ' +
    'data-repo="' + escapeHtml(project.private ? '' : parseGithubRepo(project.url)) + '">' +
    '<span class="github-repo-tile">' + renderAbstractArt(index || 0) + preview + '</span>' +
    '<span class="github-repo-label">' + escapeHtml(project.name) + '</span>' +
    '</a>' +
    (!compact && project.description ? '<p class="github-repo-desc">' + escapeHtml(project.description) + '</p>' : '') +
    (project.tag ? '<div class="github-repo-meta">' + escapeHtml(project.tag) + '</div>' : '') +
    '</li>'
  );
}

function renderProjectsWidget(projects) {
  if (!projects || !projects.length) return '';
  var items = projects.slice(0, 4).map(function (p, i) { return renderProjectItem(p, true, false, i); }).join('');
  return (
    '<aside class="widget github-widget">' +
    '<h2 class="widget-title"><a href="/projects/">Projects</a></h2>' +
    '<ul class="github-repo-list">' + items + '</ul>' +
    '<p class="widget-footer"><a href="/projects/">See all &rarr;</a></p>' +
    '</aside>'
  );
}

/* Clicking a project name opens this in-page modal instead of
   navigating away -- description + tag come straight from the
   data-* attributes rendered by renderProjectItem; language/stars/
   last-updated are enriched from GitHub's public REST API (CORS-
   enabled for unauthenticated reads, no server proxy needed), skipped
   entirely for the private repo (no data-repo attribute rendered). */
function renderProjectModal() {
  return (
    '<div class="project-modal" id="project-modal" hidden>' +
    '<div class="project-modal-backdrop" id="project-modal-backdrop"></div>' +
    '<div class="project-modal-panel" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">' +
    '<button type="button" class="project-modal-close" id="project-modal-close" aria-label="Close">&times;</button>' +
    '<h2 id="project-modal-title"></h2>' +
    '<p class="project-modal-tag" id="project-modal-tag"></p>' +
    '<p class="project-modal-desc" id="project-modal-desc"></p>' +
    '<p class="project-modal-meta" id="project-modal-meta"></p>' +
    '<a class="view-all-btn" id="project-modal-github" target="_blank" rel="noopener noreferrer">View on GitHub &rarr;</a>' +
    '</div>' +
    '</div>' +
    '<script>(function(){' +
    'var modal=document.getElementById("project-modal");' +
    'if(!modal)return;' +
    'var backdrop=document.getElementById("project-modal-backdrop");' +
    'var closeBtn=document.getElementById("project-modal-close");' +
    'var title=document.getElementById("project-modal-title");' +
    'var tagEl=document.getElementById("project-modal-tag");' +
    'var descEl=document.getElementById("project-modal-desc");' +
    'var metaEl=document.getElementById("project-modal-meta");' +
    'var githubBtn=document.getElementById("project-modal-github");' +
    'var repoCache={};' +
    'function renderMeta(data){' +
    'var parts=[];' +
    'if(data.language)parts.push(data.language);' +
    'if(typeof data.stargazers_count==="number")parts.push(data.stargazers_count+" \\u2605");' +
    'if(data.pushed_at){var d=new Date(data.pushed_at);parts.push("Updated "+d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}));}' +
    'metaEl.textContent=parts.join(" \\u00b7 ");' +
    '}' +
    'function openModal(a){' +
    'title.textContent=a.dataset.name;' +
    'tagEl.textContent=a.dataset.tag||"";' +
    'tagEl.hidden=!a.dataset.tag;' +
    'descEl.textContent=a.dataset.description||"";' +
    'metaEl.textContent="";' +
    'githubBtn.href=a.dataset.url;' +
    'modal.hidden=false;' +
    'document.body.style.overflow="hidden";' +
    'var repo=a.dataset.repo;' +
    'if(!repo)return;' +
    'if(repoCache[repo]){renderMeta(repoCache[repo]);return;}' +
    'fetch("https://api.github.com/repos/"+repo).then(function(r){return r.ok?r.json():null;}).then(function(data){' +
    'if(!data)return;' +
    'repoCache[repo]=data;' +
    'renderMeta(data);' +
    '}).catch(function(){});' +
    '}' +
    'function closeModal(){modal.hidden=true;document.body.style.overflow="";}' +
    'document.querySelectorAll(".github-repo-list--page .github-repo-name").forEach(function(a){' +
    'a.addEventListener("click",function(e){e.preventDefault();openModal(a);});' +
    '});' +
    'backdrop.addEventListener("click",closeModal);' +
    'closeBtn.addEventListener("click",closeModal);' +
    'document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!modal.hidden)closeModal();});' +
    '})();</script>'
  );
}

function renderProjectsPage(site, projects) {
  var items = (projects || []).map(function (p, i) { return renderProjectItem(p, false, i === 0, i); }).join('');
  var content = (
    '<h1 class="page-title">Projects</h1>' +
    '<p class="page-lede">A few things I’m proud of.</p>' +
    '<ul class="github-repo-list github-repo-list--page">' + items + '</ul>' +
    '<p class="view-all-wrap"><a class="view-all-btn" href="https://github.com/Yuvraajb" target="_blank" rel="noopener noreferrer">See more on GitHub &rarr;</a></p>' +
    renderProjectModal()
  );
  return layout({ site: site, title: 'Projects', activeUrl: '/projects/', content: content, bodyClass: 'page-projects' });
}

function renderHome(site, projects, bioHtml) {
  var content = (
    '<div class="home-identity h-card">' +
    '<img class="home-identity-avatar u-photo" src="' + site.avatar + '" alt="" width="56" height="56">' +
    '<span class="home-identity-name p-name">' + escapeHtml(site.name) + '</span>' +
    '</div>' +
    '<section class="intro p-note">' +
    bioHtml +
    '</section>' +
    '<div class="home-grid">' +
    '<div>' + renderSubstackEmbed(site) + '</div>' +
    '<div class="sidebar">' +
    renderProjectsWidget(projects) +
    renderBookshelfWidget() +
    '</div>' +
    '</div>'
  );
  return layout({ site: site, title: '', description: site.bioShort, activeUrl: '', content: content, bodyClass: 'page-home' });
}

/* Fetches the Substack feed client-side, live, on every page load --
   no manual sync step and no rebuild needed for a new post to show up.
   The browser can't hit Substack's feed directly (no CORS headers on
   their end), so this calls a same-origin API route that proxies it
   server-side: api/substack-feed.js in production, and the matching
   handler in scripts/server.js for local dev. */
function renderSubstackEmbed(site) {
  var feedUrl = site.externalBlog && site.externalBlog.feedUrl;
  if (!feedUrl) return '';
  var provider = escapeHtml((site.externalBlog && site.externalBlog.provider) || 'Substack');
  return (
    '<section class="substack-embed" id="substack-embed">' +
    '<div class="stream" id="substack-embed-list"><p class="feed-status" id="substack-embed-status">Loading latest posts&hellip;</p></div>' +
    '</section>' +
    '<script>(function(){' +
    'function esc(s){return String(s).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c];});}' +
    'var list=document.getElementById("substack-embed-list");' +
    'var status=document.getElementById("substack-embed-status");' +
    'if(!list)return;' +
    'window.__cachedFetch("substack-cache","/api/substack-feed",function(data){' +
    'if(!data||!data.ok){status.textContent="Couldn\\u2019t load posts right now \\u2014 view them directly on ' + provider + ' \\u2197";return;}' +
    'if(!data.posts||!data.posts.length){status.textContent="No posts yet \\u2014 check back soon.";return;}' +
    'list.innerHTML=data.posts.map(function(p){' +
    'var date=p.date?new Date(p.date+"T00:00:00Z").toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}):"";' +
    'return "<article class=\\"stream-item stream-item--post\\"><div class=\\"stream-meta\\"><span class=\\"stream-kind\\">Post</span> "+' +
    '(date?"<time>"+esc(date)+"</time>":"")+' +
    '"</div>' +
    '<h3 class=\\"stream-title\\"><a href=\\""+esc(p.link)+"\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">"+esc(p.title)+"</a></h3>' +
    '<p class=\\"stream-excerpt\\">"+esc(p.excerpt)+"</p></article>";' +
    '}).join("");' +
    '});' +
    '})();</script>'
  );
}

function renderPostList(site) {
  var content = '<h1 class="page-title">Blog</h1><p class="page-lede">Long-form posts. Also available as an <a href="/feed.xml">RSS feed</a>.</p>' + renderSubstackEmbed(site);
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

/* A literal shelf of book spines instead of a cover grid -- still the
   same live-embed pattern (api/bookshelf.js, window.__cachedFetch), just
   a different presentation of the exact same real data. No genre/year
   fields exist anywhere in the data model (Goodreads' RSS doesn't expose
   them, see goodreads-parser.js's itemToBook) so the filter chips use
   the three real reading-status values instead of invented categories,
   and the hover card only shows fields that are actually real: title,
   author, status, rating, finish date. Spine width/color are derived
   deterministically from the title (a tiny hash + the same six-slot
   color system cover-card already uses), so the shelf looks organic
   without inventing anything about the books themselves. */
function renderBookshelfPage(site) {
  var recommendHref = 'mailto:' + (site.email || 'hello@example.com') + '?subject=' + encodeURIComponent('Book recommendation');
  var content = (
    '<section class="library-hero">' +
    '<p class="library-eyebrow">A personal archive</p>' +
    '<h1 class="library-title">Welcome to my library<span class="library-cursor" aria-hidden="true"></span></h1>' +
    '<p class="library-count" id="library-count"></p>' +
    '<a class="view-all-btn library-recommend" href="' + escapeHtml(recommendHref) + '">Recommend a book &rarr;</a>' +
    '</section>' +
    '<div class="library-controls">' +
    '<input class="library-search" id="library-search" type="text" placeholder="What are you looking for?" autocomplete="off" aria-label="Search the library">' +
    '<div class="library-filters" id="library-filters">' +
    '<button type="button" class="library-chip is-active" data-filter="all">All</button>' +
    '<button type="button" class="library-chip" data-filter="currently-reading">Currently Reading</button>' +
    '<button type="button" class="library-chip" data-filter="read">Finished</button>' +
    '<button type="button" class="library-chip" data-filter="want-to-read">Want to Read</button>' +
    '</div>' +
    '</div>' +
    '<ul class="library-shelf" id="library-shelf"><li class="feed-status">Loading your shelves&hellip;</li></ul>' +
    '<script>(function(){' +
    'function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' +
    'function hashSmall(str){var h=0;for(var i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))|0;}return Math.abs(h);}' +
    'var WIDTHS=[30,34,38,42,46];' +
    'var COLORS=["purple","pink","teal","orange","yellow","green"];' +
    'var shelfEl=document.getElementById("library-shelf");' +
    'var countEl=document.getElementById("library-count");' +
    'var searchEl=document.getElementById("library-search");' +
    'var filtersEl=document.getElementById("library-filters");' +
    'if(!shelfEl)return;' +
    'var allBooks=[];' +
    'var activeFilter="all";' +
    'function statusLabel(s){return s==="currently-reading"?"Currently reading":(s==="want-to-read"?"Want to read":"Finished");}' +
    'function renderShelf(){' +
    'var q=((searchEl&&searchEl.value)||"").trim().toLowerCase();' +
    'var visible=allBooks.filter(function(b){' +
    'if(activeFilter!=="all"&&b.status!==activeFilter)return false;' +
    'if(q&&b._search.indexOf(q)===-1)return false;' +
    'return true;' +
    '});' +
    'if(!visible.length){shelfEl.innerHTML="<li class=\\"feed-status\\">No books match.</li>";return;}' +
    'shelfEl.innerHTML=visible.map(function(b){' +
    'var stars=b.rating?("<span class=\\"stars\\" aria-label=\\""+b.rating+" out of 5 stars\\">"+"\\u2605".repeat(b.rating)+"\\u2606".repeat(5-b.rating)+"</span>"):"";' +
    'var finishedDate=b.dateFinished?new Date(b.dateFinished+"T00:00:00Z").toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}):"";' +
    'var finished=finishedDate?("<span class=\\"bookshelf-date\\">Finished "+esc(finishedDate)+"</span>"):"";' +
    'return "<li class=\\"library-spine library-spine--"+b._color+"\\" style=\\"--spine-width:"+b._width+"px\\">"+' +
    '"<a class=\\"library-spine-link\\" href=\\""+esc(b.link||"#")+"\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\" aria-label=\\""+esc(b.title)+" by "+esc(b.author)+"\\">"+' +
    '"<span class=\\"library-spine-title\\">"+esc(b.title)+"</span>"+' +
    '"</a>"+' +
    '"<div class=\\"library-spine-card\\">"+' +
    '"<strong>"+esc(b.title)+"</strong>"+' +
    '"<span class=\\"bookshelf-author\\">"+esc(b.author)+"</span>"+' +
    '"<span class=\\"library-spine-status\\">"+statusLabel(b.status)+"</span>"+' +
    'stars+finished+' +
    '"</div>"+' +
    '"</li>";' +
    '}).join("");' +
    '}' +
    'if(searchEl)searchEl.addEventListener("input",renderShelf);' +
    'if(filtersEl)filtersEl.addEventListener("click",function(e){' +
    'var btn=e.target.closest?e.target.closest(".library-chip"):null;' +
    'if(!btn)return;' +
    'var chips=filtersEl.querySelectorAll(".library-chip");' +
    'for(var i=0;i<chips.length;i++)chips[i].classList.remove("is-active");' +
    'btn.classList.add("is-active");' +
    'activeFilter=btn.getAttribute("data-filter");' +
    'renderShelf();' +
    '});' +
    'window.__cachedFetch("bookshelf-cache","/api/bookshelf",function(data){' +
    'if(!data||!data.ok||!data.books||!data.books.length){' +
    'shelfEl.innerHTML="<li class=\\"feed-status\\">Couldn\\u2019t load the shelf right now \\u2014 view it directly on <a href=\\"' + escapeHtml((site.goodreads && site.goodreads.profileUrl) || 'https://www.goodreads.com/') + '\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">Goodreads \\u2197</a></li>";' +
    'return;' +
    '}' +
    'allBooks=data.books.map(function(b,i){' +
    'b._width=WIDTHS[hashSmall(b.title)%WIDTHS.length];' +
    'b._color=COLORS[i%COLORS.length];' +
    'b._search=(b.title+" "+b.author).toLowerCase();' +
    'return b;' +
    '});' +
    'if(countEl)countEl.textContent=allBooks.length+(allBooks.length===1?" volume":" volumes");' +
    'renderShelf();' +
    '});' +
    '})();</script>'
  );
  return layout({ site: site, title: 'Bookshelf', activeUrl: '/bookshelf/', content: content, bodyClass: 'page-bookshelf' });
}

/* A real (tiny) command interpreter, not just terminal chrome: typing
   the prompt in on load, then a live input a visitor can actually type
   into. Progressive enhancement -- the prompt line and about content
   above are plain server-rendered text/HTML, fully readable with JS
   off; this only adds a typing animation and an extra interactive
   layer below it. */
function renderInteractiveTerminal(site) {
  var handle = escapeHtml((site.shortName || site.name).toLowerCase().replace(/\s+/g, ''));
  return (
    '<div id="terminal-log" class="terminal-log" aria-live="polite"></div>' +
    '<div class="terminal-input-line">' +
    '<span class="terminal-prompt">' + handle + '@site:~$</span>' +
    '<input id="terminal-cmd-input" class="terminal-cmd-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal command input">' +
    '</div>' +
    '<script>(function(){' +
    'var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;' +
    'var pathEl=document.querySelector(".terminal-path");' +
    'if(pathEl&&!reduce){' +
    'var full=pathEl.textContent;' +
    'pathEl.textContent="";' +
    'var i=0;' +
    'var iv=setInterval(function(){pathEl.textContent+=full.charAt(i);i++;if(i>=full.length)clearInterval(iv);},28);' +
    '}' +
    'var input=document.getElementById("terminal-cmd-input");' +
    'var log=document.getElementById("terminal-log");' +
    'var body=document.querySelector(".terminal-body");' +
    'if(!input||!log)return;' +
    'var promptText="' + handle + '@site:~$";' +
    'var HELP="Commands: help, whoami, about, ls, projects, blog, bookshelf, contact, date, clear";' +
    'function println(text){var p=document.createElement("div");p.textContent=text;log.appendChild(p);}' +
    'function printCmd(cmd){' +
    'var p=document.createElement("div");p.className="terminal-log-cmd";' +
    'var s=document.createElement("span");s.className="terminal-prompt";s.textContent=promptText;' +
    'p.appendChild(s);p.appendChild(document.createTextNode(" "+cmd));log.appendChild(p);' +
    '}' +
    'function run(raw){' +
    'var cmd=raw.trim();' +
    'if(!cmd)return;' +
    'printCmd(cmd);' +
    'var parts=cmd.toLowerCase().split(/\\s+/);' +
    'var base=parts[0];' +
    'if(base==="help"){println(HELP);}' +
    'else if(base==="whoami"){println("' + (site.bioShort || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '");}' +
    'else if(base==="about"){println("You\\u2019re already here. Scroll up \\u2191");}' +
    'else if(base==="ls"){println("blog/  bookshelf/  projects/  about/");}' +
    'else if(base==="date"){println(new Date().toString());}' +
    'else if(base==="clear"){log.innerHTML="";return;}' +
    'else if(base==="contact"||base==="email"){println("Find me via the links in the footer \\u2014 LinkedIn, GitHub, Substack.");}' +
    'else if(base==="sudo"){println("Nice try. Permission denied.");}' +
    'else if(base==="echo"){println(cmd.slice(5));}' +
    'else if(base==="projects"||base==="blog"||base==="bookshelf"){' +
    'println("Opening /"+base+"/ \\u2026");' +
    'setTimeout(function(){location.href="/"+base+"/";},350);' +
    '}' +
    'else{println(base+": command not found. Type \'help\' for a list.");}' +
    'log.scrollTop=log.scrollHeight;' +
    '}' +
    'input.addEventListener("keydown",function(e){if(e.key==="Enter"){run(input.value);input.value="";}});' +
    'if(body)body.addEventListener("click",function(){input.focus();});' +
    '})();</script>'
  );
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
    renderInteractiveTerminal(site) +
    '</div>' +
    '</div>'
  );
  return layout({ site: site, title: 'About', activeUrl: '/about/', content: content, bodyClass: 'page-about' });
}

/* Same live-embed pattern as renderSubstackEmbed/renderBookshelfPage --
   fetches api/letterboxd.js client-side and builds the journal list +
   watchlist cover-grid in the browser, so a new diary entry shows up on
   next load with no rebuild. Reuses the Bookshelf page's own
   cover-grid/cover-card classes for the watchlist (same poster-grid
   pattern) and new reel-entry classes for the journal. */
function renderLetterboxdPage(site) {
  var profileUrl = (site.letterboxd && site.letterboxd.profileUrl) || 'https://letterboxd.com/';
  var content = (
    '<h1 class="page-title">The Reel</h1>' +
    '<p class="page-lede">The film diary and watchlist I keep off the main site, synced from <a href="' + escapeHtml(profileUrl) + '" rel="noopener noreferrer" target="_blank">Letterboxd</a>.</p>' +
    '<div id="reel-journal-section"><h2 class="shelf-heading">Journal</h2><p class="feed-status" id="reel-journal-status">Loading your diary&hellip;</p></div>' +
    '<div id="reel-watchlist-section"><h2 class="shelf-heading">Watchlist</h2><p class="feed-status" id="reel-watchlist-status">Loading your watchlist&hellip;</p></div>' +
    '<p class="post-nav"><a href="/">&larr; Back to the surface</a></p>' +
    '<script>(function(){' +
    'function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' +
    'function stars(r){if(!r)return "";var full=Math.floor(r);var half=(r-full)>=0.5;var empty=5-full-(half?1:0);return "<span class=\\"stars\\" aria-label=\\""+r+" out of 5 stars\\">"+"\\u2605".repeat(full)+(half?"\\u00bd":"")+"\\u2606".repeat(Math.max(0,empty))+"</span>";}' +
    'var jSection=document.getElementById("reel-journal-section");' +
    'var wSection=document.getElementById("reel-watchlist-section");' +
    'if(!jSection||!wSection)return;' +
    'window.__cachedFetch("letterboxd-cache","/api/letterboxd",function(data){' +
    'if(!data||!data.ok){' +
    'jSection.innerHTML="<h2 class=\\"shelf-heading\\">Journal</h2><p class=\\"feed-status\\">Couldn\\u2019t load the diary right now \\u2014 view it directly on <a href=\\"' + escapeHtml(profileUrl) + '\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">Letterboxd \\u2197</a></p>";' +
    'wSection.innerHTML="<h2 class=\\"shelf-heading\\">Watchlist</h2><p class=\\"feed-status\\">Couldn\\u2019t load the watchlist right now.</p>";' +
    'return;' +
    '}' +
    'var journal=data.journal||[];' +
    'var watchlist=data.watchlist||[];' +
    'if(journal.length){' +
    'jSection.innerHTML="<h2 class=\\"shelf-heading\\">Journal</h2><ul class=\\"reel-journal\\">"+journal.map(function(e){' +
    'var poster=e.poster?("<a class=\\"reel-poster-link\\" href=\\""+esc(e.link)+"\\" rel=\\"noopener noreferrer\\" target=\\"_blank\\" tabindex=\\"-1\\"><img class=\\"reel-poster\\" src=\\""+esc(e.poster)+"\\" alt=\\"\\" width=\\"60\\" height=\\"90\\" loading=\\"lazy\\"></a>"):"";' +
    'var year=e.year?("<span class=\\"reel-entry-year\\">"+esc(e.year)+"</span>"):"";' +
    'var watchedDate=e.watchedDate?new Date(e.watchedDate+"T00:00:00Z").toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}):"";' +
    'var watched=watchedDate?("<time datetime=\\""+esc(e.watchedDate)+"\\">"+esc(watchedDate)+"</time>"):"";' +
    'var rewatch=e.rewatch?"<span class=\\"source-badge\\">rewatch</span>":"";' +
    'var review=e.review?("<p class=\\"reel-review\\">"+esc(e.review)+"</p>"):"";' +
    'return "<li class=\\"reel-entry\\">"+poster+"<div class=\\"reel-entry-body\\"><div class=\\"reel-entry-head\\"><a class=\\"reel-entry-title\\" href=\\""+esc(e.link)+"\\" rel=\\"noopener noreferrer\\" target=\\"_blank\\">"+esc(e.title)+"</a>"+year+"</div><div class=\\"reel-entry-meta\\">"+stars(e.rating)+watched+rewatch+"</div>"+review+"</div></li>";' +
    '}).join("")+"</ul>";' +
    '}else{' +
    'jSection.innerHTML="<h2 class=\\"shelf-heading\\">Journal</h2><p class=\\"feed-status\\">Nothing logged yet.</p>";' +
    '}' +
    'if(watchlist.length){' +
    'var COLORS=["purple","pink","teal","orange","yellow","green"];' +
    'wSection.innerHTML="<h2 class=\\"shelf-heading\\">Watchlist</h2><ul class=\\"cover-grid\\">"+watchlist.map(function(e,i){' +
    'var color=COLORS[i%COLORS.length];' +
    'return "<li class=\\"cover-card cover-card--"+color+"\\"><a href=\\""+esc(e.link)+"\\" rel=\\"noopener noreferrer\\" target=\\"_blank\\"><img class=\\"cover-img\\" src=\\""+esc(e.poster)+"\\" alt=\\"Poster for "+esc(e.title)+"\\" width=\\"140\\" height=\\"210\\" loading=\\"lazy\\"></a><div class=\\"cover-caption\\"><strong>"+esc(e.title)+"</strong>"+(e.year?("<span class=\\"bookshelf-author\\">"+esc(e.year)+"</span>"):"")+"</div></li>";' +
    '}).join("")+"</ul>";' +
    '}else{' +
    'wSection.innerHTML="<h2 class=\\"shelf-heading\\">Watchlist</h2><p class=\\"feed-status\\">Nothing on the watchlist yet.</p>";' +
    '}' +
    '});' +
    '})();</script>'
  );

  return layout({
    site: site,
    title: 'The Reel',
    description: 'A hidden Letterboxd diary and watchlist.',
    content: content,
    bodyClass: 'page-reel',
    robotsNoindex: true
  });
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
  renderProjectsPage: renderProjectsPage,
  renderAboutPage: renderAboutPage,
  renderLetterboxdPage: renderLetterboxdPage,
  render404: render404,
  fmtDate: fmtDate
};
