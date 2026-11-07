// ページに書いた計算例の数字がロジックと一致するか、ほかのページと同じ文章を使い回していないかを確かめる
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { loadCore } from './load-core.mjs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const C = loadCore(new URL('nenmatsu/index.html', root));
const base = { paid: 0, spouse: '', spInc: 0, dep: 0, tok: 0, old: 0, dokyo: 0, shaAuto: true, sha: 0, seiho: 0, ideco: 0, jutaku: 0 };
const yen = n => n.toLocaleString('ja-JP') + '円';
const rows = (html, startText) => {
  const t = html.slice(html.indexOf(startText)).match(/<table[^>]*>([\s\S]*?)<\/table>/)[1];
  return [...t.matchAll(/<tr>(<td[\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1].replace(/<[^>]+>/g, '')));
};

test('ツールページの年収別計算例 = ロジックの結果', () => {
  const h = read('nenmatsu/index.html');
  for (const [inc, est, nen, diff] of rows(h, '計算例：年収別に')) {
    const c = C.nenmatsu({ ...base, income: parseInt(inc) * 10000 });
    assert.deepEqual([est, nen, diff], [yen(c.est), yen(c.nen), yen(c.diff)], inc);
  }
});

test('解説記事の年収別の表 = ロジックの結果', () => {
  const h = read('guide/nenmatsu-kaisei/index.html');
  for (const [inc, old, now, cut] of rows(h, 'id="rei"')) {
    const c = C.nenmatsu({ ...base, income: parseInt(inc) * 10000 });
    assert.deepEqual([old, now, cut], [yen(c.nenOld), yen(c.nen), yen(c.cut)], inc);
  }
});

// 20文字以上の文が、ほかのページにそのまま出ていないか
// 共通部品(シェア・関連ツール・フッター)と、全ツール共通の一文は除く
const sentences = html => new Set(html.replace(/<label[^>]*>[^<]*<\/label>|<t[dh][^>]*>[^<]*<\/t[dh]>/g, '').replace(/<div class="card"><div class="sharebox"[\s\S]*?<\/main>/, '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head>[\s\S]*?<\/head>/g, '').replace(/<[^>]+>/g, '\n').split(/[。\n]/).map(s => s.trim()).filter(s => s.length >= 20));
const pages = (dir, out = []) => { for (const n of readdirSync(new URL(dir, root))) { if (/^(\.|node_modules|tests|assets|functions)/.test(n)) continue; const p = dir + n; if (statSync(new URL(p, root)).isDirectory()) pages(p + '/', out); else if (n === 'index.html') out.push(p); } return out; };
test('年末調整の2ページが、ほかのページと同じ文章を使っていない', () => {
  const all = pages('');
  for (const target of ['nenmatsu/index.html', 'guide/nenmatsu-kaisei/index.html']) {
    const mine = sentences(read(target));
    for (const other of all) {
      if (other === target || other === 'index.html' || other === 'guide/index.html') continue;
      const dup = [...sentences(read(other))].filter(s => mine.has(s) && !/しごと計算ラボ|出典|確認日|記事の内容は公開日時点|ブラウザ内だけで処理|^国税庁/.test(s));
      assert.deepEqual(dup, [], `${target} と ${other} で同じ文`);
    }
  }
});
