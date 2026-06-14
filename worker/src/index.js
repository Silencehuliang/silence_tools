import { handleRegister } from './auth/register.js';
import { handleLogin } from './auth/login.js';
import { getSession, handleLogout } from './auth/session.js';
import { handleResetRequest, handleAdminResetRequests, handleAdminApproveReset, handleAdminRejectReset } from './auth/admin.js';
import { handleProfile } from './handlers/profile.js';
import { handleAlerts } from './handlers/alerts.js';
import { handleGoldHistory, saveGoldHistory } from './handlers/gold.js';
import { handleFamily } from './handlers/family.js';
import { handleCategory } from './handlers/category.js';
import { handleTag } from './handlers/tag.js';
import { handleExpense } from './handlers/expense.js';
import { handleCors, jsonResponse } from './cors.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return handleCors(request);
    }

    try {
      // 公开接口
      if (path === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request, env);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      if (path === '/api/auth/reset-request' && method === 'POST') {
        return await handleResetRequest(request, env);
      }
      if (path.startsWith('/api/gold/history')) {
        return await handleGoldHistory(request, env);
      }

      // 需要登录的接口
      const session = await getSession(request, env);

      if (path === '/api/auth/me') {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return jsonResponse({ user: session.user });
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        return await handleLogout(request, env);
      }
      if (path.startsWith('/api/user/profile')) {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleProfile(request, env, session);
      }
      if (path.startsWith('/api/alerts')) {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleAlerts(request, env, session);
      }

      // 家庭消费记录
      if (path.startsWith('/api/family')) {
        return await handleFamily(request, env, session);
      }
      if (path.startsWith('/api/expense/categories') || path.startsWith('/api/expense/tags')) {
        if (path.startsWith('/api/expense/categories')) {
          return await handleCategory(request, env, session);
        }
        return await handleTag(request, env, session);
      }
      if (path.startsWith('/api/expenses')) {
        return await handleExpense(request, env, session);
      }

      // 管理员接口
      if (path === '/api/admin/reset-requests') {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleAdminResetRequests(request, env, session);
      }
      const approveMatch = path.match(/^\/api\/admin\/reset-requests\/(\d+)\/approve$/);
      if (approveMatch) {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleAdminApproveReset(request, env, session, parseInt(approveMatch[1]));
      }
      const rejectMatch = path.match(/^\/api\/admin\/reset-requests\/(\d+)\/reject$/);
      if (rejectMatch) {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleAdminRejectReset(request, env, session, parseInt(rejectMatch[1]));
      }

      return jsonResponse({ error: 'Not Found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: err.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(saveGoldHistory(env));
  }
};
