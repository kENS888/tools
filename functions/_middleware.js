// 旧アドレス(shigoto-keisan.pages.dev)と www を、本番ドメイン shigoto-keisan.com に301転送する
// ブランチの確認用URL(〇〇.shigoto-keisan.pages.dev)は転送しない
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'shigoto-keisan.pages.dev' || url.hostname === 'www.shigoto-keisan.com') {
    url.hostname = 'shigoto-keisan.com';
    return Response.redirect(url.toString(), 301);
  }
  // エージェント向けの内部資料(CLAUDE.md など)は公開しない。404 を返す(2026-11-12)
  // llms.txt・robots.txt・sitemap.xml は公開のまま
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch (e) {}
  // //CLAUDE.md のようにスラッシュを重ねても配信されるため、1つにまとめてから判定する
  path = path.replace(/\/{2,}/g, '/');
  // 「.」で始まる名前(.gitignore・.impeccable/ など)と tests/ も公開しない(2026-11-12)。/.well-known/ は外部サービスの確認用なので通す
  const hidden = /(^|\/)\./.test(path) && !/^\/\.well-known(\/|$)/i.test(path);
  if (/^\/(CLAUDE|AGENTS|LESSONS|PRODUCT)\.md\/?$/i.test(path) || /^\/(agent-docs|tests)(\/|$)/i.test(path) || hidden) {
    return new Response('404 Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' },
    });
  }
  return context.next();
}
