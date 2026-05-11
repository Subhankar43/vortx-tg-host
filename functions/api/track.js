// functions/api/track.js
// POST /api/track  { fileId, type: 'download'|'preview'|'copy' }
// Public endpoint — no auth required (anyone accessing a file can trigger)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const { fileId, type } = await request.json();
    if (!fileId || !['download', 'preview', 'copy'].includes(type)) {
      return json({ error: 'Invalid params.' }, 400);
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Update global stats
    const globalRaw = await env.KV.get('stats:global');
    const global = globalRaw ? JSON.parse(globalRaw) : { downloads: {}, previews: {}, copies: {} };

    const bucket = type === 'download' ? 'downloads' : type === 'preview' ? 'previews' : 'copies';
    global[bucket][today] = (global[bucket][today] || 0) + 1;

    await env.KV.put('stats:global', JSON.stringify(global));

    // Update per-file stats
    const fileStatsKey = `filestats:${fileId}`;
    const fileStatsRaw = await env.KV.get(fileStatsKey);
    const fileStats = fileStatsRaw ? JSON.parse(fileStatsRaw) : { downloads: 0, previews: 0, copies: 0, fileId };
    fileStats[bucket] = (fileStats[bucket] || 0) + 1;
    fileStats.lastActivity = Date.now();
    await env.KV.put(fileStatsKey, JSON.stringify(fileStats));

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'Server error: ' + e.message }, 500);
  }
}
