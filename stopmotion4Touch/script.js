// ==========================================
// デバイスを判別し、適切なモジュールを動的に読み込む
// ==========================================
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const script = document.createElement('script');
if (isTouchDevice) {
    script.src = 'mobile.js'; // スマホならmobile.jsを読み込む
    console.log("Device: Mobile (Loaded mobile.js)");
} else {
    script.src = 'pc.js';     // PCならpc.jsを読み込む
    console.log("Device: PC (Loaded pc.js)");
}
document.body.appendChild(script);