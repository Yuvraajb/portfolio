'use strict';

function escapeHtml(str) {
  return str
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;');
}

function inline(text) {
  var codeSpans = [];
  var OPEN = 'CODESPANOPEN';
  var CLOSE = 'CODESPANCLOSE';

  text = text.replace(/`([^`]+)`/g, function (match, code) {
    codeSpans.push('<code>' + escapeHtml(code) + '</code>');
    return OPEN + (codeSpans.length - 1) + CLOSE;
  });

  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (match, alt, src, title) {
    var t = title ? (' title="' + escapeHtml(title) + '"') : '';
    return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '"' + t + ' loading="lazy">';
  });

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (match, label, href, title) {
    var t = title ? (' title="' + escapeHtml(title) + '"') : '';
    var external = /^https?:\/\//.test(href);
    var rel = external ? ' rel="noopener noreferrer"' : '';
    return '<a href="' + escapeHtml(href) + '"' + t + rel + '>' + label + '</a>';
  });

  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  var restoreRe = new RegExp(OPEN + '(\\d+)' + CLOSE, 'g');
  text = text.replace(restoreRe, function (match, i) {
    return codeSpans[Number(i)];
  });

  return text;
}

function mdToHtml(markdown) {
  var lines = markdown.replace(/\r\n/g, '\n').split('\n');
  var html = [];
  var i = 0;
  var paragraphBuf = [];
  var listStack = null;

  function flushParagraph() {
    if (paragraphBuf.length) {
      html.push('<p>' + inline(escapeHtml(paragraphBuf.join(' '))) + '</p>');
      paragraphBuf = [];
    }
  }

  function flushList() {
    if (listStack) {
      var tag = listStack.type;
      html.push('<' + tag + '>');
      for (var k = 0; k < listStack.items.length; k++) {
        html.push('<li>' + inline(escapeHtml(listStack.items[k])) + '</li>');
      }
      html.push('</' + tag + '>');
      listStack = null;
    }
  }

  while (i < lines.length) {
    var line = lines[i];

    var fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      var lang = fenceMatch[1];
      var codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      var langClass = lang ? (' class="language-' + lang + '"') : '';
      html.push('<pre><code' + langClass + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line) && line.trim().length >= 3) {
      flushParagraph();
      flushList();
      html.push('<hr>');
      i++;
      continue;
    }

    var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      var level = headingMatch[1].length;
      html.push('<h' + level + '>' + inline(escapeHtml(headingMatch[2].trim())) + '</h' + level + '>');
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      flushList();
      var quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push('<blockquote>' + mdToHtml(quoteLines.join('\n')) + '</blockquote>');
      continue;
    }

    var ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (!listStack || listStack.type !== 'ul') {
        flushList();
        listStack = { type: 'ul', items: [] };
      }
      listStack.items.push(ulMatch[1]);
      i++;
      continue;
    }

    var olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (!listStack || listStack.type !== 'ol') {
        flushList();
        listStack = { type: 'ol', items: [] };
      }
      listStack.items.push(olMatch[1]);
      i++;
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    flushList();
    paragraphBuf.push(line.trim());
    i++;
  }

  flushParagraph();
  flushList();

  return html.join('\n');
}

module.exports = { mdToHtml: mdToHtml, inline: inline, escapeHtml: escapeHtml };
