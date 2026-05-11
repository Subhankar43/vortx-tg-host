// functions/api/admin.js
// Admin API — protected by ADMIN_PASSWORD env var
// GET  /api/admin?action=users|stats
// POST /api/admin  { action: 'approve'|'reject'|'delete', userId }

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getAdminCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|; )admin_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function isAdmin(request, env) {
  const token = getAdminCookie(request);
  if (!token) return false;
  const raw = await env.KV.get(`admin_session:${token}`);
  return !!raw;
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'users';

  if (action === 'users') {
    // List all users
    const list = await env.KV.list({ prefix: 'user:' });
    const users = [];
    for (const key of list.keys) {
      const raw = await env.KV.get(key.name);
      if (raw) {
        const u = JSON.parse(raw);
        // Don't expose passwordHash
        users.push({
          userId: u.userId,
          email: u.email,
          status: u.status || 'approved',
          createdAt: u.createdAt
        });
      }
    }
    return json({ users });
  }

  if (action === 'stats') {
    // Global analytics from KV
    const raw = await env.KV.get('stats:global');
    const stats = raw ? JSON.parse(raw) : { downloads: {}, previews: {}, copies: {} };
    return json({ stats });
  }

  if (action === 'filestats') {
    // Per-user file stats
    const list = await env.KV.list({ prefix: 'filestats:' });
    const allStats = [];
    for (const key of list.keys) {
      const raw = await env.KV.get(key.name);
      if (raw) allStats.push({ key: key.name, ...JSON.parse(raw) });
    }
    return json({ filestats: allStats });
  }

  return json({ error: 'Unknown action.' }, 400);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();

  // Admin login
  if (body.action === 'login') {
    const { password } = body;
    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return json({ error: 'Wrong admin password.' }, 401);
    }
    const token = crypto.randomUUID();
    await env.KV.put(`admin_session:${token}`, '1', { expirationTtl: 60 * 60 * 8 }); // 8 hours
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', `admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60*60*8}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);

  const { action, userId } = body;

  if (action === 'approve' || action === 'reject') {
    // Find user by userId
    const emailRaw = await env.KV.get(`userId:${userId}`);
    if (!emailRaw) return json({ error: 'User not found.' }, 404);
    const userRaw = await env.KV.get(`user:${emailRaw}`);
    if (!userRaw) return json({ error: 'User not found.' }, 404);
    const user = JSON.parse(userRaw);
    user.status = action === 'approve' ? 'approved' : 'rejected';
    await env.KV.put(`user:${emailRaw}`, JSON.stringify(user));
    return json({ ok: true, status: user.status });
  }

  if (action === 'delete') {
    const emailRaw = await env.KV.get(`userId:${userId}`);
    if (!emailRaw) return json({ error: 'User not found.' }, 404);
    // Delete user record
    await env.KV.delete(`user:${emailRaw}`);
    await env.KV.delete(`userId:${userId}`);
    // Delete all their files from KV
    const fileList = await env.KV.list({ prefix: `file:${userId}:` });
    for (const key of fileList.keys) {
      await env.KV.delete(key.name);
    }
    return json({ ok: true });
  }

  if (action === 'logout') {
    const token = getAdminCookie(request);
    if (token) await env.KV.delete(`admin_session:${token}`);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', 'admin_session=; Path=/; HttpOnly; Max-Age=0');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  return json({ error: 'Unknown action.' }, 400);
}
