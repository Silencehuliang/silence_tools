export async function upsertUser(db, userData) {
  const { provider, provider_id, username, avatar_url, email } = userData;
  
  const existing = await db.prepare(
    'SELECT * FROM users WHERE provider = ? AND provider_id = ?'
  ).bind(provider, provider_id).first();

  if (existing) {
    await db.prepare(
      'UPDATE users SET username = ?, avatar_url = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(username, avatar_url, email, existing.id).run();
    return { ...existing, username, avatar_url, email };
  }

  const result = await db.prepare(
    'INSERT INTO users (provider, provider_id, username, avatar_url, email) VALUES (?, ?, ?, ?, ?)'
  ).bind(provider, provider_id, username, avatar_url, email).run();

  return {
    id: result.meta.last_row_id,
    provider,
    provider_id,
    username,
    avatar_url,
    email
  };
}

export async function createSession(db, userId, provider) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await db.prepare(
    'INSERT INTO sessions (token, user_id, provider, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, provider, expiresAt).run();

  return { token, expiresAt };
}

export async function getSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;

  const token = match[1];
  const session = await env.DB.prepare(`
    SELECT s.*, u.id as uid, u.username, u.avatar_url, u.email, u.encrypted_profile
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();

  if (!session) return null;

  return {
    token: session.token,
    userId: session.uid,
    provider: session.provider,
    user: {
      id: session.uid,
      username: session.username,
      avatar_url: session.avatar_url,
      email: session.email
    }
  };
}

export async function clearSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (match) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  }
  const response = new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
  response.headers.append('Set-Cookie',
    'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  );
  return response;
}

export async function getUserAlerts(db, userId) {
  const result = await db.prepare(
    'SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();
  return result.results;
}

export async function createAlert(db, userId, alertType, targetPrice) {
  const result = await db.prepare(
    'INSERT INTO alerts (user_id, alert_type, target_price) VALUES (?, ?, ?)'
  ).bind(userId, alertType, targetPrice).run();
  return { id: result.meta.last_row_id, user_id: userId, alert_type: alertType, target_price: targetPrice };
}

export async function deleteAlert(db, userId, alertId) {
  await db.prepare(
    'DELETE FROM alerts WHERE id = ? AND user_id = ?'
  ).bind(alertId, userId).run();
}
