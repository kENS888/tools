// 押せる大きさの点検: シェアボタン(.sb)・ボタン(.btn)・一覧の出典リンク(文の中のリンクは基準の対象外)・チェックボックス(押せる範囲=ラベル)が 44px 以上か
// 使い方: node tests/tap-size.mjs <base-url>  (Git Bash では先頭に MSYS_NO_PATHCONV=1)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(process.env.APPDATA + '/npm/node_modules/playwright'); }
const base = (process.argv[2] || 'http://localhost:8788').replace(/\/$/, '');
const paths = ['/kabu-shinkoku/', '/', '/nenmatsu/', '/furusato/', '/zangyo/', '/gensen/', '/eigyobi/', '/hiwari/', '/shohizei/', '/keihi/', '/seikyusho/', '/mitsumori/', '/nohinsho/', '/ryoshusho/', '/hacchusho/', '/sofujo/', '/guide/', '/guide/nenmatsu-kaisei/', '/guide/gensen-keisan/', '/about/', '/contact/', '/privacy/'];
const b = await pw.chromium.launch();
let ng = 0;
for (const vp of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.route(u => !u.href.startsWith(base), r => r.abort());
  for (const p of paths) {
    const page = await ctx.newPage();
    await page.goto(base + p, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const small = await page.evaluate(() => {
      for (const d of document.querySelectorAll('details')) d.open = true; // 折りたたみの中も測る
      const out = [];
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
      const chk = (el, kind, target) => { if (!vis(el)) return; const r = (target || el).getBoundingClientRect(); if (r.height < 44 - 0.5) out.push(kind + ' ' + Math.round(r.height) + 'px「' + (el.textContent || el.id || '').trim().slice(0, 14) + '」'); };
      document.querySelectorAll('.sb').forEach(e => chk(e, 'シェア'));
      document.querySelectorAll('.btn, .jump, .ks-answer, .ks-extra, .ks-back, .ks-restart, .ks-chip, #ks-refs a').forEach(e => chk(e, 'ボタン'));
      document.querySelectorAll('.src li > a, ul.note a').forEach(e => chk(e, '出典'));
      document.querySelectorAll('input[type=checkbox]').forEach(e => { const l = e.closest('label') || (e.id && document.querySelector('label[for="' + e.id + '"]')); chk(e, 'チェック', l || e); });
      return out;
    });
    if (small.length) { ng += small.length; console.log('NG ' + vp.width + ' ' + p + ' ' + small.length + '件: ' + small.slice(0, 4).join(' / ')); }
    await page.close();
  }
  await ctx.close();
}
await b.close();
console.log(ng ? `44px未満 ${ng}件` : 'すべて44px以上');
process.exit(ng ? 1 : 0);
