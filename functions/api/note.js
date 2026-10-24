// noteの記事一覧(RSS)を取得して、サイト表示用のJSONにして返す。1時間キャッシュ。
const RSS = 'https://note.com/k88855888/rss';
function pick(s, tag) {
  const m = s.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}
function text(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
export function parse(xml) {
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 30).map(it => {
    const link = pick(it, 'link');
    const thumb = (it.match(/<media:thumbnail[^>]*>([^<]+)<\/media:thumbnail>/) || it.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1] || '';
    const d = new Date(pick(it, 'pubDate'));
    return {
      title: text(pick(it, 'title')),
      link: /^https:\/\/note\.com\//.test(link) ? link : '',
      date: isNaN(d) ? '' : d.toISOString().slice(0, 10),
      thumb: /^https:\/\//.test(thumb.trim()) ? thumb.trim() : '',
      desc: text(pick(it, 'description')).slice(0, 300),
    };
  }).filter(x => x.title && x.link);
}
export async function onRequest(context) {
  const cache = caches.default;
  const key = new Request(new URL('/api/note', context.request.url).toString());
  let res = await cache.match(key);
  if (res) return res;
  let items = [];
  try {
    const r = await fetch(RSS, { headers: { 'User-Agent': 'shigoto-keisan.com' } });
    if (r.ok) items = parse(await r.text());
  } catch (_) {}
  res = new Response(JSON.stringify({ items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
  if (items.length) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
