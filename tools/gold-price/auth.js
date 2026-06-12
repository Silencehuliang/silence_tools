class AuthManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.user = null;
    this.ready = false;
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
    this.ready = true;
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
    this.renderAll();
  }

  isLoggedIn() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  renderAll() {
    document.querySelectorAll('[data-auth]').forEach(el => {
      const authState = el.getAttribute('data-auth');
      if (authState === 'in') {
        el.style.display = this.user ? '' : 'none';
      } else if (authState === 'out') {
        el.style.display = this.user ? 'none' : '';
      }
    });
    document.querySelectorAll('[data-auth-user]').forEach(el => {
      const field = el.getAttribute('data-auth-user');
      if (this.user && this.user[field]) {
        if (el.tagName === 'IMG') {
          el.src = this.user[field];
        } else {
          el.textContent = this.user[field];
        }
      }
    });
  }

  renderLoginUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.user) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 30px; backdrop-filter: blur(10px);">
          <img src="${this.user.avatar_url}" alt="" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);">
          <div style="display: flex; flex-direction: column; line-height: 1.2;">
            <span style="font-weight: 600; font-size: 0.95rem; color: white;">${this.user.username}</span>
            <span style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">已登录</span>
          </div>
          <button onclick="auth.logout()" style="margin-left: 4px; padding: 6px 12px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(231,76,60,0.8)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">退出</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; gap: 10px;">
          <button onclick="auth.login('github')" style="padding: 10px 20px; background: #24292e; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            GitHub 登录
          </button>
          <button onclick="auth.login('gitee')" style="padding: 10px 20px; background: #c71d23; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M11.997 1.243c-1.062-.05-2.13.05-3.18.303C6.57 2.167 5.11 3.53 4.32 5.28c-.74 1.63-1.06 3.42-.95 5.2.11 1.77.75 3.47 1.84 4.85.27.34.58.65.91.92.17.14.35.27.54.38.19.12.39.22.59.31.41.18.84.31 1.28.38.88.15 1.79.12 2.66-.07 1.74-.38 3.23-1.39 4.24-2.85 1.01-1.46 1.5-3.28 1.37-5.08-.13-1.8-.8-3.5-1.9-4.85-1.1-1.35-2.6-2.32-4.27-2.72-.84-.2-1.7-.27-2.56-.23l-.32.02z"/></svg>
            Gitee 登录
          </button>
        </div>
      `;
    }
  }
}

var AUTH_API_BASE = 'https://silence-tools-api.silencehuliang.workers.dev';
var auth = new AuthManager(AUTH_API_BASE);