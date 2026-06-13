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
