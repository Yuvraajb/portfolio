'use strict';

/**
 * Minimal YAML-frontmatter parser. Only handles the shapes this site's
 * content actually needs: `key: value` pairs, quoted strings, and simple
 * `[a, b, c]` inline arrays. No nested objects, no multiline values.
 */
function parseFrontmatter(raw) {
  var text = raw.replace(/\r\n/g, '\n');
  var match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: text };
  }

  var yamlBlock = match[1];
  var body = match[2];
  var data = {};

  yamlBlock.split('\n').forEach(function (line) {
    if (!line.trim()) return;
    var idx = line.indexOf(':');
    if (idx === -1) return;
    var key = line.slice(0, idx).trim();
    var value = line.slice(idx + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      var inner = value.slice(1, -1).trim();
      data[key] = inner === '' ? [] : inner.split(',').map(function (s) {
        return stripQuotes(s.trim());
      });
    } else {
      data[key] = stripQuotes(value);
    }
  });

  return { data: data, content: body.replace(/^\n+/, '') };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

module.exports = { parseFrontmatter: parseFrontmatter };
