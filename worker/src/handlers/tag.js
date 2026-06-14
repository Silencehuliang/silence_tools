import { jsonResponse } from '../cors.js';

export async function handleTag(request, env, session) {
  if (!session) return jsonResponse({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const userId = session.user.id;

  if (path === '/api/expense/tags' && method === 'GET') {
    return await getTags(env, userId);
  }
  if (path === '/api/expense/tags' && method === 'POST') {
    return await createTag(request, env, userId);
  }

  const deleteMatch = path.match(/^\/api\/expense\/tags\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    return await deleteTag(env, userId, parseInt(deleteMatch[1]));
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function getTags(env, userId) {
  try {
    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (!member) {
      return jsonResponse({ tags: [] });
    }

    const result = await env.DB.prepare(
      'SELECT id, name FROM expense_tags WHERE family_id = ? ORDER BY name'
    ).bind(member.family_id).all();

    return jsonResponse({ tags: result.results });
  } catch (err) {
    console.error('getTags error:', err);
    return jsonResponse({ error: '获取标签失败' }, 500);
  }
}

async function createTag(request, env, userId) {
  try {
    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return jsonResponse({ error: '标签名称不能为空' }, 400);
    }

    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (!member) {
      return jsonResponse({ error: '你尚未加入任何家庭' }, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM expense_tags WHERE family_id = ? AND name = ?'
    ).bind(member.family_id, name.trim()).first();
    if (existing) {
      return jsonResponse({ error: '该标签已存在' }, 409);
    }

    const result = await env.DB.prepare(
      'INSERT INTO expense_tags (family_id, name) VALUES (?, ?)'
    ).bind(member.family_id, name.trim()).run();

    return jsonResponse({ tag: { id: result.meta.last_row_id, name: name.trim() } });
  } catch (err) {
    console.error('createTag error:', err);
    return jsonResponse({ error: '创建标签失败' }, 500);
  }
}

async function deleteTag(env, userId, tagId) {
  try {
    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (!member) {
      return jsonResponse({ error: '你尚未加入任何家庭' }, 400);
    }

    const tag = await env.DB.prepare(
      'SELECT * FROM expense_tags WHERE id = ? AND family_id = ?'
    ).bind(tagId, member.family_id).first();
    if (!tag) {
      return jsonResponse({ error: '标签不存在' }, 404);
    }

    await env.DB.prepare(
      'DELETE FROM expense_tag_relations WHERE tag_id = ?'
    ).bind(tagId).run();

    await env.DB.prepare(
      'DELETE FROM expense_tags WHERE id = ?'
    ).bind(tagId).run();

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('deleteTag error:', err);
    return jsonResponse({ error: '删除标签失败' }, 500);
  }
}
