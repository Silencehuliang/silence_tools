class AuthManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.user = null;
    this.listeners = [];
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (urlParams.get('error')) {
      console.error('Login error:', urlParams.get('error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
    await this.checkAuth();
  }

  async checkAuth() {
    try {
      const res = await fetch(`${this.apiBase}/api/auth/me`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        this.user = data.user;
      } else {
        this.user = null;
      }
    } catch (e) {
      this.user = null;
    }
    this.notifyListeners();
    return this.user;
  }

  login(provider) {
    window.location.href = `${this.apiBase}/api/auth/${provider}`;
  }

  async logout() {
    try {
      await fetch(`${this.apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    this.user = null;
    this.notifyListeners();
  }

  isLoggedIn() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.user));
  }

  async getProfile() {
    const res = await fetch(`${this.apiBase}/api/user/profile`, {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return await res.json();
  }

  async saveProfile(profile) {
    const res = await fetch(`${this.apiBase}/api/user/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profile })
    });
    return res.ok;
  }

  async getAlerts() {
    const res = await fetch(`${this.apiBase}/api/alerts`, {
      credentials: 'include'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.alerts || [];
  }

  async createAlert(alertType, targetPrice) {
    const res = await fetch(`${this.apiBase}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ alert_type: alertType, target_price: targetPrice })
    });
    if (!res.ok) return null;
    return await res.json();
  }

  async deleteAlert(alertId) {
    const res = await fetch(`${this.apiBase}/api/alerts/${alertId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return res.ok;
  }

  renderLoginUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.user) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${this.user.avatar_url}" alt="" style="width: 32px; height: 32px; border-radius: 50%;">
          <span style="font-weight: 500;">${this.user.username}</span>
          <button onclick="auth.logout()" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">退出</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; gap: 8px;">
          <button onclick="auth.login('github')" style="padding: 8px 16px; background: #24292e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            GitHub 登录
          </button>
          <button onclick="auth.login('gitee')" style="padding: 8px 16px; background: #c71d23; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.997 1.243c-1.062-.05-2.13.05-3.18.303C6.57 2.167 5.11 3.53 4.32 5.28c-.74 1.63-1.06 3.42-.95 5.2.11 1.77.75 3.47 1.84 4.85.27.34.58.65.91.92.17.14.35.27.54.38.19.12.39.22.59.31.41.18.84.31 1.28.38.88.15 1.79.12 2.66-.07 1.74-.38 3.23-1.39 4.24-2.85 1.01-1.46 1.5-3.28 1.37-5.08-.13-1.8-.8-3.5-1.9-4.85-1.1-1.35-2.6-2.32-4.27-2.72-.84-.2-1.7-.27-2.56-.23l-.32.02z"/></svg>
            Gitee 登录
          </button>
        </div>
      `;
    }
  }
}

const AUTH_API_BASE = 'https://silence-tools-api.silencehuliang.workers.dev';
const auth = new AuthManager(AUTH_API_BASE);
