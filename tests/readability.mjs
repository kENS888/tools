// 読みやすさの数字を測る: 最初の画面に見える文字数/本文の漢字の割合/1文の平均の長さ/見出しと見出しの間の文字数
// 使い方: node tests/readability.mjs <base-url> [path ...]  (Git Bash では先頭に MSYS_NO_PATHCONV=1)
// 「本文」= main の中で、いま画面に表示されている文字(閉じた折りたたみの中・script は含めない)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(process.env.APPDATA + '/npm/node_modules/playwright'); }
const base = (process.argv[2] || 'https://shigoto-keisan.com').replace(/\/$/, '');
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/nenmatsu/'];
const b = await pw.chromium.launch();
const rows = [];
for (const vp of [{ width: 390, height: 844, n: 'スマホ' }, { width: 1366, height: 768, n: 'PC' }]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.route(u => !u.href.startsWith(base), r => r.abort());
  for (const p of paths) {
    const page = await ctx.newPage();
    await page.goto(base + p, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const strip = s => s.replace(/\s+/g, '');
      // 最初の画面に見える文字(テキストノード単位で、上端が画面内にあるもの)
      let first = 0;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let t; (t = tw.nextNode());) {
        const el = t.parentElement; if (!el || /SCRIPT|STYLE|NOSCRIPT/.test(el.tagName)) continue;
        const s = strip(t.textContent); if (!s) continue;
        const r = document.createRange(); r.selectNodeContents(t); const rc = r.getBoundingClientRect();
        if (rc.width === 0 || rc.height === 0 || rc.top >= innerHeight || rc.bottom <= 0) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        first += s.length;
      }
      const main = document.querySelector('main') || document.body;
      const text = main.innerText;
      const chars = strip(text);
      const kanji = (chars.match(/[一-鿿々]/g) || []).length;
      const sents = text.split(/[。！？\n]/).map(strip).filter(s => s.length >= 5);
      const avgSent = sents.length ? sents.reduce((a, s) => a + s.length, 0) / sents.length : 0;
      // 見出しの間の文字数:表示されている h1〜h3 で区切った本文の長さの平均
      const hs = [...main.querySelectorAll('h1,h2,h3')].filter(h => h.getBoundingClientRect().height > 0);
      let between = [];
      for (let i = 0; i < hs.length; i++) {
        const rg = document.createRange(); rg.setStartAfter(hs[i]);
        if (hs[i + 1]) rg.setEndBefore(hs[i + 1]); else rg.setEndAfter(main.lastChild);
        const div = document.createElement('div'); div.appendChild(rg.cloneContents());
        // 閉じた折りたたみの中身は数えない
        div.querySelectorAll('details:not([open])').forEach(d => { [...d.childNodes].forEach(c => { if (c.tagName !== 'SUMMARY') c.remove(); }); });
        div.querySelectorAll('script,style').forEach(x => x.remove());
        between.push(strip(div.textContent).length);
      }
      const avgBetween = between.length ? between.reduce((a, x) => a + x, 0) / between.length : 0;
      return { first, chars: chars.length, kanjiPct: chars.length ? kanji / chars.length * 100 : 0, avgSent, avgBetween, heads: hs.length };
    });
    rows.push({ 画面: vp.n, ページ: p, 最初の画面の文字数: m.first, 本文の文字数: m.chars, 漢字の割合: m.kanjiPct.toFixed(1) + '%', '1文の平均': m.avgSent.toFixed(1), 見出しの間: Math.round(m.avgBetween), 見出しの数: m.heads });
    await page.close();
  }
  await ctx.close();
}
await b.close();
console.log(base);
console.table(rows);
