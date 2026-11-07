// 比較用スクリーンショット: node tests/shots.mjs <base-url> <保存フォルダ> <名前の頭> [path ...]
// 各ページを PC 1366×768・スマホ 390×844 で、最初の画面(top)とページ全体(full)を撮る。年末調整は年収500万円を入れた状態も撮る
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(process.env.APPDATA + '/npm/node_modules/playwright'); }
const [baseArg, dir, tag, ...ps] = process.argv.slice(2);
const base = baseArg.replace(/\/$/, '');
const paths = ps.length ? ps : ['/', '/nenmatsu/'];
mkdirSync(dir, { recursive: true });
const b = await pw.chromium.launch();
for (const vp of [{ width: 390, height: 844, n: 'sp' }, { width: 1366, height: 768, n: 'pc' }]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.route(u => !u.href.startsWith(base), r => r.abort());
  for (const p of paths) {
    const name = p === '/' ? 'top' : p.replace(/\//g, '');
    const page = await ctx.newPage();
    await page.goto(base + p, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/${tag}_${name}_${vp.n}_1first.png` });
    await page.screenshot({ path: `${dir}/${tag}_${name}_${vp.n}_3full.png`, fullPage: true });
    if (p === '/nenmatsu/') {
      await page.fill('#inc', '5000000'); await page.dispatchEvent('#inc', 'input'); await page.waitForTimeout(300);
      await page.screenshot({ path: `${dir}/${tag}_${name}_${vp.n}_2result.png` });
    }
    await page.close();
  }
  await ctx.close();
}
await b.close();
console.log('saved to ' + dir);
