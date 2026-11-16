// Marcador mínimo del modo fiestas (F2): barra de energía y aviso del refugio al alcance. El
// marcador completo (puntos, tiempo, pases, vida y panel de la vaquilla) llega en la F4.
export function creaHudFiestas() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  const raiz = document.createElement('div');
  raiz.id = 'hud-fiestas';
  raiz.style.cssText = 'position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);'
    + 'z-index:5;display:grid;gap:6px;justify-items:center;pointer-events:none;font:600 13px system-ui,sans-serif;color:#fff;'
    + 'text-shadow:0 1px 3px rgba(0,0,0,.8)';
  const pista = document.createElement('div');
  pista.style.cssText = 'padding:4px 10px;border-radius:8px;background:rgba(16,22,30,.78);min-height:1em';
  const caja = document.createElement('div');
  caja.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:10px;background:rgba(16,22,30,.78)';
  const rotulo = document.createElement('span');
  rotulo.textContent = 'Energía';
  const barra = document.createElement('div');
  barra.style.cssText = 'width:min(34vw,180px);height:9px;border-radius:5px;background:rgba(255,255,255,.2);overflow:hidden';
  const relleno = document.createElement('div');
  relleno.style.cssText = 'height:100%;width:100%;background:#ffd54a;border-radius:5px';
  barra.append(relleno);
  caja.append(rotulo, barra);
  raiz.append(pista, caja);
  document.body.append(raiz);
  const botonRefugio = document.querySelector('[data-pulsar="refugio"]');
  let textoPista = null;

  return {
    actualiza({ energia, agotado, pista: p }) {
      relleno.style.width = `${Math.round(energia * 100)}%`;
      relleno.style.background = agotado ? '#e2553f' : energia < 0.3 ? '#f0a23a' : '#ffd54a';
      const texto = p ? (tactil ? '' : `F: ${p.texto}`) : '';
      if (texto !== textoPista) {
        textoPista = texto;
        pista.textContent = texto;
        pista.style.visibility = texto ? 'visible' : 'hidden';
      }
      if (botonRefugio) {
        botonRefugio.hidden = !p;
        botonRefugio.textContent = p?.bajar ? 'Bajar' : 'Subir';
        botonRefugio.classList.toggle('listo', Boolean(p));
      }
    },
    mostrar(visible) { raiz.style.display = visible ? 'grid' : 'none'; },
    quita() {
      raiz.remove();
      if (botonRefugio) botonRefugio.hidden = true;
    },
  };
}
