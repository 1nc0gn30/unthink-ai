import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test('index.html has valid tags, OG/Twitter metadata, JSON-LD @graph, and no waitlist form', () => {
  const html = read('index.html');

  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:url" content="https:\/\/unthink-ai\.757tech\.pro\/"/);
  assert.match(html, /property="og:image" content="https:\/\/unthink-ai\.757tech\.pro\/og-image\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:site" content="@1nc0gn30"/);
  assert.match(html, /name="twitter:creator" content="@1nc0gn30"/);
  assert.doesNotMatch(html, /name="waitlist"/i, 'Stale waitlist form must be removed');

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'JSON-LD script block must exist');
  const schema = JSON.parse(jsonLdMatch[1]) as { '@graph'?: Array<{ '@type': string }> };
  assert.ok(Array.isArray(schema['@graph']), 'JSON-LD must declare @graph');
  const types = schema['@graph'].map((n) => n['@type']);
  assert.ok(types.includes('WebApplication'));
  assert.ok(types.includes('FAQPage'));
});

test('public/og-image.png exists as a valid 1200x630 PNG', () => {
  const pngPath = path.join(ROOT, 'public/og-image.png');
  assert.ok(fs.existsSync(pngPath), 'public/og-image.png must exist');
  const buf = fs.readFileSync(pngPath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.equal(width, 1200);
  assert.equal(height, 630);
});

test('robots.txt allows frontier crawlers with 0 crawl delay and declares sitemap', () => {
  const robots = read('public/robots.txt');
  for (const bot of ['*', 'Googlebot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Applebot']) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots.txt missing ${bot}`);
  }
  assert.match(robots, /Crawl-delay:\s*0/);
  assert.match(robots, /Sitemap:\s*https:\/\/unthink-ai\.757tech\.pro\/sitemap\.xml/);
});

test('sitemap.xml contains canonical loc and lastmod', () => {
  const sitemap = read('public/sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/unthink-ai\.757tech\.pro\/<\/loc>/);
  assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('netlify.toml configures dist publish, security headers, and SPA fallback', () => {
  const toml = read('netlify.toml');
  assert.match(toml, /publish\s*=\s*"dist"/);
  assert.match(toml, /X-Frame-Options\s*=\s*"SAMEORIGIN"/);
  assert.match(toml, /X-Content-Type-Options\s*=\s*"nosniff"/);
  assert.match(toml, /Referrer-Policy\s*=\s*"strict-origin-when-cross-origin"/);
  assert.match(toml, /from\s*=\s*"\/\*"[\s\S]*to\s*=\s*"\/index\.html"[\s\S]*status\s*=\s*200/);
});

test('App.tsx satisfies open-access, attribution, Buy Us a Coffee, Solana tip, and zero DePay/paywall invariants', () => {
  const app = read('src/App.tsx');
  assert.ok(app.includes('https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X'));
  assert.ok(app.includes('GG2eQbVh8ut1BK6j1A2tz7pSySdLpD38BgyEhGcxdXoK'));
  assert.ok(app.includes('Engineered by Neal Frazier Tech (@1nc0gn30) • NullAI Platform'));
  assert.ok(app.includes('https://github.com/1nc0gn30/unthink-ai'));
  assert.ok(app.includes('https://nullai.tech'));
  assert.doesNotMatch(app, /depay/i);
  assert.doesNotMatch(app, /filter:\s*blur/i);
  assert.doesNotMatch(app, /GoogleMark/);
});
