// Reduce las texturas de un modelo cargado a como mucho «maximo» px de lado (en un lienzo),
// antes de que se suban a la gráfica. En el móvil ahorra memoria de vídeo: una textura de
// 1024² con mipmaps ocupa ~5,6 MB y a 512² ~1,4 MB, y desde la cámara apenas se nota.
const CANALES = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'];

export function limitaTexturas(raiz, maximo) {
  if (!maximo) return;
  const hechas = new Set();
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const canal of CANALES) {
        const textura = material[canal];
        if (!textura || hechas.has(textura)) continue;
        hechas.add(textura);
        const imagen = textura.image;
        const lado = Math.max(imagen?.width ?? 0, imagen?.height ?? 0);
        if (lado <= maximo) continue;
        const f = maximo / lado;
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(imagen.width * f));
        lienzo.height = Math.max(1, Math.round(imagen.height * f));
        lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        imagen.close?.();                  // ImageBitmap: libera la copia a tamaño completo
        textura.image = lienzo;
        textura.needsUpdate = true;
      }
    }
  });
}
