import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const rightPanel = document.getElementById('right-panel');
const container = document.getElementById('stream-container');
const glitchScreen = document.getElementById('glitch-screen');
const rawLogStream = document.getElementById('raw-log-stream');
const cameraContainer = document.getElementById('camera-container');
const cameraSelector = document.getElementById('camera-selector');

const dataPool = [];
const noiseChars = ['█', '░', '▒', '▨', '_', '▲', '×', 'Ø', '§'];
let localStream = null;

// ==========================================
// 3D NEURAL SWARM CORE CONFIG & VARIABLES
// ==========================================
const COUNT = 20000;
const SPEED_MULT = 1;
const AUTO_SPIN = true;

let scene, camera, renderer, controls, composer, instancedMesh;
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const target = new THREE.Vector3();
const positions = [];
const clock = new THREE.Clock();

let liveActivity = 2.5;     
let liveSeparation = 5;      
let revertGlitchFactor = 0;  

const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

// ==========================================
// WEB AUDIO API (音響解析システム)
// ==========================================
let audioContext, audioAnalyser, audioDataArray;
let isAudioInitialized = false;

function initAudioAnalyser() {
    if (isAudioInitialized) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256; 
    
    const bufferLength = audioAnalyser.frequencyBinCount;
    audioDataArray = new Uint8Array(bufferLength);
    
    const audio = new Audio();
    audio.src = 'week4/fragment.mp3'; // 学生の制作ファイルパス
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    
    const source = audioContext.createMediaElementSource(audio);
    source.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);
    
    audio.play();
    isAudioInitialized = true;
    console.log("Audio Analyser Initialized.");
}

// 画面クリックでオーディオを起動
window.addEventListener('click', () => {
    initAudioAnalyser();
});

function initThreeSwarm() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.01);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 110);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, document.body);
    controls.enableDamping = true;
    controls.autoRotate = AUTO_SPIN;
    controls.autoRotateSpeed = 1.2;

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.strength = 1.6; 
    bloomPass.radius = 0.5; 
    bloomPass.threshold = 0;
    composer.addPass(bloomPass);

    const geometry = new THREE.ConeGeometry(0.08, 0.4, 4).rotateX(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    
    instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    for(let i=0; i<COUNT; i++) {
        positions.push(new THREE.Vector3((Math.random()-0.5)*120, (Math.random()-0.5)*120, (Math.random()-0.5)*120));
        instancedMesh.setColorAt(i, color.setHex(0x00ff88));
    }

    window.addEventListener('mousemove', (e) => {
        mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
}

// ==========================================
// CAMERA MEDIA SWITCHER (YouTube Live ID)
// ==========================================
const globalCams = {
    tokyo: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=0&modestbranding=1",
    ny: "https://www.youtube.com/embed/mreXgn44pSg?autoplay=1&mute=1&controls=0&modestbranding=1",
    london: "https://www.youtube.com/embed/48MZ_S73idU?autoplay=1&mute=1&controls=0&modestbranding=1",
    venice: "https://www.youtube.com/embed/ph1vpnYIxS0?autoplay=1&mute=1&controls=0&modestbranding=1"
};

async function switchCameraSource(sourceType) {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    cameraContainer.innerHTML = ""; 

    if (sourceType === 'local') {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        cameraContainer.appendChild(video);

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = localStream;
        } catch (error) {
            console.warn("カメラの取得に失敗しました:", error);
        }
    } else if (globalCams[sourceType]) {
        const iframe = document.createElement('iframe');
        iframe.src = globalCams[sourceType];
        iframe.allow = "autoplay; encrypted-media";
        cameraContainer.appendChild(iframe);
    }
}

cameraSelector.addEventListener('change', (e) => {
    switchCameraSource(e.target.value);
});

// ==========================================
// DATA STREAMING & TEXT ENTROPY LOGIC
// ==========================================
const eventSource = new EventSource('https://stream.wikimedia.org/v2/stream/recentchange');

eventSource.onmessage = (event) => {
    const rawData = JSON.parse(event.data);
    
    const logLine = document.createElement('div');
    logLine.innerText = `[RAW_DATA] ${rawData.title}`;
    rawLogStream.insertBefore(logLine, rawLogStream.firstChild);
    if (rawLogStream.childNodes.length > 40) {
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
    
    if (!isAudioInitialized) {
        liveActivity = data.isRevert ? 9.5 : 6.0;
    }
    
    if (data.isRevert) {
        liveSeparation = 35;       
        revertGlitchFactor = 1.0;  
        glitchScreen.className = 'system-revert-glitch';
        setTimeout(() => { glitchScreen.className = ''; }, 300);
    }

    card.innerHTML = `
        <div class="card-bg" style="background-image: url('${data.imageUrl}')"></div>
        <div class="card-content">
            <div class="meta-line">// NODE: ${data.user} // COLLISION: ${data.isRevert ? 'CRITICAL' : 'STABLE'}</div>
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
        const textElements = card.querySelectorAll('.decay-title, .decay-comment');

        if (rect.top < 0) {
            if (Math.random() > 0.3) return;

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
// MAIN RECURSIVE SYSTEM LOOP
// ==========================================
let scrollSpeed = 0.6;

function systemLoop() {
    rightPanel.scrollBy(0, scrollSpeed);
    
    const pageHeight = rightPanel.scrollHeight;
    const currentBottom = rightPanel.scrollTop + rightPanel.clientHeight;

    if (pageHeight - currentBottom < 1200 && dataPool.length > 0) {
        appendCard(dataPool.shift());
    }

    // 音響ボリューム解析連動
    if (isAudioInitialized) {
        audioAnalyser.getByteFrequencyData(audioDataArray);
        let total = 0;
        for (let i = 0; i < audioDataArray.length; i++) {
            total += audioDataArray[i];
        }
        const volumeNormalized = total / (audioDataArray.length * 255); 
        liveActivity = 2.0 + volumeNormalized * 15.0; 
    } else {
        liveActivity += (2.5 - liveActivity) * 0.015;
    }

    liveSeparation += (5.0 - liveSeparation) * 0.02;
    revertGlitchFactor += (0.0 - revertGlitchFactor) * 0.03;

    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    instancedMesh.rotation.y = mouse.x * 0.4;
    instancedMesh.rotation.x = -mouse.y * 0.3;

    const time = clock.getElapsedTime() * SPEED_MULT;
    controls.update();

    const scale = 45;
    const complexity = 8;
    const count = COUNT;

    for(let i=0; i<COUNT; i++) {
        const p = i / count;
        const goldenRatio = 1.61803398875;
        const cosVal = Math.max(-1.0, Math.min(1.0, 1.0 - 2.0 * p));
        const theta = Math.acos(cosVal);
        const phi = 2.0 * Math.PI * i / goldenRatio;
        
        const fold = 0.75 + 0.25 * Math.sin(theta * complexity) * Math.cos(phi * complexity + time * 0.2);
        const radius = scale * fold;
        
        let x = radius * Math.sin(theta) * Math.cos(phi);
        let y = radius * Math.sin(theta) * Math.sin(phi);
        let z = radius * Math.cos(theta);
        
        x += (x >= 0 ? 1 : -1) * liveSeparation;
        
        const isTract = (i % 60 === 0) ? 1.0 : 0.0;
        x *= (1.0 - 0.85 * isTract);
        y *= (1.0 - 0.20 * isTract);
        z *= (1.0 - 0.50 * isTract);
        
        const neuronOffset = Math.sin(i * 12.9898 + i * 78.233) * 43758.5453;
        const firingPhase = neuronOffset + time * liveActivity;
        const spike = Math.pow(Math.max(0.0, Math.sin(firingPhase)), 40);
        
        const wave = (Math.sin(y * 0.1 - time * 1.5) + 1.0) * 0.5;
        
        const jiggle = 0.3 * (1.0 - isTract);
        const jX = Math.sin(time * 5.0 + i) * jiggle;
        const jY = Math.cos(time * 6.2 + i * 2.0) * jiggle;
        const jZ = Math.sin(time * 4.1 - i) * jiggle;
        
        target.set(x + jX, y + jY, z + jZ);
        
        const baseHue = 0.65 + p * 0.15; 
        let currentHue = baseHue - spike * 0.15 - isTract * 0.1;
        
        currentHue = currentHue * (1.0 - revertGlitchFactor) + (0.02 * revertGlitchFactor);
        
        const saturation = 0.7 + wave * 0.3;
        const lightness = Math.max(0.0, Math.min(1.0, (isTract * 0.1) + 0.15 + (wave * 0.15) + (spike * 0.7)));
        
        color.setHSL(currentHue, saturation, lightness);

        positions[i].lerp(target, 0.1);
        dummy.position.copy(positions[i]);
        
        dummy.lookAt(target); 
        dummy.updateMatrix();
        
        instancedMesh.setMatrixAt(i, dummy.matrix);
        instancedMesh.setColorAt(i, color);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;

    composer.render();
    requestAnimationFrame(systemLoop);
}

async function startSystem() {
    initThreeSwarm();
    await switchCameraSource('local'); 

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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

startSystem();