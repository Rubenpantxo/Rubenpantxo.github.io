/* ============================================================
   ESCENA — mundo 3D, marcadores arrastrables y las dos cámaras.

   Un solo WebGLRenderer con dos cámaras que se intercambian:
     · cenital → cámara fija en picado, es donde se arrastra
     · plano   → la cámara de la escena, con su FOV y su relación
                 de aspecto buzoneada

   Las etiquetas no usan CSS2DRenderer (en r128 va en un archivo
   aparte): se proyectan a mano con vector.project().
   ============================================================ */

(function (global) {
    'use strict';

    var DEG = Math.PI / 180;

    /* Paleta del Halogen Kit, en números para three.js */
    var COLOR = {
        canvas: 0x0a0d0a,
        suelo: 0x12160f,
        pared: 0x171c15,
        paredFondo: 0x1a1f18,
        rejilla: 0x2a312a,
        halogen: 0xa3e635,
        piel: 0xe8e4d8,
        pielAlt: 0xd6cdb8,
        disco: 0x3a423a
    };

    var SALA = { ancho: 14, fondo: 12, alto: 3 };
    var UMBRAL_PUCK = 0.5;
    var UMBRAL_TIRADOR = 0.3;
    var RADIO_TIRADOR = 0.85;

    var renderer, escena, camCenital, camPlano, raycaster, planoSuelo;
    var lienzo, capaEtiquetas, opciones;
    var grupoSujetos = [], grupoCamara, mallaFrustum;
    var vista = 'cenital', aspecto = 16 / 9, etiquetasVisibles = true;
    var estadoActual = null;
    var arrastre = null;
    var punteroNDC = new THREE.Vector2();
    var puntoSuelo = new THREE.Vector3();
    var vecProy = new THREE.Vector3();

    /* ------------------------------------------------------------
       CONSTRUCCIÓN
       ------------------------------------------------------------ */
    function init(opts) {
        opciones = opts;
        lienzo = opts.canvas;
        capaEtiquetas = opts.labels;

        renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        renderer.setClearColor(COLOR.canvas, 1);
        renderer.shadowMap.enabled = false;

        escena = new THREE.Scene();
        escena.fog = new THREE.Fog(COLOR.canvas, 16, 34);

        camCenital = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
        camCenital.position.set(0, 11.5, 8.5);
        camCenital.lookAt(0, 0, -0.5);

        camPlano = new THREE.PerspectiveCamera(45, 1, 0.05, 200);

        raycaster = new THREE.Raycaster();
        planoSuelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        construirSala();
        construirLuces();
        construirCamaraGizmo();

        lienzo.addEventListener('pointerdown', alPulsar);
        global.addEventListener('pointermove', alMover);
        global.addEventListener('pointerup', alSoltar);
        global.addEventListener('pointercancel', alSoltar);

        if (global.ResizeObserver) {
            new ResizeObserver(redimensionar).observe(lienzo.parentElement);
        } else {
            global.addEventListener('resize', redimensionar);
        }
        redimensionar();

        renderer.setAnimationLoop(dibujar);
    }

    function construirSala() {
        var suelo = new THREE.Mesh(
            new THREE.PlaneGeometry(SALA.ancho, SALA.fondo),
            new THREE.MeshStandardMaterial({ color: COLOR.suelo, roughness: .95, metalness: 0 })
        );
        suelo.rotation.x = -Math.PI / 2;
        escena.add(suelo);

        var rejilla = new THREE.GridHelper(SALA.ancho, SALA.ancho, COLOR.halogen, COLOR.rejilla);
        rejilla.position.y = 0.002;
        rejilla.material.opacity = 0.22;
        rejilla.material.transparent = true;
        escena.add(rejilla);

        /* Tres paredes: fondo y laterales, mirando hacia dentro */
        var matFondo = new THREE.MeshStandardMaterial({
            color: COLOR.paredFondo, roughness: 1, side: THREE.DoubleSide
        });
        var matLateral = new THREE.MeshStandardMaterial({
            color: COLOR.pared, roughness: 1, side: THREE.DoubleSide
        });

        var fondo = new THREE.Mesh(new THREE.PlaneGeometry(SALA.ancho, SALA.alto), matFondo);
        fondo.position.set(0, SALA.alto / 2, -SALA.fondo / 2);
        escena.add(fondo);

        var izq = new THREE.Mesh(new THREE.PlaneGeometry(SALA.fondo, SALA.alto), matLateral);
        izq.position.set(-SALA.ancho / 2, SALA.alto / 2, 0);
        izq.rotation.y = Math.PI / 2;
        escena.add(izq);

        var der = new THREE.Mesh(new THREE.PlaneGeometry(SALA.fondo, SALA.alto), matLateral);
        der.position.set(SALA.ancho / 2, SALA.alto / 2, 0);
        der.rotation.y = -Math.PI / 2;
        escena.add(der);

        /* Zócalo halógeno en la unión de las paredes con el suelo */
        var zocalo = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(SALA.ancho, 0.02, SALA.fondo)),
            new THREE.LineBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .18 })
        );
        zocalo.position.y = 0.01;
        escena.add(zocalo);
    }

    function construirLuces() {
        escena.add(new THREE.HemisphereLight(0xdfe8d4, 0x0a0d0a, 0.85));

        var clave = new THREE.DirectionalLight(0xffffff, 0.75);
        clave.position.set(5, 9, 6);
        escena.add(clave);

        /* Un toque halógeno de relleno, sin teñir la sala entera */
        var relleno = new THREE.DirectionalLight(0xa3e635, 0.10);
        relleno.position.set(-6, 4, -5);
        escena.add(relleno);
    }

    /* --- Marcador de sujeto: disco + cuerpo + cabeza + tirador --- */
    function crearSujeto(indice) {
        var grupo = new THREE.Group();
        var tono = indice % 2 === 0 ? COLOR.piel : COLOR.pielAlt;

        var disco = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32),
            new THREE.MeshStandardMaterial({ color: COLOR.disco, roughness: .8 })
        );
        disco.position.y = 0.015;
        grupo.add(disco);

        /* Escala humana real (~1,73 m): el encuadre se calcula sobre
           una persona de 1,75 m, así que la figura tiene que medir lo
           mismo o la vista de plano no cuadraría con la píldora. */
        var matPiel = new THREE.MeshStandardMaterial({ color: tono, roughness: .7 });

        var cuerpo = new THREE.Mesh(
            new THREE.CylinderGeometry(0.21, 0.26, 1.32, 20),
            matPiel
        );
        cuerpo.position.y = 0.66;
        grupo.add(cuerpo);

        var hombros = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 14), matPiel);
        hombros.scale.set(1, 0.58, 0.82);
        hombros.position.y = 1.31;
        grupo.add(hombros);

        var cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.13, 12), matPiel);
        cuello.position.y = 1.45;
        grupo.add(cuello);

        var cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.125, 22, 16), matPiel);
        cabeza.position.y = 1.60;
        grupo.add(cabeza);

        /* Nariz: indica hacia dónde mira, a la altura de los ojos */
        var nariz = new THREE.Mesh(
            new THREE.ConeGeometry(0.045, 0.13, 12),
            new THREE.MeshStandardMaterial({ color: COLOR.halogen, roughness: .5 })
        );
        nariz.position.set(0, 1.60, 0.14);
        nariz.rotation.x = Math.PI / 2;
        grupo.add(nariz);

        /* Tirador de rotación */
        var varilla = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, RADIO_TIRADOR, 8),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .35 })
        );
        varilla.position.set(0, 0.04, RADIO_TIRADOR / 2);
        varilla.rotation.x = Math.PI / 2;
        grupo.add(varilla);

        var tirador = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 12),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen })
        );
        tirador.position.set(0, 0.05, RADIO_TIRADOR);
        grupo.add(tirador);

        grupo.userData.gizmo = [varilla, tirador];
        escena.add(grupo);
        return grupo;
    }

    /* --- Marcador de cámara: disco halógeno + cuña + frustum --- */
    function construirCamaraGizmo() {
        grupoCamara = new THREE.Group();

        var disco = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.12, 32),
            new THREE.MeshStandardMaterial({ color: COLOR.halogen, roughness: .45 })
        );
        disco.position.y = 0.06;
        grupoCamara.add(disco);

        var cuerpo = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.2, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x1a1f18, roughness: .6 })
        );
        cuerpo.position.set(0, 0.22, 0.06);
        grupoCamara.add(cuerpo);

        var objetivo = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.11, 0.22, 16),
            new THREE.MeshStandardMaterial({ color: 0x0a0d0a, roughness: .4 })
        );
        objetivo.position.set(0, 0.22, 0.3);
        objetivo.rotation.x = Math.PI / 2;
        grupoCamara.add(objetivo);

        var varilla = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, RADIO_TIRADOR, 8),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen, transparent: true, opacity: .35 })
        );
        varilla.position.set(0, 0.04, RADIO_TIRADOR / 2);
        varilla.rotation.x = Math.PI / 2;
        grupoCamara.add(varilla);

        var tirador = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 12),
            new THREE.MeshBasicMaterial({ color: COLOR.halogen })
        );
        tirador.position.set(0, 0.05, RADIO_TIRADOR);
        grupoCamara.add(tirador);
        grupoCamara.userData.gizmo = [varilla, tirador];

        /* Abanico del campo de visión, sobre el suelo */
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
        mallaFrustum = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: COLOR.halogen, transparent: true, opacity: .06, side: THREE.DoubleSide,
            depthWrite: false
        }));
        mallaFrustum.position.y = 0.006;
        escena.add(mallaFrustum);

        escena.add(grupoCamara);
    }

    /* ------------------------------------------------------------
       SINCRONIZACIÓN CON EL ESTADO
       ------------------------------------------------------------ */
    function sincronizar(estado) {
        estadoActual = estado;

        /* Crear o retirar marcadores según cuántos sujetos haya */
        while (grupoSujetos.length < estado.sujetos.length) {
            grupoSujetos.push(crearSujeto(grupoSujetos.length));
        }
        while (grupoSujetos.length > estado.sujetos.length) {
            escena.remove(grupoSujetos.pop());
        }

        var enCenital = vista === 'cenital';
        estado.sujetos.forEach(function (s, i) {
            var g = grupoSujetos[i];
            g.position.set(s.x, 0, s.z);
            g.rotation.y = s.rot * DEG;
            /* Un sujeto añadido estando en vista de plano no debe
               aparecer con su tirador colgando */
            g.userData.gizmo.forEach(function (m) { m.visible = enCenital; });
        });

        var c = estado.camara;
        grupoCamara.position.set(c.x, 0, c.z);
        grupoCamara.rotation.y = anguloCamara(estado) * DEG;

        actualizarFrustum(estado);
        actualizarCamPlano(estado);
    }

    /* Hacia dónde apunta la cámara: al objetivo activo */
    function anguloCamara(estado) {
        var obj = objetivoDe(estado);
        return Math.atan2(obj.x - estado.camara.x, obj.z - estado.camara.z) / DEG;
    }

    function objetivoDe(estado) {
        var c = estado.camara;
        if (c.objetivoX != null && c.objetivoZ != null) {
            return { x: c.objetivoX, z: c.objetivoZ };
        }
        var s = estado.sujetos[estado.enfoque] || estado.sujetos[0];
        return { x: s.x, z: s.z };
    }

    function actualizarFrustum(estado) {
        var c = estado.camara;
        var ang = anguloCamara(estado) * DEG;
        /* FOV horizontal a partir del vertical y la relación de aspecto */
        var fovH = 2 * Math.atan(Math.tan((c.fov * DEG) / 2) * aspecto);
        var largo = 6;

        var izq = ang - fovH / 2;
        var der = ang + fovH / 2;

        var pos = mallaFrustum.geometry.attributes.position;
        pos.setXYZ(0, c.x, 0, c.z);
        pos.setXYZ(1, c.x + Math.sin(izq) * largo, 0, c.z + Math.cos(izq) * largo);
        pos.setXYZ(2, c.x + Math.sin(der) * largo, 0, c.z + Math.cos(der) * largo);
        pos.needsUpdate = true;
        mallaFrustum.geometry.computeBoundingSphere();
    }

    function actualizarCamPlano(estado) {
        var c = estado.camara;
        var obj = objetivoDe(estado);
        camPlano.fov = c.fov;
        camPlano.aspect = aspecto;
        camPlano.position.set(c.x, c.altura, c.z);
        camPlano.lookAt(obj.x, c.mira != null ? c.mira : 1.35, obj.z);
        camPlano.updateProjectionMatrix();
    }

    /* ------------------------------------------------------------
       INTERACCIÓN
       ------------------------------------------------------------ */
    function puntoDelPuntero(ev) {
        var r = lienzo.getBoundingClientRect();
        punteroNDC.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        punteroNDC.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(punteroNDC, camCenital);
        return raycaster.ray.intersectPlane(planoSuelo, puntoSuelo) ? puntoSuelo : null;
    }

    /* Devuelve el marcador o el tirador más cercano al punto dado */
    function objetivoBajo(p) {
        if (!estadoActual) return null;
        var mejor = null;
        var mejorD = Infinity;

        function probar(tipo, id, x, z, umbral) {
            var d = Math.hypot(p.x - x, p.z - z);
            if (d < umbral && d < mejorD) { mejorD = d; mejor = { tipo: tipo, id: id }; }
        }

        /* Los tiradores tienen prioridad: se comprueban primero y con
           un umbral más pequeño */
        estadoActual.sujetos.forEach(function (s, i) {
            var a = s.rot * DEG;
            probar('rot', i, s.x + Math.sin(a) * RADIO_TIRADOR, s.z + Math.cos(a) * RADIO_TIRADOR, UMBRAL_TIRADOR);
        });
        var ac = anguloCamara(estadoActual) * DEG;
        probar('rotcam', -1,
            estadoActual.camara.x + Math.sin(ac) * RADIO_TIRADOR,
            estadoActual.camara.z + Math.cos(ac) * RADIO_TIRADOR, UMBRAL_TIRADOR);

        if (mejor) return mejor;

        estadoActual.sujetos.forEach(function (s, i) {
            probar('pos', i, s.x, s.z, UMBRAL_PUCK);
        });
        probar('poscam', -1, estadoActual.camara.x, estadoActual.camara.z, UMBRAL_PUCK);

        return mejor;
    }

    function alPulsar(ev) {
        if (vista !== 'cenital') return;
        var p = puntoDelPuntero(ev);
        if (!p) return;
        var obj = objetivoBajo(p);
        if (!obj) return;
        ev.preventDefault();
        arrastre = obj;
        lienzo.classList.add('is-grabbing');
        if (lienzo.setPointerCapture) {
            try { lienzo.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
        }
    }

    function alMover(ev) {
        if (vista !== 'cenital') return;

        if (!arrastre) {
            var p0 = puntoDelPuntero(ev);
            lienzo.classList.toggle('is-over', !!(p0 && objetivoBajo(p0)));
            return;
        }

        var p = puntoDelPuntero(ev);
        if (!p) return;

        var lim = { x: SALA.ancho / 2 - 0.6, z: SALA.fondo / 2 - 0.6 };
        var x = Math.max(-lim.x, Math.min(lim.x, p.x));
        var z = Math.max(-lim.z, Math.min(lim.z, p.z));

        if (arrastre.tipo === 'pos') {
            opciones.onMoverSujeto(arrastre.id, x, z);
        } else if (arrastre.tipo === 'poscam') {
            opciones.onMoverCamara(x, z);
        } else if (arrastre.tipo === 'rot') {
            var s = estadoActual.sujetos[arrastre.id];
            opciones.onRotarSujeto(arrastre.id, Math.atan2(p.x - s.x, p.z - s.z) / DEG);
        } else if (arrastre.tipo === 'rotcam') {
            var c = estadoActual.camara;
            opciones.onApuntarCamara(p.x, p.z);
        }
    }

    function alSoltar() {
        arrastre = null;
        lienzo.classList.remove('is-grabbing');
    }

    /* ------------------------------------------------------------
       VISTA, ASPECTO Y ETIQUETAS
       ------------------------------------------------------------ */
    function setVista(v) {
        vista = v;
        var enCenital = v === 'cenital';
        grupoCamara.visible = enCenital;
        mallaFrustum.visible = enCenital;
        grupoSujetos.forEach(function (g) {
            g.userData.gizmo.forEach(function (m) { m.visible = enCenital; });
        });
        if (!enCenital) { arrastre = null; lienzo.classList.remove('is-over', 'is-grabbing'); }
        redimensionar();
    }

    function setAspecto(a) {
        aspecto = a;
        if (estadoActual) { actualizarFrustum(estadoActual); actualizarCamPlano(estadoActual); }
    }

    function setEtiquetas(v) { etiquetasVisibles = v; }

    function redimensionar() {
        if (!lienzo.parentElement) return;
        var w = lienzo.parentElement.clientWidth;
        var h = lienzo.parentElement.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camCenital.aspect = w / h;
        camCenital.updateProjectionMatrix();
        if (estadoActual) actualizarCamPlano(estadoActual);
    }

    /* ------------------------------------------------------------
       DIBUJO
       ------------------------------------------------------------ */
    function dibujar() {
        var w = renderer.domElement.clientWidth;
        var h = renderer.domElement.clientHeight;
        if (!w || !h) return;

        if (vista === 'cenital') {
            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, w, h);
            renderer.render(escena, camCenital);
            pintarEtiquetas(w, h);
        } else {
            /* Buzoneado a la relación de aspecto elegida */
            var vw = w, vh = h;
            if (w / h > aspecto) { vw = h * aspecto; } else { vh = w / aspecto; }
            var vx = (w - vw) / 2;
            var vy = (h - vh) / 2;

            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, w, h);
            renderer.clear();

            renderer.setViewport(vx, vy, vw, vh);
            renderer.setScissor(vx, vy, vw, vh);
            renderer.setScissorTest(true);
            renderer.render(escena, camPlano);
            renderer.setScissorTest(false);

            capaEtiquetas.classList.add('is-hidden');
        }
    }

    function pintarEtiquetas(w, h) {
        if (!estadoActual) return;
        capaEtiquetas.classList.toggle('is-hidden', !etiquetasVisibles);
        if (!etiquetasVisibles) return;

        var necesarias = estadoActual.sujetos.length + 1;
        while (capaEtiquetas.children.length < necesarias) {
            var el = document.createElement('span');
            el.className = 'puck-label';
            capaEtiquetas.appendChild(el);
        }
        while (capaEtiquetas.children.length > necesarias) {
            capaEtiquetas.removeChild(capaEtiquetas.lastChild);
        }

        estadoActual.sujetos.forEach(function (s, i) {
            colocar(capaEtiquetas.children[i], s.x, 1.95, s.z, s.nombre, w, h,
                i === estadoActual.enfoque ? 'puck-label puck-label--focus' : 'puck-label');
        });

        var c = estadoActual.camara;
        colocar(capaEtiquetas.children[necesarias - 1], c.x, 0.55, c.z, 'Cámara', w, h,
            'puck-label puck-label--camera');
    }

    function colocar(el, x, y, z, texto, w, h, clase) {
        vecProy.set(x, y, z).project(camCenital);
        var visible = vecProy.z < 1;
        el.style.display = visible ? '' : 'none';
        if (!visible) return;
        el.className = clase;
        if (el.textContent !== texto) el.textContent = texto;
        el.style.left = ((vecProy.x * 0.5 + 0.5) * w) + 'px';
        el.style.top = ((-vecProy.y * 0.5 + 0.5) * h) + 'px';
    }

    /* Punto del mundo → píxeles del lienzo, con la cámara cenital.
       Lo usan las etiquetas y sirve para dirigir las pruebas. */
    function proyectar(x, y, z) {
        var r = lienzo.getBoundingClientRect();
        vecProy.set(x, y, z).project(camCenital);
        return {
            x: r.left + (vecProy.x * 0.5 + 0.5) * r.width,
            y: r.top + (-vecProy.y * 0.5 + 0.5) * r.height
        };
    }

    global.Escena = {
        init: init,
        sincronizar: sincronizar,
        proyectar: proyectar,
        setVista: setVista,
        setAspecto: setAspecto,
        setEtiquetas: setEtiquetas,
        redimensionar: redimensionar,
        SALA: SALA
    };
})(window);
