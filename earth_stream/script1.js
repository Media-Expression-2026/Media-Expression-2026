const container = document.getElementById('stream-container');
let isFetching = false;
let cityIndex = 0;

// 観測対象のポイントデータ（タイポを修正しました）
const cities = [
    { name: "TOKYO / JAPAN", lat: 35.6762, lon: 139.6503 },
    { name: "NEW YORK / USA", lat: 40.7128, lon: -74.0060 },
    { name: "LONDON / UK", lat: 51.5074, lon: -0.1278 },
    { name: "REYKJAVIK / ICELAND", lat: 64.1466, lon: -21.9426 },
    { name: "CAIRO / EGYPT", lat: 30.0444, lon: 31.2357 },
    { name: "SYDNEY / AUSTRALIA", lat: -33.8688, lon: 151.2093 },
    { name: "AMAZON RAINFOREST / BRAZIL", lat: -3.4653, lon: -62.2159 },
    { name: "AMUNDSEN-SCOTT / ANTARCTICA", lat: -82.8628, lon: 135.0000 }
];

// Open-Meteo APIから環境データを取得
async function fetchEarthMetrics() {
    const city = cities[cityIndex];
    cityIndex = (cityIndex + 1) % cities.length; // 順繰りにループ

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        
        if (data.current) {
            appendCard(city.name, city.lat, city.lon, data.current);
        }
    } catch (error) {
        console.warn("Open-Meteo APIのエラー。ダミーを出力します。");
        insertFallbackData(city.name, city.lat, city.lon);
    }
}

function appendCard(name, lat, lon, current) {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.innerHTML = `
        <div class="geo-location">// GLOBE_MONITOR: ${name} <br>[ LAT: ${lat.toFixed(4)} / LON: ${lon.toFixed(4)} ]</div>
        <div class="metrics-grid">
            <div class="metric-box">
                <div class="metric-label">TEMP_2M</div>
                <div class="metric-value">${current.temperature_2m}°C</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">HUMIDITY</div>
                <div class="metric-value">${current.relative_humidity_2m}%</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">WIND_SPD</div>
                <div class="metric-value">${current.wind_speed_10m} km/h</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">BARO_PRES</div>
                <div class="metric-value">${Math.round(current.surface_pressure)} hPa</div>
            </div>
        </div>
    `;
    container.appendChild(card);
}

function insertFallbackData(name, lat, lon) {
    const dummyCurrent = {
        temperature_2m: (Math.random() * 35 - 10).toFixed(1),
        relative_humidity_2m: Math.floor(Math.random() * 50 + 40),
        wind_speed_10m: (Math.random() * 25).toFixed(1),
        surface_pressure: Math.floor(Math.random() * 30 + 990)
    };
    appendCard(name, lat, lon, dummyCurrent);
}

// データの塊（バッチ）をロード
async function loadBatch(count) {
    if (isFetching) return;
    isFetching = true;
    for (let i = 0; i < count; i++) {
        await fetchEarthMetrics();
    }
    isFetching = false;
}

// 確実な残り距離計算による自動スクロール
let scrollSpeed = 0.5;
function autoScroll() {
    window.scrollBy(0, scrollSpeed);

    const pageHeight = document.documentElement.scrollHeight;
    const currentBottom = window.scrollY + window.innerHeight;

    // 底に近づいたら先読み補充
    if (pageHeight - currentBottom < 1000) {
        loadBatch(3);
    }
    requestAnimationFrame(autoScroll);
}

// 初期化
async function start() {
    await loadBatch(4); // 最初に4画面分作る
    autoScroll();
}

start();