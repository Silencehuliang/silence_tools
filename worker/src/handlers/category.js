import { jsonResponse } from '../cors.js';

export async function handleCategory(request, env, session) {
  if (!session) return jsonResponse({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const userId = session.user.id;

  if (path === '/api/expense/categories' && method === 'GET') {
    return await getCategories(env, userId);
  }
  if (path === '/api/expense/categories' && method === 'POST') {
    return await createCategory(request, env, userId);
  }

  const deleteMatch = path.match(/^\/api\/expense\/categories\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    return await deleteCategory(env, userId, parseInt(deleteMatch[1]));
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function getCategories(env, userId) {
  try {
    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();

    const systemCategories = await env.DB.prepare(
      'SELECT id, name, icon, sort_order, 1 as is_system FROM expense_categories WHERE family_id IS NULL ORDER BY sort_order'
    ).all();

    let customCategories = { results: [] };
    if (member) {
      customCategories = await env.DB.prepare(
        'SELECT id, name, icon, sort_order, 0 as is_system FROM expense_categories WHERE family_id = ? ORDER BY sort_order'
      ).bind(member.family_id).all();
    }

    return jsonResponse({
      categories: [...systemCategories.results, ...customCategories.results]
    });
  } catch (err) {
    console.error('getCategories error:', err);
    return jsonResponse({ error: '获取分类失败' }, 500);
  }
}

async function createCategory(request, env, userId) {
  try {
    const { name, icon } = await request.json();
    if (!name || name.trim().length === 0) {
      return jsonResponse({ error: '分类名称不能为空' }, 400);
    }

    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (!member) {
      return jsonResponse({ error: '你尚未加入任何家庭' }, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM expense_categories WHERE family_id = ? AND name = ?'
    ).bind(member.family_id, name.trim()).first();
    if (existing) {
      return jsonResponse({ error: '该分类已存在' }, 409);
    }

    const maxOrder = await env.DB.prepare(
      'SELECT MAX(sort_order) as max_order FROM expense_categories WHERE family_id = ?'
    ).bind(member.family_id).first();

    const result = await env.DB.prepare(
      'INSERT INTO expense_categories (family_id, name, icon, sort_order) VALUES (?, ?, ?, ?)'
    ).bind(member.family_id, name.trim(), icon || null, (maxOrder.max_order || 0) + 1).run();

    return jsonResponse({
      category: { id: result.meta.last_row_id, name: name.trim(), icon: icon || null, is_system: false }
    });
  } catch (err) {
    console.error('createCategory error:', err);
    return jsonResponse({ error: '创建分类失败' }, 500);
  }
}

async function deleteCategory(env, userId, categoryId) {
  try {
    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (!member) {
      return jsonResponse({ error: '你尚未加入任何家庭' }, 400);
    }

    const category = await env.DB.prepare(
      'SELECT * FROM expense_categories WHERE id = ? AND family_id = ?'
    ).bind(categoryId, member.family_id).first();
    if (!category) {
      return jsonResponse({ error: '分类不存在或无法删除' }, 404);
    }

    const inUse = await env.DB.prepare(
      'SELECT id FROM expenses WHERE category_id = ? LIMIT 1'
    ).bind(categoryId).first();
    if (inUse) {
      return jsonResponse({ error: '该分类已被账单引用，无法删除' }, 409);
    }

    await env.DB.prepare(
      'DELETE FROM expense_categories WHERE id = ?'
    ).bind(categoryId).run();

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('deleteCategory error:', err);
    return jsonResponse({ error: '删除分类失败' }, 500);
  }
}
