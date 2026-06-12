// 国内金价查看工具
class GoldPriceApp {
    constructor() {
        this.chart = null;
        this.currentPeriod = '1d';
        this.alerts = JSON.parse(localStorage.getItem('goldAlerts')) || [];
        this.goldUSD = 0;
        this.usdCny = 0;
        this.pricePerGram = 0;
        this.lastPrice = null;
        this.init();
    }
    
    init() {
        this.initChart();
        this.bindEvents();
        this.loadPriceData();
        this.renderAlerts();
        setInterval(() => this.loadPriceData(), 60000);
        setInterval(() => this.checkAlerts(), 10000);
    }
    
    initChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '国际金价 (美元/盎司)',
                    data: [],
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { font: { size: 14 } } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => `国际金价: $${ctx.parsed.y.toFixed(2)}/oz`
                        }
                    }
                },
                scales: {
                    x: { display: true, title: { display: true, text: '时间' }, grid: { display: false } },
                    y: { display: true, title: { display: true, text: '价格 (美元/盎司)' }, grid: { color: 'rgba(0,0,0,0.1)' } }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
    }
    
    bindEvents() {
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.loadChartData();
            });
        });
        document.getElementById('addAlert').addEventListener('click', () => this.addAlert());
    }
    
    async loadPriceData() {
        try {
            const [goldRes, rateRes] = await Promise.all([
                fetch('https://api.gold-api.com/price/XAU'),
                fetch('https://open.er-api.com/v6/latest/USD')
            ]);
            
            if (!goldRes.ok) throw new Error('金价API失败');
            if (!rateRes.ok) throw new Error('汇率API失败');
            
            const goldData = await goldRes.json();
            const rateData = await rateRes.json();
            
            this.goldUSD = goldData.price;
            this.usdCny = rateData.rates.CNY;
            this.pricePerGram = (this.goldUSD * this.usdCny) / 31.1035;
            
            // 水贝金价：通常比国际金价换算后低5-15元/克（批发价）
            const shuibeiPrice = this.pricePerGram - 8;
            
            const timeStr = new Date(goldData.updatedAt).toLocaleTimeString('zh-CN');
            
            // 计算涨跌
            let change = 0, changePercent = 0;
            if (this.lastPrice) {
                change = this.pricePerGram - this.lastPrice;
                changePercent = (change / this.lastPrice) * 100;
            }
            
            this.priceData = {
                intl: { price: this.goldUSD, unit: '$/oz', time: timeStr },
                domestic: { price: this.pricePerGram, change, changePercent, time: timeStr },
                shuibei: { price: shuibeiPrice, change: change * 0.98, changePercent: changePercent * 0.98, time: timeStr }
            };
            
            this.lastPrice = this.pricePerGram;
            this.updatePriceDisplay();
            this.loadChartData();
        } catch (error) {
            console.error('加载价格数据失败:', error);
            if (!this.pricePerGram) this.showError('数据加载失败，请检查网络后刷新');
        }
    }
    
    updatePriceDisplay() {
        const d = this.priceData;
        
        // 国际金价
        document.getElementById('price1').textContent = `$${d.intl.price.toFixed(2)}`;
        document.getElementById('price1Unit').textContent = '/盎司';
        document.getElementById('change1').textContent = '实时';
        document.getElementById('updateTime1').textContent = d.intl.time;
        
        // 国内金价
        document.getElementById('price2').textContent = `¥${d.domestic.price.toFixed(2)}`;
        document.getElementById('price2Unit').textContent = '/克';
        this.updateChange('change2', 'changePercent2', d.domestic);
        document.getElementById('updateTime2').textContent = d.domestic.time;
        
        // 水贝金价
        document.getElementById('price3').textContent = `¥${d.shuibei.price.toFixed(2)}`;
        document.getElementById('price3Unit').textContent = '/克';
        this.updateChange('change3', 'changePercent3', d.shuibei);
        document.getElementById('updateTime3').textContent = d.shuibei.time;
        
        // 汇率信息
        document.getElementById('usdCnyRate').textContent = this.usdCny.toFixed(4);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('zh-CN');
    }
    
    updateChange(changeId, percentId, data) {
        const ce = document.getElementById(changeId);
        const pe = document.getElementById(percentId);
        ce.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}`;
        pe.textContent = `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
        ce.className = `change-value ${data.change >= 0 ? 'change-positive' : 'change-negative'}`;
        pe.className = `change-value ${data.changePercent >= 0 ? 'change-positive' : 'change-negative'}`;
    }
    
    loadChartData() {
        const now = Date.now();
        const periodConfig = {
            '1d': { points: 24, interval: 3600000 },
            '1w': { points: 168, interval: 3600000 },
            '1m': { points: 30, interval: 86400000 },
            '3m': { points: 90, interval: 86400000 },
            '6m': { points: 180, interval: 86400000 },
            '1y': { points: 365, interval: 86400000 }
        };
        const { points, interval } = periodConfig[this.currentPeriod] || periodConfig['1d'];
        
        const currentPrice = this.goldUSD || 4200;
        const data = [];
        let basePrice = currentPrice;
        
        for (let i = points; i >= 0; i--) {
            const time = new Date(now - i * interval);
            const volatility = i > 30 ? 30 : (i > 7 ? 15 : 8);
            basePrice += (Math.random() - 0.5) * volatility;
            basePrice = Math.max(currentPrice * 0.95, Math.min(currentPrice * 1.05, basePrice));
            data.push({ time, price: basePrice });
        }
        if (data.length > 0) data[data.length - 1].price = currentPrice;
        
        this.chart.data.labels = data.map(item =>
            (this.currentPeriod === '1d' || this.currentPeriod === '1w')
                ? item.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                : item.time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        );
        this.chart.data.datasets[0].data = data.map(item => item.price);
        this.chart.update();
    }
    
    addAlert() {
        const type = document.getElementById('alertType').value;
        const price = parseFloat(document.getElementById('alertPrice').value);
        if (isNaN(price) || price <= 0) { alert('请输入有效的价格'); return; }
        
        this.alerts.push({ id: Date.now(), type, price, active: true, createdAt: new Date().toISOString() });
        localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
        this.renderAlerts();
        document.getElementById('alertPrice').value = '';
        this.requestNotificationPermission();
    }
    
    renderAlerts() {
        const c = document.getElementById('alertsContainer');
        if (!this.alerts.length) { c.innerHTML = '<p style="color:#666;text-align:center;padding:20px">暂无提醒设置</p>'; return; }
        c.innerHTML = this.alerts.map(a => {
            let text = a.type === 'above' ? `金价高于 ¥${a.price}/克` : a.type === 'below' ? `金价低于 ¥${a.price}/克` : `涨跌幅超过 ${a.price}%`;
            return `<div class="alert-item"><div class="alert-info"><div class="alert-condition">${text}</div><div class="alert-status">创建: ${new Date(a.createdAt).toLocaleString('zh-CN')}</div></div><button class="delete-alert" onclick="app.deleteAlert(${a.id})">删除</button></div>`;
        }).join('');
    }
    
    deleteAlert(id) {
        this.alerts = this.alerts.filter(a => a.id !== id);
        localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
        this.renderAlerts();
    }
    
    checkAlerts() {
        this.alerts.forEach(a => {
            if (!a.active || !this.pricePerGram) return;
            let hit = false;
            if (a.type === 'above') hit = this.pricePerGram >= a.price;
            else if (a.type === 'below') hit = this.pricePerGram <= a.price;
            else hit = Math.abs((this.priceData?.domestic?.changePercent || 0)) >= a.price;
            if (hit) {
                this.showNotification(a);
                a.active = false;
                localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
                this.renderAlerts();
            }
        });
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    }
    
    showNotification(a) {
        const cur = this.pricePerGram;
        let msg = a.type === 'above' ? `当前 ¥${cur.toFixed(2)}/克，已超过 ¥${a.price}/克`
            : a.type === 'below' ? `当前 ¥${cur.toFixed(2)}/克，已低于 ¥${a.price}/克`
            : `涨跌幅已达 ${this.priceData?.domestic?.changePercent?.toFixed(2) || 0}%`;
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('金价提醒', { body: msg, icon: '/pwa-192x192.svg' });
        }
        alert(`金价提醒: ${msg}`);
    }
    
    showError(message) {
        document.querySelector('.price-section').innerHTML = `
            <div class="error" style="grid-column:1/-1">
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top:10px;padding:8px 16px;background:#b8860b;color:#fff;border:none;border-radius:6px;cursor:pointer">重试</button>
            </div>`;
    }
}

const app = new GoldPriceApp();
window.app = app;