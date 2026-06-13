import { verifyPassword } from '../crypto.js';
import { jsonResponse } from '../cors.js';
import { createSession } from './session.js';

export async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return jsonResponse({ error: '用户名和密码不能为空' }, 400);
    }

    // 查找用户
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).bind(username).first();

    // 通用错误信息，不透露用户名是否存在
    const invalidMsg = '用户名或密码错误';

    if (!user) {
      return jsonResponse({ error: invalidMsg }, 401);
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password_hash, user.password_salt);

    if (!valid) {
      return jsonResponse({ error: invalidMsg }, 401);
    }

    // 创建会话
    const session = await createSession(env.DB, user.id);

    const response = jsonResponse({
      success: true,
      user: { id: user.id, username: user.username, role: user.role }
    });
    response.headers.append('Set-Cookie',
      `session=${session.token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`
    );
    return response;

  } catch (err) {
    console.error('Login error:', err);
    return jsonResponse({ error: '登录失败，请重试' }, 500);
  }
}
