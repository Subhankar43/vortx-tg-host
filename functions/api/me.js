// functions/api/me.js
// GET /api/me — returns logged-in user info

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Not authenticated.' }, 401);
  
  // Status check karo
  const emailRaw = await env.KV.get(`userId:${session.userId}`);
  if (emailRaw) {
    const userRaw = await env.KV.get(`user:${emailRaw}`);
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user.status === 'rejected' || user.status === 'pending') {
        return json({ error: 'Account not authorized.' }, 403);
      }
    }
  }
  
  return json({ email: session.email, userId: session.userId });
}
export async function getSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const token = getCookie(cookie, 'session');
  if (!token) return null;
  const raw = await env.KV.get(`session:${token}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

function getCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
