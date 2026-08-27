const fs = require('fs');
let html = fs.readFileSync('apps/instagram-downloader/index_insta_down.html', 'utf8');

const newButtonHTML = `
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
`;

// Replace the original button
html = html.replace(
    /'<button class="descargar w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transition-all">' \+[\s\S]*?'<\/p>' \+/,
    newButtonHTML + ' +'
);

// We need to also patch the saving logic to update the progress visually.
// The current `guardarVideo` uses simple fetch blob:
// const r = await fetch(...);
// if (!r.ok) ...
// const blob = await r.blob();
// We can use a readable stream to track progress

const customGuardarVideo = `
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
            arrow.style.opacity = '1';
            arrow.style.transform = 'translateY(0) scale(1)';
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
                arrow.style.opacity = '0';
                arrow.style.transform = 'translateY(20px) scale(0.5)';
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
`;

html = html.replace(/async function guardarVideo[\s\S]*?finally {\s*boton\.disabled = false;\s*boton\.classList\.remove\('opacity-70'\);\s*boton\.innerHTML = htmlOriginal;\s*}\s*}/, customGuardarVideo);

fs.writeFileSync('apps/instagram-downloader/index_insta_down.html', html);
console.log('Patched');
