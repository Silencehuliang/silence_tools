import { jsonResponse } from '../cors.js';

export async function handleResetRequest(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { username } = await request.json();

    if (!username) {
      return jsonResponse({ error: '请输入用户名' }, 400);
    }

    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();

    // 不透露用户名是否存在
    if (!user) {
      return jsonResponse({ success: true, message: '如果该用户存在，重置申请已提交' });
    }

    // 检查是否已有待处理的申请
    const existing = await env.DB.prepare(
      "SELECT id FROM password_resets WHERE user_id = ? AND status = 'pending'"
    ).bind(user.id).first();

    if (existing) {
      return jsonResponse({ success: true, message: '如果该用户存在，重置申请已提交' });
    }

    await env.DB.prepare(
      'INSERT INTO password_resets (user_id) VALUES (?)'
    ).bind(user.id).run();

    return jsonResponse({ success: true, message: '如果该用户存在，重置申请已提交' });

  } catch (err) {
    console.error('Reset request error:', err);
    return jsonResponse({ error: '提交失败，请重试' }, 500);
  }
}

export async function handleAdminResetRequests(request, env, session) {
  if (session.user.role !== 'admin') {
    return jsonResponse({ error: '无权限' }, 403);
  }

  if (request.method === 'GET') {
    const result = await env.DB.prepare(`
      SELECT pr.*, u.username 
      FROM password_resets pr 
      JOIN users u ON pr.user_id = u.id 
      ORDER BY pr.requested_at DESC
    `).all();
    return jsonResponse({ requests: result.results });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

export async function handleAdminApproveReset(request, env, session, resetId) {
  if (session.user.role !== 'admin') {
    return jsonResponse({ error: '无权限' }, 403);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const reset = await env.DB.prepare(
      "SELECT * FROM password_resets WHERE id = ? AND status = 'pending'"
    ).bind(resetId).first();

    if (!reset) {
      return jsonResponse({ error: '申请不存在或已处理' }, 404);
    }

    // 生成随机新密码
    const newPassword = crypto.randomUUID().slice(0, 12);
    const { hash, salt } = await (await import('../crypto.js')).hashPassword(newPassword);

    // 更新用户密码
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(hash, salt, reset.user_id).run();

    // 更新申请状态
    await env.DB.prepare(
      "UPDATE password_resets SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, new_password = ? WHERE id = ?"
    ).bind(session.userId, newPassword, resetId).run();

    return jsonResponse({ 
      success: true, 
      message: '密码已重置',
      newPassword: newPassword
    });

  } catch (err) {
    console.error('Approve reset error:', err);
    return jsonResponse({ error: '操作失败' }, 500);
  }
}

export async function handleAdminRejectReset(request, env, session, resetId) {
  if (session.user.role !== 'admin') {
    return jsonResponse({ error: '无权限' }, 403);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    await env.DB.prepare(
      "UPDATE password_resets SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND status = 'pending'"
    ).bind(session.userId, resetId).run();

    return jsonResponse({ success: true, message: '已拒绝' });

  } catch (err) {
    console.error('Reject reset error:', err);
    return jsonResponse({ error: '操作失败' }, 500);
  }
}
