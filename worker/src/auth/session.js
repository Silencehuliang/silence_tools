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
