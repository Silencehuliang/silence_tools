import { jsonResponse } from '../cors.js';

export async function handleProfile(request, env, session) {
  const method = request.method;

  if (method === 'GET') {
    const user = await env.DB.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?')
      .bind(session.userId).first();

    return jsonResponse({ user });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
