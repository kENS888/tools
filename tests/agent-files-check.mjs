// 使い方: node tests/agent-files-check.mjs [base-url]   (base-url は環境変数 SITE_URL でも渡せる)
//   例: node tests/agent-files-check.mjs https://block-agent-files.shigoto-keisan.pages.dev
//   base-url を省くと、1. の手元の検査だけを行う
//   REF_URL に変更前のサイト(例: https://shigoto-keisan.com)を渡すと、公開のままのページのステータスと、llms.txt などの中身が同じかも比べる
// エージェント向けの内部資料(CLAUDE.md・AGENTS.md・LESSONS.md・PRODUCT.md・agent-docs/)を配信しないことを確かめる(2026-11-12)
//   1. functions/_middleware.js を手元で呼び、404・素通し・301 転送を確かめる
//   2. base-url に実際に問い合わせ、ステータスを確かめる
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('../functions/_middleware.js', import.meta.url)), 'utf8');
const { onRequest } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(src));

const BLOCKED = [
  '/CLAUDE.md', '/AGENTS.md', '/LESSONS.md', '/PRODUCT.md',
  '/claude.md', '/CLAUDE.md/', '//CLAUDE.md', '/%43LAUDE.md', '/CLAUDE%2Emd', '/./AGENTS.md',
  '/agent-docs/', '/agent-docs/design.md', '/agent-docs/user-audit.md', '/agent-docs',
];
// 変更前と同じく配信するもの。期待するステータスは変更前の本番で確かめた値(/api/count は POST 専用のため GET は 405)
const PUBLIC = [
  ['/', 200], ['/llms.txt', 200], ['/robots.txt', 200], ['/sitemap.xml', 200],
  ['/nenmatsu/', 200], ['/kabu-shinkoku/', 200], ['/seikyusho/', 200], ['/guide/', 200],
  ['/api/count', 405], ['/api/note', 200],
];
const SAME_BODY = ['/llms.txt', '/robots.txt'];

let ng = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK ' : 'NG ') + msg); if (!cond) ng++; };

// 1. 手元で middleware を呼ぶ
const call = async (href) => {
  let passed = false;
  const res = await onRequest({ request: new Request(href), next: async () => { passed = true; return new Response('next', { status: 200 }); } });
  return { res, passed };
};
for (const p of BLOCKED) {
  const { res, passed } = await call('https://shigoto-keisan.com' + p);
  ok(res.status === 404 && !passed, '手元 ' + p + ' → ' + res.status);
}
for (const [p] of PUBLIC) {
  const { passed } = await call('https://shigoto-keisan.com' + p);
  ok(passed, '手元 ' + p + ' → 素通し');
}
for (const [from, to] of [
  ['https://shigoto-keisan.pages.dev/guide/?a=1', 'https://shigoto-keisan.com/guide/?a=1'],
  ['https://www.shigoto-keisan.com/', 'https://shigoto-keisan.com/'],
  ['https://www.shigoto-keisan.com/CLAUDE.md', 'https://shigoto-keisan.com/CLAUDE.md'],
]) {
  const { res } = await call(from);
  ok(res.status === 301 && res.headers.get('location') === to, '手元 転送 ' + from + ' → ' + res.status + ' ' + res.headers.get('location'));
}
{
  const { passed } = await call('https://block-agent-files.shigoto-keisan.pages.dev/');
  ok(passed, '手元 確認用URL(ブランチ)は転送しない');
}

// 2. 実際のサイトに問い合わせる
const base = (process.argv[2] || process.env.SITE_URL || '').replace(/\/$/, '');
const ref = (process.env.REF_URL || '').replace(/\/$/, '');
const get = (u) => fetch(u, { redirect: 'manual' });
if (base) {
  for (const p of BLOCKED) {
    const r = await get(base + p);
    ok(r.status === 404, base + p + ' → ' + r.status);
  }
  for (const [p, want] of PUBLIC) {
    const r = await get(base + p);
    ok(r.status === want, base + p + ' → ' + r.status + '(期待 ' + want + ')');
    if (ref) {
      const r2 = await get(ref + p);
      ok(r.status === r2.status, '変更前と同じステータス ' + p + ' ' + r.status + ' / ' + r2.status);
      if (SAME_BODY.includes(p)) ok((await r.text()) === (await r2.text()), '変更前と同じ中身 ' + p);
    }
  }
} else {
  console.log('(base-url がないため、実際のサイトへの問い合わせは省いた)');
}

console.log(ng ? `NG ${ng}件` : 'すべてOK');
process.exit(ng ? 1 : 0);
