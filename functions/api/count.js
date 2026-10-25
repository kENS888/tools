// 利用回数だけを数える(どのツールで、どのボタンが、何回押されたか)。
// 入力内容・IPアドレス・Cookieなど、個人を特定する情報は一切受け取らず、記録もしない。
const TOOLS = new Set(['mitsumori','nohinsho','seikyusho','ryoshusho','hacchusho','sofujo','keihi','gensen','eigyobi','shohizei','hiwari','nenmatsu','furusato','zangyo']);
const EVENTS = new Set(['pdf','print','copy']);
export async function onRequestPost({ request, env }) {
  const u = new URL(request.url);
  const t = u.searchParams.get('t'), e = u.searchParams.get('e');
  if (!TOOLS.has(t) || !EVENTS.has(e) || !env.COUNTS) return new Response(null, { status: 204 });
  const d = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 日本時間の日付
  const key = d + ':' + t + ':' + e;
  try {
    const n = parseInt((await env.COUNTS.get(key)) || '0', 10) + 1;
    await env.COUNTS.put(key, String(n));
  } catch (_) {}
  return new Response(null, { status: 204 });
}
export async function onRequestGet() { return new Response(null, { status: 405 }); }
