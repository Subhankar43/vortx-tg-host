// functions/file/[fileId].js
// GET /file/{fileId}          — inline preview (streams from Telegram)
// GET /file/{fileId}?download=1  — force download

export async function onRequestGet({ params, request, env }) {
  const { fileId } = params;
  const url = new URL(request.url);
  const forceDownload = url.searchParams.get('download') === '1';

  try {
    // Search KV for this fileId across all users
    const list = await env.KV.list({ prefix: 'file:' });

    let meta = null;
    for (const key of list.keys) {
      if (key.name.endsWith(`:${fileId}`)) {
        const raw = await env.KV.get(key.name);
        if (raw) { meta = JSON.parse(raw); break; }
      }
    }

    if (!meta) {
      return new Response('File not found.', { status: 404 });
    }

    // Track this access
    try {
      const statsKey = `filestats:${fileId}`;
      const statsRaw = await env.KV.get(statsKey);
      const stats = statsRaw ? JSON.parse(statsRaw) : { downloads: 0, previews: 0, copies: 0, fileId };
      const today = new Date().toISOString().slice(0, 10);

      if (forceDownload) {
        stats.downloads = (stats.downloads || 0) + 1;
        // Global stats
        const globalRaw = await env.KV.get('stats:global');
        const global = globalRaw ? JSON.parse(globalRaw) : { downloads: {}, previews: {}, copies: {} };
        global.downloads[today] = (global.downloads[today] || 0) + 1;
        await env.KV.put('stats:global', JSON.stringify(global));
      } else {
        stats.previews = (stats.previews || 0) + 1;
        const globalRaw = await env.KV.get('stats:global');
        const global = globalRaw ? JSON.parse(globalRaw) : { downloads: {}, previews: {}, copies: {} };
        global.previews[today] = (global.previews[today] || 0) + 1;
        await env.KV.put('stats:global', JSON.stringify(global));
      }
      stats.lastActivity = Date.now();
      await env.KV.put(statsKey, JSON.stringify(stats));
    } catch (_) { /* stats failure should not block file serving */ }

    // Get download URL from Telegram
    const tgRes = await fetch(
      `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${meta.tgFileId}`
    );
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return new Response('Could not retrieve file from Telegram.', { status: 500 });
    }

    const filePath = tgData.result.file_path;
    const tgFileUrl = `https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${filePath}`;

    const fileRes = await fetch(tgFileUrl);

    const headers = new Headers();
    // Use actual mimeType — support all types including webp, audio, etc.
    headers.set('Content-Type', meta.mimeType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=86400');

    if (forceDownload) {
      headers.set('Content-Disposition', `attachment; filename="${meta.fileName}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${meta.fileName}"`);
    }

    return new Response(fileRes.body, { status: 200, headers });

  } catch (e) {
    return new Response('Server error: ' + e.message, { status: 500 });
  }
}
