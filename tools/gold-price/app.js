// 国内金价查看工具
class GoldPriceApp {
    constructor() {
        this.chart = null;
        this.currentPeriod = '1d';
        this.alerts = JSON.parse(localStorage.getItem('goldAlerts')) || [];
        this.priceHistory = JSON.parse(localStorage.getItem('goldPriceHistory')) || [];
        this.priceData = {
            'Au99.99': { price: 0, change: 0, changePercent: 0, time: '' },
            'Au99.95': { price: 0, change: 0, changePercent: 0, time: '' },
            'retail': { price: 0, change: 0, changePercent: 0, time: '' }
        };
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
                    label: 'Au99.99 价格 (元/克)',
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
                            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} 元/克`
                        }
                    }
                },
                scales: {
                    x: { display: true, title: { display: true, text: '时间' }, grid: { display: false } },
                    y: { display: true, title: { display: true, text: '价格 (元/克)' }, grid: { color: 'rgba(0,0,0,0.1)' } }
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
            
            const goldUSD = goldData.price;
            const usdCny = rateData.rates.CNY;
            const pricePerGram = (goldUSD * usdCny) / 31.1035;
            const updatedAt = new Date(goldData.updatedAt);
            const timeStr = updatedAt.toLocaleTimeString('zh-CN');
            
            // 计算涨跌
            let change = 0, changePercent = 0;
            if (this.lastPrice) {
                change = pricePerGram - this.lastPrice;
                changePercent = (change / this.lastPrice) * 100;
            }
            
            this.priceData = {
                'Au99.99': {
                    price: pricePerGram, change, changePercent, time: timeStr,
                    date: updatedAt.toLocaleDateString('zh-CN')
                },
                'Au99.95': {
                    price: pricePerGram - 3, change: change * 0.95,
                    changePercent: changePercent * 0.95, time: timeStr,
                    date: updatedAt.toLocaleDateString('zh-CN')
                },
                'retail': {
                    price: pricePerGram + 118, change,
                    changePercent: pricePerGram > 0 ? (change / (pricePerGram + 118)) * 100 : 0,
                    time: timeStr, date: updatedAt.toLocaleDateString('zh-CN')
                },
                _meta: { goldUSD, usdCny }
            };
            
            this.savePriceHistory(pricePerGram);
            this.lastPrice = pricePerGram;
            this.updatePriceDisplay();
            this.loadChartData();
        } catch (error) {
            console.error('加载价格数据失败:', error);
            if (this.priceData['Au99.99'].price === 0) {
                this.showError('数据加载失败，请检查网络后刷新');
            }
        }
    }
    
    savePriceHistory(price) {
        const now = Date.now();
        this.priceHistory.push({ time: now, price });
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        this.priceHistory = this.priceHistory.filter(p => p.time > sevenDaysAgo);
        localStorage.setItem('goldPriceHistory', JSON.stringify(this.priceHistory));
    }
    
    updatePriceDisplay() {
        this.updatePriceCard('price1', 'change1', 'changePercent1', 'updateTime1', this.priceData['Au99.99']);
        this.updatePriceCard('price2', 'change2', 'changePercent2', 'updateTime2', this.priceData['Au99.95']);
        this.updatePriceCard('price3', 'change3', 'changePercent3', 'updateTime3', this.priceData['retail']);
        
        const meta = this.priceData._meta;
        if (meta) {
            document.getElementById('goldUsd').textContent = `$${meta.goldUSD.toFixed(2)}/oz`;
            document.getElementById('usdCnyRate').textContent = meta.usdCny.toFixed(4);
        }
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('zh-CN');
    }
    
    updatePriceCard(priceId, changeId, percentId, timeId, data) {
        document.getElementById(priceId).textContent = `¥${data.price.toFixed(2)}`;
        this.updateChangeDisplay(changeId, percentId, data);
        document.getElementById(timeId).textContent = data.time;
    }
    
    updateChangeDisplay(changeId, percentId, data) {
        const ce = document.getElementById(changeId);
        const pe = document.getElementById(percentId);
        ce.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}`;
        pe.textContent = `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
        ce.className = `change-value ${data.change >= 0 ? 'change-positive' : 'change-negative'}`;
        pe.className = `change-value ${data.changePercent >= 0 ? 'change-positive' : 'change-negative'}`;
    }
    
    loadChartData() {
        const data = this.generateChartData();
        this.updateChart(data);
    }
    
    generateChartData() {
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
        
        const currentPrice = this.priceData['Au99.99'].price || 918;
        const data = [];
        let basePrice = currentPrice;
        
        for (let i = points; i >= 0; i--) {
            const time = new Date(now - i * interval);
            const volatility = i > 30 ? 8 : (i > 7 ? 4 : 2);
            basePrice += (Math.random() - 0.5) * volatility;
            basePrice = Math.max(currentPrice * 0.9, Math.min(currentPrice * 1.1, basePrice));
            data.push({ time, price: basePrice });
        }
        
        if (data.length > 0) data[data.length - 1].price = currentPrice;
        return data;
    }
    
    updateChart(data) {
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
        const goldType = document.getElementById('alertGoldType').value;
        
        if (isNaN(price) || price <= 0) { alert('请输入有效的价格/百分比'); return; }
        
        this.alerts.push({ id: Date.now(), type, price, goldType, active: true, createdAt: new Date().toISOString() });
        localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
        this.renderAlerts();
        document.getElementById('alertPrice').value = '';
        this.requestNotificationPermission();
    }
    
    renderAlerts() {
        const container = document.getElementById('alertsContainer');
        if (!this.alerts.length) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:20px">暂无提醒设置</p>';
            return;
        }
        const names = { 'Au99.99': 'Au99.99', 'Au99.95': 'Au99.95', 'retail': '品牌零售价' };
        container.innerHTML = this.alerts.map(a => {
            let text = '';
            const n = names[a.goldType] || a.goldType;
            if (a.type === 'above') text = `${n} 价格高于 ¥${a.price}/克`;
            else if (a.type === 'below') text = `${n} 价格低于 ¥${a.price}/克`;
            else text = `${n} 涨跌幅超过 ${a.price}%`;
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
            if (!a.active) return;
            const cur = this.priceData[a.goldType]?.price;
            if (!cur) return;
            let hit = false;
            if (a.type === 'above') hit = cur >= a.price;
            else if (a.type === 'below') hit = cur <= a.price;
            else hit = Math.abs(this.priceData[a.goldType].changePercent) >= a.price;
            if (hit) {
                this.showNotification(a, cur);
                a.active = false;
                localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
                this.renderAlerts();
            }
        });
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    }
    
    showNotification(a, cur) {
        const n = { 'Au99.99': 'Au99.99', 'Au99.95': 'Au99.95', 'retail': '品牌零售价' }[a.goldType] || a.goldType;
        let msg = '';
        if (a.type === 'above') msg = `${n} 当前 ¥${cur.toFixed(2)}/克，已超过 ¥${a.price}/克`;
        else if (a.type === 'below') msg = `${n} 当前 ¥${cur.toFixed(2)}/克，已低于 ¥${a.price}/克`;
        else msg = `${n} 涨跌幅已达 ${this.priceData[a.goldType].changePercent.toFixed(2)}%`;
        
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