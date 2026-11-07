// 年末調整(令和8年分)の計算テスト。期待値は国税庁資料の式から手計算した値
// 実行: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load-core.mjs';
const C = loadCore(new URL('../nenmatsu/index.html', import.meta.url));
const base = { paid: 0, spouse: '', spInc: 0, dep: 0, tok: 0, old: 0, dokyo: 0, shaAuto: true, sha: 0, seiho: 0, ideco: 0, jutaku: 0 };
const run = o => C.nenmatsu({ ...base, ...o });

test('給与所得控除後の金額(年末調整用の表):控除が切り替わる額の前後', () => {
  const cases = [
    [740999, 0], [741000, 1000],                 // 74万円の最低保障
    [2190999, 1450999], [2191000, 1451000],      // 219.1万円からの変則刻み
    [2195999, 1453000], [2199999, 1456000],
    [2200000, 1460000], [2203999, 1460000],      // 220万円から4,000円刻み・×70%−8万
    [3599999, 2437200], [3600000, 2440000],      // 360万円から×80%−44万
    [6599999, 4836800], [6600000, 4840000],      // 660万円から×90%−110万
    [8499999, 6549999], [8500000, 6550000],      // 850万円から−195万
  ];
  for (const [I, s] of cases) assert.equal(C.kyuyoShotoku(I), s, `年収 ${I}`);
});

test('基礎控除:合計所得489万円の前後で104万→67万', () => {
  assert.equal(run({ income: 6655555 }).kiso, 1040000); // 給与所得 4,889,999
  assert.equal(run({ income: 6656667 }).kiso, 670000);  // 給与所得 4,891,000
});

test('年収別の年税額(独身・社会保険料は年収の15%)', () => {
  const exp = { 3000000: 27000, 4000000: 57100, 5000000: 90300, 6000000: 147500 };
  for (const [I, nen] of Object.entries(exp)) assert.equal(run({ income: +I }).nen, nen, `年収 ${I}`);
  const c = run({ income: 4000000 });
  assert.deepEqual([c.s, c.sha, c.kiso, c.kazei, c.tax], [2760000, 600000, 1040000, 1120000, 56000]);
});

test('扶養 0人・1人・2人(年収500万円)', () => {
  assert.equal(run({ income: 5000000, dep: 0 }).nen, 90300);
  assert.equal(run({ income: 5000000, dep: 1 }).nen, 70900);
  assert.equal(run({ income: 5000000, dep: 2 }).nen, 51500);
  assert.equal(run({ income: 5000000, tok: 1 }).dep, 630000); // 特定扶養
});

test('配偶者の年収の境目(本人 年収500万円)', () => {
  const sp = si => run({ income: 5000000, spouse: '1', spInc: si });
  assert.equal(sp(1360000).spKind, 'kojo');        // 合計所得62万円 → 配偶者控除
  assert.equal(sp(1360000).sp, 380000);
  assert.equal(sp(1360001).spKind, 'tokubetsu');   // 62万円超 → 配偶者特別控除
  assert.equal(sp(1690000).sp, 380000);            // 合計所得95万円まで38万円
  assert.equal(sp(1700000).sp, 360000);            // 96万円 → 36万円
  assert.equal(sp(2070000).sp, 30000);             // 133万円 → 3万円
  assert.equal(sp(2070000).nen, 88800);
  assert.equal(sp(2080000).sp, 0);                 // 133万円超 → なし
  assert.equal(run({ income: 5000000, spouse: 'old', spInc: 0 }).sp, 480000); // 老人控除対象配偶者
  assert.equal(run({ income: 12000000, spouse: '1', spInc: 0 }).sp, 0);       // 本人の合計所得1,000万円超
});

test('住宅ローン控除あり(年収500万円・独身)', () => {
  assert.equal(run({ income: 5000000, jutaku: 50000 }).nen, 39300);
  const c = run({ income: 5000000, jutaku: 200000 });
  assert.equal(c.jutaku, 88500); // 所得税額が上限
  assert.equal(c.nen, 0);
});

test('還付になる人・追加で引かれる人', () => {
  assert.equal(run({ income: 5000000, paid: 100000 }).diff, 9700);
  assert.equal(run({ income: 5000000, paid: 80000 }).diff, -10300);
});

test('毎月の天引き(源泉徴収税額表 電算機計算の特例)', () => {
  assert.equal(C.monthlyTax(212500, 0), 4790);
  assert.equal(C.monthlyTax(212500, 1), 3170);
  assert.equal(C.monthlyTax(158333, 0), 2850);
  assert.equal(C.monthlyTax(80000, 0), 0);
  // 所得税の合計が空欄なら、天引きの見込み(賞与なし・毎月同額)と比べる
  const c = run({ income: 3000000 });
  assert.equal(c.est, 4790 * 12);
  assert.equal(c.diff, 57480 - 27000);
  assert.equal(c.paidIsEst, true);
});
