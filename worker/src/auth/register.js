import { hashPassword } from '../crypto.js';
import { jsonResponse } from '../cors.js';
import { createSession } from './session.js';

export async function handleRegister(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { username, password } = await request.json();

    // 参数校验
    if (!username || !password) {
      return jsonResponse({ error: '用户名和密码不能为空' }, 400);
    }

    if (username.length < 3 || username.length > 20) {
      return jsonResponse({ error: '用户名长度需在3-20个字符之间' }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: '密码长度至少6个字符' }, 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return jsonResponse({ error: '用户名只能包含字母、数字和下划线' }, 400);
    }

    // 检查用户名是否已存在
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();

    if (existing) {
      return jsonResponse({ error: '用户名已被注册' }, 409);
    }

    // 哈希密码
    const { hash, salt } = await hashPassword(password);

    // 创建用户
    const result = await env.DB.prepare(
      'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)'
    ).bind(username, hash, salt).run();

    // 创建会话
    const session = await createSession(env.DB, result.meta.last_row_id);

    const response = jsonResponse({
      success: true,
      user: { id: result.meta.last_row_id, username, role: 'user' }
    });
    response.headers.append('Set-Cookie',
      `session=${session.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
    );
    return response;

  } catch (err) {
    console.error('Register error:', err);
    return jsonResponse({ error: '注册失败，请重试' }, 500);
  }
}
