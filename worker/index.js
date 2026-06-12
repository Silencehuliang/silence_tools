export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/api/gold') {
        // 获取Au99.99实时报价
        const symbols = url.searchParams.get('symbols') || 'au9999';
        const data = await fetchSinaGold(symbols);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/gold/kline') {
        // 获取K线数据
        const symbol = url.searchParams.get('symbol') || 'au9999';
        const scale = url.searchParams.get('scale') || '240';
        const datalen = url.searchParams.get('datalen') || '100';
        const data = await fetchSinaKLine(symbol, scale, datalen);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function fetchSinaGold(symbols) {
  const resp = await fetch(`https://hq.sinajs.cn/list=${symbols}`, {
    headers: {
      'Referer': 'https://finance.sina.com.cn/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!resp.ok) throw new Error(`Sina API error: ${resp.status}`);

  const text = await resp.text();
  const results = {};

  // 解析格式: var hq_str_au9999="名称,今开,昨收,当前价,最高,最低,买价,卖价,时间,涨跌额,涨跌幅,...";
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const match = line.match(/var hq_str_(\w+)="(.*)"/);
    if (match) {
      const [, code, data] = match;
      const fields = data.split(',');
      if (code === 'au9999') {
        results[code] = {
          name: fields[0],           // 名称
          open: parseFloat(fields[1]),    // 今开
          prevClose: parseFloat(fields[2]), // 昨收
          price: parseFloat(fields[3]),   // 当前价
          high: parseFloat(fields[4]),    // 最高
          low: parseFloat(fields[5]),     // 最低
          bid: parseFloat(fields[6]),     // 买价
          ask: parseFloat(fields[7]),     // 卖价
          time: fields[8],              // 时间
          change: parseFloat(fields[9]),  // 涨跌额
          changePercent: parseFloat(fields[10]), // 涨跌幅
          volume: parseFloat(fields[14]) || 0,  // 成交量
          turnover: parseFloat(fields[15]) || 0, // 成交额
        };
      } else if (code === 'au9995') {
        results[code] = {
          name: fields[0],
          open: parseFloat(fields[1]),
          prevClose: parseFloat(fields[2]),
          price: parseFloat(fields[3]),
          high: parseFloat(fields[4]),
          low: parseFloat(fields[5]),
          bid: parseFloat(fields[6]),
          ask: parseFloat(fields[7]),
          time: fields[8],
          change: parseFloat(fields[9]),
          changePercent: parseFloat(fields[10]),
          volume: parseFloat(fields[14]) || 0,
          turnover: parseFloat(fields[15]) || 0,
        };
      } else {
        results[code] = data;
      }
    }
  }

  return results;
}

async function fetchSinaKLine(symbol, scale, datalen) {
  const resp = await fetch(
    `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=${scale}&ma=no&datalen=${datalen}`,
    {
      headers: {
        'Referer': 'https://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  );

  if (!resp.ok) throw new Error(`Sina KLine API error: ${resp.status}`);

  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}