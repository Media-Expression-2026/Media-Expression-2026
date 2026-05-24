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
// 2. 状態管理（フレームカウントベース）
// ==========================================
let currentIndex = 0;
let frameCounter = 0;
let isRunning = false; 

// フレーム数ベースの周期（60コマ、15コマ、3コマ）
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
    primitiveAudio.play().catch(e => console.log("Audio play blocked:", e));

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
// 5. 核心：挙動のコントロールロジック
// ==========================================
function handleAction(clientY) {
    const rect = view.getBoundingClientRect();
    const relativeY = clientY - rect.top;

    // 枠外の操作は無視
    if (relativeY < 0 || relativeY > rect.height) return;

    // 【上半分】：フレームレート変速（60 -> 15 -> 3）
    if (relativeY < rect.height / 2) {
        if (isRunning) {
            currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
            statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
        }
    } 
    // 【下半分】：再生 / 一時停止
    else {
        if (!isRunning) {
            isRunning = true;
            statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
            
            // タップ・クリックしたその瞬間に直接音を叩いてブラウザロックを解除
            triggerSync();
            frameCounter = 0; 
            
            systemLoop();  
        } else {
            isRunning = false;
            statusText.innerText = `[ PAUSED ]`;
        }
    }
}

// ==========================================
// 6. スマホ用・PC用 イベント完全分離（競合解決）
// ==========================================

// 📱 スマホ環境（タッチイベント）
view.addEventListener('touchstart', (e) => {
    // タッチした瞬間の座標を渡し、即座にアクションを起こす
    const clientY = e.touches.clientY;
    handleAction(clientY);
}, { passive: true });

// 💻 PC環境（マウスクリックイベント）
view.addEventListener('click', (e) => {
    // スマホ・タッチパネルの環境（ontouchstartが存在する端末）では、このクリック処理を完全にスキップ
    if (window.ontouchstart !== undefined) return;
    
    handleAction(e.clientY);
});

// ⌨️ PC用：スペースキーでの変速（PC操作時の利便性キープ）
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isRunning) {
        e.preventDefault();
        currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
        statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
    }
});