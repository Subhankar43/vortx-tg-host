// functions/api/upload.js
// POST /api/upload  (multipart form-data, field: "file")
// Env vars needed: TG_BOT_TOKEN, TG_CHAT_ID

import { getSession } from './me.js';

export async function onRequestPost({ request, env }) {
  // Auth check
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Not authenticated.' }, 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return json({ error: 'No file provided.' }, 400);

    const fileSize = file.size;
    if (fileSize > 50 * 1024 * 1024) {
      return json({ error: 'File too large. Max 50MB.' }, 400);
    }

    const fileName = file.name || 'unnamed_file';
    const mimeType = file.type || 'application/octet-stream';

    // Upload to Telegram
    const tgForm = new FormData();
    tgForm.append('chat_id', env.TG_CHAT_ID);
    tgForm.append('document', file, fileName);
    // Caption stores owner info (userId) so we can trace it back
    const uploadDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const fileSizeStr = fileSize < 1024*1024 ? (fileSize/1024).toFixed(1)+' KB' : (fileSize/(1024*1024)).toFixed(1)+' MB';
tgForm.append('caption', `👤 Owner: ${session.email}\n📄 File: ${fileName}\n📅 Date: ${uploadDate}\n💾 Size: ${fileSizeStr}`);

    const tgRes = await fetch(
      `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendDocument`,
      { method: 'POST', body: tgForm }
    );
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return json({ error: 'Telegram upload failed: ' + tgData.description }, 500);
    }

    // Get the file_id from Telegram response
    // Telegram returns different fields depending on file type:
    // sendDocument → .document, but WEBP/images can come as .photo (array), .sticker, etc.
    const result = tgData.result;
    const tgFileObj =
      result.document ||
      result.video ||
      result.audio ||
      result.voice ||
      result.sticker ||
      result.animation ||
      (result.photo && result.photo[result.photo.length - 1]); // photo is an array, pick highest res

    if (!tgFileObj || !tgFileObj.file_id) {
      return json({ error: 'Telegram did not return a file_id. Response: ' + JSON.stringify(result) }, 500);
    }

    const tgFileId = tgFileObj.file_id;
    const fileId = crypto.randomUUID(); // Our own internal ID

    // Save metadata to KV
    const meta = {
      fileId,
      tgFileId,
      fileName,
      fileSize,
      mimeType,
      uploadedAt: Date.now(),
      userId: session.userId
    };

    await env.KV.put(`file:${session.userId}:${fileId}`, JSON.stringify(meta));

    return json({ ok: true, fileId, fileName, fileSize, mimeType });

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
