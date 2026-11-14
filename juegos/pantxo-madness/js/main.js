/* ============================================================
   THE PANTXO MADNESS TRIAL
   Arcade racer de mundo abierto. Obra original: el código, los
   modelos, el mapa y el sonido se generan en estos archivos.
   Homenaje de género, sin assets de terceros.
   ============================================================ */
import { World } from './world.js';
import { CityNet } from './citynet.js';
import { Vehicle } from './vehicle.js';
import { buildCarMesh } from './models.js';
import { PLAYER_TUNES, NPC_TUNES } from './tuning.js';
import { Ambient } from './ambient.js';
import { Session, DT } from './session.js';

const THREE = window.THREE;
const world = new World();

/* ---------- utilidades ---------- */
function mulberry32(seed){
  return function(){
    seed|=0; seed=(seed+0x6D2B79F5)|0;
    let t=Math.imul(seed^(seed>>>15),1|seed);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
const rng=mulberry32(20260612);          // mundo determinista
const rand=(a,b)=>a+(b-a)*rng();
const pickR=a=>a[Math.floor(rng()*a.length)];
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
const $=id=>document.getElementById(id);

/* ---------- constantes de la ciudad ---------- */
const BLOCKS=10, PITCH=90, ROAD_W=18;
const BLOCK_W=PITCH-ROAD_W;              // 72
const SPAN=BLOCKS*PITCH+ROAD_W;          // 918
const HALF=SPAN/2;
const LANE=3.6;                          // separación de carril
const streetC=i=>i*PITCH+ROAD_W/2-HALF;  // centro de la calle i (0..BLOCKS)
const blockMin=i=>i*PITCH+ROAD_W-HALF;   // borde mínimo de la manzana i

const GREENS=[[4,4],[5,4],[1,1],[8,1],[1,8]];   // parques
const PLAZA=[5,5];                                // plaza con fuente
const isGreen=(i,j)=>GREENS.some(g=>g[0]===i&&g[1]===j);
const isPlaza=(i,j)=>PLAZA[0]===i&&PLAZA[1]===j;

/* ---------- three.js: base ---------- */
let renderer;
if(typeof THREE==='undefined'){
  document.body.innerHTML='<div id="errMsg">No se pudo cargar el motor 3D (three.js). Comprueba tu conexión y recarga la página.</div>';
  throw new Error('three.js no disponible');
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true});
}catch(e){
  document.body.innerHTML='<div id="errMsg">Tu navegador no soporta WebGL, que es necesario para este juego. 😢</div>';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setClearColor(0x9fd2f0);
$('game').appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x9fd2f0,320,1150);
const camera=new THREE.PerspectiveCamera(62,window.innerWidth/window.innerHeight,0.1,2400);
camera.position.set(0,60,420);

scene.add(new THREE.HemisphereLight(0xbfd9ff,0x6b7563,0.95));
const sun=new THREE.DirectionalLight(0xfff2d8,0.85);
sun.position.set(250,420,160);
scene.add(sun);

/* nubes planas decorativas */
{
  const cMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,side:THREE.DoubleSide,fog:true});
  for(let i=0;i<10;i++){
    const c=new THREE.Mesh(new THREE.PlaneGeometry(rand(50,110),rand(22,42)),cMat);
    c.rotation.x=-Math.PI/2;
    c.position.set(rand(-900,900),rand(140,210),rand(-900,900));
    scene.add(c);
  }
}

/* ---------- pintado del plano urbano (textura y minimapa) ---------- */
function paintCity(ctx,px,detail){
  const s=px/SPAN, M=v=>(v+HALF)*s;
  ctx.fillStyle='#3a3e44'; ctx.fillRect(0,0,px,px);            // asfalto
  for(let bi=0;bi<BLOCKS;bi++)for(let bj=0;bj<BLOCKS;bj++){
    const x0=M(blockMin(bi)), z0=M(blockMin(bj)), w=BLOCK_W*s;
    ctx.fillStyle='#a7abb0'; ctx.fillRect(x0,z0,w,w);          // acera
    const inset=5*s;
    ctx.fillStyle=isGreen(bi,bj)?'#4c8a4c':(isPlaza(bi,bj)?'#b9b2a4':'#8d9196');
    ctx.fillRect(x0+inset,z0+inset,w-2*inset,w-2*inset);
  }
  if(!detail) return;
  /* líneas de carril */
  for(let i=0;i<=BLOCKS;i++){
    const c=M(streetC(i));
    ctx.strokeStyle='#c9a33b'; ctx.lineWidth=Math.max(1,0.45*s); ctx.setLineDash([6*s,4*s]);
    ctx.beginPath(); ctx.moveTo(c,0); ctx.lineTo(c,px); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,c); ctx.lineTo(px,c); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=Math.max(1,0.3*s); ctx.setLineDash([3.5*s,5*s]);
    for(const off of [-ROAD_W/4,ROAD_W/4]){
      ctx.beginPath(); ctx.moveTo(c+off*s,0); ctx.lineTo(c+off*s,px); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,c+off*s); ctx.lineTo(px,c+off*s); ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  /* limpiar intersecciones y pintar pasos de cebra */
  for(let i=0;i<=BLOCKS;i++)for(let j=0;j<=BLOCKS;j++){
    const cx=M(streetC(i)), cz=M(streetC(j)), r=ROAD_W/2*s;
    ctx.fillStyle='#3a3e44'; ctx.fillRect(cx-r,cz-r,r*2,r*2);
    ctx.fillStyle='rgba(255,255,255,.8)';
    for(let k=-2;k<=2;k++){
      const o=k*2.6*s;
      ctx.fillRect(cx+o-0.9*s,cz-r-2.6*s,1.8*s,2.4*s);   // norte
      ctx.fillRect(cx+o-0.9*s,cz+r+0.2*s,1.8*s,2.4*s);   // sur
      ctx.fillRect(cx-r-2.6*s,cz+o-0.9*s,2.4*s,1.8*s);   // oeste
      ctx.fillRect(cx+r+0.2*s,cz+o-0.9*s,2.4*s,1.8*s);   // este
    }
  }
}

{ /* suelo principal */
  const cv=document.createElement('canvas'); cv.width=cv.height=2048;
  paintCity(cv.getContext('2d'),2048,true);
  const tx=new THREE.CanvasTexture(cv);
  tx.anisotropy=renderer.capabilities.getMaxAnisotropy?Math.min(4,renderer.capabilities.getMaxAnisotropy()):1;
  const g=new THREE.Mesh(new THREE.PlaneGeometry(SPAN,SPAN),new THREE.MeshLambertMaterial({map:tx}));
  g.rotation.x=-Math.PI/2; scene.add(g);
  /* terreno exterior y lago al este */
  const outer=new THREE.Mesh(new THREE.PlaneGeometry(4200,4200),new THREE.MeshLambertMaterial({color:0x5e7a52}));
  outer.rotation.x=-Math.PI/2; outer.position.y=-0.25; scene.add(outer);
  const lake=new THREE.Mesh(new THREE.PlaneGeometry(560,SPAN+460),new THREE.MeshLambertMaterial({color:0x2e6f9e}));
  lake.rotation.x=-Math.PI/2; lake.position.set(HALF+281,-0.12,0); scene.add(lake);
}

/* ---------- sólidos (colisiones) ---------- */
const solids=[]; const HASH=new Map(); const CELL=PITCH;
function addSolid(b){
  solids.push(b);
  world.add(b);
  const i0=Math.floor((b.minX+HALF)/CELL), i1=Math.floor((b.maxX+HALF)/CELL);
  const j0=Math.floor((b.minZ+HALF)/CELL), j1=Math.floor((b.maxZ+HALF)/CELL);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
    const k=i+'_'+j;
    if(!HASH.has(k))HASH.set(k,[]);
    HASH.get(k).push(b);
  }
}
function solidsNear(x,z){
  const ci=Math.floor((x+HALF)/CELL), cj=Math.floor((z+HALF)/CELL), out=[];
  for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){
    const v=HASH.get(i+'_'+j); if(v)for(const b of v)out.push(b);
  }
  return out;
}
/* muros perimetrales */
addSolid({minX:-HALF-4,maxX:-HALF,minZ:-HALF-4,maxZ:HALF+4});
addSolid({minX:HALF,maxX:HALF+4,minZ:-HALF-4,maxZ:HALF+4});
addSolid({minX:-HALF-4,maxX:HALF+4,minZ:-HALF-4,maxZ:-HALF});
addSolid({minX:-HALF-4,maxX:HALF+4,minZ:HALF,maxZ:HALF+4});
{ /* barreras visuales */
  const bMat=new THREE.MeshLambertMaterial({color:0xb9bcc2});
  const mk=(w,d,x,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,1,d),bMat);m.position.set(x,0.5,z);scene.add(m);};
  mk(SPAN+4,1.2,0,-HALF-0.6); mk(SPAN+4,1.2,0,HALF+0.6);
  mk(1.2,SPAN+4,-HALF-0.6,0); mk(1.2,SPAN+4,HALF+0.6,0);
}

/* ---------- rampas (parque central) ---------- */
const ramps=[
  {minX:-70,maxX:-57,minZ:-50,maxZ:-40,h:3.2,dir:1},   // sube hacia +x
  {minX:-33,maxX:-20,minZ:-50,maxZ:-40,h:3.2,dir:-1}   // sube hacia -x
];
function groundYAt(x,z){
  let y=0;
  for(const r of ramps){
    if(x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ){
      const len=r.maxX-r.minX;
      const p=r.dir>0?(x-r.minX)/len:(r.maxX-x)/len;
      y=Math.max(y,r.h*p);
    }
  }
  return y;
}
{
  const rMat=new THREE.MeshLambertMaterial({color:0x8a6f4d});
  for(const r of ramps){
    const len=r.maxX-r.minX, w=r.maxZ-r.minZ;
    const slope=Math.atan2(r.h,len);
    const m=new THREE.Mesh(new THREE.BoxGeometry(Math.sqrt(len*len+r.h*r.h),0.5,w),rMat);
    m.position.set((r.minX+r.maxX)/2,r.h/2-0.1,(r.minZ+r.maxZ)/2);
    m.rotation.z=r.dir>0?slope:-slope;
    scene.add(m);
  }
}

/* ---------- edificios ---------- */
const winTextures=[];
{
  const tints=['#8a7f72','#9c8f7a','#6d7b88','#5d6e7e','#a09486','#76685c'];
  for(const t of tints){
    const cv=document.createElement('canvas'); cv.width=64; cv.height=64;
    const c=cv.getContext('2d');
    c.fillStyle=t; c.fillRect(0,0,64,64);
    for(let wy=0;wy<4;wy++)for(let wx=0;wx<5;wx++){
      const lit=rng()<0.14;
      c.fillStyle=lit?'#ffe9a8':(rng()<0.5?'#27313d':'#39434f');
      c.fillRect(4+wx*12,6+wy*14,8,9);
    }
    const tx=new THREE.CanvasTexture(cv);
    tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
    winTextures.push(tx);
  }
}
function addBuilding(x0,z0,w,d,h){
  const tx=pickR(winTextures).clone(); tx.needsUpdate=true;
  tx.repeat.set(Math.max(1,Math.round(Math.max(w,d)/10)),Math.max(1,Math.round(h/5)));
  const side=new THREE.MeshLambertMaterial({map:tx});
  const top=new THREE.MeshLambertMaterial({color:0x55504a});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[side,side,top,top,side,side]);
  mesh.position.set(x0+w/2,h/2,z0+d/2);
  scene.add(mesh);
  addSolid({minX:x0,maxX:x0+w,minZ:z0,maxZ:z0+d,h});
}
for(let bi=0;bi<BLOCKS;bi++)for(let bj=0;bj<BLOCKS;bj++){
  if(isGreen(bi,bj)||isPlaza(bi,bj))continue;
  const bx=blockMin(bi)+5, bz=blockMin(bj)+5, usable=BLOCK_W-10;   // margen de acera
  const cdist=Math.max(Math.abs(bi-4.5),Math.abs(bj-4.5));
  const hMin=cdist<=1.5?45:(cdist<=2.5?18:7);
  const hMax=cdist<=1.5?110:(cdist<=2.5?48:22);
  const pat=pickR(['1','2h','2v','4']);
  const plots=[];
  const half=usable/2;
  if(pat==='1')plots.push([bx,bz,usable,usable]);
  else if(pat==='2h'){plots.push([bx,bz,usable,half],[bx,bz+half,usable,half]);}
  else if(pat==='2v'){plots.push([bx,bz,half,usable],[bx+half,bz,half,usable]);}
  else plots.push([bx,bz,half,half],[bx+half,bz,half,half],[bx,bz+half,half,half],[bx+half,bz+half,half,half]);
  for(const p of plots){
    if(rng()<0.08)continue;                       // solar vacío
    const inset=rand(1,4);
    const w=p[2]-inset*2, d=p[3]-inset*2;
    if(w<10||d<10)continue;
    addBuilding(p[0]+inset,p[1]+inset,w,d,rand(hMin,hMax));
  }
}

/* ---------- parques: árboles y fuente ---------- */
const trunkMat=new THREE.MeshLambertMaterial({color:0x6b4a2c});
const crownMat=new THREE.MeshLambertMaterial({color:0x3c7a36});
function addTree(x,z){
  const t=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.26,1.7,6),trunkMat);
  t.position.set(x,0.85,z);
  const c=new THREE.Mesh(new THREE.ConeGeometry(1.7,3.0,8),crownMat);
  c.position.set(x,3.4,z);
  scene.add(t,c);
  addSolid({minX:x-0.45,maxX:x+0.45,minZ:z-0.45,maxZ:z+0.45,h:5});
}
for(const g of GREENS){
  const bx=blockMin(g[0]), bz=blockMin(g[1]);
  for(let n=0;n<9;n++){
    const x=bx+rand(9,BLOCK_W-9), z=bz+rand(9,BLOCK_W-9);
    let onRamp=false;
    for(const r of ramps)if(x>r.minX-4&&x<r.maxX+4&&z>r.minZ-4&&z<r.maxZ+4)onRamp=true;
    if(!onRamp)addTree(x,z);
  }
}
{ /* fuente de la plaza */
  const cx=blockMin(PLAZA[0])+BLOCK_W/2, cz=blockMin(PLAZA[1])+BLOCK_W/2;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(6.5,7,1.2,18),new THREE.MeshLambertMaterial({color:0xb0a795}));
  base.position.set(cx,0.6,cz);
  const agua=new THREE.Mesh(new THREE.CylinderGeometry(5.6,5.6,0.3,18),new THREE.MeshLambertMaterial({color:0x4d9fce}));
  agua.position.set(cx,1.15,cz);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.2,3.4,10),new THREE.MeshLambertMaterial({color:0xb0a795}));
  col.position.set(cx,2.5,cz);
  scene.add(base,agua,col);
  addSolid({minX:cx-6.8,maxX:cx+6.8,minZ:cz-6.8,maxZ:cz+6.8,h:1.2});
}

/* ---------- metro elevado ---------- */
const elevCorners=[
  [streetC(2),streetC(2)],[streetC(8),streetC(2)],
  [streetC(8),streetC(8)],[streetC(2),streetC(8)]
];
const elevEdges=[]; let elevPerim=0;
for(let e=0;e<4;e++){
  const a=elevCorners[e], b=elevCorners[(e+1)%4];
  const len=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);
  elevEdges.push({a,b,len,start:elevPerim});
  elevPerim+=len;
}
{
  const slabMat=new THREE.MeshLambertMaterial({color:0x4d5560});
  const railMat=new THREE.MeshLambertMaterial({color:0x303841});
  const pillMat=new THREE.MeshLambertMaterial({color:0x5a6470});
  for(const ed of elevEdges){
    const dx=ed.b[0]-ed.a[0], dz=ed.b[1]-ed.a[1];
    const horiz=Math.abs(dx)>Math.abs(dz);
    const cx=(ed.a[0]+ed.b[0])/2, cz=(ed.a[1]+ed.b[1])/2;
    const slab=new THREE.Mesh(new THREE.BoxGeometry(horiz?ed.len+5:4.6,0.6,horiz?4.6:ed.len+5),slabMat);
    slab.position.set(cx,7.2,cz); scene.add(slab);
    for(const ro of [-1.4,1.4]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(horiz?ed.len+5:0.25,0.3,horiz?0.25:ed.len+5),railMat);
      rail.position.set(cx+(horiz?0:ro),7.65,cz+(horiz?ro:0)); scene.add(rail);
    }
    /* pilares en mitad de la calzada, esquivando cruces */
    const steps=Math.floor(ed.len/27);
    for(let k=0;k<=steps;k++){
      const t=Math.min(1,k*27/ed.len);
      const px=ed.a[0]+dx*t, pz=ed.a[1]+dz*t;
      const along=horiz?px:pz;
      let nearCross=false;
      for(let q=0;q<=BLOCKS;q++)if(Math.abs(along-streetC(q))<11)nearCross=true;
      if(nearCross)continue;
      const pil=new THREE.Mesh(new THREE.BoxGeometry(1.3,7.2,1.3),pillMat);
      pil.position.set(px,3.6,pz); scene.add(pil);
      addSolid({minX:px-0.65,maxX:px+0.65,minZ:pz-0.65,maxZ:pz+0.65,h:7.2});
    }
  }
}
/* tren */
const trainCars=[];
{
  const tMat=new THREE.MeshLambertMaterial({color:0xc23b22});
  const wMat=new THREE.MeshLambertMaterial({color:0xe8e2d4});
  for(let i=0;i<3;i++){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(2.8,2.6,12),tMat);
    body.position.y=0;
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.85,0.8,12.02),wMat);
    stripe.position.y=0.4;
    g.add(body,stripe);
    scene.add(g);
    trainCars.push(g);
  }
}
let trainD=0;
function elevPoint(d){
  d=((d%elevPerim)+elevPerim)%elevPerim;
  for(const ed of elevEdges){
    if(d<=ed.start+ed.len){
      const t=(d-ed.start)/ed.len;
      return {x:ed.a[0]+(ed.b[0]-ed.a[0])*t,z:ed.a[1]+(ed.b[1]-ed.a[1])*t,
              dx:Math.sign(ed.b[0]-ed.a[0]),dz:Math.sign(ed.b[1]-ed.a[1])};
    }
  }
  return {x:elevCorners[0][0],z:elevCorners[0][1],dx:1,dz:0};
}
function updateTrain(dt){
  trainD+=dt*17;
  for(let i=0;i<trainCars.length;i++){
    const p=elevPoint(trainD-i*13.5);
    trainCars[i].position.set(p.x,8.9,p.z);
    trainCars[i].rotation.y=Math.atan2(p.dx,p.dz);
  }
}


/* ---------- red de calles ---------- */
const net = new CityNet(streetC, BLOCKS, ROAD_W);
const heightAt = (x, z) => groundYAt(x, z);
function nodeW(i, j) { return [streetC(i), streetC(j)]; }

/* ---------- coches jugables ---------- */
const CAR_SPECS = [
  { id: 'gt', nombre: 'Pantxo GT', desc: 'Coupé deportivo ligero', color: 0xc62828, type: 'coupe', L: 4.3, W: 1.95 },
  { id: 'v8', nombre: 'Txoko V8', desc: 'Muscle clásico derrapón', color: 0xef6c00, type: 'muscle', L: 4.9, W: 2.05 },
  { id: 'furgo', nombre: 'Furgo Erreka', desc: 'Furgoneta de reparto', color: 0x2e7d32, type: 'van', L: 4.7, W: 2.0 },
  { id: 'bus', nombre: 'Bus Aldiri', desc: 'Autobús urbano demoledor', color: 0xfdd835, type: 'bus', L: 10, W: 2.5 },
];
// Cifras para las barras de la tarjeta de cada coche.
for (const s of CAR_SPECS) {
  const t = PLAYER_TUNES[s.id];
  s.maxSpeed = t.top;
  s.accel = (t.hp * 745.7) / t.mass / 12;
  s.grip = t.grip * 5.5;
}
const RIVAL_COLORS = [0x1565c0, 0x6a1b9a, 0x00838f, 0x37474f, 0xad1457];

let spec = CAR_SPECS[0];
let player = null;          // Vehicle del jugador
let session = null;
function setPlayerCar(s) {
  spec = s;
}
function makePlayer() {
  if (player) player.dispose();
  player = new Vehicle(PLAYER_TUNES[spec.id], buildCarMesh(spec), spec.nombre);
  player.car.noWreck = true;            // con el daño al 100 % pierde potencia, no se para
  player.onHit = (energy, speed) => { if (speed > 4) sfx.crash(Math.min(1, speed / 24)); };
  scene.add(player.group);
}
const SPAWN = { x: LANE, z: streetC(9), yaw: Math.PI };
function playerSpeed() { return player ? Math.hypot(player.car.vx, player.car.vz) : 0; }
function playerVF() { return player ? player.car.speed : 0; }
function resetToRoad() {
  /* recoloca el coche en el carril derecho de la calle más cercana y lo repara */
  const c = player.car;
  const sn = net.snap({ x: c.x, z: c.z });
  // Calle a lo largo de x o de z: se queda mirando hacia el lado al que ya apuntaba.
  const alongX = sn.a[0] !== sn.b[0];
  const yaw = alongX ? (Math.sin(c.yaw) >= 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.cos(c.yaw) >= 0 ? 0 : Math.PI);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const x = clamp(sn.x - fz * LANE * 0.65, -HALF + 8, HALF - 8), z = clamp(sn.z + fx * LANE * 0.65, -HALF + 8, HALF - 8);
  player.place(x, z, yaw, heightAt, 0);
  c.damage = 0;
}

/* ---------- policía y vida de la ciudad ---------- */
// Coches patrulla aparcados junto a la acera, a mitad de manzana.
function copSpots(n) {
  const spots = [];
  const cand = [[1, 3], [3, 7], [6, 1], [7, 6], [9, 4], [4, 9], [2, 5], [8, 8], [5, 2]];
  for (const [i, j] of cand.slice(0, n)) {
    const x = streetC(i) - 6.5, z = (streetC(j) + streetC(j + 1)) / 2;
    spots.push({ x, z, yaw: Math.PI });
  }
  return spots;
}
function makeAmbient(withCops) {
  return new Ambient({ scene, world, heightAt, net }, {
    traffic: 18, peds: 26, speedLimit: 13, winter: false,
    cops: withCops ? copSpots(mode === 'race' ? 3 : 6) : [],
  });
}

/* ---------- carrera checkpoint ---------- */
const race={active:false,gates:[],idx:0,timeLeft:0,elapsed:0,done:false};
let gateMesh=null,beamMesh=null,arrowMesh=null;
{
  const post=new THREE.CylinderGeometry(0.4,0.4,6.5,8);
  const postMat=new THREE.MeshLambertMaterial({color:0xffd527});
  const bannerCv=document.createElement('canvas'); bannerCv.width=256; bannerCv.height=32;
  const bc=bannerCv.getContext('2d');
  bc.fillStyle='#ffd527'; bc.fillRect(0,0,256,32);
  bc.fillStyle='#101216'; bc.font='bold 20px Verdana'; bc.textAlign='center'; bc.textBaseline='middle';
  bc.fillText('CHECKPOINT',128,17);
  const bannerTx=new THREE.CanvasTexture(bannerCv);
  gateMesh=new THREE.Group();
  const p1=new THREE.Mesh(post,postMat); p1.position.set(-7.5,3.25,0);
  const p2=new THREE.Mesh(post,postMat); p2.position.set(7.5,3.25,0);
  const ban=new THREE.Mesh(new THREE.BoxGeometry(15.8,1.3,0.3),
    new THREE.MeshLambertMaterial({map:bannerTx}));
  ban.position.y=6.4;
  gateMesh.add(p1,p2,ban);
  beamMesh=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,42,10,1,true),
    new THREE.MeshBasicMaterial({color:0xffd527,transparent:true,opacity:0.28,side:THREE.DoubleSide,depthWrite:false}));
  beamMesh.position.y=21;
  gateMesh.add(beamMesh);
  gateMesh.visible=false;
  scene.add(gateMesh);
  const coneGeo=new THREE.ConeGeometry(0.75,1.9,8);
  coneGeo.rotateX(Math.PI/2);
  arrowMesh=new THREE.Mesh(coneGeo,new THREE.MeshBasicMaterial({color:0xffd527}));
  arrowMesh.visible=false;
  scene.add(arrowMesh);
}
function genCourse(n){
  const nodes=[];
  for(let i=1;i<BLOCKS;i++)for(let j=1;j<BLOCKS;j++)nodes.push([i,j]);
  const gates=[];
  let cur=[5,9];                                    // cerca del spawn
  for(let g=0;g<n;g++){
    const cw=nodeW(cur[0],cur[1]);
    let cands=nodes.filter(nd=>{
      if(gates.some(gt=>gt[0]===nd[0]&&gt[1]===nd[1]))return false;
      const w=nodeW(nd[0],nd[1]);
      const d=Math.hypot(w[0]-cw[0],w[1]-cw[1]);
      return d>140&&d<430;
    });
    if(cands.length===0)cands=nodes.filter(nd=>!gates.some(gt=>gt[0]===nd[0]&&gt[1]===nd[1]));
    const nxt=cands[Math.floor(Math.random()*cands.length)];
    gates.push(nxt); cur=nxt;
  }
  return gates.map(g=>{const w=nodeW(g[0],g[1]);return {x:w[0],z:w[1]};});
}

function gateAllowance(d) { return 6 + d / 10; }
function startRace() {
  race.active = true; race.done = false;
  race.gates = genCourse(8);
  race.idx = 0; race.elapsed = 0;
  const d0 = Math.hypot(race.gates[0].x - player.car.x, race.gates[0].z - player.car.z);
  race.timeLeft = gateAllowance(d0) + 10;
  pointGate();
  arrowMesh.visible = true;
  $('gateBox').style.display = 'block';
  $('posBox').style.display = 'block';
  $('timerLbl').textContent = 'TIEMPO RESTANTE';
}
function pointGate() {
  const g = race.gates[race.idx];
  gateMesh.visible = true;
  gateMesh.position.set(g.x, 0, g.z);
  const prev = race.idx > 0 ? race.gates[race.idx - 1] : { x: player.car.x, z: player.car.z };
  gateMesh.rotation.y = Math.atan2(g.x - prev.x, g.z - prev.z) + Math.PI / 2;
}
function updateRace(dt) {
  if (!race.active || race.done) return;
  race.elapsed += dt;
  race.timeLeft -= dt;
  beamMesh.rotation.y += dt * 1.5;
  const me = session.racers[0];
  const g = race.gates[race.idx];
  const c = player.car;
  arrowMesh.position.set(c.x, player.y + 3.3 + Math.sin(race.elapsed * 4) * 0.25, c.z);
  arrowMesh.rotation.y = Math.atan2(g.x - c.x, g.z - c.z);
  if (me.justPassed) {
    me.justPassed = false;
    race.idx = me.done;
    sfx.ding();
    if (race.idx >= race.gates.length) finishRace(true);
    else {
      const ng = race.gates[race.idx];
      const bonus = gateAllowance(Math.hypot(ng.x - g.x, ng.z - g.z));
      race.timeLeft += bonus;
      popup('✓ CHECKPOINT  +' + bonus.toFixed(0) + 's');
      pointGate();
    }
  }
  if (race.timeLeft <= 0 && !race.done) { race.timeLeft = 0; finishRace(false); }
}
function finishRace(win, reason) {
  race.done = true; race.active = false;
  gateMesh.visible = false; arrowMesh.visible = false;
  let best = null;
  try { best = localStorage.getItem('pantxoMadnessBest'); } catch (e) {}
  let lines = '';
  const pos = session ? session.position() : 1;
  const total = session ? session.racers.length : 1;
  if (reason === 'busted') {
    $('resTitle').textContent = '¡Detenido!';
    lines += mode === 'race' ? 'La policía te ha parado antes de la meta.<br>' : 'La policía te ha parado tras ' + fmtTime(cruiseTime) + ' de paseo.<br>';
  } else if (win) {
    $('resTitle').textContent = pos === 1 ? '¡Victoria!' : '¡Carrera completada!';
    lines += 'Posición: <b>' + pos + 'º de ' + total + '</b><br>';
    lines += 'Tiempo total: <b>' + fmtTime(race.elapsed) + '</b><br>';
    if (!best || race.elapsed < parseFloat(best)) {
      try { localStorage.setItem('pantxoMadnessBest', String(race.elapsed)); } catch (e) {}
      lines += '🏆 <b>¡Nuevo récord personal!</b><br>';
    } else {
      lines += 'Mejor marca: <b>' + fmtTime(parseFloat(best)) + '</b><br>';
    }
  } else {
    $('resTitle').textContent = 'Tiempo agotado';
    lines += 'Checkpoints superados: <b>' + race.idx + ' / ' + race.gates.length + '</b><br>';
    if (best) lines += 'Mejor marca: <b>' + fmtTime(parseFloat(best)) + '</b><br>';
  }
  lines += 'Coche: <b>' + spec.nombre + '</b>';
  $('resLines').innerHTML = lines;
  sfx.siren(false);
  setState('results');
}

/* ---------- HUD ---------- */
const mapBase=document.createElement('canvas');
mapBase.width=mapBase.height=190;
paintCity(mapBase.getContext('2d'),190,false);
const mapCtx=$('mapCv').getContext('2d');
function fmtTime(t){
  const m=Math.floor(t/60), s=t-m*60;
  return m+':'+(s<10?'0':'')+s.toFixed(1);
}
let hintTimer=null;
function popup(txt){
  const p=$('popup');
  p.textContent=txt;
  p.style.opacity='1'; p.style.top='34%';
  requestAnimationFrame(()=>{p.style.top='28%';});
  clearTimeout(popup._t);
  popup._t=setTimeout(()=>{p.style.opacity='0';},1300);
}
function hint(txt,ms){
  const h=$('hintMsg');
  h.textContent=txt; h.style.opacity='1';
  clearTimeout(hintTimer);
  hintTimer=setTimeout(()=>{h.style.opacity='0';},ms||4000);
}

let cruiseTime = 0;
function updateHUD() {
  $('speedVal').textContent = Math.round(Math.abs(playerVF()) * 3.6);
  if (mode === 'race') {
    $('timerVal').textContent = fmtTime(Math.max(0, race.timeLeft));
    $('timerVal').classList.toggle('low', race.timeLeft < 6);
    $('gateNum').textContent = Math.min(race.idx + 1, race.gates.length) + ' / ' + race.gates.length;
    $('posNum').textContent = session.position() + ' / ' + session.racers.length;
  } else {
    $('timerVal').textContent = fmtTime(cruiseTime);
    $('timerVal').classList.remove('low');
  }
  $('dmgFill').style.width = player.damagePct.toFixed(0) + '%';
  const chasing = session.ambient?.chasing;
  $('copBox').style.display = chasing ? 'block' : 'none';
  /* minimapa */
  const ms = 190 / SPAN, M = (v) => (v + HALF) * ms;
  mapCtx.drawImage(mapBase, 0, 0);
  if (mode === 'race' && race.active) {
    for (let i = race.idx; i < race.gates.length; i++) {
      const g = race.gates[i];
      mapCtx.fillStyle = i === race.idx ? '#ffd527' : 'rgba(255,213,39,.45)';
      mapCtx.beginPath();
      mapCtx.arc(M(g.x), M(g.z), i === race.idx ? 5 : 3, 0, Math.PI * 2);
      mapCtx.fill();
      if (i === race.idx) { mapCtx.strokeStyle = '#fff'; mapCtx.lineWidth = 1.5; mapCtx.stroke(); }
    }
  }
  const dot = (x, z, color, r) => { mapCtx.fillStyle = color; mapCtx.beginPath(); mapCtx.arc(M(x), M(z), r, 0, Math.PI * 2); mapCtx.fill(); };
  for (const r of session.racers) if (!r.player) dot(r.vehicle.car.x, r.vehicle.car.z, '#4aa3ff', 2.6);
  const blink = Math.floor(performance.now() / 200) % 2;
  for (const c of session.ambient?.cops ?? []) {
    if (c.state === 'chase') dot(c.v.car.x, c.v.car.z, blink ? '#ff2a2a' : '#2a6bff', 3.4);
  }
  const c = player.car;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  mapCtx.save();
  mapCtx.translate(M(c.x), M(c.z));
  mapCtx.rotate(Math.atan2(fx, -fz));
  mapCtx.fillStyle = '#ff3b30';
  mapCtx.beginPath();
  mapCtx.moveTo(0, -6); mapCtx.lineTo(4.2, 5); mapCtx.lineTo(-4.2, 5);
  mapCtx.closePath(); mapCtx.fill();
  mapCtx.strokeStyle = '#fff'; mapCtx.lineWidth = 1; mapCtx.stroke();
  mapCtx.restore();
}

/* ---------- sonido (sintetizado, original) ---------- */
const sfx={
  ctx:null,muted:false,
  init(){
    if(this.ctx)return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    const ctx=new AC(); this.ctx=ctx;
    this.master=ctx.createGain(); this.master.gain.value=0.5;
    this.master.connect(ctx.destination);
    /* motor */
    this.eg=ctx.createGain(); this.eg.gain.value=0;
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
    this.o1=ctx.createOscillator(); this.o1.type='sawtooth'; this.o1.frequency.value=60;
    this.o2=ctx.createOscillator(); this.o2.type='square'; this.o2.frequency.value=92;
    this.o1.connect(this.eg); this.o2.connect(this.eg);
    this.eg.connect(lp); lp.connect(this.master);
    this.o1.start(); this.o2.start();
    /* derrape (ruido) */
    const buf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
    const ch=buf.getChannelData(0);
    for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;
    this.noiseBuf=buf;
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=950; bp.Q.value=1.2;
    this.sg=ctx.createGain(); this.sg.gain.value=0;
    src.connect(bp); bp.connect(this.sg); this.sg.connect(this.master);
    src.start();
  },
  engine(speed,thr){
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    const f=55+speed*6+thr*26;
    this.o1.frequency.setTargetAtTime(f,t,0.06);
    this.o2.frequency.setTargetAtTime(f*1.5+3,t,0.06);
    this.eg.gain.setTargetAtTime(0.035+Math.min(0.09,speed*0.0022)+thr*0.045,t,0.08);
  },
  skid(on){
    if(!this.ctx)return;
    this.sg.gain.setTargetAtTime(on?0.22:0,this.ctx.currentTime,0.06);
  },
  quietEngine(){
    if(!this.ctx)return;
    this.eg.gain.setTargetAtTime(0,this.ctx.currentTime,0.05);
    this.sg.gain.setTargetAtTime(0,this.ctx.currentTime,0.05);
  },
  burst(dur,vol,freq,type){
    if(!this.ctx)return;
    const ctx=this.ctx,t=ctx.currentTime;
    const src=ctx.createBufferSource(); src.buffer=this.noiseBuf; src.loop=true;
    const f=ctx.createBiquadFilter(); f.type=type||'lowpass'; f.frequency.value=freq;
    const g=ctx.createGain();
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t+dur+0.05);
  },
  crash(k){this.burst(0.35,0.5*k+0.1,500+600*k,'lowpass');},
  yelp(){
    if(!this.ctx)return;
    const ctx=this.ctx,t=ctx.currentTime;
    const o=ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(600,t);
    o.frequency.exponentialRampToValueAtTime(1100,t+0.12);
    const g=ctx.createGain();
    g.gain.setValueAtTime(0.06,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.18);
  },
  ding(){
    if(!this.ctx)return;
    const ctx=this.ctx,t=ctx.currentTime;
    [880,1318].forEach((fr,i)=>{
      const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=fr;
      const g=ctx.createGain();
      g.gain.setValueAtTime(0.12,t+i*0.09);
      g.gain.exponentialRampToValueAtTime(0.001,t+i*0.09+0.4);
      o.connect(g); g.connect(this.master);
      o.start(t+i*0.09); o.stop(t+i*0.09+0.45);
    });
  },
  toggleMute(){
    this.muted=!this.muted;
    if(this.master)this.master.gain.value=this.muted?0:0.5;
    hint(this.muted?'Sonido: OFF':'Sonido: ON',1500);
  }
};


/* sirena: dos tonos alternos mientras te persigue la policía */
sfx.siren = function (on) {
  if (!this.ctx) return;
  if (on && !this.sirenOsc) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'square';
    const g = ctx.createGain(); g.gain.value = 0.025;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 1.6;
    const lg = ctx.createGain(); lg.gain.value = 160;
    lfo.connect(lg); lg.connect(o.frequency);
    o.frequency.value = 780;
    o.connect(g); g.connect(this.master);
    o.start(); lfo.start();
    this.sirenOsc = [o, lfo, g];
  } else if (!on && this.sirenOsc) {
    for (const n of this.sirenOsc) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }
    this.sirenOsc = null;
  }
};

/* ---------- entrada ---------- */
const input={steer:0,throttle:0,brake:0,hand:false,
  kL:false,kR:false,kU:false,kD:false,tL:false,tR:false,tU:false,tD:false};
function refreshInput(){
  input.steer=((input.kL||input.tL)?-1:0)+((input.kR||input.tR)?1:0);
  input.throttle=(input.kU||input.tU)?1:0;
  input.brake=(input.kD||input.tD)?1:0;
}
window.addEventListener('keydown',e=>{
  if(e.repeat)return;
  switch(e.code){
    case 'ArrowUp': case 'KeyW': input.kU=true; break;
    case 'ArrowDown': case 'KeyS': input.kD=true; break;
    case 'ArrowLeft': case 'KeyA': input.kL=true; break;
    case 'ArrowRight': case 'KeyD': input.kR=true; break;
    case 'Space': input.hand=true; e.preventDefault(); break;
    case 'KeyC': if(state==='playing')camMode=(camMode+1)%3; break;
    case 'KeyR': if(state==='playing'){resetToRoad();hint('Coche reparado y recolocado',2000);} break;
    case 'KeyM': sfx.toggleMute(); break;
    case 'Escape': case 'KeyP':
      if(state==='playing')setState('paused');
      else if(state==='paused')setState('playing');
      break;
  }
  refreshInput();
});
window.addEventListener('keyup',e=>{
  switch(e.code){
    case 'ArrowUp': case 'KeyW': input.kU=false; break;
    case 'ArrowDown': case 'KeyS': input.kD=false; break;
    case 'ArrowLeft': case 'KeyA': input.kL=false; break;
    case 'ArrowRight': case 'KeyD': input.kR=false; break;
    case 'Space': input.hand=false; break;
  }
  refreshInput();
});
/* táctil */
const isTouch='ontouchstart' in window||navigator.maxTouchPoints>0;
function bindTouch(id,prop){
  const el=$(id);
  const on=e=>{e.preventDefault();input[prop]=true;refreshInput();};
  const off=e=>{e.preventDefault();input[prop]=false;refreshInput();};
  el.addEventListener('pointerdown',on);
  el.addEventListener('pointerup',off);
  el.addEventListener('pointercancel',off);
  el.addEventListener('pointerleave',off);
}
bindTouch('tLeft','tL'); bindTouch('tRight','tR');
bindTouch('tGas','tU'); bindTouch('tBrake','tD');
{
  const el=$('tHand');
  el.addEventListener('pointerdown',e=>{e.preventDefault();input.hand=true;});
  el.addEventListener('pointerup',e=>{e.preventDefault();input.hand=false;});
  el.addEventListener('pointercancel',()=>{input.hand=false;});
}


/* ---------- cámara ---------- */
let camMode = 0;
const camCfg = [{ d: 9.5, h: 3.6 }, { d: 14.5, h: 5.6 }];
function updateCamera(dt) {
  const c = player.car, py = player.y;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const big = spec.type === 'bus' ? 1.6 : 1;
  if (camMode === 2) { /* capó */
    camera.position.set(c.x + fx * 1.2, py + 1.5 * big, c.z + fz * 1.2);
    camera.lookAt(c.x + fx * 30, py + 1.2 * big, c.z + fz * 30);
    return;
  }
  const cfg = camCfg[camMode];
  const tx = c.x - fx * cfg.d * big, ty = py + cfg.h * big, tz = c.z - fz * cfg.d * big;
  const k = Math.min(1, 5.5 * dt);
  camera.position.x = lerp(camera.position.x, tx, k);
  camera.position.y = lerp(camera.position.y, ty, k);
  camera.position.z = lerp(camera.position.z, tz, k);
  camera.lookAt(c.x + fx * 7, py + 1.6, c.z + fz * 7);
}

/* ---------- estados y menús ---------- */
let state = 'title';           // title | carselect | playing | paused | results
let mode = 'cruise';           // cruise | race
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function setState(s) {
  state = s;
  for (const id of ['titleScr', 'carScr', 'pauseScr', 'resultScr']) hide(id);
  $('hud').style.display = (s === 'playing' || s === 'paused') ? 'block' : 'none';
  $('touch').style.display = (isTouch && s === 'playing') ? 'block' : 'none';
  if (s === 'title') show('titleScr');
  if (s === 'carselect') show('carScr');
  if (s === 'paused') { show('pauseScr'); sfx.quietEngine(); sfx.siren(false); }
  if (s === 'results') { show('resultScr'); sfx.quietEngine(); sfx.siren(false); }
}
function endSession() {
  if (session) { session.dispose(); session = null; }
}
function startGame() {
  endSession();
  makePlayer();
  player.place(SPAWN.x, SPAWN.z, SPAWN.yaw, heightAt, 0);
  cruiseTime = 0;
  gateMesh.visible = false; arrowMesh.visible = false;
  race.active = false; race.done = false;
  const ambient = makeAmbient(true);
  if (mode === 'race') {
    race.gates = genCourse(8);
    // Rivales en dos filas detrás del jugador.
    const rivals = [];
    for (let k = 0; k < 5; k++) {
      const v = new Vehicle(NPC_TUNES.rival, buildCarMesh({ type: k % 2 ? 'muscle' : 'coupe', color: RIVAL_COLORS[k], L: 4.4, W: 1.95 }), 'rival');
      const row = Math.floor(k / 2) + 1, side = k % 2 ? -3.2 : 3.2;
      const fx = Math.sin(SPAWN.yaw), fz = Math.cos(SPAWN.yaw);
      v.place(SPAWN.x - fx * row * 8 - fz * side * 0.5, SPAWN.z - fz * row * 8 + fx * side * 0.5, SPAWN.yaw, heightAt, 0);
      rivals.push(v);
    }
    session = new Session({ scene, world, heightAt, net }, player, { rivals, gates: race.gates, ambient });
    startRace();
  } else {
    session = new Session({ scene, world, heightAt, net }, player, { ambient });
    $('gateBox').style.display = 'none';
    $('posBox').style.display = 'none';
    $('timerLbl').textContent = 'TIEMPO';
    setTimeout(() => hint('Paseo libre: explora Bahía Pantxo… y ojo con la policía. 🚓', 5000), 600);
  }
  camera.position.set(player.car.x, 8, player.car.z + 12);
  setState('playing');
}
/* tarjetas de selección de coche */
function drawCarThumb(cv,s){
  const c=cv.getContext('2d'), w=cv.width, h=cv.height;
  c.clearRect(0,0,w,h);
  const col='#'+s.color.toString(16).padStart(6,'0');
  const gy=h*0.78, cx=w/2;
  const L=s.L*9, bodyH=s.type==='bus'?34:(s.type==='van'?28:14);
  c.fillStyle='rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(cx,gy+4,L/2+6,5,0,0,Math.PI*2); c.fill();
  c.fillStyle=col;
  c.fillRect(cx-L/2,gy-bodyH,L,bodyH-3);
  if(s.type==='coupe'||s.type==='muscle'){
    c.fillStyle='#2c3e50';
    c.fillRect(cx-L*0.22,gy-bodyH-9,L*0.42,9);
    if(s.type==='coupe'){c.fillStyle=col;c.fillRect(cx-L/2,gy-bodyH-5,7,4);}
  }else{
    c.fillStyle='#2c3e50';
    const ww=s.type==='bus'?L*0.84:L*0.26;
    const wx=s.type==='bus'?cx-ww/2:cx+L*0.16;
    c.fillRect(wx,gy-bodyH+4,ww,9);
  }
  c.fillStyle='#14171c';
  const wr=s.type==='bus'?8:7;
  const wxs=s.type==='bus'?[-L*0.36,0,L*0.36]:[-L*0.3,L*0.3];
  for(const ox of wxs){
    c.beginPath(); c.arc(cx+ox,gy-2,wr,0,Math.PI*2); c.fill();
    c.fillStyle='#3a4048'; c.beginPath(); c.arc(cx+ox,gy-2,wr*0.45,0,Math.PI*2); c.fill();
    c.fillStyle='#14171c';
  }
}
function buildCarCards(){
  const grid=$('carGrid');
  grid.innerHTML='';
  for(const s of CAR_SPECS){
    const card=document.createElement('div');
    card.className='car-card';
    const maxV=Math.round(s.maxSpeed*3.6);
    card.innerHTML='<h3>'+s.nombre+'</h3><p>'+s.desc+' · '+maxV+' km/h</p>'+
      '<canvas width="190" height="74"></canvas>'+
      '<div class="stat"><span>VEL</span><div class="bar"><i style="width:'+(s.maxSpeed/56*100).toFixed(0)+'%"></i></div></div>'+
      '<div class="stat"><span>ACEL</span><div class="bar"><i style="width:'+(s.accel/15*100).toFixed(0)+'%"></i></div></div>'+
      '<div class="stat"><span>AGARRE</span><div class="bar"><i style="width:'+(s.grip/7.5*100).toFixed(0)+'%"></i></div></div>';
    drawCarThumb(card.querySelector('canvas'),s);
    card.addEventListener('click',()=>{
      sfx.init();
      if(sfx.ctx&&sfx.ctx.state==='suspended')sfx.ctx.resume();
      setPlayerCar(s);
      startGame();
    });
    grid.appendChild(card);
  }
}

buildCarCards();
$('btnRace').addEventListener('click', () => { mode = 'race'; sfx.init(); setState('carselect'); });
$('btnCruise').addEventListener('click', () => { mode = 'cruise'; sfx.init(); setState('carselect'); });
$('btnBack').addEventListener('click', () => setState('title'));
$('btnResume').addEventListener('click', () => setState('playing'));
$('btnRestart').addEventListener('click', () => startGame());
$('btnExit').addEventListener('click', () => { sfx.quietEngine(); endSession(); setState('title'); });
$('btnAgain').addEventListener('click', () => startGame());
$('btnMenu').addEventListener('click', () => { endSession(); setState('title'); });
window.addEventListener('blur', () => { if (state === 'playing') setState('paused'); });

/* ---------- bucle principal (física a paso fijo) ---------- */
setState('title');
let last = performance.now(), elapsedAll = 0, acc = 0;
function physicsInput() {
  const weak = player.damagePct >= 100 ? 0.45 : 1;
  // En pantalla, +x queda a la izquierda: la física gira a +x con dirección positiva.
  return { throttle: input.throttle * weak, brake: input.brake, steer: -input.steer, handbrake: input.hand };
}
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame(dt);
}
function frame(dt) {
  elapsedAll += dt;
  if (state === 'playing' && session) {
    acc += dt;
    const inp = physicsInput();
    const running = !race.done;
    let steps = 0;
    while (acc >= DT && steps < 10) { session.step(inp, running); acc -= DT; steps++; }
    session.sync(dt);
    updateTrain(dt);
    if (mode === 'race') updateRace(dt);
    else cruiseTime += dt;
    if (session.ambient?.busted && state === 'playing') finishRace(false, 'busted');
    sfx.siren(!!session.ambient?.chasing && state === 'playing');
    /* sonido del motor y derrape */
    const c = player.car;
    sfx.engine(Math.abs(c.speed), input.throttle);
    const slip = c.slipping.some(Boolean) && Math.hypot(c.vx, c.vz) > 5;
    sfx.skid(slip || (input.hand && Math.abs(c.speed) > 8));
    updateCamera(dt);
    updateHUD();
  } else {
    acc = 0;
    if (state === 'title' || state === 'carselect' || state === 'results') {
      const a = elapsedAll * 0.07;
      camera.position.set(Math.sin(a) * 330, 150, Math.cos(a) * 330);
      camera.lookAt(0, 0, 0);
      updateTrain(dt);
    }
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Acceso para depurar desde la consola.
window.pantxo = { get session() { return session; }, get player() { return player; }, get state() { return state; }, net, world, startGame, frame, setMode: (m) => { mode = m; } };
