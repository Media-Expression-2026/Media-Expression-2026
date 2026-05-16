const container = document.getElementById('stream-container');
let isFetching = false; // 3件のバッチ全体の読み込みをロックするフラグ

// Wikipedia APIから1件のデータを取得して配置する関数
async function fetchWikipedia() {
    const url = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("APIエラー");
        const data = await response.json();

        if (data.title && data.extract) {
            appendCard(data);
        }
    } catch (error) {
        console.warn("Wikipedia APIエラー。模擬データを挿入します。");
        insertFallbackData();
    }
}

function appendCard(data) {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.innerHTML = `
        <div class="wiki-meta">// SOURCE: WIKIPEDIA_RANDOM_ARCHIVE // ID: ${data.pageid || 'UNKNOWN'}</div>
        <div class="wiki-title">${data.title}</div>
        <div class="wiki-extract">${data.extract}</div>
    `;
    container.appendChild(card);
}

function insertFallbackData() {
    const dummy = {
        title: "Digital Archaeology",
        extract: "The study of human history and prehistory through the excavation of sites and the analysis of artifacts and other physical remains preserved in digital formats."
    };
    appendCard(dummy);
}

// 指定した件数を「1つの塊（バッチ）」として順番に読み込む
async function loadBatch(count) {
    if (isFetching) return; // すでに読み込み中なら重複して実行しない
    isFetching = true;

    for (let i = 0; i < count; i++) {
        await fetchWikipedia();
    }

    isFetching = false; // すべての読み込みが完了したらロック解除
}

// 自動スクロール ＆ 残り距離の数学的監視
let scrollSpeed = 0.5;
function autoScroll() {
    window.scrollBy(0, scrollSpeed);

    // ページ全体の高さ
    const pageHeight = document.documentElement.scrollHeight;
    // 現在の画面最下部の位置（スクロール量 ＋ 画面の高さ）
    const currentBottom = window.scrollY + window.innerHeight;

    // 画面の最下部が、ページの本当の終端から「残り1000px」に近づいたら自動補充
    if (pageHeight - currentBottom < 1000) {
        loadBatch(3); // 非同期で次の3件を裏で読み込み開始
    }

    requestAnimationFrame(autoScroll);
}

// 初回起動処理
async function start() {
    // 最初に4件読み込んで、スクロールできる床（十分な高さ）を確実に作る
    await loadBatch(4); 
    // スクロールと監視を同時に開始
    autoScroll();
}

start();