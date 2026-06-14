import { jsonResponse } from '../cors.js';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const arr = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) code += chars[arr[i] % chars.length];
  return code;
}

export async function handleFamily(request, env, session) {
  if (!session) return jsonResponse({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const userId = session.user.id;

  if (path === '/api/family/create' && method === 'POST') {
    return await createFamily(request, env, userId);
  }
  if (path === '/api/family/join' && method === 'POST') {
    return await joinFamily(request, env, userId);
  }
  if (path === '/api/family/info' && method === 'GET') {
    return await getFamilyInfo(env, userId);
  }
  if (path === '/api/family/invite-code' && method === 'POST') {
    return await regenerateInviteCode(env, userId);
  }
  if (path === '/api/family/members' && method === 'GET') {
    return await getMembers(env, userId);
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function createFamily(request, env, userId) {
  try {
    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return jsonResponse({ error: '家庭名称不能为空' }, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (existing) {
      return jsonResponse({ error: '你已经加入了一个家庭' }, 409);
    }

    const inviteCode = generateInviteCode();
    const result = await env.DB.prepare(
      'INSERT INTO families (name, invite_code, created_by) VALUES (?, ?, ?)'
    ).bind(name.trim(), inviteCode, userId).run();

    const familyId = result.meta.last_row_id;

    await env.DB.prepare(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)'
    ).bind(familyId, userId, 'owner').run();

    return jsonResponse({
      family: { id: familyId, name: name.trim(), invite_code: inviteCode, created_by: userId },
      member_role: 'owner'
    });
  } catch (err) {
    console.error('createFamily error:', err);
    return jsonResponse({ error: '创建家庭失败' }, 500);
  }
}

async function joinFamily(request, env, userId) {
  try {
    const { invite_code } = await request.json();
    if (!invite_code) {
      return jsonResponse({ error: '邀请码不能为空' }, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();
    if (existing) {
      return jsonResponse({ error: '你已经加入了一个家庭' }, 409);
    }

    const family = await env.DB.prepare(
      'SELECT * FROM families WHERE invite_code = ?'
    ).bind(invite_code.toUpperCase()).first();
    if (!family) {
      return jsonResponse({ error: '邀请码无效' }, 404);
    }

    await env.DB.prepare(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)'
    ).bind(family.id, userId, 'member').run();

    return jsonResponse({
      family: { id: family.id, name: family.name },
      member_role: 'member'
    });
  } catch (err) {
    console.error('joinFamily error:', err);
    return jsonResponse({ error: '加入家庭失败' }, 500);
  }
}

async function getFamilyInfo(env, userId) {
  try {
    const member = await env.DB.prepare(
      `SELECT f.*, fm.role as member_role,
        (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) as member_count
       FROM family_members fm
       JOIN families f ON fm.family_id = f.id
       WHERE fm.user_id = ?`
    ).bind(userId).first();

    if (!member) {
      return jsonResponse({ family: null });
    }

    return jsonResponse({
      family: {
        id: member.id,
        name: member.name,
        invite_code: member.invite_code,
        created_by: member.created_by
      },
      member_role: member.member_role,
      member_count: member.member_count
    });
  } catch (err) {
    console.error('getFamilyInfo error:', err);
    return jsonResponse({ error: '获取家庭信息失败' }, 500);
  }
}

async function regenerateInviteCode(env, userId) {
  try {
    const member = await env.DB.prepare(
      'SELECT f.* FROM family_members fm JOIN families f ON fm.family_id = f.id WHERE fm.user_id = ? AND fm.role = ?'
    ).bind(userId, 'owner').first();

    if (!member) {
      return jsonResponse({ error: '仅家庭创建者可操作' }, 403);
    }

    const newCode = generateInviteCode();
    await env.DB.prepare(
      'UPDATE families SET invite_code = ? WHERE id = ?'
    ).bind(newCode, member.id).run();

    return jsonResponse({ invite_code: newCode });
  } catch (err) {
    console.error('regenerateInviteCode error:', err);
    return jsonResponse({ error: '重新生成邀请码失败' }, 500);
  }
}

async function getMembers(env, userId) {
  try {
    const member = await env.DB.prepare(
      'SELECT family_id FROM family_members WHERE user_id = ?'
    ).bind(userId).first();

    if (!member) {
      return jsonResponse({ error: '你尚未加入任何家庭' }, 400);
    }

    const result = await env.DB.prepare(
      `SELECT fm.user_id, u.username, fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = ?
       ORDER BY fm.role DESC, fm.joined_at ASC`
    ).bind(member.family_id).all();

    return jsonResponse({ members: result.results });
  } catch (err) {
    console.error('getMembers error:', err);
    return jsonResponse({ error: '获取成员列表失败' }, 500);
  }
}
