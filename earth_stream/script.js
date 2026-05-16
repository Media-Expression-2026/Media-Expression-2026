const container = document.getElementById('stream-container');
const dataPool = []; // リアルタイムに流れ込むデータを一時的に貯めるプール

// 1. Wikipediaのリアルタイム世界編集ストリーム（SSE）に常時接続
// ※アカウント・キー一切不要、HTTPS対応
const streamUrl = 'https://stream.wikimedia.org/v2/stream/recentchange';
const eventSource = new EventSource(streamUrl);

// ストリームからデータが届くたびに自動実行されるイベント
eventSource.onmessage = (event) => {
    const rawData = JSON.parse(event.data);
    
    // 「通常の編集（edit）」かつ「Botではない人間の操作」のみを抽出
    if (rawData.type === 'edit' && !rawData.bot) {
        // アーカイブに必要な要素だけを削り出してプールに投入
        dataPool.push({
            title: rawData.title,
            user: rawData.user,
            comment: rawData.comment || '(no comment)',
            server: rawData.server_name,
            timestamp: new Date(rawData.timestamp * 1000).toLocaleTimeString()
        });
    }

    // メモリ枯渇防止：プールが溜まりすぎたら古いものを捨てる
    if (dataPool.length > 100) {
        dataPool.shift();
    }
};

// 届いた生データを画面のカードに変換する関数
function appendCard(data) {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.innerHTML = `
        <div class="wiki-meta">// LIVE_STREAM_CONNECTED // SERVER: ${data.server} // TIME: ${data.timestamp}</div>
        <div class="wiki-title">${data.title}</div>
        <div class="wiki-extract">
            <span style="color: #fff;">BY: ${data.user}</span><br>
            <span style="opacity: 0.6;">LOG: ${data.comment}</span>
        </div>
    `;
    container.appendChild(card);
}

// 2. 自動スクロール ＆ プールからの引き出し監視
let scrollSpeed = 0.5;
function autoScroll() {
    window.scrollBy(0, scrollSpeed);

    const pageHeight = document.documentElement.scrollHeight;
    const currentBottom = window.scrollY + window.innerHeight;

    // 底に近づき、かつプールに「本物の生データ」が届いていれば、1件引き抜いて床を伸ばす
    if (pageHeight - currentBottom < 1000 && dataPool.length > 0) {
        const nextData = dataPool.shift(); // プールの先頭から取り出す
        appendCard(nextData);
    }

    requestAnimationFrame(autoScroll);
}

// 3. 初期起動処理（ストリームが接続され、最初の数件がプールに溜まったらスタート）
const scrambledInitialize = setInterval(() => {
    if (dataPool.length >= 4) {
        clearInterval(scrambledInitialize);
        
        // 最初の4画面分を配置してスクロールの床を作る
        for (let i = 0; i < 4; i++) {
            appendCard(dataPool.shift());
        }
        
        // 永遠のスクロールを開始
        autoScroll();
    }
}, 300);