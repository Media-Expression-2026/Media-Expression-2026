const container = document.getElementById('stream-container');
const glitchScreen = document.getElementById('glitch-screen');
const rawLogStream = document.getElementById('raw-log-stream');
const dataPool = [];

const noiseChars = ['█', '░', '▒', '▨', '_', '▲', '×', 'Ø', '§'];

// ==========================================
// ADVANCED INTERACTIVE 3D PARTICLE SYSTEM
// ==========================================
let scene, camera, renderer, particleGeometry, particles;
const PARTICLE_COUNT = 2000;
const particleData = [];

// マウスインタラクション用の座標管理
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

function initThree() {
    const canvas = document.getElementById('three-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 400;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // 粒子ベクトルの初期化（球体状のクラスタから流体展開）
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIdx = i * 3;
        
        // 空間全体にランダム分散
        positions[pIdx] = (Math.random() - 0.5) * 800;
        positions[pIdx + 1] = (Math.random() - 0.5) * 600;
        positions[pIdx + 2] = (Math.random() - 0.5) * 400;

        // サイバーグリーンから輝く白へのグラデーション
        colors[pIdx] = 0.0;
        colors[pIdx + 1] = Math.random() * 0.8 + 0.2;
        colors[pIdx + 2] = Math.random() * 0.5;

        // 物理特性の定義
        particleData.push({
            x: positions[pIdx],
            y: positions[pIdx + 1],
            z: positions[pIdx + 2],
            ox: positions[pIdx], // オリジナルの位置を記憶
            oy: positions[pIdx + 1],
            oz: positions[pIdx + 2],
            vx: 0,
            vy: 0,
            vz: 0,
            speed: Math.random() * 0.02 + 0.01,
            angle: Math.random() * Math.PI * 2
        });
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 発光質感を持つマテリアル設定
    const particleMaterial = new THREE.PointsMaterial({
        size: 2.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // マウス移動のイベントリスナー（ウインドウ全体で検知）
    window.addEventListener('mousemove', (e) => {
        // 座標を正規化 (-1 から 1)
        mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
}

// ネットデータのパルス（データ受信＝緑の波紋、衝突＝赤の衝撃波）
function triggerParticleBurst(isRevert) {
    const colors = particleGeometry.attributes.color.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIdx = i * 3;
        
        // 四方へ弾け飛ぶベクトルを注入
        const force = isRevert ? 12 : 4;
        particleData[i].vx += (Math.random() - 0.5) * force;
        particleData[i].vy += (Math.random() - 0.5) * force;
        particleData[i].vz += (Math.random() - 0.5) * force;

        if (isRevert) {
            // 警告色の赤パルス
            colors[pIdx] = 1.0; colors[pIdx + 1] = 0.2; colors[pIdx + 2] = 0.2;
        } else {
            // 通常同期のグリーンパルス
            colors[pIdx] = 0.3; colors[pIdx + 1] = 1.0; colors[pIdx + 2] = 0.7;
        }
    }
    particleGeometry.attributes.color.needsUpdate = true;
}

// ==========================================
// DATA STREAMING & MULTIMEDIA DECAY LOGIC
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
// SYSTEM CORE MAIN LOOP (CORE PHYSICS)
// ==========================================
let scrollSpeed = 0.6;
let time = 0;

function systemLoop() {
    // 1. スクロール駆動
    window.scrollBy(0, scrollSpeed);

    const pageHeight = document.documentElement.scrollHeight;
    const currentBottom = window.scrollY + window.innerHeight;

    if (pageHeight - currentBottom < 1200 && dataPool.length > 0) {
        appendCard(dataPool.shift());
    }

    // 2. インタラクティブ流体パーティクル演算
    time += 0.002;
    
    // マウス追従のスムージング（慣性移動）
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    // 3D空間上のマウス絶対座標をシミュレート
    const mX = mouse.x * 350;
    const mY = mouse.y * 250;

    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIdx = i * 3;
        const data = particleData[i];

        // ベースの有機的数学ノイズ移動（うねり効果）
        data.angle += data.speed;
        const noiseX = Math.sin(data.angle + time) * 0.5;
        const noiseY = Math.cos(data.angle - time) * 0.5;

        // マウスカーソルとの距離を計算
        const dx = mX - positions[pIdx];
        const dy = mY - positions[pIdx + 1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        // マウス周辺の粒子への重力・反発インタラクション
        if (distance < 120) {
            const force = (120 - distance) / 120;
            // カーソル方向へ流動的に引き寄せる、あるいはうねらせる
            data.vx += (dx / distance) * force * 0.6;
            data.vy += (dy / distance) * force * 0.6;
        }

        // 速度ベクトルと慣性の適用
        positions[pIdx] += data.vx + noiseX;
        positions[pIdx + 1] += data.vy + noiseY;
        positions[pIdx + 2] += data.vz;

        // 摩擦（減衰抵抗）をかけて元の安定軌道（ホームポジション）に戻る復元力
        data.vx *= 0.92;
        data.vy *= 0.92;
        data.vz *= 0.92;

        positions[pIdx] += (data.ox - positions[pIdx]) * 0.015;
        positions[pIdx + 1] += (data.oy - positions[pIdx + 1]) * 0.015;
        positions[pIdx + 2] += (data.oz - positions[pIdx + 2]) * 0.015;

        // カラーの本来のサイバーグリーンへの緩やかな減衰（色復帰）
        colors[pIdx] += (0.0 - colors[pIdx]) * 0.01;
        colors[pIdx + 1] += (data.baseG - colors[pIdx + 1]) * 0.01;
        colors[pIdx + 2] += (data.baseB - colors[pIdx + 2]) * 0.01;
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;

    // カメラのわずかな自動ゆらぎ演出
    particles.rotation.y = Math.sin(time * 0.2) * 0.08;
    particles.rotation.x = Math.cos(time * 0.2) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(systemLoop);
}

// 初期起動
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