const container = document.getElementById('stream-container');
const sentinel = document.getElementById('sentinel');

let currentSol = 1000; 
let isFetching = false;

// NASA APIからデータを取得する関数
async function fetchMarsPhotos() {
    if (isFetching) return;
    isFetching = true;
    console.log(`データ取得開始... (Sol: ${currentSol})`);

    const apiKey = 'DEMO_KEY'; 
    const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=${currentSol}&api_key=${apiKey}`;

    try {
        const response = await fetch(url);
        
        // エラー（429:制限超えなど）が出た場合はフォールバック（模擬データ）へ
        if (!response.ok) {
            throw new Error(`APIエラー: ステータス ${response.status}`);
        }

        const data = await response.json();

        if (data.photos && data.photos.length > 0) {
            console.log(`${data.photos.length}枚の写真を読み込みました。`);
            appendCards(data.photos.slice(0, 4));
            currentSol += 100; // 次回のために進める
        } else {
            console.log("このSolには写真がありませんでした。模擬データを表示します。");
            generateFallbackData();
        }

    } catch (error) {
        console.warn("NASA APIの取得に失敗したため、バックアップモードで起動します:", error.message);
        // APIが止まっても、以下の関数が身代わりになって画面を動かし続けます
        generateFallbackData();
    } finally {
        isFetching = false;
    }
}

// 画面にカードを追加する共通処理
function appendCards(photoArray) {
    photoArray.forEach(photo => {
        const secureImgSrc = photo.img_src.replace("http://", "https://");
        const card = document.createElement('div');
        card.className = 'data-card';
        card.innerHTML = `
            <img src="${secureImgSrc}" alt="Mars Photo">
            <div class="data-overlay">
                <div>// IDENTIFIER: NASA_MARS_ROVER_STREAM</div>
                <div>[ ROVER ] : ${photo.rover.name.toUpperCase()}</div>
                <div>[ CAMERA] : ${photo.camera.full_name}</div>
                <div>[ M_SOL ] : SOL-${photo.sol}</div>
                <div>[ EARTH ] : ${photo.earth_date}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 【安全対策】APIが死んでいる時に動くダミーデータ生成機能
function generateFallbackData() {
    const fallbackPhotos = [
        {
            img_src: 'https://images.unsplash.com/photo-1612892483236-42d68a57623d?w=1200', // 宇宙のフリー素材画像
            sol: currentSol,
            earth_date: new Date().toISOString().split('T'),
            camera: { full_name: "Navigation Camera (Simulation)" },
            rover: { name: "Curiosity (Offline Mode)" }
        },
        {
            img_src: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200',
            sol: currentSol + 1,
            earth_date: new Date().toISOString().split('T'),
            camera: { full_name: "Hazard Avoidance Camera" },
            rover: { name: "Curiosity (Offline Mode)" }
        }
    ];
    appendCards(fallbackPhotos);
    currentSol += 10;
}

// 最下部検知の設定
const observer = new IntersectionObserver((entries) => {
    if (entries.isIntersecting) {
        fetchMarsPhotos();
    }
}, { rootMargin: '400px' });

observer.observe(sentinel);

// 自動スクロール
let scrollSpeed = 0.8;
function autoScroll() {
    window.scrollBy(0, scrollSpeed);
    requestAnimationFrame(autoScroll);
}

// 初回起動
fetchMarsPhotos().then(() => {
    autoScroll();
});