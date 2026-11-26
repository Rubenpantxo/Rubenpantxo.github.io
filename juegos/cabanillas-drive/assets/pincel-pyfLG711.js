import{A as $,L as W}from"./agricultura-DoxFWYIr.js";import{aD as J,V as ca,k as ia,a as sa,A as ma,w as va,M as pa,aH as ha,aL as ba,aM as ga,L as Ma,u as xa,B as ja,y as Ca,aI as oa,aN as ea}from"./librerias-BRsXrkg8.js";async function wa(a){const e=await fetch(a);if(!e.ok)throw new Error(`No se pudo leer ${a}`);const t=await e.json(),o=new Map(t.parcelas.map(r=>[r.ref,r]));return{...t,porRef:o}}function ya(a,e,t){const[o,r,l,i]=a.caja;if(e<o||e>l||t<r||t>i)return!1;let c=!1;for(const s of a.partes)for(const n of s)for(let p=0,M=n.length-1;p<n.length;M=p++){const[g,u]=n[p],[m,d]=n[M];u>t!=d>t&&e<(m-g)*(t-u)/(d-u)+g&&(c=!c)}return c}const U=100;function ka(a){const e=new Map,t=(o,r)=>`${o},${r}`;for(const o of a.parcelas){const[r,l,i,c]=o.caja;for(let s=Math.floor(r/U);s<=Math.floor(i/U);s++)for(let n=Math.floor(l/U);n<=Math.floor(c/U);n++){const p=t(s,n);e.has(p)||e.set(p,[]),e.get(p).push(o)}}return{datos:a,cuantas:a.parcelas.length,porRef:o=>a.porRef.get(o)??null,parcelaEn(o,r){const l=e.get(t(Math.floor(o/U),Math.floor(r/U)));if(!l)return null;for(const i of l)if(ya(i,o,r))return i;return null}}}const ua={trigo:{nombre:"Trigo",curva:[[0,0,0,0,[120,104,80],[120,150,70],0,"Sembrado"],[14,.03,.12,0,[118,150,72],[120,150,70],0,"Nascencia"],[35,.09,.34,0,[88,122,56],[120,150,70],0,"Ahijado"],[105,.2,.75,0,[70,102,48],[104,132,66],0,null],[125,.38,.9,0,[66,100,50],[104,132,66],0,"Encañado"],[165,.82,.97,.6,[72,106,60],[138,158,98],0,"Espigado"],[182,.88,.97,1,[88,116,64],[162,170,112],.05,"Floración"],[200,.88,.96,1,[150,156,78],[184,178,106],.1,"Llenado del grano"],[222,.86,.93,1,[196,166,96],[214,176,104],.18,"Madura"],[240,.84,.92,1,[182,152,92],[204,166,100],.22,null]],madura:222,rendimientoKgHa:6500,pesoLitroKg:.78},cebada:{nombre:"Cebada",curva:[[0,0,0,0,[120,104,80],[120,150,70],0,"Sembrado"],[12,.03,.12,0,[122,154,76],[120,150,70],0,"Nascencia"],[32,.09,.32,0,[92,126,58],[120,150,70],0,"Ahijado"],[95,.2,.75,0,[76,108,52],[108,136,68],0,null],[115,.36,.9,0,[72,106,54],[108,136,68],0,"Encañado"],[150,.76,.96,.6,[80,112,64],[146,162,104],0,"Espigado"],[165,.8,.96,1,[100,122,68],[168,172,116],.15,"Floración"],[182,.8,.95,1,[168,166,92],[186,178,108],.45,"Llenado del grano"],[205,.76,.92,1,[214,196,136],[224,204,146],.85,"Madura"],[225,.74,.9,1,[200,182,128],[212,192,138],.9,null]],madura:205,rendimientoKgHa:5800,pesoLitroKg:.66},cebolla:{nombre:"Cebolla",curva:[[0,0,0,0,[120,104,80],[120,150,70],0,"Sembrada"],[18,.04,.06,0,[124,162,76],[120,150,70],0,"Nascencia"],[45,.14,.2,0,[96,146,64],[120,150,70],0,"Hojas"],[90,.42,.5,0,[78,132,58],[120,150,70],0,"Bulbificación"],[125,.55,.62,0,[84,134,58],[120,150,70],.05,"Engrosado del bulbo"],[148,.5,.58,0,[128,148,66],[120,150,70],.55,"Tumbado"],[165,.26,.4,0,[176,150,84],[120,150,70],1,"Madura"],[185,.2,.34,0,[168,138,80],[120,150,70],1,null]],madura:165,rendimientoKgHa:55e3,pesoLitroKg:.62,arrancable:!0},brocoli:{nombre:"Brócoli",curva:[[0,.04,.03,0,[110,140,90],[150,180,110],0,"Plantado"],[14,.12,.25,0,[96,138,98],[150,180,110],0,"Arraigado"],[40,.35,.72,0,[84,128,98],[150,180,110],0,"Hojas"],[68,.55,.95,.35,[78,120,96],[138,176,96],0,"Formando la pella"],[90,.6,.97,1,[76,116,92],[128,172,92],0,"Pella en su punto"],[110,.6,.95,1,[92,120,80],[160,170,80],0,"Se pasa"]],madura:90,recoleccion:"mano",rendimientoKgHa:12e3,pesoLitroKg:.4},alcachofa:{nombre:"Alcachofa",curva:[[0,.05,.03,0,[120,130,100],[128,140,110],0,"Zueca plantada"],[25,.2,.3,0,[126,148,118],[128,140,110],0,"Brotando"],[60,.55,.7,0,[118,142,118],[128,140,110],0,"Matas"],[95,.85,.95,.4,[112,138,114],[120,130,120],0,"Alcachofas formándose"],[120,.95,.98,1,[108,134,110],[118,126,122],0,"Alcachofas en su punto"],[150,.95,.96,1,[120,132,100],[132,124,100],0,"Se abren"]],madura:120,recoleccion:"mano",perenne:!0,edadRebrote:95,rendimientoKgHa:4e3,pesoLitroKg:.3},esparrago:{nombre:"Espárrago",curva:[[0,.02,.02,0,[120,110,80],[200,190,150],0,"Garras plantadas"],[30,.08,.1,0,[118,150,80],[200,190,150],0,"Brotando"],[70,.5,.35,0,[96,140,74],[200,190,150],0,"Frondes"],[100,.85,.55,.5,[92,132,70],[214,204,160],0,"Turiones en su punto"],[130,.9,.6,1,[96,128,68],[214,204,160],0,null],[170,.8,.5,1,[150,140,70],[214,204,160],0,"Frondes amarilleando"]],madura:100,recoleccion:"mano",perenne:!0,edadRebrote:70,rendimientoKgHa:1500,pesoLitroKg:.5}},Ha={alto:{radio:32,separacion:.3},medio:{radio:24,separacion:.34},bajo:{radio:14,separacion:.42},ancho:.42,alturaMinimaDosel:.12,pasoDoselFinoM:.5,doselFinoHastaHa:3},q=10,ta=250;function Ra({dia:a=$.reloj.diaInicial,segundosPorDia:e=$.reloj.segundosPorDia}={}){const t={value:0};let o=a;const r=new Set,l=i=>{const c=Math.floor(o);if(o=Math.max(0,i),t.value=o%255,Math.floor(o)!==c)for(const s of r)s(Math.floor(o),Math.floor(o)-c)};return l(a),{uHoy:t,get hoy(){return o},get dia(){return Math.floor(o)},get fraccion(){return o-Math.floor(o)},get segundosParaManana(){return(1-(o-Math.floor(o)))*e},get byte(){return Math.floor(o)%255+1},avanza(i){l(o+i/e)},pasaDias(i){l(Math.floor(o)+i+(o-Math.floor(o)))},pon:l,alCambiarDia(i){return r.add(i),()=>r.delete(i)}}}const Ga=(a,e)=>a?((e-(a-1))%255+255)%255:null;function Ta(a,e,t=1){const{cultivo:o,interior:r}=a,l=Math.floor(e),i=l-t;let c=0;for(let s=0;s<r.length;s++){const n=o[s*4+1];if(!n)continue;((i-(n-1))%255+255)%255+t>ta&&(o[s*4+1]=((l-ta)%255+255)%255+1,c++)}return c&&a.marcaCambio(0,0,a.ancho-1,a.alto-1),c}const ra=a=>new ia().setRGB(a[0]/255,a[1]/255,a[2]/255,sa),Z=new Map;function X(a){if(Z.has(a))return Z.get(a);const e=ua[a],t=[],o=[],r=[];for(let i=0;i<q;i++){const c=e.curva[Math.min(i,e.curva.length-1)],s=Math.max(0,i-e.curva.length+1)*1e3;t.push(new J(c[0]+s,c[1],c[2],c[3]));const n=ra(c[4]);o.push(new J(n.r,n.g,n.b,c[6]));const p=ra(c[5]);r.push(new ca(p.r,p.g,p.b))}const l={uCurva:{value:t},uHoja:{value:o},uEspiga:{value:r}};return Z.set(a,l),l}function Pa(a,e){const t=ua[a],o=t.curva;let r=0;for(let n=1;n<o.length;n++)e>=o[n][0]&&(r=n);const l=Math.min(r+1,o.length-1),i=l===r?0:Math.min(1,Math.max(0,(e-o[r][0])/(o[l][0]-o[r][0])));let c=o[0][7];for(let n=0;n<=r;n++)o[n][7]&&(c=o[n][7]);let s=null;for(let n=r+1;n<o.length;n++)if(o[n][7]){s={etapa:o[n][7],enDias:Math.max(0,Math.ceil(o[n][0]-e))};break}return{altura:o[r][1]+(o[l][1]-o[r][1])*i,cobertura:o[r][2]+(o[l][2]-o[r][2])*i,espiga:o[r][3]+(o[l][3]-o[r][3])*i,etapa:c,siguiente:s,madura:e>=t.madura}}const za=`
uniform float uHoy;
uniform vec4 uCurva[${q}];
uniform vec4 uHoja[${q}];
uniform vec3 uEspiga[${q}];
float azarC(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoC(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarC(i), azarC(i + vec2(1, 0)), f.x), mix(azarC(i + vec2(0, 1)), azarC(i + vec2(1, 1)), f.x), f.y);
}
float fbmC(vec2 p) { return 0.5 * ruidoC(p) + 0.3 * ruidoC(p * 2.03 + 3.1) + 0.2 * ruidoC(p * 4.07 + 7.7); }
// Fase del cultivo a una edad: altura, cobertura, espiga, color de hoja (y cabeceo en .w), color de espiga
struct Fase { float altura; float cobertura; float espiga; vec4 hoja; vec3 colEspiga; };
Fase faseDe(float edad) {
  int k = 0;
  for (int i = 1; i < ${q}; i++) { if (edad >= uCurva[i].x) k = i; }
  int k1 = min(k + 1, ${q-1});
  float t = k1 == k ? 0.0 : clamp((edad - uCurva[k].x) / max(uCurva[k1].x - uCurva[k].x, 1e-3), 0.0, 1.0);
  vec4 c = mix(uCurva[k], uCurva[k1], t);
  Fase f;
  f.altura = c.y; f.cobertura = c.z; f.espiga = c.w;
  f.hoja = mix(uHoja[k], uHoja[k1], t);
  f.colEspiga = mix(uEspiga[k], uEspiga[k1], t);
  return f;
}
// Píxel de máscara de un punto (o -1 si cae fuera)
ivec2 pixelDe(vec2 p) {
  vec2 q = (p - uMascara.xy) / uMascara.zw / uTexel;
  ivec2 i = ivec2(floor(q));
  ivec2 n = ivec2(floor(1.0 / uTexel + 0.5));
  return (i.x < 0 || i.y < 0 || i.x >= n.x || i.y >= n.y) ? ivec2(-1) : i;
}
// Edad (días) de lo sembrado en un punto; negativa si no hay nada sembrado
float edadEn(vec2 p) {
  ivec2 i = pixelDe(p);
  if (i.x < 0) return -1.0;
  float b = floor(texelFetch(uCultivo, i, 0).g * 255.0 + 0.5);
  if (b < 0.5) return -1.0;
  return mod(uHoy - (b - 1.0) + 255.0, 255.0);
}
// Edad con el borde de lo sembrado suavizado (sin la escalera de los píxeles): mira los 2 × 2
// píxeles vecinos; dentro si la mezcla de «sembrado sí / no» pasa de «umbral». La edad es la del
// píxel sembrado más cercano. Negativa si no hay nada.
float edadSuave(vec2 p, float umbral) {
  vec2 q = (p - uMascara.xy) / uMascara.zw / uTexel - 0.5;
  ivec2 i0 = ivec2(floor(q));
  vec2 f = q - vec2(i0);
  ivec2 n = ivec2(floor(1.0 / uTexel + 0.5));
  float b00 = 0.0; float b10 = 0.0; float b01 = 0.0; float b11 = 0.0;
  if (i0.x >= 0 && i0.y >= 0 && i0.x + 1 < n.x && i0.y + 1 < n.y) {
    b00 = floor(texelFetch(uCultivo, i0, 0).g * 255.0 + 0.5);
    b10 = floor(texelFetch(uCultivo, i0 + ivec2(1, 0), 0).g * 255.0 + 0.5);
    b01 = floor(texelFetch(uCultivo, i0 + ivec2(0, 1), 0).g * 255.0 + 0.5);
    b11 = floor(texelFetch(uCultivo, i0 + ivec2(1, 1), 0).g * 255.0 + 0.5);
  }
  float s00 = step(0.5, b00); float s10 = step(0.5, b10); float s01 = step(0.5, b01); float s11 = step(0.5, b11);
  float hay = mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
  if (hay < umbral) return -1.0;
  // El más cercano de los sembrados
  vec2 c = step(0.5, f);
  float b = c.y < 0.5 ? (c.x < 0.5 ? b00 : b10) : (c.x < 0.5 ? b01 : b11);
  if (b < 0.5) b = max(max(b00, b10), max(b01, b11));
  return mod(uHoy - (b - 1.0) + 255.0, 255.0);
}
// Agua que ha tenido el cultivo mientras crecía (A7, máscara «agua»: 0,5 = solo la lluvia)
uniform sampler2D uAgua;
// Vigor (0,36…1,34): tierra preparada y abonada crece más; rodales más altos y más bajos; con el
// agua de los riegos, hasta un 20 % más; con sed, hasta un 20 % menos
float vigorEn(vec2 p) {
  ivec2 i = pixelDe(p);
  vec4 lab = i.x < 0 ? vec4(0.0) : texelFetch(uLaboreo, i, 0);
  float agua = i.x < 0 ? 0.5 : texelFetch(uAgua, i, 0).r;
  float prep = max(smoothstep(0.3, 0.7, lab.r), smoothstep(0.3, 0.7, lab.g));
  float suelo = clamp(0.62 + 0.18 * prep + 0.25 * lab.b + 0.24 * (fbmC(p * 0.07) - 0.5), 0.45, 1.12);
  return suelo * (0.8 + 0.4 * agua);
}
`;function _a(a,e,t=.5){return Math.min(1.12,Math.max(.45,.62+.18*a+.25*e))*(.8+.4*t)}const Y=new Map;function $a(a){if(!Y.has(a)){const e=new Float32Array(256);for(let t=0;t<256;t++)e[t]=Pa(a,t).altura;Y.set(a,e)}return Y.get(a)}const T={arado:[104,84,64],gradeado:[150,128,101],abono:[226,224,214],surcoSiembra:[96,80,62],rastrojo:[196,176,128],paja:[214,190,132],humedo:[26,20,14],charco:[122,140,152]},H={surcoAradoM:.36,surcoGradeoM:.12,lineaSiembraM:.17,hileraPajaM:6,alturaArado:.09,alturaGradeo:.025,oscurecerHumedo:.55},_=a=>new ia().setRGB(a[0]/255,a[1]/255,a[2]/255,sa),Aa=`
varying vec3 vMundo;
uniform sampler2D uLaboreo, uCultivo, uDentro;
uniform vec4 uMascara;               // ox, oz, ancho en metros, alto en metros
uniform vec2 uTexel;                 // 1/ancho, 1/alto en píxeles de máscara
uniform vec3 uSol;                   // hacia el sol (mundo)
uniform vec3 uColArado, uColGradeo, uColAbono, uColSurco, uColRastrojo, uColPaja, uColHumedo, uColCharco;
uniform float uHayCultivo;
vec4 capaParcela = vec4(0.0);
${za}

float azarP(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoP(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarP(i), azarP(i + vec2(1, 0)), f.x), mix(azarP(i + vec2(0, 1)), azarP(i + vec2(1, 1)), f.x), f.y);
}
float fbmP(vec2 p) { return 0.5 * ruidoP(p) + 0.3 * ruidoP(p * 2.03 + 3.1) + 0.2 * ruidoP(p * 4.07 + 7.7); }

// «Encima» (over) de una capa con alfa sobre lo que ya hay
void encima(inout vec4 base, vec3 color, float alfa) {
  float a = alfa + base.a * (1.0 - alfa);
  base.rgb = a > 1e-4 ? (color * alfa + base.rgb * base.a * (1.0 - alfa)) / a : base.rgb;
  base.a = a;
}

// Altura del arado: tiras volteadas (perfil asimétrico de vertedera) más terrones
float alturaArado(vec2 p, vec2 eje, vec2 lado, float detalle) {
  float s = dot(p, eje);
  // La tira no es recta ni igual de ancha: la vertedera va y viene con el terreno
  float u = dot(p, lado) / ${H.surcoAradoM.toFixed(3)} + (ruidoP(vec2(s * 0.35, 0.5)) - 0.5) * 0.9;
  float f = fract(u);
  float n = floor(u);
  float tira = pow(sin(3.14159 * pow(f, 0.65)), 0.7) * (0.75 + 0.5 * azarP(vec2(n, 3.0)));
  // Terrones: bultos de 10–30 cm que rompen la tira, y grumos pequeños de cerca
  float terron = smoothstep(0.35, 0.85, ruidoP(p * 4.0 + n * 1.7)) * 0.9 + fbmP(p * 9.0) * 0.4;
  terron += ruidoP(p * 23.0) * 0.35 * detalle;
  return (tira * 0.6 + terron * 0.55) * ${H.alturaArado.toFixed(3)};
}
float alturaGradeo(vec2 p, vec2 eje, vec2 lado, float detalle) {
  float u = dot(p, lado) / ${H.surcoGradeoM.toFixed(3)};
  float raya = 0.5 + 0.5 * sin(6.28318 * u + ruidoP(p * 0.7) * 2.0);
  float grumo = fbmP(p * 14.0) * detalle;
  return (raya * 0.5 * detalle + grumo * 0.6) * ${H.alturaGradeo.toFixed(3)};
}

// Luz difusa de una superficie con esa pendiente (1 = como el suelo llano)
float luzRelieve(vec2 grad) {
  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  return clamp(dot(n, uSol) / max(uSol.y, 0.25), 0.25, 1.6);
}

void calculaParcela() {
  vec2 p = vMundo.xz;
  vec2 uv = (p - uMascara.xy) / uMascara.zw;
  float dentro = texture2D(uDentro, uv).r;
  if (dentro < 0.002) discard;
  vec4 lab = texture2D(uLaboreo, uv);
  vec4 cul = texture2D(uCultivo, uv);
  float arado = smoothstep(0.15, 0.85, lab.r);
  float gradeo = smoothstep(0.15, 0.85, lab.g);
  float abono = lab.b;
  float th = lab.a * 3.14159265;
  vec2 eje = vec2(cos(th), sin(th));               // dirección de la pasada
  vec2 lado = vec2(-eje.y, eje.x);
  float humedad = cul.r;
  float sembrado = step(0.002, cul.g);
  float cosechado = smoothstep(0.15, 0.85, cul.b);
  float rodada = cul.a;
  float da = max(length(fwidth(p)), 1e-4);         // metros por píxel de pantalla
  float detalle = 1.0 - smoothstep(0.02, 0.09, da);
  float e = 0.03;

  vec4 capa = vec4(0.0);

  // --- Arado: tiras volteadas y terrones, sombreados con el sol
  if (arado > 0.001) {
    float vista = 1.0 - smoothstep(0.08, 0.3, da);  // de lejos, el relieve se funde en color
    float h0 = alturaArado(p, eje, lado, detalle);
    vec2 g = vec2(alturaArado(p + vec2(e, 0.0), eje, lado, detalle) - h0,
                  alturaArado(p + vec2(0.0, e), eje, lado, detalle) - h0) / e;
    float luz = mix(1.0, luzRelieve(g), vista);
    vec3 c = uColArado * (0.8 + 0.4 * fbmP(p * 0.3)) * (0.88 + 0.24 * ruidoP(p * 2.5));
    // Algún resto de paja enterrada a medias
    c = mix(c, uColRastrojo * 0.8, smoothstep(0.93, 0.98, ruidoP(p * 11.0 + 4.0)) * detalle * 0.6);
    c *= mix(0.85, 1.12, h0 / ${H.alturaArado.toFixed(3)} * vista + (1.0 - vista) * 0.5);
    encima(capa, c * luz, arado);
  }
  // --- Gradeado / preparado: más claro y liso
  if (gradeo > 0.001) {
    float vista = 1.0 - smoothstep(0.05, 0.2, da);
    float h0 = alturaGradeo(p, eje, lado, detalle);
    vec2 g = vec2(alturaGradeo(p + vec2(e, 0.0), eje, lado, detalle) - h0,
                  alturaGradeo(p + vec2(0.0, e), eje, lado, detalle) - h0) / e;
    float luz = mix(1.0, luzRelieve(g), vista);
    vec3 c = uColGradeo * (0.9 + 0.2 * fbmP(p * 0.4)) * (0.95 + 0.1 * ruidoP(p * 5.0));
    encima(capa, c * luz, gradeo);
  }
  // --- Siembra: líneas finas en la dirección de la pasada
  float hojas = 0.0;                               // lo que tapa el cultivo (la humedad no lo oscurece)
  if (sembrado > 0.5) {
    float u = dot(p, lado) / ${H.lineaSiembraM.toFixed(3)};
    float dLinea = abs(fract(u) - 0.5) * ${H.lineaSiembraM.toFixed(3)};   // metros a la línea
    float linea = 1.0 - smoothstep(0.012, 0.012 + da * 0.8, dLinea);
    float vista = 1.0 - smoothstep(0.04, 0.12, da);
    float lomo = smoothstep(0.012, 0.035, dLinea) * (1.0 - smoothstep(0.035, 0.06, dLinea));
    encima(capa, uColSurco, linea * 0.75 * vista + 0.12 * (1.0 - vista));
    encima(capa, uColGradeo * 1.15, lomo * 0.25 * vista);
    // El cultivo: de joven, plantitas a lo largo de las líneas; luego cubre el suelo
    float edad = uHayCultivo > 0.5 ? edadSuave(p, 0.5 + (ruidoP(p * 3.0) - 0.5) * 0.4) : -1.0;
    if (edad >= 0.0) {
      Fase f = faseDe(edad);
      float vig = vigorEn(p);
      float cob = clamp(f.cobertura * mix(0.75, 1.05, (vig - 0.45) / 0.67), 0.0, 0.97);
      float fila = 1.0 - smoothstep(0.2, 0.48, abs(fract(u) - 0.5));
      float joven = 1.0 - smoothstep(0.35, 0.8, cob);
      float a = mix(cob, cob * mix(0.3, 2.6, fila) * (0.6 + 0.8 * fbmP(p * 3.0)), joven * vista);
      vec3 c = mix(f.hoja.rgb, f.colEspiga, f.espiga * 0.55) * (0.82 + 0.3 * fbmP(p * 0.45)) * (0.88 + 0.18 * vig);
      // Con el cultivo alto, lo que se ve por abajo (entre el dosel y la linde) es la base en sombra
      c *= mix(1.0, 0.5, smoothstep(0.1, 0.3, f.altura * vig));
      hojas = clamp(a, 0.0, 0.97);
      encima(capa, c, hojas);
    }
  }
  // --- Cosechado: rastrojo claro, tallos en líneas e hileras de paja
  if (cosechado > 0.001) {
    float u = dot(p, lado);
    float tallos = 0.5 + 0.5 * sin(6.28318 * u / ${H.lineaSiembraM.toFixed(3)});
    vec3 c = uColRastrojo * (0.85 + 0.25 * fbmP(p * 0.5)) * mix(1.0, 0.8 + 0.3 * tallos, detalle);
    c *= 0.92 + 0.16 * ruidoP(p * 25.0) * detalle;
    float dHilera = abs(fract(u / ${H.hileraPajaM.toFixed(1)}) - 0.5) * ${H.hileraPajaM.toFixed(1)};
    float hilera = 1.0 - smoothstep(0.35, 0.65 + ruidoP(p * 0.8) * 0.3, dHilera);
    vec3 paja = uColPaja * (0.8 + 0.4 * ruidoP(vec2(dot(p, eje) * 3.0, u * 12.0)));
    c = mix(c, paja, hilera * 0.85);
    encima(capa, c, cosechado);
  }
  // --- Abono: granulado moteado (de lejos, un velo claro)
  if (abono > 0.004) {
    vec2 celda = floor(p * 22.0);
    float grano = step(1.0 - 0.28 * abono, azarP(celda)) * (1.0 - smoothstep(0.22, 0.45, length(fract(p * 22.0) - 0.5)));
    float vista = 1.0 - smoothstep(0.01, 0.05, da);
    encima(capa, uColAbono * (0.85 + 0.3 * azarP(celda + 0.5)), grano * vista * 0.95 + abono * 0.18 * (1.0 - vista));
  }
  // --- Rodadas: tierra compactada y hundida (el relieve sale de la propia máscara)
  if (rodada > 0.004) {
    float rx = texture2D(uCultivo, uv + vec2(uTexel.x, 0.0)).a - texture2D(uCultivo, uv - vec2(uTexel.x, 0.0)).a;
    float rz = texture2D(uCultivo, uv + vec2(0.0, uTexel.y)).a - texture2D(uCultivo, uv - vec2(0.0, uTexel.y)).a;
    vec2 g = -vec2(rx, rz) * 0.06 / (2.0 * uMascara.z * uTexel.x);   // 6 cm de hundimiento
    // Dentro de la huella la tierra queda aplastada y lisa: se ve más clara que el arado, con
    // los tacos del neumático en espiga (en la dirección de la huella, de la propia máscara)
    vec2 gm = vec2(rx, rz);
    vec2 lado2 = length(gm) > 0.02 ? normalize(gm) : lado;
    vec2 eje2 = vec2(-lado2.y, lado2.x);
    float taco = step(0.5, fract(dot(p, eje2) / 0.22 + abs(dot(p, lado2)) * 1.6));
    vec3 base = mix(uColGradeo * 0.92, capa.a > 0.01 ? capa.rgb : uColGradeo, 0.35);
    vec3 c = base * (0.9 + 0.12 * taco * detalle) * (0.92 + 0.12 * ruidoP(p * 6.0)) * luzRelieve(g);
    encima(capa, c, smoothstep(0.05, 0.45, rodada) * 0.92);
  }
  // --- Humedad: oscurece lo de debajo (también la foto) y encharca donde hay mucha agua
  if (humedad > 0.004) {
    // (A7: el riego deja la humedad del suelo, 0,3 es lo que da la lluvia; se seca con los días)
    encima(capa, uColHumedo, smoothstep(0.3, 0.75, humedad) * ${H.oscurecerHumedo.toFixed(2)} * (1.0 - hojas));
    // Charcos solo en los bajos (ruido lento) y con el agua de sobra: bordes irregulares
    float bajo = fbmP(p * 0.25) * 0.7 + ruidoP(p * 1.3) * 0.3;
    // Solo con el pincel (255): los charcos del riego los dibuja su lámina de agua (riego.js)
    float charco = step(0.998, humedad) * smoothstep(0.0, 0.05, (humedad - 0.9) * 1.5 + bajo - 0.75);
    vec3 cielo = mix(uColCharco, uColHumedo * 6.0, 0.25 + 0.25 * ruidoP(p * 0.6)) * (0.9 + 0.2 * ruidoP(p * 0.15));
    encima(capa, cielo, charco * 0.7);
  }

  // Linde: se funde con la ortofoto en los últimos centímetros, con un borde irregular
  float borde = smoothstep(0.0, 1.0, dentro * 1.25 + (ruidoP(p * 2.5) - 0.5) * 0.5);
  capa.a *= borde;
  if (capa.a < 0.003) discard;
  capaParcela = capa;
}
`;function La({texturas:a,ox:e,oz:t,anchoM:o,altoM:r,ancho:l,alto:i}){const c=new ma({color:16777215,emissive:16777215,transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2,name:"suelo_parcela"}),s={uLaboreo:{value:a.laboreo},uCultivo:{value:a.cultivo},uDentro:{value:a.dentro},uAgua:{value:a.agua},uMascara:{value:new J(e,t,o,r)},uTexel:{value:new va(1/l,1/i)},uSol:{value:new ca(.3,.8,.5).normalize()},uColArado:{value:_(T.arado)},uColGradeo:{value:_(T.gradeado)},uColAbono:{value:_(T.abono)},uColSurco:{value:_(T.surcoSiembra)},uColRastrojo:{value:_(T.rastrojo)},uColPaja:{value:_(T.paja)},uColHumedo:{value:_(T.humedo)},uColCharco:{value:_(T.charco)},uHayCultivo:{value:0},uHoy:{value:0},uCurva:{value:X("trigo").uCurva.value},uHoja:{value:X("trigo").uHoja.value},uEspiga:{value:X("trigo").uEspiga.value}};return c.userData.uniformes=s,c.onBeforeCompile=n=>{Object.assign(n.uniforms,s,{uEmisivo:W.emisivo,uFactorLuz:W.factor,uDifuso:W.difuso}),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
        varying vec3 vMundo;`).replace("#include <project_vertex>",`#include <project_vertex>
        vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
        uniform vec3 uEmisivo;
        uniform float uFactorLuz, uDifuso;
        ${Aa}`).replace("#include <map_fragment>",`#include <map_fragment>
        calculaParcela();
        diffuseColor = vec4(capaParcela.rgb * uDifuso, capaParcela.a);`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        totalEmissiveRadiance = capaParcela.rgb * uEmisivo;`).replace("#include <shadowmap_pars_fragment>",`#include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>`).replace("#include <opaque_fragment>",`
        outgoingLight *= 1.0 - 0.55 * min(uFactorLuz, 1.0) * (1.0 - getShadowMask());
        #include <opaque_fragment>`)},c.customProgramCacheKey=()=>"suelo_parcela_v4",c}function K(a,e,t,o){const r=new ha(a,e,t,o,ba);return r.wrapS=r.wrapT=ga,r.magFilter=Ma,r.minFilter=xa,r.generateMipmaps=!0,r.flipY=!1,r.unpackAlignment=1,r.needsUpdate=!0,r}function Sa(a,e,t,o,r,l,i){const c=new Uint8Array(r*l),s=a.partes.flat(),n=[];for(let u=0;u<l;u++){const m=t+(u+.5)*o;n.length=0;for(const d of s)for(let b=0,f=d.length-1;b<d.length;f=b++){const[h,L]=d[b],[x,S]=d[f];L>m!=S>m&&n.push(h+(m-L)/(S-L)*(x-h))}n.sort((d,b)=>d-b);for(let d=0;d+1<n.length;d+=2){const b=Math.max(0,Math.ceil((n[d]-e)/o-.5)),f=Math.min(r-1,Math.floor((n[d+1]-e)/o-.5));for(let h=b;h<=f;h++)c[u*r+h]=1}}const p=new Float32Array(r*l).fill(i),M=Math.ceil(i/o)+1;for(const u of s)for(let m=0,d=u.length-1;m<u.length;d=m++){const[b,f]=u[d],[h,L]=u[m],x=h-b,S=L-f,D=x*x+S*S||1e-9,z=Math.max(0,Math.floor((Math.min(b,h)-e)/o)-M),A=Math.min(r-1,Math.ceil((Math.max(b,h)-e)/o)+M),E=Math.max(0,Math.floor((Math.min(f,L)-t)/o)-M),j=Math.min(l-1,Math.ceil((Math.max(f,L)-t)/o)+M);for(let C=E;C<=j;C++){const k=t+(C+.5)*o;for(let w=z;w<=A;w++){const R=e+(w+.5)*o,G=Math.min(1,Math.max(0,((R-b)*x+(k-f)*S)/D)),v=Math.hypot(R-b-G*x,k-f-G*S),y=C*r+w;v<p[y]&&(p[y]=v)}}}const g=new Uint8Array(r*l);for(let u=0;u<g.length;u++)c[u]&&(g[u]=Math.max(1,Math.round(p[u]/i*255)));return{interior:c,dentro:g}}function Ea(a,e,t,o=null){const{ox:r,oz:l,mpp:i,ancho:c,alto:s,interior:n}=t,p=Math.max(a.caja[2]-a.caja[0],a.caja[3]-a.caja[1]),M=$.malla,g=o??(p>M.pasoGrandeDesdeM?M.pasoGrandeM:M.pasoM),u=c*i,m=s*i,d=Math.ceil(u/g),b=Math.ceil(m/g),f=(z,A)=>{const E=Math.floor((z-r)/i),j=Math.floor((A-l)/i);return E>=0&&j>=0&&E<c&&j<s&&n[j*c+E]===1},h=new Int32Array((d+1)*(b+1)).fill(-1),L=[],x=[],S=(z,A)=>{const E=A*(d+1)+z;if(h[E]<0){const j=r+Math.min(z*g,u),C=l+Math.min(A*g,m);h[E]=L.length/3,L.push(j,e.alturaEn(j,C)+M.alturaSobreSueloM,C)}return h[E]};for(let z=0;z<b;z++)for(let A=0;A<d;A++){const E=r+A*g,j=l+z*g,C=Math.min(E+g,r+u),k=Math.min(j+g,l+m),w=(E+C)/2,R=(j+k)/2;if(!(f(w,R)||f(E+.01,j+.01)||f(C-.01,j+.01)||f(E+.01,k-.01)||f(C-.01,k-.01)))continue;const G=S(A,z),v=S(A+1,z),y=S(A,z+1),F=S(A+1,z+1);x.push(G,y,v,v,y,F)}const D=new ja;return D.setAttribute("position",new Ca(L,3)),D.setIndex(x),D.computeVertexNormals(),D.computeBoundingSphere(),D.computeBoundingBox(),{geo:D,paso:g,triangulos:x.length/3}}function Ua(a,{terreno:e,nivelCalidad:t="alto"}){const o=$.mascara,[r,l,i,c]=a.caja;let s=o.metrosPorPixel[t]??o.metrosPorPixel.alto;const n=Math.max(i-r,c-l)+2*o.margenM,p=o.ladoMax[t]??o.ladoMax.alto;n/s>p&&(s=n/p);const M=r-o.margenM,g=l-o.margenM,u=Math.ceil((i-r+2*o.margenM)/s),m=Math.ceil((c-l+2*o.margenM)/s),{interior:d,dentro:b}=Sa(a,M,g,s,u,m,$.fundidoLindeM),f=new Uint8Array(u*m*4),h=new Uint8Array(u*m*4),L=new Uint8Array(u*m).fill(128),x={laboreo:K(f,u,m,ea),cultivo:K(h,u,m,ea),dentro:K(b,u,m,oa),agua:K(L,u,m,oa)},S={ox:M,oz:g,mpp:s,ancho:u,alto:m,interior:d},{geo:D,paso:z,triangulos:A}=Ea(a,e,S),E=La({texturas:x,ox:M,oz:g,anchoM:u*s,altoM:m*s,ancho:u,alto:m}),j=new pa(D,E);j.name=`parcela_${a.ref}`,j.renderOrder=2,j.receiveShadow=!0,j.userData.sombrasPropias=!0;let C=null,k=-1/0,w=null;const R=d.reduce((v,y)=>v+y,0),G={info:a,ref:a.ref,malla:j,laboreo:f,cultivo:h,agua:L,dentro:b,interior:d,texturas:x,mascara:S,version:0,ox:M,oz:g,mpp:s,ancho:u,alto:m,pasoMalla:z,triangulos:A,pixelesDentro:R,aPixel:(v,y)=>[(v-M)/s-.5,(y-g)/s-.5],marcaCambio(v,y,F,P){w=null,G.version++,C?C=[Math.min(C[0],v),Math.min(C[1],y),Math.max(C[2],F),Math.max(C[3],P)]:C=[v,y,F,P]},sube(v=performance.now(),y=!1){return!C||!y&&v-k<1e3/$.subidasPorSegundo?!1:(x.laboreo.needsUpdate=!0,x.cultivo.needsUpdate=!0,x.agua.needsUpdate=!0,C=null,k=v,!0)},recuento(){if(w)return w;const v={arado:0,gradeado:0,abonado:0,sembrado:0,regado:0,cosechado:0,rodadas:0,rastrojo:0};for(let F=0;F<d.length;F++){if(!d[F])continue;const P=F*4,B=f[P]>127||f[P+1]>127;f[P+1]>127?v.gradeado++:f[P]>127&&v.arado++,f[P+2]>127&&v.abonado++,h[P+1]>0&&v.sembrado++,h[P]>127&&v.regado++,h[P+2]>127&&v.cosechado++,h[P+3]>127&&v.rodadas++,!B&&h[P+1]===0&&h[P+2]<=127&&v.rastrojo++}const y=Math.max(R,1);return w=Object.fromEntries(Object.entries(v).map(([F,P])=>[F,Math.round(P/y*1e3)/10])),w},libera(){j.removeFromParent(),D.dispose(),E.dispose();for(const v of Object.values(x))v.dispose()}};return G}const O=Math.PI,la=(a,e)=>{let t=Math.atan2(e,a);return t<0&&(t+=O),t>=O&&(t-=O),Math.round(t/O*255)&255};function da(a){const e=(a.labor_grados??0)*O/180;return[Math.sin(e),-Math.cos(e)]}const N={rastrojo(a,e,t,o){const r=1-o;for(let l=0;l<3;l++)a.laboreo[e+l]*=r,a.cultivo[t+l]*=r;a.cultivo[t+3]*=r,o>.5&&(a.cultivo[t+1]=0,a.agua[e>>2]=128)},arar(a,e,t,o,r){a.laboreo[e]=Math.max(a.laboreo[e],o*255),a.laboreo[e+1]*=1-o,a.laboreo[e+2]*=1-o*.7,a.cultivo[t+2]*=1-o,a.cultivo[t+3]*=1-o,o>.5&&(a.cultivo[t+1]=0,a.agua[e>>2]=128,a.laboreo[e+3]=r)},gradear(a,e,t,o,r){a.laboreo[e+1]=Math.max(a.laboreo[e+1],o*255),a.cultivo[t+2]*=1-o,a.cultivo[t+3]*=1-o*.6,o>.5&&(a.cultivo[t+1]=0,a.agua[e>>2]=128,a.laboreo[e+3]=r)},abonar(a,e,t,o){a.laboreo[e+2]=Math.max(a.laboreo[e+2],o*255)},sembrar(a,e,t,o,r,l){o>.5&&(a.cultivo[t+1]=l,a.cultivo[t+2]=0,a.agua[e>>2]=128,a.laboreo[e+3]=r)},regar(a,e,t,o){a.cultivo[t]=Math.max(a.cultivo[t],o*255)},cosechar(a,e,t,o,r){a.cultivo[t+2]=Math.max(a.cultivo[t+2],o*255),o>.5&&(a.cultivo[t+1]=0,a.agua[e>>2]=128,a.laboreo[e+3]=r)},rodar(a,e,t,o){a.cultivo[t+3]=Math.max(a.cultivo[t+3],o*255)},segar(a,e,t,o,r,l,i){const c=a.cultivo[t+1];if(!(!c||o<=.5)){if(i.maduro&&!i.maduro(a,e>>2,c)){i.verdes=(i.verdes??0)+1;return}i.alCortar?.(a,e>>2),a.cultivo[t+1]=0,a.cultivo[t+2]=255,a.agua[e>>2]=128,a.laboreo[e+3]=r}}};N.arrancar=N.segar;function na(a,e,t,o,r,l,i,c){const{mpp:s,ox:n,oz:p,ancho:M,alto:g,interior:u}=a,m=Math.min($.pincel.bordeSuaveM,i*.15),d=i/2,b=r-t,f=l-o,h=b*b+f*f;let L=c.direccion;if(L==null)if(h>1e-6)L=la(b,f);else{const[y,F]=da(a.info);L=la(y,F)}const x=d+m,S=Math.max(0,Math.floor((Math.min(t,r)-x-n)/s)),D=Math.min(M-1,Math.ceil((Math.max(t,r)+x-n)/s)),z=Math.max(0,Math.floor((Math.min(o,l)-x-p)/s)),A=Math.min(g-1,Math.ceil((Math.max(o,l)+x-p)/s));if(S>D||z>A)return 0;const E=N[e],j=c.extremosRectos&&h>1e-6,C=Math.sqrt(h),k=j?-(c.solape??.35)/C:-1/0,w=j?1+(c.solape??.35)/C:1/0,R=c.dia??1,G=c.fuerza??1;let v=0;for(let y=z;y<=A;y++){const F=p+(y+.5)*s;for(let P=S;P<=D;P++){const B=y*M+P;if(!u[B])continue;const Q=n+(P+.5)*s,I=h>1e-6?((Q-t)*b+(F-o)*f)/h:0;if(I<k||I>w)continue;const aa=j?I:Math.min(1,Math.max(0,I)),V=Math.hypot(Q-t-aa*b,F-o-aa*f);if(V>=x)continue;const fa=V<=d-m?1:(x-V)/(2*m);E(a,B*4,B*4,Math.min(1,fa)*G,L,R,c),v++}}return v&&a.marcaCambio(S,z,D,A),v}function qa(a,e,t,o,r,l,i,c={}){if(!N[e])throw new Error(`Labor desconocida: ${e}`);if(e!=="rodar")return na(a,e,t,o,r,l,i,c);const s=$.pincel;let n=r-t,p=l-o,M=Math.hypot(n,p);M<.001&&([n,p]=da(a.info),M=1);const g=-p/M,u=n/M,m=c.anchoRodada??s.anchoRodadaM,d=c.via??Math.min(s.viaRodadasM,Math.max(i-m,0));let b=0;for(const f of[-.5,.5])b+=na(a,e,t+g*d*f,o+u*d*f,r+g*d*f,l+u*d*f,m,c);return b}function Ba(a,e,t){const o=Math.floor((e-a.ox)/a.mpp),r=Math.floor((t-a.oz)/a.mpp);if(o<0||r<0||o>=a.ancho||r>=a.alto)return!1;const l=(r*a.ancho+o)*4;return a.laboreo[l]>127||a.laboreo[l+1]>127||a.cultivo[l+2]>127}function Oa(a,e,t){const o=Math.floor((e-a.ox)/a.mpp),r=Math.floor((t-a.oz)/a.mpp);if(o<0||r<0||o>=a.ancho||r>=a.alto||!a.interior[r*a.ancho+o])return null;const l=(r*a.ancho+o)*4;return{preparada:a.laboreo[l]>127||a.laboreo[l+1]>127,abonada:a.laboreo[l+2]>127,sembrada:a.cultivo[l+1]>0}}function Ia(a){a.laboreo.fill(0),a.cultivo.fill(0),a.agua.fill(128),a.marcaCambio(0,0,a.ancho-1,a.alto-1)}export{ua as C,za as G,Ha as M,ka as a,Ua as b,wa as c,da as d,Ba as e,Ga as f,Oa as g,Ea as h,$a as i,Ra as j,Ta as k,Ia as l,Pa as m,qa as p,X as u,_a as v};
