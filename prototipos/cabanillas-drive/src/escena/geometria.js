// Utilidades de geometría compartidas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// meshopt guarda posiciones cuantizadas (enteros normalizados) y la escala en el nodo: copia
// en coma flotante con la matriz aplicada (y así se pueden unir geometrías de distinto origen)
export function geometriaFlotante(geometria, matriz, atributos = null) {
  const g = new THREE.BufferGeometry();
  for (const [nombre, attr] of Object.entries(geometria.attributes)) {
    if (atributos && !atributos.includes(nombre)) continue;
    const datos = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) {
      for (let k = 0; k < attr.itemSize; k++) datos[i * attr.itemSize + k] = attr.getComponent(i, k);
    }
    g.setAttribute(nombre, new THREE.BufferAttribute(datos, attr.itemSize));
  }
  if (geometria.index) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(geometria.index.array), 1));
  if (matriz) g.applyMatrix4(matriz);
  g.computeBoundingSphere();
  return g;
}

// Une las mallas hijas directas de «grupo» que comparten material (una llamada de dibujo por
// material en vez de una por pieza). Solo une las que tienen los mismos atributos. Usa la
// matriz que ya tenga cada malla (no la recalcula desde posición/rotación).
export function unePorMaterial(grupo) {
  const porMaterial = new Map();
  for (const hijo of [...grupo.children]) {
    if (!hijo.isMesh || hijo.isInstancedMesh || hijo.children.length) continue;
    const clave = `${hijo.material.uuid}|${Object.keys(hijo.geometry.attributes).sort().join(',')}`;
    if (!porMaterial.has(clave)) porMaterial.set(clave, []);
    porMaterial.get(clave).push(hijo);
  }
  let unidas = 0;
  for (const mallas of porMaterial.values()) {
    if (mallas.length < 2) continue;
    const geometrias = mallas.map((m) => geometriaFlotante(m.geometry, m.matrix));
    const unida = mergeGeometries(geometrias, false);
    if (!unida) continue;
    const malla = new THREE.Mesh(unida, mallas[0].material);
    malla.name = `${mallas[0].name}_unida`;
    malla.matrixAutoUpdate = false;
    grupo.add(malla);
    for (const m of mallas) grupo.remove(m);
    unidas += mallas.length;
  }
  return unidas;
}

// Más agresivo (móvil): une las piezas por TIPO de material —pintura, cristal, metal y mate—
// pasando el color de cada material a los vértices. Solo para mallas sin texturas (las del
// coche del jugador): de ~36 llamadas de dibujo a ~8. Los brillos de cada pieza se igualan.
export function uneCochePorClase(grupo) {
  const clases = new Map();
  for (const hijo of [...grupo.children]) {
    if (!hijo.isMesh || hijo.isInstancedMesh || hijo.children.length) continue;
    const m = hijo.material;
    if (m.map || m.name === 'pintura') continue;           // la pintura se tiñe aparte
    const cristal = m.transparent || m.opacity < 1 || /cristal|glass/i.test(m.name);
    const clase = cristal ? `cristal|${m.uuid}` : ((m.metalness ?? 0) >= 0.5 ? 'metal' : 'mate');
    if (!clases.has(clase)) clases.set(clase, []);
    clases.get(clase).push(hijo);
  }
  const color = new THREE.Color();
  for (const [clase, mallas] of clases) {
    if (mallas.length < 2) continue;
    const esCristal = clase.startsWith('cristal');
    const geometrias = mallas.map((malla) => {
      const geo = geometriaFlotante(malla.geometry, malla.matrix, ['position', 'normal']);
      if (!esCristal) {
        const m = malla.material;
        color.copy(m.color);
        if (m.emissive) color.add(m.emissive.clone().multiplyScalar(m.emissiveIntensity ?? 1));
        const n = geo.attributes.position.count;
        const colores = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) colores.set([Math.min(color.r, 1), Math.min(color.g, 1), Math.min(color.b, 1)], i * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
      }
      return geo;
    });
    const unida = mergeGeometries(geometrias, false);
    if (!unida) continue;
    const rugosidad = mallas.reduce((s, x) => s + (x.material.roughness ?? 0.5), 0) / mallas.length;
    const material = esCristal ? mallas[0].material : new THREE.MeshStandardMaterial({
      vertexColors: true, metalness: clase === 'metal' ? 1 : 0, roughness: rugosidad, name: `coche_${clase}`,
    });
    const malla = new THREE.Mesh(unida, material);
    malla.name = `${grupo.name || 'pieza'}_${clase.split('|')[0]}_unida`;
    malla.matrixAutoUpdate = false;
    grupo.add(malla);
    for (const x of mallas) grupo.remove(x);
  }
  return unePorMaterial(grupo);   // y lo que quede (pintura, cristales iguales) por material
}
