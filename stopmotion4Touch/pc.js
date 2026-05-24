const images = ['assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg'];
const primitiveAudio = new Audio('week5/shot.mp3');

let currentIndex = 0;
let frameCounter = 0;
let isRunning = false; 
let intervals =[60, 30, 5]; // フレーム間隔の選択肢
let currentIntervalIndex = 0;

const view = document.getElementById('canvas-view');
const statusText = document.getElementById('status');

// 初回テキスト表示
statusText.innerText = "[ CLICK SCREEN TO START ]";

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

// 枠内のクリック判定
view.addEventListener('click', (e) => {
    const rect = view.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    if (relativeY < rect.height / 2) {
        // 上半分：速度切り替え
        if (isRunning) {
            currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
            statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
        }
    } else {
        // 下半分：再生・停止
        if (!isRunning) {
            isRunning = true;
            statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
            triggerSync();
            frameCounter = 0;
            systemLoop();
        } else {
            isRunning = false;
            statusText.innerText = `[ PAUSED ]`;
        }
    }
});

// スペースキーでも変速可能
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isRunning) {
        e.preventDefault();
        currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
        statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
    }
});