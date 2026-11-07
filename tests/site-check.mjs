// 使い方: node tests/site-check.mjs <base-url> [path ...]  (Git Bash では先頭に MSYS_NO_PATHCONV=1 を付ける)
// PC 1366x768 とスマホ 390px で、横はみ出し・コンソールエラー・内部リンク切れ・404 を確かめる
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(process.env.APPDATA + '/npm/node_modules/playwright'); }
const { chromium } = pw;
const base = (process.argv[2] || 'http://localhost:8788').replace(/\/$/, '');
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/nenmatsu/', '/guide/', '/'];
const browser = await chromium.launch();
let ng = 0;
const seen = new Map();
for (const vp of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp });
  // 外部(広告など)は読み込まない。サイト自身の表示だけを見る
  await ctx.route(u => !u.href.startsWith(base), r => r.abort());
  for (const p of paths) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/googlesyndication|adsbygoogle|doubleclick|google|ERR_BLOCKED|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const res = await page.goto(base + p, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const links = await page.$$eval('a[href^="/"]', as => [...new Set(as.map(a => a.getAttribute('href').split('#')[0]))]);
    for (const l of links) if (!seen.has(l)) seen.set(l, null);
    const bad = [];
    if (res.status() !== 200) bad.push('status ' + res.status());
    if (ow > 1) bad.push('横はみ出し ' + ow + 'px');
    if (errs.length) bad.push('console: ' + errs.join(' | '));
    console.log((bad.length ? 'NG ' : 'OK ') + vp.width + ' ' + p + (bad.length ? ' ' + bad.join(' / ') : ''));
    ng += bad.length ? 1 : 0;
    await page.close();
  }
  await ctx.close();
}
for (const l of seen.keys()) {
  const r = await fetch(base + l, { redirect: 'follow' });
  if (r.status !== 200) { console.log('NG リンク切れ ' + l + ' ' + r.status); ng++; }
}
const r404 = await fetch(base + '/no-such-page-' + Date.now() + '/');
console.log((r404.status === 404 ? 'OK ' : 'NG ') + '存在しないURL → ' + r404.status);
if (r404.status !== 404) ng++;
await browser.close();
console.log(ng ? `NG ${ng}件` : 'すべてOK');
process.exit(ng ? 1 : 0);
