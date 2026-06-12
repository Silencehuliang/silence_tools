import { jsonResponse } from '../cors.js';

export async function handleAlerts(request, env, session) {
  const method = request.method;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(session.userId).all();
    return jsonResponse({ alerts: result.results });
  }

  if (method === 'POST') {
    const body = await request.json();
    const { alert_type, target_price } = body;

    if (!alert_type || !target_price) {
      return jsonResponse({ error: '缺少必要参数' }, 400);
    }

    if (!['above', 'below', 'change'].includes(alert_type)) {
      return jsonResponse({ error: '无效的提醒类型' }, 400);
    }

    const result = await env.DB.prepare(
      'INSERT INTO alerts (user_id, alert_type, target_price) VALUES (?, ?, ?)'
    ).bind(session.userId, alert_type, target_price).run();

    return jsonResponse({
      id: result.meta.last_row_id,
      user_id: session.userId,
      alert_type,
      target_price,
      is_active: 1
    }, 201);
  }

  if (method === 'DELETE') {
    const alertId = pathParts[2];
    if (!alertId) {
      return jsonResponse({ error: '缺少提醒ID' }, 400);
    }

    await env.DB.prepare(
      'DELETE FROM alerts WHERE id = ? AND user_id = ?'
    ).bind(alertId, session.userId).run();

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
