// 使い方: node tests/agent-files-check.mjs [base-url]   (base-url は環境変数 SITE_URL でも渡せる)
//   例: node tests/agent-files-check.mjs https://block-more-files.shigoto-keisan.pages.dev
//   base-url を省くと、1.・2. の手元の検査だけを行う
//   REF_URL に変更前のサイト(例: https://shigoto-keisan.com)を渡すと、/api/ などのステータスと、llms.txt などの中身が同じかも比べる
// サイトのページではない内部ファイルを配信しないことを確かめる(2026-11-12)
//   1. git ls-files の全ファイルを「公開する」「公開しない」に分ける。どちらにも当てはまらないファイルがあれば失敗(公開するかを決めてから足す)
//   2. functions/_middleware.js を手元で呼び、404・素通し・301 転送を確かめる
//   3. base-url に実際に問い合わせ、「公開しない」は全件 404、「公開する」は 200(.html は .html なしへの 308 も可)を確かめる
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = readFileSync(fileURLToPath(new URL('../functions/_middleware.js', import.meta.url)), 'utf8');
const { onRequest } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(src));

let ng = 0;
const ok = (cond, msg) => { if (!cond || process.env.VERBOSE) console.log((cond ? 'OK ' : 'NG ') + msg); if (!cond) ng++; return cond; };

// 1. ファイルを分ける規則
//   middleware: middleware で 404 にする物 / native: Cloudflare Pages がもともと配信しない物
const PRIVATE = [
  [/^[^/]+\.md$/, 'middleware'],            // 直下の *.md(CLAUDE.md・AGENTS.md・LESSONS.md・PRODUCT.md)
  [/^agent-docs\//, 'middleware'],
  [/(^|\/)\./, 'middleware'],               // 「.」で始まる名前(.gitignore・.impeccable/ など)
  [/^tests\//, 'middleware'],
  [/^functions\//, 'native'],
  [/^_headers$/, 'native'],
];
const PUBLIC = [
  /^assets\//,                              // LICENSE-*.txt を含む
  /^(llms\.txt|robots\.txt|sitemap\.xml|ads\.txt|favicon\.ico|favicon\.svg|apple-touch-icon\.png|404\.html|index\.html)$/,
  /^[a-z0-9-]+\/([a-z0-9-]+\/)?index\.html$/, // 各ページ(/seikyusho/・/guide/zangyo-keisan/ など)
];
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const priv = [], pub = [];
for (const f of files) {
  const p = PRIVATE.find(([re]) => re.test(f));
  const q = PUBLIC.some(re => re.test(f));
  if (p && q) ok(false, '両方に当てはまる ' + f);
  else if (p) priv.push({ f, kind: p[1] });
  else if (q) pub.push(f);
  else ok(false, 'どちらにも当てはまらない ' + f + '(公開するかを決めて、このテストの規則に足す)');
}
console.log(`ファイル ${files.length} 件:公開しない ${priv.length} 件 / 公開する ${pub.length} 件`);

// 書き換え(大文字小文字・%エンコード・//・/./・末尾の /)を試す代表
const SAMPLES = ['/CLAUDE.md', '/AGENTS.md', '/LESSONS.md', '/PRODUCT.md', '/agent-docs/design.md', '/.gitignore', '/.impeccable/config.json', '/tests/site-check.mjs', '/tests/fixtures/kabu-shinkoku-og.html'];
const toggleCase = s => s.replace(/[a-zA-Z]/, c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase());
const enc = c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
const variants = p => [
  toggleCase(p), p + '/', '/' + p, '/.' + p,
  p.replace(/^\/(.)/, (_, c) => '/' + enc(c)),     // 先頭の1文字を %エンコード
  p.replace(/\.(?=[^./]+$)/, '%2E'),               // 拡張子の前の「.」を %エンコード
];
const VARIANTS = [...new Set(SAMPLES.flatMap(variants))].filter(v => !SAMPLES.includes(v));
const DIRS = ['/agent-docs', '/agent-docs/', '/tests', '/tests/', '/.impeccable/', '/.git/config', '/.env', '/.wrangler/'];

// 2. 手元で middleware を呼ぶ
const call = async (href) => {
  let passed = false;
  const res = await onRequest({ request: new Request(href), next: async () => { passed = true; return new Response('next', { status: 200 }); } });
  return { res, passed };
};
const H = 'https://shigoto-keisan.com';
for (const p of [...priv.filter(x => x.kind === 'middleware').map(x => '/' + x.f), ...VARIANTS, ...DIRS]) {
  const { res, passed } = await call(H + p);
  ok(res.status === 404 && !passed, '手元 ' + p + ' → ' + res.status);
}
const PASS = ['/', '/api/count', '/api/note', '/.well-known/', '/.well-known/security.txt', '/no-such-page/', ...pub.map(f => '/' + f)];
for (const p of PASS) {
  const { passed } = await call(H + p);
  ok(passed, '手元 ' + p + ' → 素通し');
}
for (const [from, to] of [
  ['https://shigoto-keisan.pages.dev/guide/?a=1', 'https://shigoto-keisan.com/guide/?a=1'],
  ['https://www.shigoto-keisan.com/', 'https://shigoto-keisan.com/'],
  ['https://www.shigoto-keisan.com/.gitignore', 'https://shigoto-keisan.com/.gitignore'],
]) {
  const { res } = await call(from);
  ok(res.status === 301 && res.headers.get('location') === to, '手元 転送 ' + from + ' → ' + res.status + ' ' + res.headers.get('location'));
}
{
  const { passed } = await call('https://block-more-files.shigoto-keisan.pages.dev/');
  ok(passed, '手元 確認用URL(ブランチ)は転送しない');
}
console.log(`手元の検査まで:NG ${ng} 件`);

// 3. 実際のサイトに問い合わせる(同時に開くのは5つまで)
const base = (process.argv[2] || process.env.SITE_URL || '').replace(/\/$/, '');
const ref = (process.env.REF_URL || '').replace(/\/$/, '');
const get = (u, method = 'GET') => fetch(u, { redirect: 'manual', method });
const pool = async (items, fn, n = 5) => {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
};
if (base) {
  const hide = [...priv.map(x => '/' + x.f), ...VARIANTS, ...DIRS];
  const hideRes = await pool(hide, async p => { const r = await get(base + p); await r.body?.cancel(); return [p, r.status]; });
  let n404 = 0;
  for (const [p, s] of hideRes) if (ok(s === 404, '公開しない ' + p + ' → ' + s)) n404++;

  // 公開する物:ファイルのURL と、index.html はフォルダのURL(/seikyusho/)も
  const show = [];
  for (const f of pub) {
    show.push(['/' + f, f.endsWith('.html')]);
    if (f.endsWith('index.html')) show.push(['/' + f.slice(0, -'index.html'.length), false]);
  }
  show.push(['/api/note', false]);
  const showRes = await pool(show, async ([p, html]) => { const r = await get(base + p, 'HEAD'); return [p, html, r.status, r.headers.get('location')]; });
  let n200 = 0, n308 = 0;
  for (const [p, html, s, loc] of showRes) {
    if (s === 200) { n200++; continue; }
    if (html && s === 308 && loc && !/\.html$/.test(loc)) { n308++; continue; }
    ok(false, '公開する ' + p + ' → ' + s + (loc ? ' ' + loc : ''));
  }
  {
    const r = await get(base + '/api/count');
    ok(r.status === 405, '/api/count(GET)→ ' + r.status + '(期待 405。POST 専用)');
    const r4 = await get(base + '/no-such-page-' + Date.now() + '/');
    ok(r4.status === 404 && /text\/html/.test(r4.headers.get('content-type') || ''), '存在しないURL → ' + r4.status + '(404 ページ)');
  }
  if (ref) {
    for (const p of ['/', '/api/count', '/api/note', '/llms.txt', '/robots.txt', '/ads.txt']) {
      const [a, b] = [await get(base + p), await get(ref + p)];
      ok(a.status === b.status, '変更前と同じステータス ' + p + ' ' + a.status + ' / ' + b.status);
      if (/\.txt$/.test(p)) ok((await a.text()) === (await b.text()), '変更前と同じ中身 ' + p);
    }
  }
  console.log(`実際のサイト:公開しない ${hide.length} 件中 404 が ${n404} 件 / 公開する ${show.length} 件中 200 が ${n200} 件・308 が ${n308} 件`);
} else {
  console.log('(base-url がないため、実際のサイトへの問い合わせは省いた)');
}

console.log(ng ? `NG ${ng}件` : 'すべてOK');
process.exit(ng ? 1 : 0);
