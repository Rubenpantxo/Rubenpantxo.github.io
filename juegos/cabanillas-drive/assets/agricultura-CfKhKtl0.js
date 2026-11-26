import{k as g,T as x,af as M,aC as m,L as _,A as j,V as E,aD as L,a as C}from"./librerias-BYlJDhEZ.js";const h={alto:{pixelRatioMax:1.5,sombras:!0,mapaSombras:4096,radioSombras:110,ao:!0,aoMediaResolucion:!1,distanciaArbolesDetalle:110,radioHierba:70,detalleSuelo:!0,lucesFarolas:8,distanciaCochesDetalle:70,distanciaCochesLejos:180,distanciaCochesMax:900,distanciaEdificiosDetalle:700,sombrasEdificios:!0,unirMaterialesCoche:!1,terreno:"assets/cabanillas.glb",atlasTejados:"assets/tejados.jpg",cielo:{anchoFondo:4096,anchoReflejos:2048},niebla:null,camaraLejos:6e3,descargaEstimadaMB:22,resolucionDinamica:{objetivoFps:45,minimo:.75}},medio:{pixelRatioMax:1.25,sombras:!0,mapaSombras:2048,radioSombras:80,ao:!0,aoMediaResolucion:!0,distanciaArbolesDetalle:90,radioHierba:55,detalleSuelo:!0,lucesFarolas:4,distanciaCochesDetalle:55,distanciaCochesLejos:120,distanciaCochesMax:600,distanciaEdificiosDetalle:400,sombrasEdificios:!0,unirMaterialesCoche:!1,terreno:"assets/cabanillas.glb",atlasTejados:"assets/tejados.jpg",cielo:{anchoFondo:4096,anchoReflejos:1024},niebla:null,camaraLejos:6e3,descargaEstimadaMB:22,resolucionDinamica:{objetivoFps:35,minimo:.7}},bajo:{pixelRatioMax:1,sombras:!0,mapaSombras:1024,radioSombras:50,ao:!1,aoMediaResolucion:!0,distanciaArbolesDetalle:55,radioHierba:30,detalleSuelo:!1,lucesFarolas:0,distanciaCochesDetalle:40,distanciaCochesLejos:0,distanciaCochesMax:350,distanciaEdificiosDetalle:160,sombrasEdificios:!1,unirMaterialesCoche:!0,terreno:"assets/cabanillas_bajo.glb",atlasTejados:"assets/tejados_bajo.jpg",cielo:{anchoFondo:1024,anchoReflejos:512},texturaMax:512,niebla:{cerca:450,lejos:1300},camaraLejos:1400,descargaEstimadaMB:13,resolucionDinamica:{objetivoFps:30,minimo:.6}}};function A(){const o=new URLSearchParams(location.search).get("calidad");return o in h?o:matchMedia("(pointer: coarse)").matches&&Math.min(screen.width,screen.height)<820?"bajo":"alto"}const f=A(),F={nivel:f,...h[f],antialias:!0,radioColisiones:45,camaraCerca:.5},D=.55,p=[.035,.12],b={calzada:.44,acera:.95},z=3,O=[86,85,82],R=[178,173,160],d={emisivo:{value:new g(1,1,1)},factor:{value:1},difuso:{value:0}};async function P(o,t){const a=await fetch(`${o}suelo.json`).then(c=>c.ok?c.json():null);if(!a)return null;const i=new x,[e,l,r,s,u]=await Promise.all(["tipos","direccion","asfalto","baldosa","tierra"].map(c=>i.loadAsync(`${o}${c}.png`))),S=t.capabilities.getMaxAnisotropy();for(const c of[r,s,u])c.wrapS=c.wrapT=M,c.anisotropy=S;l.magFilter=m,l.minFilter=m,l.generateMipmaps=!1;const n=await i.loadAsync(`${o}bordillo.png`).catch(()=>null);return n&&(n.generateMipmaps=!1,n.minFilter=_),{meta:a,tipos:e,direccion:l,asfalto:r,baldosa:s,tierra:u,bordillo:n}}function v(o,t){return new g().setRGB(o[0]/255,o[1]/255,o[2]/255,C).multiplyScalar(t)}const T=`
varying vec3 vMundo;
uniform sampler2D uTipos, uDireccion, uAsfalto, uBaldosa, uTierra, uBordillo;
uniform vec4 uZona;
uniform vec3 uMetros;
uniform vec3 uColAsfalto, uColAcera;
vec3 sueloProc = vec3(0.0);
float pesoProc = 0.0;

float azarS(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoS(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarS(i), azarS(i + vec2(1, 0)), f.x), mix(azarS(i + vec2(0, 1)), azarS(i + vec2(1, 1)), f.x), f.y);
}
float fbmS(vec2 p) { return 0.5 * ruidoS(p) + 0.3 * ruidoS(p * 2.07 + 5.3) + 0.2 * ruidoS(p * 4.13 + 1.7); }
// Distancia al borde de la celda de Voronoi (grietas)
float bordeVoronoi(vec2 q) {
  vec2 i = floor(q); vec2 f = fract(q);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(azarS(i + g), azarS(i + g + 3.1));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return d2 - d1;
}

void calculaSuelo(vec3 foto) {
  vec2 uvT = vec2((vMundo.x - uZona.x) / uZona.z, (vMundo.z - uZona.y) / uZona.w);
  uvT.y = 1.0 - uvT.y;
  vec2 p = vMundo.xz;
  float da = max(length(fwidth(p)), 1e-4);                   // metros por píxel (antes de ramas)
  vec3 tipo = texture2D(uTipos, uvT).rgb;
  float suma = tipo.r + tipo.g + tipo.b;
  pesoProc = smoothstep(0.15, 0.6, suma);
  if (pesoProc <= 0.0) return;
  tipo /= max(suma, 1e-3);
  // Bordillo nítido: donde hay acera, asfalto y cemento se reparten por la distancia exacta al
  // borde de la calzada (bordillo.png) en vez de por tipos.png, que es borroso (0,5 m/px)
  float dBordillo = 9.0;
#ifdef CON_BORDILLO
  dBordillo = (texture2D(uBordillo, uvT).r * 255.0 - 128.0) / 127.0 * ${z.toFixed(1)};
  float conAcera = smoothstep(0.0, 0.04, tipo.g);
  float enCalzada = smoothstep(-0.6 * da, 0.6 * da, dBordillo);
  float rg = tipo.r + tipo.g;
  tipo.r = mix(tipo.r, rg * enCalzada, conAcera);
  tipo.g = mix(tipo.g, rg * (1.0 - enCalzada), conAcera);
  dBordillo = mix(9.0, dBordillo, conAcera);
#endif
  vec3 dir = texture2D(uDireccion, uvT).rgb;
  float th = 0.5 * atan(dir.g * 2.0 - 1.0, dir.r * 2.0 - 1.0);
  vec2 eje = vec2(cos(th), sin(th));
  vec2 lado = vec2(-eje.y, eje.x);
  float dEje = dir.b * 25.5;
  float s = dot(p, eje);                                     // metros a lo largo de la vía

  // --- Asfalto
  float arido = texture2D(uAsfalto, p / uMetros.x).r * 2.0;
  arido = mix(arido, texture2D(uAsfalto, p / (uMetros.x * 0.37) + 0.31).r * 2.0, 0.4);
  vec3 asf = uColAsfalto * max(1.0 + (arido - 1.0) * 1.8, 0.2);
  asf *= 0.92 + 0.16 * fbmS(p * 1.7);                        // textura a media distancia
  asf *= 0.85 + 0.3 * fbmS(p * 0.09);                        // parches y reasfaltados
  float parche = smoothstep(0.62, 0.66, fbmS(p * 0.05 + 11.0));
  asf *= 1.0 - 0.12 * parche;                                // parche más nuevo, más negro
  float rodada = smoothstep(0.5, 1.0, dEje) * (1.0 - smoothstep(2.2, 2.9, dEje));
  asf *= 1.0 - 0.07 * rodada;                                // pulido de las ruedas
  float bordeCalzada = dBordillo < 8.0 ? 1.0 - smoothstep(0.05, 0.7, dBordillo)   // junto al bordillo
                                       : 1.0 - smoothstep(0.55, 0.95, tipo.r + tipo.b);
  asf = mix(asf, asf * vec3(1.05, 1.0, 0.9) * 1.15, bordeCalzada * 0.6);  // polvo y arena
  // Grietas selladas con betún: pocas, finas (1 cm) y solo de cerca (a media distancia la
  // línea ocuparía el píxel entero y daría una red negra)
  float grieta = 1.0 - smoothstep(0.004, 0.014, bordeVoronoi(p / 3.2) * 3.2);   // metros al borde
  grieta *= smoothstep(0.72, 0.82, ruidoS(p * 0.12 + 4.0)) * (1.0 - smoothstep(0.006, 0.02, da));
  asf = mix(asf, uColAsfalto * 0.5, grieta * 0.6);

  // --- Cemento de la acera
  float grano = texture2D(uAsfalto, p / (uMetros.x * 1.7) + 0.7).r * 2.0;
  vec3 cem = uColAcera * (1.0 + (grano - 1.0) * 0.6);
  cem *= 0.9 + 0.18 * fbmS(p * 0.6 + 2.0);                   // manchas de fraguado
  cem *= 0.95 + 0.1 * fbmS(p * 3.0);
  cem *= 1.0 - 0.025 * ruidoS(vec2(dot(p, lado) * 40.0, s * 1.5));   // fratasado a lo ancho
  cem *= 1.0 - 0.18 * smoothstep(0.7, 0.85, fbmS(p * 0.35 + 7.0)) * ruidoS(p * 2.0);  // manchas
  float junta = 1.0 - smoothstep(0.01, 0.02 + da, abs(fract(s / 1.5 + 0.5) - 0.5) * 1.5);
  cem *= 1.0 - 0.5 * junta * (1.0 - smoothstep(0.03, 0.08, da));

  // --- Camino de tierra: color de la foto suavizado, grano, guijarros, rodadas y hierba
  // La bruma del vuelo lava la tierra: algo más cálida y saturada que la foto
  float luzB = dot(foto, vec3(0.2126, 0.7152, 0.0722));
  vec3 base = max(mix(vec3(luzB), foto, 1.35) * vec3(1.03, 0.98, 0.88), 0.0);
  float suelto = texture2D(uTierra, p / uMetros.z).r * 2.0;
  vec3 tie = base * max(1.0 + (suelto - 1.0) * 1.3, 0.2);
  tie *= 0.88 + 0.24 * fbmS(p * 0.4 + 9.0);
  float guijarro = smoothstep(0.84, 0.9, azarS(floor(p * 9.0))) * (1.0 - smoothstep(0.02, 0.05, da));
  tie = mix(tie, base * mix(0.7, 1.35, azarS(floor(p * 9.0) + 1.3)), guijarro * 0.7);
  float surco = smoothstep(0.4, 0.6, dEje) * (1.0 - smoothstep(0.95, 1.2, dEje));
  tie *= 1.0 - 0.22 * surco * (0.7 + 0.3 * ruidoS(vec2(s * 0.5, 1.0)));   // rodadas compactadas
  tie = mix(tie, tie * 1.12, (1.0 - smoothstep(0.0, 0.45, dEje)) * (1.0 - smoothstep(1.2, 1.5, dEje)));
  float hierba = (1.0 - smoothstep(0.15, 0.35, dEje)) * smoothstep(0.35, 0.65, fbmS(p * 1.3));
  hierba *= smoothstep(0.4, 0.7, ruidoS(vec2(s * 0.08, 3.0)));
  tie = mix(tie, vec3(0.16, 0.18, 0.08) * (0.8 + 0.4 * ruidoS(p * 7.0)), hierba * 0.55);
  float borde = 1.0 - smoothstep(1.3, 1.9, dEje);           // fuera de la caja del camino, hierba seca
  tie = mix(base * (0.95 + 0.1 * fbmS(p * 0.8)), tie, borde);

  sueloProc = asf * tipo.r + cem * tipo.g + tie * tipo.b;
}
`;function y(o,t,a=null){const i=new j({color:16777215,map:o,emissive:16777215,emissiveMap:o,name:t});return i.userData.esSuelo=!0,i.onBeforeCompile=e=>{Object.assign(e.uniforms,{uEmisivo:d.emisivo,uFactorLuz:d.factor,uDifuso:d.difuso}),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
        uniform vec3 uEmisivo;
        uniform float uFactorLuz, uDifuso;`).replace("#include <map_fragment>",`#include <map_fragment>
        DETALLE_SUELO_COLOR
        diffuseColor.rgb *= uDifuso;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        DETALLE_SUELO_EMISIVO
        totalEmissiveRadiance *= uEmisivo;`);let l="0.0";if(a){const{meta:r}=a,s=r.colores_srgb??{};Object.assign(e.uniforms,{uTipos:{value:a.tipos},uDireccion:{value:a.direccion},uAsfalto:{value:a.asfalto},uBaldosa:{value:a.baldosa},uTierra:{value:a.tierra},uBordillo:{value:a.bordillo},uZona:{value:new L(r.x0,r.z0,r.columnas*r.paso_m,r.filas*r.paso_m)},uMetros:{value:new E(r.metros_textura.asfalto,r.metros_textura.baldosa,r.metros_textura.tierra)},uColAsfalto:{value:v(s.calzada?s.calzada:O,s.calzada?b.calzada:1)},uColAcera:{value:v(s.acera?s.acera:R,s.acera?b.acera:1)}}),e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
          varying vec3 vMundo;`).replace("#include <project_vertex>",`#include <project_vertex>
          vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
          ${a.bordillo?"#define CON_BORDILLO":""}
          ${T}`).replace("DETALLE_SUELO_COLOR",`calculaSuelo(texture(map, vMapUv, 5.0).rgb);
          diffuseColor.rgb = mix(diffuseColor.rgb, sueloProc, pesoProc);`).replace("DETALLE_SUELO_EMISIVO","totalEmissiveRadiance = mix(totalEmissiveRadiance, sueloProc, pesoProc);"),l="pesoProc"}else e.fragmentShader=e.fragmentShader.replace("DETALLE_SUELO_COLOR","").replace("DETALLE_SUELO_EMISIVO","");e.fragmentShader=e.fragmentShader.replace("#include <shadowmap_pars_fragment>",`#include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>`).replace("#include <opaque_fragment>",`
        {
          float luzFoto = dot(totalEmissiveRadiance, vec3(0.2126, 0.7152, 0.0722)) / max(uFactorLuz, 0.02);
          float soleado = mix(smoothstep(${p[0]}, ${p[1]}, luzFoto), 1.0, ${l});
          float sombra = 1.0 - getShadowMask();
          outgoingLight *= 1.0 - ${D.toFixed(3)} * min(uFactorLuz, 1.0) * sombra * soleado;
        }
        #include <opaque_fragment>`)},i.customProgramCacheKey=()=>a?`suelo_procedural_v3${a.bordillo?"_bordillo":""}`:"suelo_ortofoto_dia",i}function w(o,t){if(t)for(const a of o){const i=a.material;a.material=y(i.emissiveMap,i.name,t),i.dispose()}}const U={rutaParcelas:"assets/agricultura/parcelas.json",parcelaPruebas:"2-700",cope:{sitioTractor:[-306,-10,180],sitiosTractores:{tractor:[-306,-10,180],tractor_fendt_516:[-314,-10,180],tractor_jd_6r250:[-322,-10,180],tractor_nh_t7_300:[-330,-10,180],tractor_case_magnum_400:[-338,-10,180]},sitioCoche:[-291,-4,180],sitiosAperos:{arado:[-299,-11,180],cultivador:[-313,-6,180],abonadora:[-292,-11,180],sembradora:[-313,3,180],remolque:[-333,-12,90],arrancadora:[-299,3,180],plantadora:[-292,3,180]},sitioCosechadora:[-357,-8,180],sitiosCosechadoras:{cosechadora:[-357,-8,180],cosechadora_nh_cx790:[-371,-8,180],cosechadora_claas_lexion7700:[-387,-8,180]}},reloj:{segundosPorDia:3600,diaInicial:1,pasarDias:[1,7,30]},labranza:{velocidadMinKmh:1,refrescoHierbaS:1,recuentoS:.5,rodadas:.55,rodadasApero:.35},riego:{ruta:"assets/agricultura/riego.json",radioTajaderaM:9,maxPasosPorFotograma:16,refrescoHumedadS:.3,refrescoLaminaS:.06,acequia:{anchoM:.5,paredM:.08,altoM:.42,laminaM:.3,pasoM:1},barro:{agarre:.35,frenoN:2600,rodadas:.8}},mascara:{metrosPorPixel:{alto:.5,medio:.5,bajo:.5},ladoMax:{alto:1024,medio:1024,bajo:512},margenM:1.5},malla:{pasoM:1,pasoGrandeM:2,pasoGrandeDesdeM:400,alturaSobreSueloM:.03},fundidoLindeM:.8,subidasPorSegundo:10,pincel:{anchoInicialM:3,anchoMinM:.5,anchoMaxM:12,bordeSuaveM:.2,anchoRodadaM:.5,viaRodadasM:1.8,camara:{distanciaMinM:3,distanciaMaxM:400}}},I=[{id:"rastrojo",icono:"🌾",nombre:"Rastrojo"},{id:"arar",icono:"🟫",nombre:"Arar"},{id:"gradear",icono:"〰️",nombre:"Gradear"},{id:"abonar",icono:"⚪",nombre:"Abonar"},{id:"sembrar",icono:"🌱",nombre:"Sembrar"},{id:"regar",icono:"💧",nombre:"Regar"},{id:"cosechar",icono:"✂️",nombre:"Cosechar"},{id:"rodar",icono:"🛞",nombre:"Rodadas"}];function $(){return!0}export{U as A,F as C,d as L,$ as a,w as b,P as c,I as d,y as m};
