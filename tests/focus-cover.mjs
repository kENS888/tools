// スマホ(390px)で Tab で入力欄を順に移ったとき、移った欄が画面下に固定された帯(position:fixed)に隠れないかを確かめる
// 使い方: node tests/focus-cover.mjs <base-url>  (Git Bash では先頭に MSYS_NO_PATHCONV=1)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(process.env.APPDATA + '/npm/node_modules/playwright'); }
const base = (process.argv[2] || 'http://localhost:8788').replace(/\/$/, '');
const paths = ['/kabu-shinkoku/', '/nenmatsu/', '/furusato/', '/zangyo/', '/gensen/', '/eigyobi/', '/hiwari/', '/shohizei/', '/keihi/', '/seikyusho/', '/mitsumori/', '/nohinsho/', '/ryoshusho/', '/hacchusho/', '/sofujo/'];
const b = await pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(u => !u.href.startsWith(base), r => r.abort());
let ng = 0;
for (const p of paths) {
  const page = await ctx.newPage();
  await page.goto(base + p, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  // 結果の帯が出る状態にするため、最初の数字の欄に値を入れ、折りたたみを開く
  await page.evaluate(() => {
    // 株の判定は口座を選んでから有効になる。帯が出せる状態でTabを点検する。
    document.querySelector('[data-account=withheld]')?.click();
    const i = document.querySelector('input.num, input[inputmode=numeric]');
    if (i && !i.value) { i.value = '4500000'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    document.querySelectorAll('details.more').forEach(d => { d.open = true; });
  });
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const hidden = [];
  for (let k = 0; k < 80; k++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return null;
      const er = el.getBoundingClientRect();
      if (er.height === 0) return null;
      const bars = [...document.querySelectorAll('body *')].filter(x => { const s = getComputedStyle(x); return s.position === 'fixed' && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().top > innerHeight / 2; });
      for (const bar of bars) { const br = bar.getBoundingClientRect(); if (er.bottom > br.top + 1 && er.top < br.bottom) return (el.id || el.name || el.tagName) + ' が帯(' + (bar.id || bar.className) + ')に隠れる'; }
      if (er.bottom > innerHeight) return (el.id || el.tagName) + ' が画面の外';
      return '';
    });
    if (r) hidden.push(r);
  }
  const u = [...new Set(hidden)];
  if (u.length) { ng += u.length; console.log('NG ' + p + ' ' + u.slice(0, 5).join(' / ')); } else console.log('OK ' + p);
  await page.close();
}
await b.close();
console.log(ng ? `隠れる欄 ${ng}件` : 'すべて隠れない');
process.exit(ng ? 1 : 0);
