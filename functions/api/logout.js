// functions/api/logout.js
// POST /api/logout

export async function onRequestPost({ request, env }) {
  const cookie = request.headers.get('Cookie') || '';
  const token = getCookie(cookie, 'session');

  if (token) {
    await env.KV.delete(`session:${token}`);
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function getCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
