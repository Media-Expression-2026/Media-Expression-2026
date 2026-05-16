const videoBg = document.getElementById('video-bg');
const dataTitle = document.getElementById('data-title');
const dataUser = document.getElementById('data-user');
const dataComment = document.getElementById('data-comment');
const rawLogStream = document.getElementById('raw-log-stream');

// Wikipediaのリアルタイム世界編集ストリーム（SSE）に接続
const streamUrl = 'https://stream.wikimedia.org/v2/stream/recentchange';
const eventSource = new EventSource(streamUrl);

eventSource.onmessage = (event) => {
    const rawData = JSON.parse(event.data);
    
    // 膨大なログのLive感を出すため、全ての生パケット情報を右側の「滝」に流し続ける
    const logLine = document.createElement('div');
    logLine.innerText = `[RC_LOG] ${rawData.server_name} >> ${rawData.title} BY_${rawData.user}`;
    rawLogStream.insertBefore(logLine, rawLogStream.firstChild);
    
    // 右側のログが溜まりすぎたら古いものを削除（ブラウザを重くしない処理）
    if (rawLogStream.childNodes.length > 40) {
        rawLogStream.removeChild(rawLogStream.lastChild);
    }

    // メインの映像化対象：「英語版Wikipedia（en.wikipedia.org）」の「人間の編集」のみに絞る
    if (rawData.server_name === 'en.wikipedia.org' && !rawData.bot && rawData.type === 'edit') {
        
        // 1. タイトルから映像（画像）の検索キーワードを抽出（最初の2単語）
        const cleanTitle = rawData.title.replace(/[^a-zA-Z ]/g, ""); // 英字のみ抽出
        const words = cleanTitle.split(" ").filter(w => w.length > 2);
        const keyword = words.slice(0, 2).join(","); // 2つの単語をキーワード化

        if (keyword) {
            // 2. ネット上のリアルタイム連動型イメージストリームから映像を取得
            // キャッシュを回避して最新を拾うためタイムスタンプを付与
            const imageUrl = `https://loremflickr.com/1920/1080/${keyword}?t=${Date.now()}`;
            
            // 画像をあらかじめ裏で読み込んでから背景に適用（白いチラつきを防止）
            const imgLoader = new Image();
            imgLoader.src = imageUrl;
            imgLoader.onload = () => {
                videoBg.style.backgroundImage = `url('${imageUrl}')`;
                
                // Liveエフェクト：受信した瞬間に背景をパルス発光（グリッチ感）させる
                videoBg.className = 'pulse-flash';
                setTimeout(() => { videoBg.className = ''; }, 300);
            };
        }

        // 3. パネル上の文字情報を更新
        dataTitle.innerText = rawData.title;
        dataUser.innerText = `// OPERATOR: ${rawData.user} [SERVER: ${rawData.server_name}]`;
        dataComment.innerText = rawData.comment ? `> COMMENT: ${rawData.comment}` : `> COMMENT: (no status log)`;
    }
};

eventSource.onerror = (err) => {
    console.error("Stream connection failed:", err);
};