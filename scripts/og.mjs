// Renders the link-preview images in public/og/ (1200 x 630). Run after changing a title or tagline:
//   node scripts/og.mjs        (needs a local Chromium; set CHROMIUM=/path if it is not /usr/bin/chromium)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { markSVG } from '../src/lib/crewbo/bo.js';

const font = (f) => `data:font/woff2;base64,${readFileSync(f).toString('base64')}`;
const sans = font('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');
const mono = font('node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2');
const img = (f, type) => `data:${type};base64,${readFileSync(f).toString('base64')}`;
const nib = readFileSync('src/assets/nib/nib-chaos.svg', 'utf8');

const cards = [
  { id: 'home', kicker: 'AI Engineer · Founder of Crewbo', title: 'Ronel Abraham Mathew', sub: 'I build agents, and the checks that make them safe to trust.', art: `<div class="trio">${markSVG({ size: 120 })}<img src="${img('public/brand/gremlin-mark.svg', 'image/svg+xml')}"><img src="${img('public/brand/scribe-mark.png', 'image/png')}"></div>` },
  { id: 'crewbo', kicker: 'Case study · my startup', title: 'Crewbo', sub: 'Every teammate’s AI coding agent on one repository, without collisions.', art: `<div class="one">${markSVG({ size: 300 })}</div>` },
  { id: 'gremlin', kicker: 'Case study · research', title: 'Gremlin', sub: 'The model decides where to go. The log decides what is broken.', art: `<div class="one nib">${nib}</div>` },
  { id: 'scribe', kicker: 'Case study · shipped app', title: 'Scribe', sub: 'Meetings in, decisions out: record, transcribe, summarise.', art: `<div class="one"><img src="${img('public/brand/scribe-mark.png', 'image/png')}"></div>` },
];

const page = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: G; src: url(${sans}); font-weight: 100 900; }
@font-face { font-family: M; src: url(${mono}); font-weight: 100 900; }
html, body { margin: 0; }
.card { width: 1200px; height: 630px; box-sizing: border-box; padding: 72px 80px; background: #f3f3f1; color: #141414;
  font-family: G; display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: center; position: relative; }
.card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: #ff5a1f; }
.k { font: 500 22px M; text-transform: uppercase; letter-spacing: .05em; color: #6b6b6b; margin: 0 0 20px; }
h1 { margin: 0; font-size: ${c.id === 'home' ? 88 : 132}px; line-height: .95; letter-spacing: -.045em; font-weight: 800; }
.s { margin: 28px 0 0; font-size: 34px; line-height: 1.25; max-width: 18ch; }
.u { position: absolute; left: 80px; bottom: 44px; font: 500 22px M; color: #6b6b6b; }
.one { display: grid; place-items: center; width: 340px; height: 340px; background: #fff; border: 2px solid #141414; }
.one svg, .one img { width: 260px; height: auto; }
.nib svg { width: 250px; height: auto; }
.trio { display: grid; gap: 18px; justify-items: center; }
.trio > * { width: 110px !important; height: 110px !important; }
</style></head><body><div class="card"><div><p class="k">${c.kicker}</p><h1>${c.title}</h1><p class="s">${c.sub}</p></div>${c.art}<span class="u">rm1338.github.io</span></div></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/usr/bin/chromium' });
const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of cards) {
  await p.setContent(page(c));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `public/og/${c.id}.png` });
}
await browser.close();
console.log(cards.map((c) => `public/og/${c.id}.png`).join('\n'));
