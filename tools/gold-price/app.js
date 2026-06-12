// 国内金价查看工具
class GoldPriceApp {
    constructor() {
        this.chart = null;
        this.currentPeriod = '1d';
        this.alerts = JSON.parse(localStorage.getItem('goldAlerts')) || [];
        this.priceData = {
            'Au99.99': { price: 0, change: 0, changePercent: 0, time: '' },
            'Au99.95': { price: 0, change: 0, changePercent: 0, time: '' },
            'retail': { price: 0, change: 0, changePercent: 0, time: '' }
        };
        
        this.init();
    }
    
    init() {
        this.initChart();
        this.bindEvents();
        this.loadPriceData();
        this.renderAlerts();
        
        // 每30秒更新一次价格
        setInterval(() => this.loadPriceData(), 30000);
        
        // 检查提醒
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
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 14 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} 元/克`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '时间'
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '价格 (元/克)'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    bindEvents() {
        // 时间按钮点击事件
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.loadChartData();
            });
        });
        
        // 添加提醒按钮
        document.getElementById('addAlert').addEventListener('click', () => {
            this.addAlert();
        });
    }
    
    async loadPriceData() {
        try {
            // 模拟数据 - 实际项目中应该从API获取
            this.simulatePriceData();
            this.updatePriceDisplay();
            this.loadChartData();
        } catch (error) {
            console.error('加载价格数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }
    
    simulatePriceData() {
        const basePrice = 480;
        const now = new Date();
        
        // 模拟Au99.99价格
        const price1 = basePrice + (Math.random() - 0.5) * 10;
        const change1 = (Math.random() - 0.5) * 5;
        
        // 模拟Au99.95价格
        const price2 = basePrice - 2 + (Math.random() - 0.5) * 8;
        const change2 = (Math.random() - 0.5) * 4;
        
        // 模拟品牌零售价
        const price3 = basePrice + 120 + (Math.random() - 0.5) * 20;
        const change3 = (Math.random() - 0.5) * 8;
        
        this.priceData = {
            'Au99.99': {
                price: price1,
                change: change1,
                changePercent: (change1 / price1 * 100),
                time: now.toLocaleTimeString('zh-CN')
            },
            'Au99.95': {
                price: price2,
                change: change2,
                changePercent: (change2 / price2 * 100),
                time: now.toLocaleTimeString('zh-CN')
            },
            'retail': {
                price: price3,
                change: change3,
                changePercent: (change3 / price3 * 100),
                time: now.toLocaleTimeString('zh-CN')
            }
        };
        
        document.getElementById('lastUpdate').textContent = now.toLocaleString('zh-CN');
    }
    
    updatePriceDisplay() {
        // 更新Au99.99
        document.getElementById('price1').textContent = this.priceData['Au99.99'].price.toFixed(2);
        this.updateChangeDisplay('change1', 'changePercent1', this.priceData['Au99.99']);
        document.getElementById('updateTime1').textContent = this.priceData['Au99.99'].time;
        
        // 更新Au99.95
        document.getElementById('price2').textContent = this.priceData['Au99.95'].price.toFixed(2);
        this.updateChangeDisplay('change2', 'changePercent2', this.priceData['Au99.95']);
        document.getElementById('updateTime2').textContent = this.priceData['Au99.95'].time;
        
        // 更新品牌零售价
        document.getElementById('price3').textContent = this.priceData['retail'].price.toFixed(2);
        this.updateChangeDisplay('change3', 'changePercent3', this.priceData['retail']);
        document.getElementById('updateTime3').textContent = this.priceData['retail'].time;
    }
    
    updateChangeDisplay(changeId, percentId, data) {
        const changeElement = document.getElementById(changeId);
        const percentElement = document.getElementById(percentId);
        
        const change = data.change;
        const percent = data.changePercent;
        
        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
        percentElement.textContent = `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
        
        changeElement.className = `change-value ${change >= 0 ? 'change-positive' : 'change-negative'}`;
        percentElement.className = `change-value ${change >= 0 ? 'change-positive' : 'change-negative'}`;
    }
    
    async loadChartData() {
        try {
            // 生成模拟历史数据
            const historicalData = this.generateHistoricalData();
            this.updateChart(historicalData);
        } catch (error) {
            console.error('加载图表数据失败:', error);
        }
    }
    
    generateHistoricalData() {
        const data = [];
        const now = new Date();
        let points, interval;
        
        switch (this.currentPeriod) {
            case '1d':
                points = 24;
                interval = 60 * 60 * 1000; // 1小时
                break;
            case '1w':
                points = 7 * 24;
                interval = 60 * 60 * 1000; // 1小时
                break;
            case '1m':
                points = 30;
                interval = 24 * 60 * 60 * 1000; // 1天
                break;
            case '3m':
                points = 90;
                interval = 24 * 60 * 60 * 1000; // 1天
                break;
            case '6m':
                points = 180;
                interval = 24 * 60 * 60 * 1000; // 1天
                break;
            case '1y':
                points = 365;
                interval = 24 * 60 * 60 * 1000; // 1天
                break;
            default:
                points = 24;
                interval = 60 * 60 * 1000;
        }
        
        const basePrice = 480;
        let currentPrice = basePrice;
        
        for (let i = points; i >= 0; i--) {
            const time = new Date(now.getTime() - i * interval);
            
            // 模拟价格波动
            currentPrice += (Math.random() - 0.5) * 5;
            currentPrice = Math.max(450, Math.min(520, currentPrice));
            
            data.push({
                time: time,
                price: currentPrice
            });
        }
        
        return data;
    }
    
    updateChart(data) {
        const labels = data.map(item => {
            if (this.currentPeriod === '1d' || this.currentPeriod === '1w') {
                return item.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            } else {
                return item.time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            }
        });
        
        const prices = data.map(item => item.price);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = prices;
        this.chart.update();
    }
    
    addAlert() {
        const type = document.getElementById('alertType').value;
        const price = parseFloat(document.getElementById('alertPrice').value);
        const goldType = document.getElementById('alertGoldType').value;
        
        if (isNaN(price) || price <= 0) {
            alert('请输入有效的价格/百分比');
            return;
        }
        
        const alert = {
            id: Date.now(),
            type,
            price,
            goldType,
            active: true,
            createdAt: new Date().toISOString()
        };
        
        this.alerts.push(alert);
        localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
        this.renderAlerts();
        
        // 清空表单
        document.getElementById('alertPrice').value = '';
        
        // 请求通知权限
        this.requestNotificationPermission();
    }
    
    renderAlerts() {
        const container = document.getElementById('alertsContainer');
        
        if (this.alerts.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">暂无提醒设置</p>';
            return;
        }
        
        container.innerHTML = this.alerts.map(alert => {
            let conditionText = '';
            switch (alert.type) {
                case 'above':
                    conditionText = `${alert.goldType} 价格高于 ${alert.price} 元/克`;
                    break;
                case 'below':
                    conditionText = `${alert.goldType} 价格低于 ${alert.price} 元/克`;
                    break;
                case 'change':
                    conditionText = `${alert.goldType} 涨跌幅超过 ${alert.price}%`;
                    break;
            }
            
            return `
                <div class="alert-item">
                    <div class="alert-info">
                        <div class="alert-condition">${conditionText}</div>
                        <div class="alert-status">创建时间: ${new Date(alert.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <button class="delete-alert" onclick="app.deleteAlert(${alert.id})">删除</button>
                </div>
            `;
        }).join('');
    }
    
    deleteAlert(id) {
        this.alerts = this.alerts.filter(alert => alert.id !== id);
        localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
        this.renderAlerts();
    }
    
    checkAlerts() {
        this.alerts.forEach(alert => {
            if (!alert.active) return;
            
            const currentPrice = this.priceData[alert.goldType]?.price;
            if (!currentPrice) return;
            
            let triggered = false;
            
            switch (alert.type) {
                case 'above':
                    triggered = currentPrice >= alert.price;
                    break;
                case 'below':
                    triggered = currentPrice <= alert.price;
                    break;
                case 'change':
                    const changePercent = Math.abs(this.priceData[alert.goldType].changePercent);
                    triggered = changePercent >= alert.price;
                    break;
            }
            
            if (triggered) {
                this.showNotification(alert, currentPrice);
                alert.active = false;
                localStorage.setItem('goldAlerts', JSON.stringify(this.alerts));
                this.renderAlerts();
            }
        });
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
    
    showNotification(alert, currentPrice) {
        let message = '';
        switch (alert.type) {
            case 'above':
                message = `${alert.goldType} 当前价格 ${currentPrice.toFixed(2)} 元/克，已超过 ${alert.price} 元/克`;
                break;
            case 'below':
                message = `${alert.goldType} 当前价格 ${currentPrice.toFixed(2)} 元/克，已低于 ${alert.price} 元/克`;
                break;
            case 'change':
                message = `${alert.goldType} 涨跌幅已达 ${this.priceData[alert.goldType].changePercent.toFixed(2)}%`;
                break;
        }
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('金价提醒', {
                body: message,
                icon: '/apple-touch-icon.png'
            });
        }
        
        // 同时使用alert作为备用
        alert(`金价提醒: ${message}`);
    }
    
    showError(message) {
        const container = document.querySelector('.price-section');
        container.innerHTML = `
            <div class="error" style="grid-column: 1 / -1;">
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #b8860b; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    重试
                </button>
            </div>
        `;
    }
}

// 初始化应用
const app = new GoldPriceApp();
window.app = app;