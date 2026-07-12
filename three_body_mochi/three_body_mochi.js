// ============================================================
//  Three-Body Mochi — p5.js
//  シェーダーなし版：2Dモードでメタボール近似
// ============================================================

var G = 0.4;
var SOFTENING = 12;
var DT = 0.25;
var TRAIL = 80;

var bodies = [];
var trails = [];

var THEMES = [
  [[80,160,80],[220,120,150],[240,235,220]],   // 和菓子
  [[60,100,220],[160,60,200],[220,240,255]],   // 宇宙
  [[220,50,50],[220,130,30],[240,220,80]],     // 炎
];
var themeIdx = 0;

function setup(){
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB,255);
  initBodies();
  frameRate(60);
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

function initBodies(){
  bodies = [
    {x:width/2-120, y:height/2,     vx:0.35,  vy:0.55,  m:1.5, r:40},
    {x:width/2+120, y:height/2,     vx:0.35,  vy:-0.55, m:1.2, r:34},
    {x:width/2,     y:height/2+140, vx:-0.7,  vy:0.0,   m:1.0, r:28},
  ];
  trails=[[],[],[]];
}

function initRandom(){
  bodies=[];trails=[];
  var masses=[1.5,1.2,1.0];
  var radii=[40,34,28];
  for(var i=0;i<3;i++){
    bodies.push({
      x:random(width*0.25,width*0.75),
      y:random(height*0.25,height*0.75),
      vx:random(-0.8,0.8),vy:random(-0.8,0.8),
      m:masses[i],r:radii[i]
    });
    trails.push([]);
  }
}

function updatePhysics(){
  var ax=[0,0,0],ay=[0,0,0];
  for(var i=0;i<3;i++){
    for(var j=0;j<3;j++){
      if(i===j) continue;
      var dx=bodies[j].x-bodies[i].x;
      var dy=bodies[j].y-bodies[i].y;
      var d2=dx*dx+dy*dy+SOFTENING*SOFTENING;
      var d=sqrt(d2);
      var f=G*bodies[i].m*bodies[j].m/d2;
      ax[i]+=f*dx/d/bodies[i].m;
      ay[i]+=f*dy/d/bodies[i].m;
    }
  }
  for(var i=0;i<3;i++){
    bodies[i].vx+=ax[i]*DT;
    bodies[i].vy+=ay[i]*DT;
    bodies[i].x+=bodies[i].vx*DT;
    bodies[i].y+=bodies[i].vy*DT;
    trails[i].push({x:bodies[i].x,y:bodies[i].y});
    if(trails[i].length>TRAIL) trails[i].shift();
    // 発散防止
    var mx=width*0.1, my=height*0.1;
    if(bodies[i].x<mx){bodies[i].vx*=-0.6;bodies[i].x=mx;}
    if(bodies[i].x>width-mx){bodies[i].vx*=-0.6;bodies[i].x=width-mx;}
    if(bodies[i].y<my){bodies[i].vy*=-0.6;bodies[i].y=my;}
    if(bodies[i].y>height-my){bodies[i].vy*=-0.6;bodies[i].y=height-my;}
  }
}

// smooth minimum
function smoothMin(a,b,k){
  var h=max(k-abs(a-b),0)/k;
  return min(a,b)-h*h*k*0.25;
}

function draw(){
  G=map(mouseX,0,width,0.15,0.8);
  DT=map(mouseY,0,height,0.1,0.45);
  updatePhysics();

  background(12,10,18,30);

  var theme=THEMES[themeIdx];

  // 軌跡
  noFill();
  for(var i=0;i<3;i++){
    var t=trails[i];
    var c=theme[i];
    for(var j=1;j<t.length;j++){
      var a=map(j,0,t.length,0,120);
      stroke(c[0],c[1],c[2],a);
      strokeWeight(map(j,0,t.length,0.3,2));
      line(t[j-1].x,t[j-1].y,t[j].x,t[j].y);
    }
  }

  // メタボール：グラデーション円を重ねてblendで融合
  drawingContext.globalCompositeOperation='screen';
  noStroke();
  for(var i=0;i<3;i++){
    var c=theme[i];
    var bx=bodies[i].x, by=bodies[i].y;
    var br=bodies[i].r;
    // 外側グロー
    for(var step=4;step>=0;step--){
      var ratio=step/4;
      var r=br*(1+ratio*1.2);
      var a=floor(map(ratio,0,1,180,0));
      fill(c[0],c[1],c[2],a);
      ellipse(bx,by,r*2,r*2);
    }
    // コア
    fill(c[0],c[1],c[2],220);
    ellipse(bx,by,br*2,br*2);
    // 光沢
    fill(255,255,255,60);
    ellipse(bx-br*0.25,by-br*0.25,br*0.6,br*0.5);
  }
  drawingContext.globalCompositeOperation='source-over';

  // UI
  noStroke();
  fill(255,255,255,60);
  textSize(11);
  textFont('Courier New');
  textAlign(LEFT,BOTTOM);
  text('G:'+G.toFixed(2)+'  マウス:重力/速度  CLICK:リセット  R:ランダム  1-3:カラー  S:保存',
    12, height-10);
}

function mousePressed(){ initBodies(); }

function keyPressed(){
  if(key==='r'||key==='R') initRandom();
  if(key==='s'||key==='S') saveCanvas('mochi_'+frameCount,'png');
  if(key==='1') themeIdx=0;
  if(key==='2') themeIdx=1;
  if(key==='3') themeIdx=2;
}
