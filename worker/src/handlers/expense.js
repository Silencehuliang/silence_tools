import { jsonResponse } from '../cors.js';

export async function handleExpense(request, env, session) {
  if (!session) return jsonResponse({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const userId = session.user.id;

  if (path === '/api/expenses' && method === 'POST') {
    return await createExpense(request, env, userId);
  }
  if (path === '/api/expenses' && method === 'GET') {
    return await listExpenses(request, env, userId);
  }
  if (path === '/api/expenses/stats' && method === 'GET') {
    return await getStats(request, env, userId);
  }
  if (path === '/api/expenses/export' && method === 'GET') {
    return await exportCSV(request, env, userId);
  }

  const updateMatch = path.match(/^\/api\/expenses\/(\d+)$/);
  if (updateMatch && method === 'PUT') {
    return await updateExpense(request, env, userId, parseInt(updateMatch[1]));
  }
  if (updateMatch && method === 'DELETE') {
    return await deleteExpense(env, userId, parseInt(updateMatch[1]));
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function getFamilyId(env, userId) {
  const member = await env.DB.prepare(
    'SELECT family_id FROM family_members WHERE user_id = ?'
  ).bind(userId).first();
  return member ? member.family_id : null;
}

async function getExpenseTags(db, expenseId) {
  const result = await db.prepare(
    `SELECT t.id, t.name FROM expense_tag_relations etr
     JOIN expense_tags t ON etr.tag_id = t.id
     WHERE etr.expense_id = ?`
  ).bind(expenseId).all();
  return result.results;
}

async function setExpenseTags(db, expenseId, tagIds) {
  await db.prepare('DELETE FROM expense_tag_relations WHERE expense_id = ?').bind(expenseId).run();
  if (tagIds && tagIds.length > 0) {
    for (const tagId of tagIds) {
      await db.prepare(
        'INSERT OR IGNORE INTO expense_tag_relations (expense_id, tag_id) VALUES (?, ?)'
      ).bind(expenseId, tagId).run();
    }
  }
}

async function createExpense(request, env, userId) {
  try {
    const familyId = await getFamilyId(env, userId);
    if (!familyId) return jsonResponse({ error: '你尚未加入任何家庭' }, 400);

    const { category_id, amount, description, expense_date, tag_ids } = await request.json();
    if (!category_id || !amount || !expense_date) {
      return jsonResponse({ error: '分类、金额和日期不能为空' }, 400);
    }
    if (amount <= 0) {
      return jsonResponse({ error: '金额必须大于0' }, 400);
    }

    const category = await env.DB.prepare(
      'SELECT * FROM expense_categories WHERE id = ? AND (family_id IS NULL OR family_id = ?)'
    ).bind(category_id, familyId).first();
    if (!category) {
      return jsonResponse({ error: '分类不存在' }, 400);
    }

    const result = await env.DB.prepare(
      'INSERT INTO expenses (family_id, user_id, category_id, amount, description, expense_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(familyId, userId, category_id, amount, description || null, expense_date).run();

    const expenseId = result.meta.last_row_id;
    await setExpenseTags(env.DB, expenseId, tag_ids);

    const tags = await getExpenseTags(env.DB, expenseId);
    const user = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first();

    return jsonResponse({
      expense: {
        id: expenseId, family_id: familyId, user_id: userId, category_id,
        amount, description: description || null, expense_date,
        category_name: category.name, category_icon: category.icon,
        username: user.username, tags
      }
    });
  } catch (err) {
    console.error('createExpense error:', err);
    return jsonResponse({ error: '创建账单失败' }, 500);
  }
}

async function listExpenses(request, env, userId) {
  try {
    const familyId = await getFamilyId(env, userId);
    if (!familyId) return jsonResponse({ error: '你尚未加入任何家庭' }, 400);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '20'), 100);
    const month = url.searchParams.get('month');
    const categoryId = url.searchParams.get('category_id');
    const tagetUserId = url.searchParams.get('user_id');
    const tagId = url.searchParams.get('tag_id');
    const keyword = url.searchParams.get('keyword');

    let where = 'e.family_id = ?';
    let params = [familyId];

    if (month) {
      where += ' AND e.expense_date LIKE ?';
      params.push(month + '%');
    }
    if (categoryId) {
      where += ' AND e.category_id = ?';
      params.push(parseInt(categoryId));
    }
    if (tagetUserId) {
      where += ' AND e.user_id = ?';
      params.push(parseInt(tagetUserId));
    }
    if (keyword) {
      where += ' AND e.description LIKE ?';
      params.push('%' + keyword + '%');
    }
    if (tagId) {
      where += ' AND EXISTS (SELECT 1 FROM expense_tag_relations etr WHERE etr.expense_id = e.id AND etr.tag_id = ?)';
      params.push(parseInt(tagId));
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM expenses e WHERE ${where}`
    ).bind(...params).first();

    const offset = (page - 1) * pageSize;
    const result = await env.DB.prepare(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, u.username
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all();

    const expenses = [];
    for (const row of result.results) {
      const tags = await getExpenseTags(env.DB, row.id);
      expenses.push({ ...row, tags });
    }

    return jsonResponse({
      expenses,
      total: countResult.total,
      page,
      page_size: pageSize
    });
  } catch (err) {
    console.error('listExpenses error:', err);
    return jsonResponse({ error: '获取账单失败' }, 500);
  }
}

async function updateExpense(request, env, userId, expenseId) {
  try {
    const expense = await env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first();
    if (!expense) return jsonResponse({ error: '账单不存在' }, 404);
    if (expense.user_id !== userId) return jsonResponse({ error: '只能修改自己创建的账单' }, 403);

    const { category_id, amount, description, expense_date, tag_ids } = await request.json();

    if (amount !== undefined && amount <= 0) {
      return jsonResponse({ error: '金额必须大于0' }, 400);
    }

    const updates = [];
    const params = [];
    if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (expense_date !== undefined) { updates.push('expense_date = ?'); params.push(expense_date); }
    updates.push("updated_at = datetime('now')");

    if (updates.length > 1) {
      await env.DB.prepare(
        `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params, expenseId).run();
    }

    if (tag_ids !== undefined) {
      await setExpenseTags(env.DB, expenseId, tag_ids);
    }

    const updated = await env.DB.prepare(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, u.username
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`
    ).bind(expenseId).first();

    const tags = await getExpenseTags(env.DB, expenseId);

    return jsonResponse({ expense: { ...updated, tags } });
  } catch (err) {
    console.error('updateExpense error:', err);
    return jsonResponse({ error: '修改账单失败' }, 500);
  }
}

async function deleteExpense(env, userId, expenseId) {
  try {
    const expense = await env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first();
    if (!expense) return jsonResponse({ error: '账单不存在' }, 404);
    if (expense.user_id !== userId) return jsonResponse({ error: '只能删除自己创建的账单' }, 403);

    await env.DB.prepare('DELETE FROM expense_tag_relations WHERE expense_id = ?').bind(expenseId).run();
    await env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(expenseId).run();

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('deleteExpense error:', err);
    return jsonResponse({ error: '删除账单失败' }, 500);
  }
}

async function getStats(request, env, userId) {
  try {
    const familyId = await getFamilyId(env, userId);
    if (!familyId) return jsonResponse({ error: '你尚未加入任何家庭' }, 400);

    const url = new URL(request.url);
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const month = url.searchParams.get('month');

    const monthlyTrend = await env.DB.prepare(
      `SELECT strftime('%Y-%m', expense_date) as month, SUM(amount) as total
       FROM expenses WHERE family_id = ? AND strftime('%Y', expense_date) = ?
       GROUP BY month ORDER BY month`
    ).bind(familyId, year).all();

    let categoryWhere = 'e.family_id = ? AND strftime(\'%Y\', e.expense_date) = ?';
    let categoryParams = [familyId, year];
    if (month) {
      categoryWhere += ' AND strftime(\'%m\', e.expense_date) = ?';
      categoryParams.push(month.padStart(2, '0'));
    }

    const categoryBreakdown = await env.DB.prepare(
      `SELECT c.id as category_id, c.name as category_name, c.icon as category_icon,
              SUM(e.amount) as total, COUNT(*) as count
       FROM expenses e JOIN expense_categories c ON e.category_id = c.id
       WHERE ${categoryWhere}
       GROUP BY c.id ORDER BY total DESC`
    ).bind(...categoryParams).all();

    const memberBreakdown = await env.DB.prepare(
      `SELECT u.id as user_id, u.username, SUM(e.amount) as total, COUNT(*) as count
       FROM expenses e JOIN users u ON e.user_id = u.id
       WHERE ${categoryWhere}
       GROUP BY u.id ORDER BY total DESC`
    ).bind(...categoryParams).all();

    let monthTotal = 0, monthCount = 0;
    if (month) {
      const m = await env.DB.prepare(
        `SELECT SUM(amount) as total, COUNT(*) as count FROM expenses
         WHERE family_id = ? AND strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`
      ).bind(familyId, year, month.padStart(2, '0')).first();
      monthTotal = m.total || 0;
      monthCount = m.count || 0;
    } else {
      const y = await env.DB.prepare(
        `SELECT SUM(amount) as total, COUNT(*) as count FROM expenses
         WHERE family_id = ? AND strftime('%Y', expense_date) = ?`
      ).bind(familyId, year).first();
      monthTotal = y.total || 0;
      monthCount = y.count || 0;
    }

    return jsonResponse({
      monthly_trend: monthlyTrend.results,
      category_breakdown: categoryBreakdown.results,
      member_breakdown: memberBreakdown.results,
      month_total: monthTotal,
      month_count: monthCount
    });
  } catch (err) {
    console.error('getStats error:', err);
    return jsonResponse({ error: '获取统计数据失败' }, 500);
  }
}

async function exportCSV(request, env, userId) {
  try {
    const familyId = await getFamilyId(env, userId);
    if (!familyId) return jsonResponse({ error: '你尚未加入任何家庭' }, 400);

    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const categoryId = url.searchParams.get('category_id');
    const tagetUserId = url.searchParams.get('user_id');

    let where = 'e.family_id = ?';
    let params = [familyId];
    if (month) { where += ' AND e.expense_date LIKE ?'; params.push(month + '%'); }
    if (categoryId) { where += ' AND e.category_id = ?'; params.push(parseInt(categoryId)); }
    if (tagetUserId) { where += ' AND e.user_id = ?'; params.push(parseInt(tagetUserId)); }

    const result = await env.DB.prepare(
      `SELECT e.expense_date, c.name as category, e.amount, e.description, u.username, e.id
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE ${where}
       ORDER BY e.expense_date DESC`
    ).bind(...params).all();

    const rows = [];
    rows.push(['日期', '分类', '金额', '备注', '记账人', '标签'].join(','));

    for (const row of result.results) {
      const tags = await getExpenseTags(env.DB, row.id);
      const tagStr = tags.map(t => t.name).join(' ');
      rows.push([
        row.expense_date,
        `"${row.category}"`,
        row.amount.toFixed(2),
        `"${(row.description || '').replace(/"/g, '""')}"`,
        row.username,
        `"${tagStr}"`
      ].join(','));
    }

    const bom = '\uFEFF';
    const csv = bom + rows.join('\n');

    const filename = month ? `expenses_${month}.csv` : `expenses_${new Date().getFullYear()}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': env.FRONTEND_URL || '*',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (err) {
    console.error('exportCSV error:', err);
    return jsonResponse({ error: '导出失败' }, 500);
  }
}
