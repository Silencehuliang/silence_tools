import { handleGithubAuth } from './auth/github.js';
import { handleGiteeAuth } from './auth/gitee.js';
import { getSession, clearSession } from './auth/session.js';
import { handleProfile } from './handlers/profile.js';
import { handleAlerts } from './handlers/alerts.js';
import { handleGoldHistory, saveGoldHistory } from './handlers/gold.js';
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
      if (path === '/api/auth/github') {
        return handleGithubAuth(request, env);
      }
      if (path === '/api/auth/github/callback') {
        return handleGithubAuth(request, env, true);
      }
      if (path === '/api/auth/gitee') {
        return handleGiteeAuth(request, env);
      }
      if (path === '/api/auth/gitee/callback') {
        return handleGiteeAuth(request, env, true);
      }

      const session = await getSession(request, env);

      if (path === '/api/auth/me') {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return jsonResponse({ user: session.user });
      }

      if (path === '/api/auth/logout' && method === 'POST') {
        return await clearSession(request, env);
      }

      if (path.startsWith('/api/user/profile')) {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleProfile(request, env, session);
      }

      if (path.startsWith('/api/alerts')) {
        if (!session) return jsonResponse({ error: '未登录' }, 401);
        return await handleAlerts(request, env, session);
      }

      if (path.startsWith('/api/gold/history')) {
        return await handleGoldHistory(request, env);
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
