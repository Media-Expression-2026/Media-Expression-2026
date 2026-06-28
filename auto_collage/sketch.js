// ============================================================
//  コラージュツール — マルチメディア表現II
//  sketch.js の中身を全部これに置き換える
//
//  【準備】
//  左パネルの「+」で画像をアップロードして
//  FILENAMES のファイル名を書き換える
//
//  【キー操作】
//  1〜6  : モード切替
//  R     : 再生成
//  スペース : PNG保存
//  B     : 描画モード切替（Mode 5 のみ）
//  クリック : マスク追加（Mode 1 のみ）
// ============================================================

var FILENAMES = [
  'image1.png',
  'image2.png',
  'image3.png',
];

var CW = 1280;
var CH = 720;

var imgs;
var loaded;
var currentMode;
var seed;
var blendIdx;
var maskShapes;
var copyGrid;
var BLENDS;
var BLEND_NAMES;

function preload() {
  imgs = [];
  loaded = 0;
  for (var i = 0; i < FILENAMES.length; i++) {
    (function(f) {
      loadImage(f,
        function(img) { imgs.push(img); loaded++; },
        function()    { console.warn('読み込み失敗: ' + f); loaded++; }
      );
    })(FILENAMES[i]);
  }
}

function setup() {
  createCanvas(CW, CH);
  imageMode(CENTER);
  textFont('monospace');

  currentMode = 1;
  seed        = 42;
  blendIdx    = 0;
  maskShapes  = [];
  copyGrid    = [];

  // p5定数はsetup以降で参照できる
  BLENDS = [BLEND, MULTIPLY, SCREEN, OVERLAY, HARD_LIGHT, DIFFERENCE, EXCLUSION];
  BLEND_NAMES = ['BLEND','MULTIPLY','SCREEN','OVERLAY','HARD_LIGHT','DIFFERENCE','EXCLUSION'];

  generate();
}

function draw() {
  background(10);

  if (loaded < FILENAMES.length) {
    fill(200); noStroke(); textSize(14); textAlign(CENTER, CENTER);
    text('画像を読み込み中...', width / 2, height / 2);
    return;
  }
  if (imgs.length === 0) {
    fill(200); noStroke(); textSize(13); textAlign(CENTER, CENTER);
    text('画像が見つかりません。\nFILENAMES に正しいファイル名を書いてください。', width / 2, height / 2);
    return;
  }

  if      (currentMode === 1) drawMask();
  else if (currentMode === 2) drawCopyGrid();
  else if (currentMode === 3) drawRandom();
  else if (currentMode === 4) drawPattern();
  else if (currentMode === 5) drawBlend();
  else if (currentMode === 6) drawSlit();

  drawUI();
}

// ── Mode 1: マスク切り抜き ──────────────────────────────
function drawMask() {
  for (var i = 0; i < maskShapes.length; i++) {
    var m = maskShapes[i];
    var src = imgs[m.imgIdx % imgs.length];
    push();
    translate(m.x, m.y);
    rotate(m.angle);
    drawingContext.save();
    drawingContext.beginPath();
    if (m.shape === 'circle') {
      drawingContext.arc(0, 0, m.r, 0, TWO_PI);
    } else if (m.shape === 'rect') {
      drawingContext.rect(-m.w / 2, -m.h / 2, m.w, m.h);
    } else {
      drawingContext.moveTo(0, -m.r);
      drawingContext.lineTo(m.r * cos(PI / 6),  m.r * sin(PI / 6));
      drawingContext.lineTo(-m.r * cos(PI / 6), m.r * sin(PI / 6));
      drawingContext.closePath();
    }
    drawingContext.clip();
    image(src, 0, 0, m.w * 1.5, m.h * 1.5);
    drawingContext.restore();
    pop();
  }
}

function initMask() {
  maskShapes = [];
  randomSeed(seed);
  var shapes = ['circle', 'rect', 'triangle'];
  var count = floor(random(6, 14));
  for (var i = 0; i < count; i++) {
    var s = floor(random(80, 260));
    maskShapes.push({
      x: random(s / 2, CW - s / 2),
      y: random(s / 2, CH - s / 2),
      r: s / 2,
      w: s,
      h: s * random(0.6, 1.4),
      angle: random(-PI / 4, PI / 4),
      shape: shapes[floor(random(3))],
      imgIdx: floor(random(imgs.length)),
    });
  }
}

// ── Mode 2: コピー＆スライス ────────────────────────────
function drawCopyGrid() {
  for (var i = 0; i < copyGrid.length; i++) {
    var c = copyGrid[i];
    var src = imgs[c.imgIdx % imgs.length];
    push();
    translate(c.dx, c.dy);
    rotate(c.angle);
    copy(src, c.sx, c.sy, c.sw, c.sh, -c.dw / 2, -c.dh / 2, c.dw, c.dh);
    pop();
  }
}

function initCopyGrid() {
  copyGrid = [];
  randomSeed(seed);
  var cols = floor(random(3, 7));
  var rows = floor(random(2, 5));
  var cw2  = CW / cols;
  var ch2  = CH / rows;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var idx = floor(random(imgs.length));
      var src = imgs[idx];
      var sw  = floor(random(src.width  * 0.2, src.width  * 0.7));
      var sh  = floor(random(src.height * 0.2, src.height * 0.7));
      var sx  = floor(random(0, src.width  - sw));
      var sy  = floor(random(0, src.height - sh));
      copyGrid.push({
        imgIdx: idx,
        sx: sx, sy: sy, sw: sw, sh: sh,
        dx: c * cw2 + cw2 / 2,
        dy: r * ch2 + ch2 / 2,
        dw: cw2 * random(0.85, 1.1),
        dh: ch2 * random(0.85, 1.1),
        angle: random(-0.08, 0.08),
      });
    }
  }
}

// ── Mode 3: ランダム配置 ────────────────────────────────
function drawRandom() {
  randomSeed(seed);
  var count = floor(random(8, 20));
  for (var i = 0; i < count; i++) {
    var img = imgs[floor(random(imgs.length))];
    var x = random(CW);
    var y = random(CH);
    var s = random(0.15, 0.7);
    var a = random(TWO_PI);
    push();
    translate(x, y);
    rotate(a);
    image(img, 0, 0, img.width * s, img.height * s);
    pop();
  }
}

// ── Mode 4: 繰り返しパターン ────────────────────────────
function drawPattern() {
  randomSeed(seed);
  var img   = imgs[floor(random(imgs.length))];
  var tileW = floor(random(60, 200));
  var tileH = floor(tileW * random(0.5, 2.0));
  var offX  = random(tileW);
  var offY  = random(tileH);
  for (var y = -tileH; y < CH + tileH; y += tileH) {
    for (var x = -tileW; x < CW + tileW; x += tileW) {
      var shift = (floor(y / tileH) % 2 === 0) ? 0 : tileW / 2;
      push();
      translate(x + shift + offX, y + offY);
      rotate(random(-0.05, 0.05));
      image(img, 0, 0, tileW, tileH);
      pop();
    }
  }
}

// ── Mode 5: 描画モード重ね ──────────────────────────────
function drawBlend() {
  if (imgs.length < 2) {
    fill(200); noStroke(); textSize(13); textAlign(CENTER, CENTER);
    text('Mode 5 は画像が2枚以上必要です', width / 2, height / 2);
    return;
  }
  randomSeed(seed);
  blendMode(BLEND);
  image(imgs[0], CW / 2, CH / 2, CW, CH);
  blendMode(BLENDS[blendIdx]);
  for (var i = 1; i < imgs.length; i++) {
    var x = CW / 2 + random(-100, 100);
    var y = CH / 2 + random(-60, 60);
    var s = random(0.6, 1.2);
    image(imgs[i], x, y, imgs[i].width * s, imgs[i].height * s);
  }
  blendMode(BLEND);
}

// ── Mode 6: スリットスキャン ────────────────────────────
function drawSlit() {
  randomSeed(seed);
  var img    = imgs[floor(random(imgs.length))];
  var slices = floor(random(20, 80));
  var sliceH = CH / slices;
  for (var i = 0; i < slices; i++) {
    var offX = random(-120, 120);
    var scl  = random(0.85, 1.15);
    var sy   = map(i, 0, slices, 0, img.height);
    var sh   = img.height / slices;
    var dy   = i * sliceH;
    var dw   = CW * scl;
    push();
    translate(offX, 0);
    copy(img, 0, floor(sy), img.width, floor(sh),
         floor((CW - dw) / 2), floor(dy), floor(dw), ceil(sliceH));
    pop();
  }
}

// ── UI ─────────────────────────────────────────────────
var MODE_NAMES = [
  '', '1:マスク切り抜き', '2:コピー&スライス',
  '3:ランダム配置', '4:繰り返しパターン',
  '5:描画モード重ね', '6:スリットスキャン',
];

function drawUI() {
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, CH - 28, CW, 28);
  fill(255, 255, 255, 180);
  textSize(11);
  textAlign(LEFT, CENTER);
  text('MODE ' + MODE_NAMES[currentMode], 12, CH - 14);
  textAlign(CENTER, CENTER);
  var hint = 'R:再生成  スペース:PNG保存  1〜6:モード切替';
  if (currentMode === 5) hint += '  B:描画モード[' + BLEND_NAMES[blendIdx] + ']';
  text(hint, CW / 2 + 60, CH - 14);
  textAlign(RIGHT, CENTER);
  text('seed:' + seed, CW - 12, CH - 14);
}

// ── 生成 ────────────────────────────────────────────────
function generate() {
  seed = floor(random(10000));
  randomSeed(seed);
  if (imgs && imgs.length > 0) {
    initMask();
    initCopyGrid();
  }
}

// ── キー・マウス ─────────────────────────────────────────
function keyPressed() {
  if (key === '1') currentMode = 1;
  if (key === '2') currentMode = 2;
  if (key === '3') currentMode = 3;
  if (key === '4') currentMode = 4;
  if (key === '5') currentMode = 5;
  if (key === '6') currentMode = 6;
  if (key === 'r' || key === 'R') generate();
  if (key === ' ') {
    var ts = year() + nf(month(),2) + nf(day(),2) + '_' + nf(hour(),2) + nf(minute(),2) + nf(second(),2);
    saveCanvas('collage_m' + currentMode + '_' + ts, 'png');
  }
  if ((key === 'b' || key === 'B') && currentMode === 5) {
    blendIdx = (blendIdx + 1) % BLENDS.length;
  }
  return false;
}

function mousePressed() {
  if (currentMode !== 1) return;
  var shapes = ['circle', 'rect', 'triangle'];
  var s = floor(random(80, 220));
  maskShapes.push({
    x: mouseX, y: mouseY,
    r: s / 2, w: s, h: s * random(0.6, 1.4),
    angle: random(-PI / 4, PI / 4),
    shape: shapes[floor(random(3))],
    imgIdx: floor(random(imgs.length)),
  });
}
