const images = ['assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg'];
const primitiveAudio = new Audio('week5/shot.mp3');

let currentIndex = 0;
let frameCounter = 0;
let isRunning = false; 
let intervals = [60, 30, 5]; // フレーム間隔の選択肢
let currentIntervalIndex = 0;

const view = document.getElementById('canvas-view');
const statusText = document.getElementById('status');

// 初回テキスト表示
statusText.innerText = "[ TAP LOWER SCREEN TO START ]";

function triggerSync() {
    view.style.backgroundImage = `url('${images[currentIndex]}')`;
    primitiveAudio.currentTime = 0;
    primitiveAudio.play().catch(e => console.log(e));
    currentIndex = (currentIndex + 1) % images.length;
}

function systemLoop() {
    if (!isRunning) return; 
    frameCounter++;
    let pace = intervals[currentIntervalIndex];
    if (frameCounter % pace === 0) {
        triggerSync();
    }
    requestAnimationFrame(systemLoop);
}

// スマホのタッチ処理のみ
view.addEventListener('touchstart', (e) => {
    const rect = view.getBoundingClientRect();
    const clientY = e.touches.clientY;
    const relativeY = clientY - rect.top;

    if (relativeY < 0 || relativeY > rect.height) return;

    // 上半分：速度変更（フレームレート変更）
    if (relativeY < rect.height / 2) {
        if (isRunning) {
            currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
            statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
        }
    } 
    // 下半分：再生 / 一時停止
    else {
        if (!isRunning) {
            isRunning = true;
            statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
            
            // タップイベントのコールバック直下で鳴らしてブラウザのプロテクトを突破
            triggerSync();
            frameCounter = 0;
            systemLoop();  
        } else {
            isRunning = false;
            statusText.innerText = `[ PAUSED ]`;
        }
    }
}, { passive: true });