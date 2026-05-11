// functions/api/signup.js
// POST /api/signup  { email, password }
// User gets created with status: "pending" — admin must approve

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required.' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters.' }, 400);
    }

    const emailKey = `user:${email.toLowerCase()}`;
    const existing = await env.KV.get(emailKey);
    if (existing) {
      return json({ error: 'Account already exists with this email.' }, 409);
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const user = {
      userId,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: Date.now(),
      status: 'pending'  // <-- Admin approval required
    };

    await env.KV.put(emailKey, JSON.stringify(user));
    await env.KV.put(`userId:${userId}`, email.toLowerCase());

    // No session created — user must wait for approval
    return json({ ok: true, pending: true });

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
