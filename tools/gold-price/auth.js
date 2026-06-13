class AuthManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.user = null;
    this.ready = false;
  }

  async init() {
    await this.checkAuth();
    this.ready = true;
  }

  async checkAuth() {
    try {
      const res = await fetch(`${this.apiBase}/api/auth/me`, { credentials: 'include' });
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

  isLoggedIn() { return !!this.user; }
  getUser() { return this.user; }
  isAdmin() { return this.user?.role === 'admin'; }

  renderAll() {
    document.querySelectorAll('[data-auth-container]').forEach(el => {
      this.renderLoginUI(el.id);
    });
  }

  renderLoginUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.user) {
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.15);padding:8px 16px;border-radius:30px;backdrop-filter:blur(10px);">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;">${this.user.username[0].toUpperCase()}</div>
          <div style="display:flex;flex-direction:column;line-height:1.2;">
            <span style="font-weight:600;font-size:0.95rem;color:white;">${this.user.username}</span>
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.7);">${this.user.role === 'admin' ? '管理员' : '已登录'}</span>
          </div>
          ${this.isAdmin() ? '<button onclick="auth.showAdmin()" style="padding:6px 12px;background:rgba(255,215,0,0.3);color:white;border:1px solid rgba(255,215,0,0.5);border-radius:20px;cursor:pointer;font-size:0.8rem;">管理</button>' : ''}
          <button onclick="auth.logout()" style="padding:6px 12px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:20px;cursor:pointer;font-size:0.8rem;">退出</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display:flex;gap:10px;">
          <button onclick="auth.showLogin()" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:25px;cursor:pointer;font-size:0.9rem;transition:all 0.2s;">登录</button>
          <button onclick="auth.showRegister()" style="padding:10px 20px;background:transparent;color:white;border:2px solid rgba(255,255,255,0.5);border-radius:25px;cursor:pointer;font-size:0.9rem;transition:all 0.2s;">注册</button>
        </div>
      `;
    }
  }

  showModal(content) {
    let overlay = document.getElementById('authModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'authModalOverlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px);';
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">
        <button onclick="document.getElementById('authModalOverlay').remove()" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#999;">&times;</button>
        ${content}
      </div>
    `;
    overlay.style.display = 'flex';
  }

  closeModal() {
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) overlay.remove();
  }

  showLogin() {
    this.showModal(`
      <h2 style="margin:0 0 24px;font-size:1.5rem;color:#333;">登录</h2>
      <form onsubmit="auth.doLogin(event)">
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:6px;color:#555;font-size:0.9rem;">用户名</label>
          <input type="text" id="loginUsername" required autocomplete="username" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="请输入用户名">
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:block;margin-bottom:6px;color:#555;font-size:0.9rem;">密码</label>
          <input type="password" id="loginPassword" required autocomplete="current-password" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="请输入密码">
        </div>
        <div id="loginError" style="color:#e74c3c;font-size:0.85rem;margin-bottom:12px;display:none;"></div>
        <button type="submit" style="width:100%;padding:14px;background:#667eea;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;font-weight:600;">登录</button>
        <div style="text-align:center;margin-top:16px;">
          <a href="javascript:auth.showResetPassword()" style="color:#667eea;text-decoration:none;font-size:0.85rem;">忘记密码？</a>
          <span style="color:#ccc;margin:0 8px;">|</span>
          <a href="javascript:auth.showRegister()" style="color:#667eea;text-decoration:none;font-size:0.85rem;">没有账号？去注册</a>
        </div>
      </form>
    `);
  }

  showRegister() {
    this.showModal(`
      <h2 style="margin:0 0 24px;font-size:1.5rem;color:#333;">注册</h2>
      <form onsubmit="auth.doRegister(event)">
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:6px;color:#555;font-size:0.9rem;">用户名</label>
          <input type="text" id="regUsername" required autocomplete="username" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="3-20个字符，字母数字下划线">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:6px;color:#555;font-size:0.9rem;">密码</label>
          <input type="password" id="regPassword" required autocomplete="new-password" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="至少6个字符">
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:block;margin-bottom:6px;color:#555;font-size:0.9rem;">确认密码</label>
          <input type="password" id="regPassword2" required autocomplete="new-password" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="再次输入密码">
        </div>
        <div id="regError" style="color:#e74c3c;font-size:0.85rem;margin-bottom:12px;display:none;"></div>
        <button type="submit" style="width:100%;padding:14px;background:#667eea;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;font-weight:600;">注册</button>
        <div style="text-align:center;margin-top:16px;">
          <a href="javascript:auth.showLogin()" style="color:#667eea;text-decoration:none;font-size:0.85rem;">已有账号？去登录</a>
        </div>
      </form>
    `);
  }

  showResetPassword() {
    this.showModal(`
      <h2 style="margin:0 0 24px;font-size:1.5rem;color:#333;">忘记密码</h2>
      <p style="color:#666;font-size:0.9rem;margin-bottom:20px;">提交重置申请后，等待管理员审批。审批通过后会告知新密码。</p>
      <form onsubmit="auth.doResetRequest(event)">
        <div style="margin-bottom:20px;">
          <label style="display:block;margin-bottom:6px;color:#555;font-size:0.9rem;">用户名</label>
          <input type="text" id="resetUsername" required style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="请输入注册时的用户名">
        </div>
        <div id="resetMsg" style="font-size:0.85rem;margin-bottom:12px;display:none;"></div>
        <button type="submit" style="width:100%;padding:14px;background:#667eea;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;font-weight:600;">提交申请</button>
        <div style="text-align:center;margin-top:16px;">
          <a href="javascript:auth.showLogin()" style="color:#667eea;text-decoration:none;font-size:0.85rem;">返回登录</a>
        </div>
      </form>
    `);
  }

  showAdmin() {
    if (!this.isAdmin()) return;
    this.showModal(`
      <h2 style="margin:0 0 24px;font-size:1.5rem;color:#333;">管理员面板</h2>
      <div id="adminContent" style="max-height:400px;overflow-y:auto;">加载中...</div>
    `);
    this.loadAdminRequests();
  }

  async loadAdminRequests() {
    try {
      const res = await fetch(`${this.apiBase}/api/admin/reset-requests`, { credentials: 'include' });
      const data = await res.json();
      const container = document.getElementById('adminContent');
      if (!data.requests?.length) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">暂无待处理的申请</p>';
        return;
      }
      container.innerHTML = data.requests.map(r => `
        <div style="padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:500;">${r.username}</div>
            <div style="font-size:0.8rem;color:#999;">${new Date(r.requested_at).toLocaleString('zh-CN')}</div>
            <div style="font-size:0.8rem;color:${r.status === 'pending' ? '#f39c12' : r.status === 'approved' ? '#27ae60' : '#e74c3c'};">
              ${{ pending: '待处理', approved: '已批准', rejected: '已拒绝' }[r.status]}
              ${r.new_password ? ` → 新密码: <b>${r.new_password}</b>` : ''}
            </div>
          </div>
          ${r.status === 'pending' ? `
            <div style="display:flex;gap:8px;">
              <button onclick="auth.approveReset(${r.id})" style="padding:6px 12px;background:#27ae60;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;">批准</button>
              <button onclick="auth.rejectReset(${r.id})" style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;">拒绝</button>
            </div>
          ` : ''}
        </div>
      `).join('');
    } catch (e) {
      document.getElementById('adminContent').innerHTML = '<p style="color:#e74c3c;">加载失败</p>';
    }
  }

  async approveReset(id) {
    const res = await fetch(`${this.apiBase}/api/admin/reset-requests/${id}/approve`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      alert(`密码已重置，新密码: ${data.newPassword}`);
      this.loadAdminRequests();
    }
  }

  async rejectReset(id) {
    await fetch(`${this.apiBase}/api/admin/reset-requests/${id}/reject`, { method: 'POST', credentials: 'include' });
    this.loadAdminRequests();
  }

  async doLogin(e) {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    errEl.style.display = 'none';
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch(`${this.apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        this.user = data.user;
        this.closeModal();
        // 强制刷新页面确保状态更新
        window.location.href = window.location.pathname + '?t=' + Date.now();
      } else {
        errEl.textContent = data.error || '登录失败';
        errEl.style.display = 'block';
      }
    } catch (e) {
      errEl.textContent = '网络错误，请重试';
      errEl.style.display = 'block';
    }
  }

  async doRegister(e) {
    e.preventDefault();
    const errEl = document.getElementById('regError');
    errEl.style.display = 'none';
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;

    if (password !== password2) {
      errEl.textContent = '两次输入的密码不一致';
      errEl.style.display = 'block';
      return;
    }

    try {
      const res = await fetch(`${this.apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        this.user = data.user;
        this.closeModal();
        window.location.href = window.location.pathname + '?t=' + Date.now();
      } else {
        errEl.textContent = data.error || '注册失败';
        errEl.style.display = 'block';
      }
    } catch (e) {
      errEl.textContent = '网络错误，请重试';
      errEl.style.display = 'block';
    }
  }

  async doResetRequest(e) {
    e.preventDefault();
    const msgEl = document.getElementById('resetMsg');
    msgEl.style.display = 'none';
    const username = document.getElementById('resetUsername').value.trim();

    try {
      const res = await fetch(`${this.apiBase}/api/auth/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      msgEl.textContent = data.message || '申请已提交';
      msgEl.style.color = '#27ae60';
      msgEl.style.display = 'block';
    } catch (e) {
      msgEl.textContent = '网络错误，请重试';
      msgEl.style.color = '#e74c3c';
      msgEl.style.display = 'block';
    }
  }

  async logout() {
    try {
      await fetch(`${this.apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) { console.error('Logout error:', e); }
    this.user = null;
    this.renderAll();
    location.reload();
  }
}

var AUTH_API_BASE = 'https://silence-tools-api.silencehuliang.workers.dev';
var auth = new AuthManager(AUTH_API_BASE);
