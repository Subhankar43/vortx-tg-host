// functions/api/delete.js
// POST /api/delete  { fileId }

import { getSession } from './me.js';

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Not authenticated.' }, 401);

  try {
    const { fileId } = await request.json();
    if (!fileId) return json({ error: 'fileId is required.' }, 400);

    const key = `file:${session.userId}:${fileId}`;
    const existing = await env.KV.get(key);
    if (!existing) return json({ error: 'File not found or not yours.' }, 404);

    await env.KV.delete(key);
    // Track deletion
    const today = new Date().toISOString().slice(0, 10);
    const globalRaw = await env.KV.get('stats:global');
    const global = globalRaw ? JSON.parse(globalRaw) : { downloads: {}, previews: {}, copies: {}, deletes: {} };
    global.deletes = global.deletes || {};
    global.deletes[today] = (global.deletes[today] || 0) + 1;
    await env.KV.put('stats:global', JSON.stringify(global));
    return json({ ok: true });

  } catch (e) {
    return json({ error: 'Server error: ' + e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
