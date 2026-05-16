const container = document.getElementById('stream-container');
const glitchScreen = document.getElementById('glitch-screen');
const rawLogStream = document.getElementById('raw-log-stream');
const dataPool = [];

const noiseChars = ['█', '░', '▒', '▨', '_', '▲', '×', 'Ø', '§'];

// ==========================================
// THREE.JS 3D PARTICLE SYSTEM ARCHITECTURE
// ==========================================
let scene, camera, renderer, particleGeometry, particleData = [];
const PARTICLE_COUNT = 2500;

function initThree() {
    const canvas = document.getElementById('three-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 500;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // 初期粒子の配置（空間に浮遊するデータノイズ）
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 1000;     // X
        positions[i + 1] = (Math.random() - 0.5) * 1000; // Y
        positions[i + 2] = (Math.random() - 0.5) * 800;  // Z

        // 基本はサイバーグリーン〜白のデータカラー
        colors[i] = 0.0;                             // R
        colors[i + 1] = Math.random() * 0.7 + 0.3;   // G
        colors[i + 2] = Math.random() * 0.4;         // B

        // 各粒子の個別物理データを記録（速度、寿命、本来の色）
        particleData.push({
            vx: (Math.random() - 0.5) * 0.5,
            vy: Math.random() * 0.5 + 0.2, // 基本的にゆっくり上に流れる
            vz: (Math.random() - 0.5) * 0.5,
            baseR: colors[i],
            baseG: colors[i + 1],
            baseB: colors[i + 2],
            isBurst: false
        });
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // マテリアル（質感）の設定
    const particleMaterial = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending // 粒子が重なると発光する
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
}

// データイベントに同期した3D粒子の爆発エフェクト（衝突＝赤、通常追加＝緑）
function triggerParticleBurst(isRevert) {
    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;

    // 全粒子のうち、ランダムに500個を爆発の運動に巻き込む
    for (let i = 0; i < 500; i++) {
        const idx = Math.floor(Math.random() * PARTICLE_COUNT);
        const pIdx = idx * 3;

        // 起点を画面中央付近にリセット
        positions[pIdx] = (Math.random() - 0.5) * 200;
        positions[pIdx + 1] = (Math.random() - 0.5) * 200;
        positions[pIdx + 2] = (Math.random() - 0.5) * 100;

        // 爆発速度（Revert時は人間の衝突エネルギーを模して超高速）
        const speedMultiplier = isRevert ? 15 : 5;
        particleData[idx].vx = (Math.random() - 0.5) * speedMultiplier;
        particleData[idx].vy = (Math.random() - 0.5) * speedMultiplier;
        particleData[idx].vz = (Math.random() - 0.5) * speedMultiplier;
        particleData[idx].isBurst = true;

        // 色の書き換え（Revertなら警告の赤、通常ならサイバーグリーン）
        if (isRevert) {
            colors[pIdx] = 1.0; colors[pIdx + 1] = 0.1; colors[pIdx + 2] = 0.1;
        } else {
            colors[pIdx] = 0.2; colors[pIdx + 1] = 1.0; colors[pIdx + 2] = 0.6;
        }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;
}

// リサイズ対策
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// DATA STREAMING & ENTROPY LOGIC
// ==========================================
const eventSource = new EventSource('https://stream.wikimedia.org/v2/stream/recentchange');

eventSource.onmessage = (event) => {
    const rawData = JSON.parse(event.data);
    
    const logLine = document.createElement('div');
    logLine.innerText = `[RAW_DATA] ${rawData.server_name} >> ${rawData.title}`;
    rawLogStream.insertBefore(logLine, rawLogStream.firstChild);
    if (rawLogStream.childNodes.length > 50) {
        rawLogStream.removeChild(rawLogStream.lastChild);
    }

    if (rawData.server_name === 'en.wikipedia.org' && !rawData.bot && rawData.type === 'edit') {
        const cleanTitle = rawData.title.replace(/[^a-zA-Z ]/g, "");
        const words = cleanTitle.split(" ").filter(w => w.length > 3);
        const keyword = words.slice(0, 2).join(",");

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

function appendCard(data) {
    const card = document.createElement('div');
    card.className = 'data-card';
    
    // データ受信と同時に3Dパーティクルシステムをバーストさせる
    triggerParticleBurst(data.isRevert);

    if (data.isRevert) {
        glitchScreen.className = 'system-revert-glitch';
        setTimeout(() => { glitchScreen.className = ''; }, 300);
    }

    card.innerHTML = `
        <div class="card-bg" style="background-image: url('${data.imageUrl}')"></div>
        <div class="card-content">
            <div class="meta-line">// STREAM_NODE // OPERATOR: ${data.user} // NETWORK_CRASH: ${data.isRevert ? 'REVERT_ALERT' : 'STABLE'}</div>
            <h2 class="decay-title">${data.title}</h2>
            <p class="decay-comment">> ${data.comment}</p>
        </div>
    `;
    container.appendChild(card);
}

function applyEntropy() {
    const cards = document.querySelectorAll('.data-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const bg = card.querySelector('.card-bg');
        const textElements = card.querySelectorAll('.decay-title, .decay-comment');

        if (rect.top < window.innerHeight * 0.3) {
            if (bg) bg.style.filter = "brightness(8%) contrast(90%) grayscale(100%) blur(15px)";

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

// ==========================================
// CORE SYSTEM LOOP (SCROLL & 3D RENDER)
// ==========================================
let scrollSpeed = 0.6;
let time = 0;

function systemLoop() {
    // 1. 自動スクロール処理
    window.scrollBy(0, scrollSpeed);

    const pageHeight = document.documentElement.scrollHeight;
    const currentBottom = window.scrollY + window.innerHeight;

    if (pageHeight - currentBottom < 1200 && dataPool.length > 0) {
        appendCard(dataPool.shift());
    }

    // 2. 3Dパーティクルの動的物理演算
    time += 0.005;
    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIdx = i * 3;
        const data = particleData[i];

        // 位置の更新（速度ベクトルを適用）
        positions[pIdx] += data.vx;
        positions[pIdx + 1] += data.vy;
        positions[pIdx + 2] += data.vz;

        // 通常の浮遊粒子にはサイン波のうねり（流体・ゆらぎ効果）を付与
        if (!data.isBurst) {
            positions[pIdx] += Math.sin(time + i) * 0.2;
        } else {
            // 爆発した粒子は徐々に空気抵抗で減速し、元の平穏な流れに戻る
            data.vx *= 0.95;
            data.vy = data.vy * 0.95 + 0.02; // 微小な上昇流へ復帰
            data.vz *= 0.95;

            // 元のデータカラーへゆっくりと減衰（色収束のエントロピー）
            colors[pIdx] += (data.baseR - colors[pIdx]) * 0.02;
            colors[pIdx + 1] += (data.baseG - colors[pIdx + 1]) * 0.02;
            colors[pIdx + 2] += (data.baseB - colors[pIdx + 2]) * 0.02;

            if (Math.abs(data.vx) < 0.1 && Math.abs(data.vz) < 0.1) {
                data.isBurst = false;
            }
        }

        // 画面外（上空）へ消えた粒子を下部に再配置するエントロピーの循環
        if (positions[pIdx + 1] > 500) {
            positions[pIdx] = (Math.random() - 0.5) * 1000;
            positions[pIdx + 1] = -500;
            positions[pIdx + 2] = (Math.random() - 0.5) * 800;
            data.vx = (Math.random() - 0.5) * 0.5;
            data.vy = Math.random() * 0.5 + 0.2;
            data.vz = (Math.random() - 0.5) * 0.5;
        }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;

    // 3. Three.js レンダリング
    renderer.render(scene, camera);

    requestAnimationFrame(systemLoop);
}

// システム起動
async function start() {
    initThree();

    const initCheck = setInterval(() => {
        if (dataPool.length >= 3) {
            clearInterval(initCheck);
            for (let i = 0; i < 3; i++) {
                appendCard(dataPool.shift());
            }
            systemLoop();
            setInterval(applyEntropy, 150);
        }
    }, 200);
}

start();