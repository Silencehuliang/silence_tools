const API_BASE = 'https://silence-tools-api.silencehuliang.workers.dev';

class ExpenseTracker {
  constructor() {
    this.family = null;
    this.categories = [];
    this.tags = [];
    this.members = [];
    this.expenses = [];
    this.currentMonth = new Date().toISOString().slice(0, 7);
    this.currentView = 'overview';
    this.charts = {};
    this.statsYear = new Date().getFullYear().toString();
  }

  async init() {
    await auth.init();
    if (!auth.user) {
      document.getElementById('authRequired').style.display = 'block';
      document.getElementById('mainApp').style.display = 'none';
      this.renderUserInfo();
      return;
    }
    document.getElementById('authRequired').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    this.renderUserInfo();
    this.bindTabs();
    await this.loadFamilyInfo();
    if (this.family) {
      await this.loadCategories();
      await this.loadTags();
      await this.loadMembers();
      this.showView('overview');
    } else {
      this.showView('settings');
    }
  }

  renderUserInfo() {
    const container = document.getElementById('userContainer');
    if (!auth.user) {
      container.innerHTML = '<span style="color:#999">未登录</span>';
      return;
    }
    container.innerHTML = `
      <div class="user-avatar">${auth.user.username[0].toUpperCase()}</div>
      <span>${auth.user.username}</span>
      <button class="logout-btn" onclick="app.logout()">退出</button>
    `;
  }

  async logout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.reload();
  }

  bindTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.showView(tab.dataset.view));
    });
  }

  showView(view) {
    this.currentView = view;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');

    if (!this.family && view !== 'settings') {
      this.showToast('请先创建或加入家庭');
      this.showView('settings');
      return;
    }

    switch (view) {
      case 'overview': this.renderOverview(); break;
      case 'add': this.renderAddExpense(); break;
      case 'list': this.renderExpenseList(); break;
      case 'stats': this.renderStats(); break;
      case 'settings': this.renderSettings(); break;
    }
  }

  async api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  async loadFamilyInfo() {
    try {
      const data = await this.api('/api/family/info');
      this.family = data.family;
    } catch (e) {
      this.family = null;
    }
  }

  async loadCategories() {
    try {
      const data = await this.api('/api/expense/categories');
      this.categories = data.categories;
    } catch (e) {
      this.categories = [];
    }
  }

  async loadTags() {
    try {
      const data = await this.api('/api/expense/tags');
      this.tags = data.tags;
    } catch (e) {
      this.tags = [];
    }
  }

  async loadMembers() {
    try {
      const data = await this.api('/api/family/members');
      this.members = data.members;
    } catch (e) {
      this.members = [];
    }
  }

  // ========== 概览 ==========
  async renderOverview() {
    const container = document.getElementById('view-overview');
    container.innerHTML = '<div class="card"><p>加载中...</p></div>';

    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const stats = await this.api(`/api/expenses/stats?year=${year}&month=${month}`);
      const recentData = await this.api(`/api/expenses?month=${this.currentMonth}&page_size=5`);

      const monthTotal = stats.month_total || 0;
      const monthCount = stats.month_count || 0;

      container.innerHTML = `
        <div class="stat-cards">
          <div class="stat-card">
            <div class="label">本月支出</div>
            <div class="value">¥${monthTotal.toFixed(2)}</div>
            <div class="sub">${monthCount} 笔消费</div>
          </div>
          <div class="stat-card">
            <div class="label">家庭成员</div>
            <div class="value">${this.members.length}</div>
            <div class="sub">${this.family.name}</div>
          </div>
          <div class="stat-card">
            <div class="label">消费分类</div>
            <div class="value">${this.categories.length}</div>
            <div class="sub">个可用分类</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <div class="card">
            <h2>分类占比</h2>
            <div class="chart-container" style="height:250px;">
              <canvas id="overviewPieChart"></canvas>
            </div>
          </div>
          <div class="card">
            <h2>最近消费</h2>
            <div class="expense-list">
              ${recentData.expenses.length === 0 ? '<div class="empty-state"><p>暂无消费记录</p></div>' :
                recentData.expenses.map(e => `
                  <div class="expense-item">
                    <div class="expense-icon">${e.category_icon || '📦'}</div>
                    <div class="expense-info">
                      <div class="top">
                        <span class="category-name">${e.category_name}</span>
                        <span class="amount">-¥${e.amount.toFixed(2)}</span>
                      </div>
                      <div class="bottom">
                        <span>${e.expense_date}</span>
                        <span>${e.username}</span>
                        ${e.description ? `<span>${e.description}</span>` : ''}
                      </div>
                    </div>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>
      `;

      if (stats.category_breakdown.length > 0) {
        this.renderPieChart('overviewPieChart', stats.category_breakdown);
      }
    } catch (e) {
      container.innerHTML = `<div class="card"><p class="error">加载失败: ${e.message}</p></div>`;
    }
  }

  renderPieChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.category_name),
        datasets: [{
          data: data.map(d => d.total),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // ========== 记账 ==========
  renderAddExpense() {
    const container = document.getElementById('view-add');
    container.innerHTML = `
      <div class="card">
        <h2>记录支出</h2>
        <div class="form-group">
          <label>金额 (元)</label>
          <input type="number" id="expenseAmount" placeholder="0.00" step="0.01" min="0.01">
        </div>
        <div class="form-group">
          <label>分类</label>
          <div class="category-grid" id="categoryGrid">
            ${this.categories.map(c => `
              <div class="category-item" data-id="${c.id}">
                <div class="icon">${c.icon || '📦'}</div>
                <div class="name">${c.name}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="expenseDate" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea id="expenseDesc" placeholder="可选备注说明"></textarea>
        </div>
        <div class="form-group">
          <label>标签</label>
          <div class="tag-chips" id="tagChips">
            ${this.tags.map(t => `<div class="tag-chip" data-id="${t.id}">${t.name}</div>`).join('')}
            <div class="tag-add" onclick="app.showAddTagDialog()">+ 新标签</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="app.submitExpense()">保存账单</button>
      </div>
    `;

    container.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.category-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });

    container.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('selected'));
    });
  }

  showAddTagDialog() {
    const name = prompt('请输入标签名称:');
    if (name && name.trim()) {
      this.api('/api/expense/tags', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })
        .then(data => {
          this.tags.push(data.tag);
          this.renderAddExpense();
          this.showToast('标签创建成功');
        })
        .catch(e => this.showToast(e.message));
    }
  }

  async submitExpense() {
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const selectedCategory = document.querySelector('#categoryGrid .category-item.selected');
    const date = document.getElementById('expenseDate').value;
    const desc = document.getElementById('expenseDesc').value;
    const selectedTags = [...document.querySelectorAll('#tagChips .tag-chip.selected')].map(t => parseInt(t.dataset.id));

    if (!amount || amount <= 0) { this.showToast('请输入有效金额'); return; }
    if (!selectedCategory) { this.showToast('请选择分类'); return; }
    if (!date) { this.showToast('请选择日期'); return; }

    try {
      await this.api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category_id: parseInt(selectedCategory.dataset.id),
          amount,
          description: desc || null,
          expense_date: date,
          tag_ids: selectedTags
        })
      });
      this.showToast('账单已保存');
      this.renderAddExpense();
    } catch (e) {
      this.showToast(e.message);
    }
  }

  // ========== 账单列表 ==========
  async renderExpenseList() {
    const container = document.getElementById('view-list');
    container.innerHTML = `
      <div class="card">
        <h2>消费账单</h2>
        <div class="filter-bar">
          <div class="month-picker">
            <button onclick="app.changeMonth(-1)">◀</button>
            <span id="currentMonth">${this.currentMonth}</span>
            <button onclick="app.changeMonth(1)">▶</button>
          </div>
          <select id="filterCategory">
            <option value="">全部分类</option>
            ${this.categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
          <select id="filterUser">
            <option value="">全部成员</option>
            ${this.members.map(m => `<option value="${m.user_id}">${m.username}</option>`).join('')}
          </select>
          <input type="text" id="filterKeyword" placeholder="搜索备注">
          <button class="btn btn-primary btn-sm" onclick="app.loadExpenses()">筛选</button>
          <button class="btn btn-secondary btn-sm" onclick="app.exportCSV()">导出CSV</button>
        </div>
        <div id="expenseListContainer"><p>加载中...</p></div>
      </div>
    `;
    await this.loadExpenses();
  }

  changeMonth(delta) {
    const [y, m] = this.currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.currentMonth = d.toISOString().slice(0, 7);
    document.getElementById('currentMonth').textContent = this.currentMonth;
    this.loadExpenses();
  }

  async loadExpenses(page = 1) {
    const container = document.getElementById('expenseListContainer');
    const categoryId = document.getElementById('filterCategory')?.value;
    const userId = document.getElementById('filterUser')?.value;
    const keyword = document.getElementById('filterKeyword')?.value;

    let url = `/api/expenses?month=${this.currentMonth}&page=${page}&page_size=20`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (userId) url += `&user_id=${userId}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    try {
      const data = await this.api(url);
      const total = data.expenses.reduce((s, e) => s + e.amount, 0);

      container.innerHTML = `
        <div style="padding:10px; background:#f5f5f5; border-radius:8px; margin-bottom:15px; display:flex; justify-content:space-between;">
          <span>共 ${data.total} 笔</span>
          <span style="font-weight:bold; color:#f44336;">总计: ¥${total.toFixed(2)}</span>
        </div>
        <div class="expense-list">
          ${data.expenses.length === 0 ? '<div class="empty-state"><div class="icon">📝</div><p>暂无消费记录</p></div>' :
            data.expenses.map(e => `
              <div class="expense-item">
                <div class="expense-icon">${e.category_icon || '📦'}</div>
                <div class="expense-info">
                  <div class="top">
                    <span class="category-name">${e.category_name}</span>
                    <span class="amount">-¥${e.amount.toFixed(2)}</span>
                  </div>
                  <div class="bottom">
                    <span>${e.expense_date}</span>
                    <span>${e.username}</span>
                    ${e.description ? `<span>${e.description}</span>` : ''}
                  </div>
                  ${e.tags.length ? `<div class="tags">${e.tags.map(t => `<span class="tag">${t.name}</span>`).join('')}</div>` : ''}
                </div>
                <div class="expense-actions">
                  <button class="btn btn-secondary btn-sm" onclick="app.editExpense(${e.id})">编辑</button>
                  <button class="btn btn-danger btn-sm" onclick="app.deleteExpense(${e.id})">删除</button>
                </div>
              </div>
            `).join('')}
        </div>
        ${data.total > 20 ? `
          <div class="pagination">
            ${page > 1 ? `<button class="btn btn-secondary btn-sm" onclick="app.loadExpenses(${page - 1})">上一页</button>` : ''}
            <span>第 ${page} 页</span>
            ${data.expenses.length === 20 ? `<button class="btn btn-secondary btn-sm" onclick="app.loadExpenses(${page + 1})">下一页</button>` : ''}
          </div>
        ` : ''}
      `;
    } catch (e) {
      container.innerHTML = `<p class="error">加载失败: ${e.message}</p>`;
    }
  }

  async editExpense(id) {
    const amount = prompt('请输入新金额:');
    if (!amount) return;
    const desc = prompt('备注说明 (留空不修改):');

    try {
      const body = { amount: parseFloat(amount) };
      if (desc !== null && desc !== '') body.description = desc;
      await this.api(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      this.showToast('账单已更新');
      this.loadExpenses();
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async deleteExpense(id) {
    if (!confirm('确定删除这条账单吗？')) return;
    try {
      await this.api(`/api/expenses/${id}`, { method: 'DELETE' });
      this.showToast('账单已删除');
      this.loadExpenses();
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async exportCSV() {
    const categoryId = document.getElementById('filterCategory')?.value;
    const userId = document.getElementById('filterUser')?.value;
    let url = `/api/expenses/export?month=${this.currentMonth}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (userId) url += `&user_id=${userId}`;

    try {
      const res = await fetch(`${API_BASE}${url}`, { credentials: 'include' });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `expenses_${this.currentMonth}.csv`;
      a.click();
      this.showToast('导出成功');
    } catch (e) {
      this.showToast('导出失败');
    }
  }

  // ========== 统计 ==========
  async renderStats() {
    const container = document.getElementById('view-stats');
    container.innerHTML = `
      <div class="card">
        <h2>消费统计</h2>
        <div style="display:flex; gap:10px; margin-bottom:20px;">
          <select id="statsYear" onchange="app.loadStats()">
            ${[0,1,2].map(i => {
              const y = new Date().getFullYear() - i;
              return `<option value="${y}" ${y.toString() === this.statsYear ? 'selected' : ''}>${y}年</option>`;
            }).join('')}
          </select>
          <select id="statsMonth" onchange="app.loadStats()">
            <option value="">全年</option>
            ${Array.from({length:12}, (_,i) => `<option value="${i+1}" ${(i+1).toString() === (new Date().getMonth()+1).toString() ? 'selected' : ''}>${i+1}月</option>`).join('')}
          </select>
        </div>
        <div id="statsContent"><p>加载中...</p></div>
      </div>
    `;
    await this.loadStats();
  }

  async loadStats() {
    const year = document.getElementById('statsYear')?.value;
    const month = document.getElementById('statsMonth')?.value;
    const container = document.getElementById('statsContent');

    let url = `/api/expenses/stats?year=${year}`;
    if (month) url += `&month=${month}`;

    try {
      const data = await this.api(url);
      container.innerHTML = `
        <div class="stat-cards">
          <div class="stat-card">
            <div class="label">${month ? '本月' : '全年'}总支出</div>
            <div class="value">¥${(data.month_total || 0).toFixed(2)}</div>
            <div class="sub">${data.month_count || 0} 笔</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
          <div>
            <h3 style="margin-bottom:10px;">月度趋势</h3>
            <div class="chart-container" style="height:250px;">
              <canvas id="trendChart"></canvas>
            </div>
          </div>
          <div>
            <h3 style="margin-bottom:10px;">分类占比</h3>
            <div class="chart-container" style="height:250px;">
              <canvas id="categoryChart"></canvas>
            </div>
          </div>
        </div>

        <div>
          <h3 style="margin-bottom:10px;">成员消费对比</h3>
          <div class="chart-container" style="height:250px;">
            <canvas id="memberChart"></canvas>
          </div>
        </div>
      `;

      if (data.monthly_trend.length) {
        new Chart(document.getElementById('trendChart'), {
          type: 'bar',
          data: {
            labels: data.monthly_trend.map(d => d.month),
            datasets: [{ label: '支出', data: data.monthly_trend.map(d => d.total), backgroundColor: '#4CAF50' }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }

      if (data.category_breakdown.length) {
        new Chart(document.getElementById('categoryChart'), {
          type: 'doughnut',
          data: {
            labels: data.category_breakdown.map(d => d.category_name),
            datasets: [{ data: data.category_breakdown.map(d => d.total), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4'] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
      }

      if (data.member_breakdown.length) {
        new Chart(document.getElementById('memberChart'), {
          type: 'bar',
          data: {
            labels: data.member_breakdown.map(d => d.username),
            datasets: [{ label: '支出', data: data.member_breakdown.map(d => d.total), backgroundColor: '#2196F3' }]
          },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
      }
    } catch (e) {
      container.innerHTML = `<p class="error">加载失败: ${e.message}</p>`;
    }
  }

  // ========== 设置 ==========
  async renderSettings() {
    const container = document.getElementById('view-settings');

    if (!this.family) {
      container.innerHTML = `
        <div class="card">
          <h2>创建或加入家庭</h2>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
              <h3 style="margin-bottom:15px;">创建新家庭</h3>
              <div class="form-group">
                <label>家庭名称</label>
                <input type="text" id="familyName" placeholder="例如: 我的家">
              </div>
              <button class="btn btn-primary" onclick="app.createFamily()">创建家庭</button>
            </div>
            <div>
              <h3 style="margin-bottom:15px;">加入已有家庭</h3>
              <div class="form-group">
                <label>邀请码</label>
                <input type="text" id="inviteCode" placeholder="输入6位邀请码" maxlength="6">
              </div>
              <button class="btn btn-primary" onclick="app.joinFamily()">加入家庭</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="settings-section">
        <div class="card">
          <h2>家庭信息</h2>
          <div class="family-info">
            <div>
              <strong>${this.family.name}</strong>
              <span style="color:#888; margin-left:10px;">${this.members.length} 位成员</span>
            </div>
            <div>
              <span style="color:#888;">邀请码:</span>
              <span class="invite-code" id="inviteCodeDisplay">${this.family.invite_code}</span>
              <button class="copy-btn" onclick="app.copyInviteCode()">复制</button>
              <button class="btn btn-secondary btn-sm" onclick="app.regenerateCode()">重新生成</button>
            </div>
          </div>
          <h3 style="margin: 20px 0 10px;">成员列表</h3>
          <div class="member-list">
            ${this.members.map(m => `
              <div class="member-item">
                <div class="avatar">${m.username[0].toUpperCase()}</div>
                <span style="flex:1;">${m.username}</span>
                <span class="role ${m.role}">${m.role === 'owner' ? '创建者' : '成员'}</span>
                <span style="color:#999; font-size:0.85rem;">加入于 ${m.joined_at.slice(0, 10)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="card">
          <h2>分类管理</h2>
          <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="text" id="newCategoryName" placeholder="分类名称" style="flex:1; padding:10px; border:2px solid #ddd; border-radius:8px;">
            <input type="text" id="newCategoryIcon" placeholder="图标" style="width:80px; padding:10px; border:2px solid #ddd; border-radius:8px;">
            <button class="btn btn-primary btn-sm" onclick="app.addCategory()">添加</button>
          </div>
          <div class="category-manage">
            ${this.categories.map(c => `
              <div class="category-manage-item">
                <span class="icon">${c.icon || '📦'}</span>
                <span class="name">${c.name}</span>
                ${c.is_system ? '<span class="badge">系统</span>' : `<button class="delete-btn" onclick="app.deleteCategory(${c.id})">删除</button>`}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="card">
          <h2>标签管理</h2>
          <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="text" id="newTagName" placeholder="标签名称" style="flex:1; padding:10px; border:2px solid #ddd; border-radius:8px;">
            <button class="btn btn-primary btn-sm" onclick="app.addTag()">添加</button>
          </div>
          <div class="tag-chips">
            ${this.tags.map(t => `
              <div class="tag-chip" style="cursor:default;">
                ${t.name}
                <span onclick="app.deleteTag(${t.id})" style="margin-left:8px; cursor:pointer; color:#f44336;">×</span>
              </div>
            `).join('')}
            ${this.tags.length === 0 ? '<span style="color:#999;">暂无自定义标签</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  async createFamily() {
    const name = document.getElementById('familyName').value.trim();
    if (!name) { this.showToast('请输入家庭名称'); return; }
    try {
      await this.api('/api/family/create', { method: 'POST', body: JSON.stringify({ name }) });
      this.showToast('家庭创建成功');
      await this.loadFamilyInfo();
      await this.loadCategories();
      await this.loadTags();
      await this.loadMembers();
      this.showView('settings');
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async joinFamily() {
    const code = document.getElementById('inviteCode').value.trim().toUpperCase();
    if (!code) { this.showToast('请输入邀请码'); return; }
    try {
      await this.api('/api/family/join', { method: 'POST', body: JSON.stringify({ invite_code: code }) });
      this.showToast('成功加入家庭');
      await this.loadFamilyInfo();
      await this.loadCategories();
      await this.loadTags();
      await this.loadMembers();
      this.showView('overview');
    } catch (e) {
      this.showToast(e.message);
    }
  }

  copyInviteCode() {
    const code = document.getElementById('inviteCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => this.showToast('邀请码已复制'));
  }

  async regenerateCode() {
    if (!confirm('重新生成邀请码后，旧邀请码将失效。确定吗？')) return;
    try {
      const data = await this.api('/api/family/invite-code', { method: 'POST' });
      this.family.invite_code = data.invite_code;
      this.renderSettings();
      this.showToast('邀请码已更新');
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    const icon = document.getElementById('newCategoryIcon').value.trim();
    if (!name) { this.showToast('请输入分类名称'); return; }
    try {
      const data = await this.api('/api/expense/categories', { method: 'POST', body: JSON.stringify({ name, icon: icon || null }) });
      this.categories.push(data.category);
      this.renderSettings();
      this.showToast('分类已添加');
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async deleteCategory(id) {
    if (!confirm('确定删除该分类吗？')) return;
    try {
      await this.api(`/api/expense/categories/${id}`, { method: 'DELETE' });
      this.categories = this.categories.filter(c => c.id !== id);
      this.renderSettings();
      this.showToast('分类已删除');
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async addTag() {
    const name = document.getElementById('newTagName').value.trim();
    if (!name) { this.showToast('请输入标签名称'); return; }
    try {
      const data = await this.api('/api/expense/tags', { method: 'POST', body: JSON.stringify({ name }) });
      this.tags.push(data.tag);
      this.renderSettings();
      this.showToast('标签已添加');
    } catch (e) {
      this.showToast(e.message);
    }
  }

  async deleteTag(id) {
    if (!confirm('确定删除该标签吗？')) return;
    try {
      await this.api(`/api/expense/tags/${id}`, { method: 'DELETE' });
      this.tags = this.tags.filter(t => t.id !== id);
      this.renderSettings();
      this.showToast('标签已删除');
    } catch (e) {
      this.showToast(e.message);
    }
  }
}

const app = new ExpenseTracker();
app.init();
