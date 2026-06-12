import { jsonResponse } from '../cors.js';

export async function saveGoldHistory(env) {
  const [goldRes, rateRes] = await Promise.all([
    fetch('https://api.gold-api.com/price/XAU'),
    fetch('https://open.er-api.com/v6/latest/USD')
  ]);

  if (!goldRes.ok || !rateRes.ok) {
    console.error('Failed to fetch gold price or exchange rate');
    return;
  }

  const goldData = await goldRes.json();
  const rateData = await rateRes.json();
  const usdCny = rateData.rates.CNY;
  const priceCNY = (goldData.price * usdCny) / 31.1035;

  const today = new Date().toISOString().split('T')[0];
  const record = {
    date: today,
    gold_usd_oz: goldData.price,
    usd_cny: usdCny,
    gold_cny_g: priceCNY,
    timestamp: new Date().toISOString()
  };

  const filePath = `gold-data/${today}.json`;
  const repo = env.GOLD_DATA_REPO;

  const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Silence-Tools'
    }
  });

  if (checkRes.ok) {
    return;
  }

  await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Silence-Tools'
    },
    body: JSON.stringify({
      message: `feat: 添加 ${today} 金价数据`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(record, null, 2))))
    })
  });
}

export async function handleGoldHistory(request, env) {
  const url = new URL(request.url);
  const repo = env.GOLD_DATA_REPO;

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/gold-data`, {
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Silence-Tools'
    }
  });

  if (!res.ok) {
    return jsonResponse({ data: [] });
  }

  const files = await res.json();
  const data = [];

  const recentFiles = files
    .filter(f => f.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, 30);

  for (const file of recentFiles) {
    const fileRes = await fetch(file.download_url);
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      data.push(fileData);
    }
  }

  return jsonResponse({ data: data.reverse() });
}
