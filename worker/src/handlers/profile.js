import { encrypt, decrypt } from '../crypto.js';
import { jsonResponse } from '../cors.js';

export async function handleProfile(request, env, session) {
  const method = request.method;

  if (method === 'GET') {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.userId).first();
    
    let profile = null;
    if (user.encrypted_profile && env.ENCRYPTION_KEY) {
      try {
        profile = await decrypt(user.encrypted_profile, env.ENCRYPTION_KEY);
      } catch (e) {
        profile = null;
      }
    }

    return jsonResponse({
      user: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        email: user.email,
        provider: user.provider,
        created_at: user.created_at
      },
      profile
    });
  }

  if (method === 'PUT') {
    const body = await request.json();
    const { profile } = body;

    if (!profile) {
      return jsonResponse({ error: '缺少 profile 数据' }, 400);
    }

    let encryptedProfile = null;
    if (env.ENCRYPTION_KEY) {
      encryptedProfile = await encrypt(profile, env.ENCRYPTION_KEY);
    }

    await env.DB.prepare(
      'UPDATE users SET encrypted_profile = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(encryptedProfile, session.userId).run();

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
