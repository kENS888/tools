// 旧アドレス(shigoto-keisan.pages.dev)と www を、本番ドメイン shigoto-keisan.com に301転送する
// ブランチの確認用URL(〇〇.shigoto-keisan.pages.dev)は転送しない
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'shigoto-keisan.pages.dev' || url.hostname === 'www.shigoto-keisan.com') {
    url.hostname = 'shigoto-keisan.com';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
