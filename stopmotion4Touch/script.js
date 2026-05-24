// ==========================================
// 1. 素材の置き場所定義
// ==========================================
const images = [
    'assets/photo1.jpg',
    'assets/photo2.jpg',
    'assets/photo3.jpg'
];
const primitiveAudio = new Audio('week5/shot.mp3');

// ==========================================
// 2. 状態管理（インフラ変数）
// ==========================================
let currentIndex = 0;
let frameCounter = 0;
let isRunning = false; 

// 周期（60コマ=約1秒、15コマ=中速、3コマ=爆速）
let intervals =[60, 15, 3];


let currentIntervalIndex = 0;

const view = document.getElementById('canvas-view');
const statusText = document.getElementById('status');

// ==========================================
// 3. コマ切り替えと音響の同時発火
// ==========================================
function triggerSync() {
    view.style.backgroundImage = `url('${images[currentIndex]}')`;
    
    primitiveAudio.currentTime = 0;
    primitiveAudio.play().catch(e => console.log(e));

    currentIndex = (currentIndex + 1) % images.length;
}

// ==========================================
// 4. メインループ
// ==========================================
function systemLoop() {
    if (!isRunning) return; 

    frameCounter++;
    let pace = intervals[currentIntervalIndex];

    if (frameCounter % pace === 0) {
        triggerSync();
    }

    requestAnimationFrame(systemLoop);
}

// ==========================================
// 5. 制御スイッチ（タップ / クリック共通関数）
// ==========================================
function toggleSystem(e) {
    // スマホでのダブル発火（チャタリング）を防止
    e.preventDefault(); 
    
    if (!isRunning) {
        isRunning = true;
        statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
        triggerSync(); 
        systemLoop();  
    } else {
        isRunning = false;
        statusText.innerText = `[ PAUSED ]`;
    }
}

// PC用のクリックイベント
window.addEventListener('click', (e) => {
    // タッチデバイスでない場合のみ通す
    if (window.ontouchstart === undefined) {
        toggleSystem(e);
    }
});

// スマホ（タッチパネル）用のイベント
window.addEventListener('touchstart', (e) => {
    toggleSystem(e);
}, { passive: false });

// PC用のスペースキー速度切り替え
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isRunning) {
        currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
        statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
    }
});