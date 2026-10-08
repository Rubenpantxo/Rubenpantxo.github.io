/* Cabanillas · modo 3D
   Añade un botón "3D" al plano y monta una escena WebGL sobre los mismos datos:
   - terreno, curvas de nivel, vías, caminos, agua, zonas verdes y arbolado -> cabanillas-3d-data.js
   - edificios extruidos con la altura real del Catastro -> cabanillas-data.js
   Se carga todo de forma perezosa: hasta que no se pulsa "3D" no se descarga three.js ni los datos. */
(() => {
    'use strict';

    const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    const UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/BufferGeometryUtils.js';
    const DATA_URL = 'cabanillas-3d-data.js';

    const COL = {
        cielo: 0xd9e3ea, terreno: 0xd8d2c4, casa: 0xf2ece1, tejado: 0xc8663f,
        industrial: 0xd9d9d6, agua: 0x4a90c4, verde: 0x86ab6a, arbol: 0x4f8f3c,
        viaMayor: 0x5a5347, viaMenor: 0x8a8274, camino: 0xa08658, curva: 0x9a9384
    };

    // ---------- interfaz ----------
    const css = document.createElement('style');
    css.textContent = `
    #btn3d{width:38px;height:38px;border-radius:9px;border:none;background:rgba(255,255,255,.94);
      box-shadow:0 2px 10px rgba(0,0,0,.14);font:700 13px/1 system-ui,sans-serif;color:#2d2418;cursor:pointer}
    #btn3d.on{background:#2d2418;color:#f7f3ec}
    #capas3d{position:fixed;left:12px;bottom:58px;z-index:30;display:none;max-width:44vw;
      background:rgba(255,255,255,.93);backdrop-filter:blur(8px);border-radius:12px;padding:10px 12px;
      box-shadow:0 2px 14px rgba(0,0,0,.14);font:12px/1.5 system-ui,sans-serif;color:#2d2418}
    #capas3d b{display:block;font-size:11px;letter-spacing:.06em;color:#6b6253;margin-bottom:5px}
    #capas3d label{display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
    #capas3d input{accent-color:#6b8f3d;margin:0}
    #lienzo3d{position:fixed;inset:0;z-index:5;display:none;touch-action:none;background:#d9e3ea}
    #aviso3d{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:40;display:none;
      background:rgba(255,255,255,.95);padding:14px 18px;border-radius:12px;font:13px system-ui,sans-serif;
      color:#2d2418;box-shadow:0 2px 14px rgba(0,0,0,.18)}
    @media (max-width:640px){#capas3d{max-width:58vw;bottom:64px}}`;
    document.head.appendChild(css);

    const canvas3d = document.createElement('canvas'); canvas3d.id = 'lienzo3d';
    document.body.appendChild(canvas3d);
    const panel = document.createElement('div'); panel.id = 'capas3d'; panel.innerHTML = '<b>CAPAS</b>';
    document.body.appendChild(panel);
    const aviso = document.createElement('div'); aviso.id = 'aviso3d';
    document.body.appendChild(aviso);

    const btn = document.createElement('button');
    btn.id = 'btn3d'; btn.textContent = '3D'; btn.title = 'Vista 3D del término';
    const zoomBtns = document.querySelector('.zoom-btns');
    (zoomBtns || document.querySelector('.controls')).appendChild(btn);

    const msg = t => { aviso.textContent = t; aviso.style.display = t ? 'block' : 'none'; };
    const carga = src => new Promise((ok, err) => {
        const s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = () => err(new Error('No se pudo cargar ' + src));
        document.head.appendChild(s);
    });

    let activo = false, listo = false, cargando = false, escena = null;

    btn.onclick = async () => {
        if (cargando) return;
        if (!listo) {
            cargando = true; msg('Cargando el relieve y los 11.803 árboles…');
            try {
                await carga(THREE_URL);
                await Promise.all([carga(ORBIT_URL), carga(UTILS_URL), carga(DATA_URL)]);
                escena = construir();
                listo = true; msg('');
            } catch (e) {
                console.error(e); msg('No se pudo cargar la vista 3D: ' + e.message);
                setTimeout(() => msg(''), 3500); cargando = false; return;
            }
            cargando = false;
        }
        activo = !activo;
        btn.classList.toggle('on', activo);
        canvas3d.style.display = activo ? 'block' : 'none';
        panel.style.display = activo ? 'block' : 'none';
        const mapa = document.getElementById('mapa');
        if (mapa) mapa.style.visibility = activo ? 'hidden' : 'visible';
        document.querySelectorAll('.scalebar,.compass,#layer-switch,.info-pop')
            .forEach(el => el.style.display = activo ? 'none' : '');
        if (activo) { escena.resize(); escena.animar(); } else { escena.parar(); }
    };

    // ---------- construcción de la escena ----------
    function construir() {
        const D = window.CABANILLAS_DATA, T = window.CABANILLAS_3D;
        const dec = b64 => {
            const bin = atob(b64), u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            return new Int16Array(u8.buffer);
        };

        // --- muestreo del terreno (rejilla regular, altitudes en decímetros) ---
        const G = T.grid, GZ = dec(G.z);
        function alt(x, y) {
            const fi = (x - G.x0) / G.sx, fj = (y - G.y0) / G.sy;
            const i = Math.max(0, Math.min(G.nx - 2, Math.floor(fi)));
            const j = Math.max(0, Math.min(G.ny - 2, Math.floor(fj)));
            const tx = Math.max(0, Math.min(1, fi - i)), ty = Math.max(0, Math.min(1, fj - j));
            const a = GZ[j * G.nx + i], b = GZ[j * G.nx + i + 1];
            const c = GZ[(j + 1) * G.nx + i], d = GZ[(j + 1) * G.nx + i + 1];
            return ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty) / 10;
        }

        const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(COL.cielo);
        scene.fog = new THREE.Fog(COL.cielo, 1800, 4200);
        const cam = new THREE.PerspectiveCamera(48, 1, 1, 12000);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8574, .85));
        const sol = new THREE.DirectionalLight(0xfff4e2, .55);
        sol.position.set(-600, 900, 400); scene.add(sol);

        const capas = {};
        const añadir = (nombre, obj, visible = true) => { obj.visible = visible; scene.add(obj); capas[nombre] = obj; };

        // --- terreno ---
        {
            const pos = new Float32Array(G.nx * G.ny * 3), idx = [];
            for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
                const k = (j * G.nx + i) * 3;
                pos[k] = G.x0 + i * G.sx; pos[k + 1] = GZ[j * G.nx + i] / 10; pos[k + 2] = G.y0 + j * G.sy;
            }
            for (let j = 0; j < G.ny - 1; j++) for (let i = 0; i < G.nx - 1; i++) {
                const a = j * G.nx + i, b = a + 1, c = a + G.nx, d = c + 1;
                idx.push(a, c, b, b, c, d);
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            g.setIndex(idx); g.computeVertexNormals();
            añadir('Terreno', new THREE.Mesh(g, new THREE.MeshLambertMaterial({
                color: COL.terreno, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2
            })));
        }

        // --- líneas drapeadas sobre el terreno ---
        function polilineas(capa) {
            const d = dec(T.lines[capa].d), ns = T.lines[capa].n, out = [];
            let k = 0;
            for (const n of ns) {
                const pts = new Array(n);
                for (let i = 0; i < n; i++, k += 2) pts[i] = [d[k] / 10, d[k + 1] / 10];
                out.push(pts);
            }
            return out;
        }
        function lineas(nombre, capa, color, alto, opacidad, visible) {
            const v = [];
            for (const pts of polilineas(capa)) for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                v.push(a[0], alt(a[0], a[1]) + alto, a[1], b[0], alt(b[0], b[1]) + alto, b[1]);
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
            añadir(nombre, new THREE.LineSegments(g, new THREE.LineBasicMaterial({
                color, transparent: opacidad < 1, opacity: opacidad
            })), visible);
        }

        // --- zonas verdes: polígonos rellenos ---
        {
            const pos = [];
            for (const pts of polilineas('green')) {
                if (pts.length < 4) continue;
                const cont = pts.map(p => new THREE.Vector2(p[0], p[1]));
                if (cont[0].equals(cont[cont.length - 1])) cont.pop();
                if (cont.length < 3) continue;
                let tris; try { tris = THREE.ShapeUtils.triangulateShape(cont, []); } catch (e) { continue; }
                for (const t of tris) for (const i of t) {
                    const p = cont[i]; pos.push(p.x, alt(p.x, p.y) + 0.25, p.y);
                }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
            g.computeVertexNormals();
            añadir('Zonas verdes', new THREE.Mesh(g, new THREE.MeshLambertMaterial({
                color: COL.verde, transparent: true, opacity: .75, side: THREE.DoubleSide,
                polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
            })));
        }

        lineas('Vías principales', 'roads_major', COL.viaMayor, 0.9, 1, true);
        lineas('Vías secundarias', 'roads_minor', COL.viaMenor, 0.8, .95, true);
        lineas('Caminos', 'paths', COL.camino, 0.7, .85, true);
        lineas('Agua', 'water', COL.agua, 0.5, 1, true);
        lineas('Curvas de nivel', 'contours', COL.curva, 0.35, .5, false);

        // --- edificios del Catastro ---
        {
            const grupos = { casa: [], ind: [] };
            for (const b of D.buildings) {
                const pts = b.p.slice();
                if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
                if (pts.length < 3) continue;
                const forma = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
                let cx = 0, cy = 0;
                for (const p of pts) { cx += p[0]; cy += p[1]; }
                const base = alt(cx / pts.length, cy / pts.length);
                const h = (b.h || 4);
                let g;
                try { g = new THREE.ExtrudeGeometry(forma, { depth: h + 4, bevelEnabled: false, curveSegments: 1 }); }
                catch (e) { continue; }
                g.deleteAttribute('uv');
                g.rotateX(Math.PI / 2);                 // plano XY -> XZ, altura en +Y
                g.translate(0, base + h, 0);
                (b.t === 'industrial' || b.t === 'farm_auxiliary' ? grupos.ind : grupos.casa).push(g);
            }
            const fusiona = (arr, color) => {
                const g = THREE.BufferGeometryUtils.mergeBufferGeometries(arr);
                g.computeVertexNormals();
                return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
            };
            const grupo = new THREE.Group();
            if (grupos.casa.length) grupo.add(fusiona(grupos.casa, COL.casa));
            if (grupos.ind.length) grupo.add(fusiona(grupos.ind, COL.industrial));
            añadir('Edificios (' + D.buildings.length + ')', grupo);
        }

        // --- arbolado ---
        {
            const t = dec(T.trees), n = t.length / 2;
            const copa = new THREE.IcosahedronGeometry(2.3, 0); copa.scale(1, 1.25, 1); copa.translate(0, 4.5, 0);
            const tronco = new THREE.CylinderGeometry(.22, .34, 2.8, 5); tronco.translate(0, 1.4, 0);
            // ambas sin índices: mergeBufferGeometries no mezcla indexadas con no indexadas
            const g = THREE.BufferGeometryUtils.mergeBufferGeometries(
                [copa.toNonIndexed(), tronco.toNonIndexed()]);
            const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: COL.arbol }), n);
            const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
            for (let i = 0; i < n; i++) {
                const x = t[i * 2] / 10, y = t[i * 2 + 1] / 10;
                const r = (Math.sin(i * 12.9898) * 43758.5453) % 1;
                const e = .75 + Math.abs(r) * .7;
                p.set(x, alt(x, y), y); s.set(e, e * (.85 + Math.abs(r) * .4), e);
                q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6.28);
                im.setMatrixAt(i, m.compose(p, q, s));
            }
            añadir('Árboles (' + n.toLocaleString('es-ES') + ')', im);
        }

        // --- controles: girar arrastrando, zoom con pellizco ---
        const ctl = new THREE.OrbitControls(cam, canvas3d);
        ctl.enableDamping = true; ctl.dampingFactor = .08;
        ctl.maxPolarAngle = Math.PI * .495; ctl.minDistance = 60; ctl.maxDistance = 4500;
        ctl.screenSpacePanning = false;
        const inicio = () => {
            cam.position.set(-430, 520, 860); ctl.target.set(0, alt(0, 0), 0); ctl.update();
        };
        inicio();
        const home = document.getElementById('zoom-home');
        if (home) home.addEventListener('click', () => { if (activo) inicio(); }, true);
        const zi = document.getElementById('zoom-in'), zo = document.getElementById('zoom-out');
        if (zi) zi.addEventListener('click', () => { if (activo) { cam.position.lerp(ctl.target, .25); ctl.update(); } }, true);
        if (zo) zo.addEventListener('click', () => { if (activo) { cam.position.lerp(ctl.target, -.3); ctl.update(); } }, true);

        // --- casillas de capas ---
        for (const [nombre, obj] of Object.entries(capas)) {
            const lb = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = obj.visible;
            cb.onchange = () => obj.visible = cb.checked;
            lb.append(cb, document.createTextNode(nombre));
            panel.appendChild(lb);
        }

        function resize() {
            const w = window.innerWidth, h = window.innerHeight;
            renderer.setSize(w, h, false);
            canvas3d.style.width = w + 'px'; canvas3d.style.height = h + 'px';
            cam.aspect = w / h; cam.updateProjectionMatrix();
        }
        window.addEventListener('resize', () => { if (activo) resize(); });

        let raf = 0;
        function bucle() { raf = requestAnimationFrame(bucle); ctl.update(); renderer.render(scene, cam); }
        return {
            resize,
            animar() { if (!raf) bucle(); },
            parar() { cancelAnimationFrame(raf); raf = 0; }
        };
    }
})();
