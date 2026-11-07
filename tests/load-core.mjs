// ページ内の <script id="core"> を取り出して Node で読み込む(ページと同じロジックをテストするため)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
export function loadCore(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('script#core が見つかりません: ' + htmlPath);
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(m[1], ctx);
  return ctx.module.exports;
}
