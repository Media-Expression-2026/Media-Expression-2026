// 素材定義
const images = ['assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg'];
const primitiveAudio = new Audio('week5/shot.mp3');

let currentIndex = 0;
let frameCounter = 0;
let isRunning = false; 
let intervals =[30, 15, 5]; // フレーム間隔の選択肢
let currentIntervalIndex = 0;

const view = document.getElementById('canvas-view');
const statusText = document.getElementById('status');

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

// PC用：クリックで再生・一時停止
window.addEventListener('click', () => {
    if (!isRunning) {
        isRunning = true;
        statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
        triggerSync(); 
        systemLoop();  
    } else {
        isRunning = false;
        statusText.innerText = `[ PAUSED ]`;
    }
});

// PC用：スペースキーで速度切り替え
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isRunning) {
        e.preventDefault();
        currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length;
        statusText.innerText = `[ RUNNING / PACE : ${intervals[currentIntervalIndex]} frames ]`;
    }
});