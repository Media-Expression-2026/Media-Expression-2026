const container = document.getElementById('stream-container');
const glitchScreen = document.getElementById('glitch-screen');
const rawLogStream = document.getElementById('raw-log-stream');
const dataPool = [];

const noiseChars = ['█', '░', '▒', '▨', '_', '▲', '×', 'Ø', '§'];

// 1. Wikipedia ライブストリーム接続
const eventSource = new EventSource('https://stream.wikimedia.org/v2/stream/recentchange');

eventSource.onmessage = (event) => {
    const rawData = JSON.parse(event.data);
    
    // 全パケットを右側の「滝」に超高速バイパス（Live感の演出）
    const logLine = document.createElement('div');
    logLine.innerText = `[RAW_DATA] ${rawData.server_name} >> ${rawData.title}`;
    rawLogStream.insertBefore(logLine, rawLogStream.firstChild);
    if (rawLogStream.childNodes.length > 50) {
        rawLogStream.removeChild(rawLogStream.lastChild);
    }

    // 英語版Wikipediaの人間の編集（メインの映画的アーカイブ対象）
    if (rawData.server_name === 'en.wikipedia.org' && !rawData.bot && rawData.type === 'edit') {
        // タイトルから検索用キーワードを抽出（意味のある3文字以上の単語）
        const cleanTitle = rawData.title.replace(/[^a-zA-Z ]/g, "");
        const words = cleanTitle.split(" ").filter(w => w.length > 3);
        const keyword = words.slice(0, 2).join(",");

        // メディアストリームURLの生成（キャッシュを殺すユニークシード付き）
        const imageUrl = `https://loremflickr.com/1200/800/${keyword || 'abstract'}?t=${Date.now()}_${Math.random()}`;
        
        const isRevert = rawData.comment && (rawData.comment.includes('revert') || rawData.comment.includes('Undo') || rawData.comment.includes('差し戻し'));

        dataPool.push({
            title: rawData.title,
            user: rawData.user,
            comment: rawData.comment || '(no status comment)',
            imageUrl: imageUrl,
            isRevert: isRevert
        });
    }

    if (dataPool.length > 30) dataPool.shift();
};

// カード生成処理
function appendCard(data) {
    const card = document.createElement('div');
    card.className = 'data-card';
    
    // 人間同士の衝突（データの修正・拒絶）を検知した場合のシステムグリッチ発火
    if (data.isRevert) {
        glitchScreen.className = 'system-revert-glitch';
        setTimeout(() => { glitchScreen.className = ''; }, 300);
    }

    card.innerHTML = `
        <div class="card-bg" style="background-image: url('${data.imageUrl}')"></div>
        <div class="card-content">
            <div class="meta-line">// STREAM_NODE // OPERATOR: ${data.user} // CRASH_STATUS: ${data.isRevert ? 'CONFLICT_REVERT' : 'STABLE'}</div>
            <h2 class="decay-title">${data.title}</h2>
            <p class="decay-comment">> ${data.comment}</p>
        </div>
    `;
    container.appendChild(card);
}

// 2. 時空間エントロピー（古いデータの「風化」と「メディアの劣化」）
function applyEntropy() {
    const cards = document.querySelectorAll('.data-card');
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const bg = card.querySelector('.card-bg');
        const textElements = card.querySelectorAll('.decay-title, .decay-comment');

        // 画面の基準線（中央より上＝過去に過ぎ去った古いカード）を超えたら劣化開始
        if (rect.top < window.innerHeight * 0.3) {
            
            // A. メディア（映像）の風化：徐々に暗く、白黒化し、ボケていく
            if (bg) {
                bg.style.filter = "brightness(8%) contrast(90%) grayscale(100%) blur(12px)";
            }

            // B. テキスト（言語）の風化：ランダムに1文字ずつノイズに置換
            textElements.forEach(el => {
                let currentText = el.innerText;
                if (currentText.length === 0) return;

                let textArray = currentText.split('');
                const randomIndex = Math.floor(Math.random() * textArray.length);
                
                if (textArray[randomIndex] !== ' ' && textArray[randomIndex] !== '>') {
                    textArray[randomIndex] = noiseChars[Math.floor(Math.random() * noiseChars.length)];
                }
                el.innerText = textArray.join('');
            });
        }
    });
}

// 3. 数学的確実性による自動スクロール
let scrollSpeed = 0.6;
function autoScroll() {
    window.scrollBy(0, scrollSpeed);

    const pageHeight = document.documentElement.scrollHeight;
    const currentBottom = window.scrollY + window.innerHeight;

    // 底に近づいたら次のデータをプールから引き抜いて床を生成
    if (pageHeight - currentBottom < 1200 && dataPool.length > 0) {
        appendCard(dataPool.shift());
    }

    requestAnimationFrame(autoScroll);
}

// 初期起動
async function start() {
    const initCheck = setInterval(() => {
        if (dataPool.length >= 3) {
            clearInterval(initCheck);
            // 初期の床（3画面分）を確保
            for (let i = 0; i < 3; i++) {
                appendCard(dataPool.shift());
            }
            autoScroll();
            
            // 150ミリ秒周期でエントロピー（風化）を進行させる
            setInterval(applyEntropy, 150);
        }
    }, 200);
}

start();