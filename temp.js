        // El servidor local (server.js) hace el trabajo real con yt-dlp.
        // Si la pagina se abre como archivo suelto, se apunta a localhost:8787.
        const API = (location.protocol === 'http:' && location.port === '8787')
            ? ''
            : 'http://localhost:8787';

        // Desde https:// el navegador bloquea cualquier peticion a http://localhost
        // (contenido mixto). En ese caso esta pagina hace de puente: pasa el enlace
        // a la app local, que es la que descarga.
        const MODO_WEB = location.protocol === 'https:';

        const urlInput = document.getElementById('videoUrl');
        const clearBtn = document.getElementById('clearBtn');
        const statusBadge = document.getElementById('serverStatus');
        let servidorListo = false;

        urlInput.addEventListener('input', function () {
            clearBtn.classList.toggle('hidden', this.value.length === 0);
        });

        urlInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') downloadVideo();
        });

        function clearInput() {
            urlInput.value = '';
            clearBtn.classList.add('hidden');
            urlInput.focus();
        }

        function showSection(sectionId) {
            ['loadingSection', 'errorSection', 'resultSection', 'offlineSection'].forEach(function (id) {
                document.getElementById(id).classList.add('hidden');
            });
            if (sectionId) {
                const el = document.getElementById(sectionId);
                el.classList.remove('hidden');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function resetForm() {
            showSection(null);
            urlInput.value = '';
            clearBtn.classList.add('hidden');
        }

        function mostrarError(mensaje) {
            document.getElementById('errorMessage').innerHTML = mensaje;
            showSection('errorSection');
        }

        function pintarEstado(clases, icono, texto) {
            statusBadge.className = 'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ' + clases;
            statusBadge.innerHTML = '<i class="fas ' + icono + '"></i><span>' + texto + '</span>';
        }

        async function comprobarServidor(desdeBoton) {
            if (MODO_WEB) {
                pintarEstado('bg-blue-100 text-blue-700', 'fa-desktop', 'La descarga se abre en tu app local');
                servidorListo = false;
                if (desdeBoton) irAlLocal();
                return false;
            }
            try {
                const r = await fetch(API + '/api/estado', { cache: 'no-store' });
                const d = await r.json();
                servidorListo = Boolean(d.ytdlp);
                if (servidorListo) {
                    pintarEstado('bg-green-100 text-green-700', 'fa-circle-check', 'Servidor local conectado · yt-dlp ' + d.ytdlp);
                    if (desdeBoton) showSection(null);
                } else {
                    pintarEstado('bg-orange-100 text-orange-700', 'fa-triangle-exclamation', 'Falta yt-dlp: python -m pip install -U yt-dlp');
                }
            } catch (e) {
                servidorListo = false;
                pintarEstado('bg-red-100 text-red-700', 'fa-circle-xmark', 'Servidor local apagado');
                if (desdeBoton) showSection('offlineSection');
            }
            return servidorListo;
        }

        
        async function downloadVideo() {
            const url = urlInput.value.trim();
            if (!url) {
                mostrarError('Pega primero un enlace de Instagram.');
                return;
            }
            if (MODO_WEB) {
                irAlLocal();
                return;
            }
            
            if (!servidorListo && !(await comprobarServidor(false))) {
                showSection('offlineSection');
                return;
            }

            const btn = document.getElementById('downloadBtn');
            if(btn.classList.contains('active')) return;
            btn.classList.add('active');
            
            const fill = document.getElementById('mainParaFill');
            const txt = document.getElementById('mainParaText');
            const chute = document.getElementById('mainParaChute');
            
            let fakeProgress = 0;
            fill.style.width = '0%';
            txt.innerHTML = '0%<br><br>CANCEL';
            
            const fakeInt = setInterval(() => {
                fakeProgress += 2;
                if(fakeProgress > 90) fakeProgress = 90;
                fill.style.width = fakeProgress + '%';
                txt.innerHTML = Math.floor(fakeProgress) + '%<br><br>CANCEL';
                const y = -(fakeProgress / 100 * 50);
                chute.style.transform = `translateX(-50%) translateY(${y}px)`;
            }, 50);


            if (!servidorListo && !(await comprobarServidor(false))) {
                showSection('offlineSection');
                return;
            }

            
            let r;
            try {
                r = await fetch(API + '/api/info?url=' + encodeURIComponent(url));
            } catch (e) {
                clearInterval(fakeInt);
                btn.classList.remove('active');
                await comprobarServidor(false);
                showSection('offlineSection');
                return;
            }


            try {
                const d = await r.json();
                if (!r.ok || !d.ok) throw new Error(d.error || 'No se ha podido obtener el vídeo.');
                pintarResultados(url, d.items);
            } catch (e) {
                mostrarError('<strong>' + escapar(e.message) + '</strong>');
            }
        }

        function escapar(t) {
            const d = document.createElement('div');
            d.textContent = t == null ? '' : String(t);
            return d.innerHTML;
        }

        function duracionTexto(seg) {
            if (!seg) return '';
            const m = Math.floor(seg / 60);
            const s = Math.round(seg % 60);
            return m + ':' + String(s).padStart(2, '0');
        }

        function pintarResultados(url, items) {
            const cont = document.getElementById('resultados');
            cont.innerHTML = '';

            items.forEach(function (item, n) {
                const bloque = document.createElement('div');
                bloque.className = 'grid md:grid-cols-2 gap-8 items-start';

                const miniatura = item.miniatura
                    ? '<img src="' + escapar(item.miniatura) + '" referrerpolicy="no-referrer" alt="Miniatura" class="w-full h-auto">'
                    : '<div class="py-16 text-center text-gray-400"><i class="fas fa-film text-5xl"></i></div>';

                bloque.innerHTML =
                    '<div>' +
                        '<div class="video-preview mb-4 bg-gray-100">' +
                            miniatura +
                            '<div class="absolute top-4 right-4">' +
                                '<span class="quality-badge text-white px-3 py-1 rounded-full text-sm font-semibold">' +
                                    '<i class="fas fa-video"></i> ' + (item.calidad ? item.calidad + 'p' : 'Vídeo') +
                                '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="text-sm text-gray-600">' +
                            '<p class="font-semibold mb-1"><i class="fas fa-user"></i> @' + escapar(item.autor || 'usuario') + '</p>' +
                            (item.duracion ? '<p class="text-xs mb-1"><i class="fas fa-clock"></i> ' + duracionTexto(item.duracion) + '</p>' : '') +
                            '<p class="text-xs whitespace-pre-line">' + escapar((item.descripcion || '').slice(0, 220)) + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        (items.length > 1 ? '<p class="text-sm font-semibold text-purple-600 mb-2">Elemento ' + (n + 1) + ' de ' + items.length + '</p>' : '') +
                        '<h4 class="font-semibold text-gray-800 mb-4 text-lg">Descarga:</h4>' +
                        
'<div class="dl-container bg-gray-900 rounded-xl p-6 text-center shadow-2xl">' +
    '<div class="progress-ui hidden flex-col items-center">' +
        '<div class="status-text text-sm tracking-widest uppercase mb-4 text-cyan-400 font-mono transition-colors">Downloading</div>' +
        '<div class="graphics relative w-full h-16 flex items-center justify-center mb-4">' +
            '<svg width="100%" height="80" viewBox="0 0 200 80" class="absolute bottom-0 left-0 w-full" preserveAspectRatio="none">' +
                '<path d="M 10,70 L 190,70" class="rail stroke-gray-800" style="stroke-width:4; stroke-linecap:round; fill:none;" />' +
                '<path d="M 10,70 L 190,70" class="rail--fill" pathLength="1" style="stroke:#00f0ff; stroke-width:4; stroke-linecap:round; fill:none; filter:drop-shadow(0 0 8px rgba(0,240,255,0.6)); stroke-dasharray:1 1; stroke-dashoffset:1; transition: stroke-dashoffset 0.1s linear;" />' +
            '</svg>' +
            '<svg class="icon arrow absolute top-2 w-8 h-8 opacity-100 transition-all duration-500 transform scale-100" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 6px rgba(0,240,255,0.6));">' +
                '<path d="M12 4v16m-6-6 6 6 6-6" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
            '</svg>' +
            '<svg class="icon check absolute top-2 w-10 h-10 opacity-0 transition-all duration-500 transform -translate-y-4 scale-50" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 6px rgba(0,240,255,0.6));">' +
                '<path d="M4 12l5 5 11-11" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
            '</svg>' +
        '</div>' +
        '<div class="percent text-cyan-400 font-mono text-sm mb-2 tabular-nums">0%</div>' +
        '<div class="filename text-gray-500 font-mono text-xs">instagram.mp4</div>' +
    '</div>' +
    '<button class="descargar w-full text-center border-2 border-cyan-400 text-cyan-400 font-bold py-4 px-6 rounded-xl hover:bg-cyan-400 hover:bg-opacity-10 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all font-mono uppercase tracking-widest">' +
        '<i class="fas fa-download mr-2"></i>Guardar (MP4)' +
    '</button>' +
    '<p class="estado hidden"></p>' +
'</div>'
 +
                        '</div>' +
                    '</div>';

                const img = bloque.querySelector('img');
                if (img) img.addEventListener('error', function () { this.style.display = 'none'; });

                const boton = bloque.querySelector('.descargar');
                const estado = bloque.querySelector('.estado');
                boton.addEventListener('click', function () {
                    guardarVideo(url, item.index, boton, estado);
                });

                cont.appendChild(bloque);
            });

            showSection('resultSection');
        }

        
        async function guardarVideo(url, index, boton, estado) {
            const container = boton.closest('.dl-container');
            const progressUi = container.querySelector('.progress-ui');
            const fill = container.querySelector('.rail--fill');
            const pct = container.querySelector('.percent');
            const st = container.querySelector('.status-text');
            const arrow = container.querySelector('.icon.arrow');
            const check = container.querySelector('.icon.check');
            const filenameEl = container.querySelector('.filename');

            boton.classList.add('hidden');
            progressUi.classList.remove('hidden');
            progressUi.classList.add('flex');
            estado.className = 'estado hidden';
            
            fill.style.strokeDashoffset = '1';
            pct.textContent = '0%';
            st.textContent = 'Downloading';
            arrow.style.opacity = '1'; arrow.classList.add('downloading');
            check.style.opacity = '0';
            check.style.transform = 'translateY(-20px) scale(0.5)';

            try {
                let r;
                try {
                    r = await fetch(API + '/api/descargar?url=' + encodeURIComponent(url) + '&index=' + index);
                } catch (fallo) {
                    throw new Error('Se ha perdido la conexión con el servidor local.');
                }

                if (!r.ok) {
                    let msg = 'Error en la descarga.';
                    try {
                        const d = await r.json();
                        if (d.error) msg = d.error;
                    } catch (e) {}
                    throw new Error(msg);
                }

                const total = parseInt(r.headers.get('content-length'), 10);
                const cabecera = r.headers.get('Content-Disposition') || '';
                const encontrado = cabecera.match(/filename="([^"]+)"/);
                const filename = encontrado ? encontrado[1] : 'instagram.mp4';
                filenameEl.textContent = filename;

                let loaded = 0;
                let chunks = [];
                const reader = r.body.getReader();

                while(true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    loaded += value.length;
                    
                    let p = total ? loaded / total : 0;
                    if(p > 1) p = 1;
                    fill.style.strokeDashoffset = 1 - p;
                    pct.textContent = Math.floor(p * 100) + '%';
                }

                const blob = new Blob(chunks);
                const enlace = document.createElement('a');
                const objeto = URL.createObjectURL(blob);
                enlace.href = objeto;
                enlace.download = filename;
                document.body.appendChild(enlace);
                enlace.click();
                document.body.removeChild(enlace);
                setTimeout(function () { URL.revokeObjectURL(objeto); }, 30000);

                // Success visual state
                fill.style.strokeDashoffset = '0';
                pct.textContent = '100%';
                st.textContent = 'Complete';
                arrow.style.opacity = '0'; arrow.style.transform = 'translateY(20px) scale(0.5)'; arrow.classList.remove('downloading');
                check.style.opacity = '1';
                check.style.transform = 'translateY(0) scale(1)';

            } catch (e) {
                // Restore button on error
                boton.classList.remove('hidden');
                progressUi.classList.add('hidden');
                progressUi.classList.remove('flex');
                
                estado.className = 'estado text-sm text-red-600 mt-3 font-semibold block';
                estado.textContent = e.message;
            }
        }


        // Puente web -> app local: abre localhost:8787 con el enlace ya cargado.
        function irAlLocal() {
            const url = urlInput.value.trim();
            const destino = 'http://localhost:8787/' + (url ? '?u=' + encodeURIComponent(url) : '');
            const boton = document.getElementById('btnLocal');
            if (boton) boton.href = destino;
            showSection('offlineSection');
        }

        comprobarServidor(false);

        // Si llegamos desde la version web, el enlace viene en la URL: lo lanzamos solo.
        const enlaceEntrante = new URLSearchParams(location.search).get('u');
        if (enlaceEntrante && !MODO_WEB) {
            urlInput.value = enlaceEntrante;
            clearBtn.classList.remove('hidden');
            history.replaceState(null, '', location.pathname);
            downloadVideo();
        }
