// functions/api/login.js
// POST /api/login  { email, password }

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required.' }, 400);
    }

    const emailKey = `user:${email.toLowerCase()}`;
    const raw = await env.KV.get(emailKey);
    if (!raw) {
      return json({ error: 'Invalid email or password.' }, 401);
    }

    const user = JSON.parse(raw);
    const passwordHash = await hashPassword(password);

    if (passwordHash !== user.passwordHash) {
      return json({ error: 'Invalid email or password.' }, 401);
    }

    // Check approval status
    if (user.status === 'pending') {
      return json({ error: 'Your account is pending admin approval. Please wait.' }, 403);
    }
    if (user.status === 'rejected') {
      return json({ error: 'Your account has been rejected by admin.' }, 403);
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    await env.KV.put(
      `session:${sessionToken}`,
      JSON.stringify({ userId: user.userId, email: user.email }),
      { expirationTtl: 60 * 60 * 24 * 30 }
    );

    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60*60*24*30}`);

    return new Response(JSON.stringify({ ok: true, email: user.email }), { status: 200, headers });

  } catch (e) {
    return json({ error: 'Server error: ' + e.message }, 500);
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
