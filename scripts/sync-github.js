'use strict';

/**
 * Pulls public repo activity from a GitHub profile into
 * content/github-activity.json, which build.js renders in place of a
 * hand-maintained "Now" page. Uses GitHub's public REST API -- no token,
 * no auth -- so it can only ever see public repos, which is also exactly
 * what should show up on a public website.
 *
 * Usage:
 *   node scripts/sync-github.js <github_username>
 *   SYNC_GITHUB_USERNAME=yuvraajb node scripts/sync-github.js
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var OUT_PATH = path.join(ROOT, 'content', 'github-activity.json');
var MAX_REPOS = 6;

function isoDate(str) {
  var d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

async function main() {
  var username = process.argv[2] || process.env.SYNC_GITHUB_USERNAME;
  if (!username) {
    console.log('No GitHub username given. Skipping sync.');
    console.log('Usage: node scripts/sync-github.js <github_username>');
    console.log('   or: SYNC_GITHUB_USERNAME=yuvraajb node scripts/sync-github.js');
    process.exit(0);
  }

  var headers = {
    'User-Agent': 'personal-site-github-sync/1.0',
    'Accept': 'application/vnd.github+json'
  };

  var profileRes = await fetch('https://api.github.com/users/' + encodeURIComponent(username), { headers: headers });
  if (!profileRes.ok) {
    console.error('HTTP ' + profileRes.status + ' fetching profile for ' + username);
    process.exit(1);
  }
  var profile = await profileRes.json();

  var reposRes = await fetch(
    'https://api.github.com/users/' + encodeURIComponent(username) + '/repos?type=owner&sort=updated&per_page=30',
    { headers: headers }
  );
  if (!reposRes.ok) {
    console.error('HTTP ' + reposRes.status + ' fetching repos for ' + username);
    process.exit(1);
  }
  var allRepos = await reposRes.json();
  if (!Array.isArray(allRepos)) {
    console.error('Unexpected repos response for ' + username);
    process.exit(1);
  }

  var repos = allRepos
    .filter(function (r) { return !r.fork && !r.archived; })
    .filter(function (r) { return r.name.toLowerCase() !== username.toLowerCase(); }) // skip the special profile-readme repo
    .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); })
    .slice(0, MAX_REPOS)
    .map(function (r) {
      var created = isoDate(r.created_at);
      var pushed = isoDate(r.pushed_at);
      return {
        name: r.name,
        url: r.html_url,
        description: r.description || '',
        language: r.language || '',
        stars: r.stargazers_count || 0,
        pushedAt: pushed,
        action: created === pushed ? 'Created' : 'Updated'
      };
    });

  var data = {
    username: username,
    profileUrl: profile.html_url || ('https://github.com/' + username),
    avatarUrl: profile.avatar_url || '',
    bio: profile.bio || '',
    publicRepos: profile.public_repos || 0,
    followers: profile.followers || 0,
    updatedAt: new Date().toISOString().slice(0, 10),
    repos: repos
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + repos.length + ' repo(s) for ' + username + ' to ' + path.relative(ROOT, OUT_PATH));
}

main().catch(function (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
});
