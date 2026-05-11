// functions/api/files.js
// GET /api/files — returns all files for logged-in user

import { getSession } from './me.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Not authenticated.' }, 401);

  try {
    // List all KV keys with prefix "file:{userId}:"
    const prefix = `file:${session.userId}:`;
    const list = await env.KV.list({ prefix });

    const files = [];
    for (const key of list.keys) {
      const raw = await env.KV.get(key.name);
      if (raw) files.push(JSON.parse(raw));
    }

    return json({ files });

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
