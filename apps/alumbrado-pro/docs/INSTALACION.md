# Guía de Instalación y Despliegue

## GitHub Pages (Recomendado)

GitHub Pages es la forma más sencilla de publicar tu aplicación de forma gratuita.

### Pasos:

1. **Crear repositorio en GitHub**
   - Ve a [github.com](https://github.com) y accede a tu cuenta
   - Clic en "New repository" (botón verde)
   - Nombre: `alumbrado-pro`
   - Descripción: "Gestión de alumbrado público"
   - Público o Privado (ambos funcionan con Pages)
   - **NO** marques "Add a README file" (ya lo tenemos)
   - Clic en "Create repository"

2. **Subir archivos desde tu ordenador**

   **Opción A: Usando Git (línea de comandos)**
   ```bash
   # En la carpeta del proyecto
   cd alumbrado-pro
   
   # Inicializar repositorio
   git init
   
   # Añadir todos los archivos
   git add .
   
   # Primer commit
   git commit -m "Primera versión de AlumbradoPro"
   
   # Conectar con GitHub (usa tu URL)
   git remote add origin https://github.com/TU_USUARIO/alumbrado-pro.git
   
   # Subir archivos
   git branch -M main
   git push -u origin main
   ```

   **Opción B: Subir directamente desde GitHub**
   - En tu repositorio vacío, clic en "uploading an existing file"
   - Arrastra toda la carpeta `alumbrado-pro`
   - Clic en "Commit changes"

3. **Activar GitHub Pages**
   - En tu repositorio, ve a **Settings** (⚙️)
   - En el menú lateral, clic en **Pages**
   - En "Source", selecciona:
     - Branch: `main`
     - Folder: `/ (root)`
   - Clic en **Save**
   - Espera 1-2 minutos

4. **¡Listo!**
   - Tu app estará en: `https://TU_USUARIO.github.io/alumbrado-pro`

---

## Servidor Web Propio

Si tienes tu propio servidor web (Apache, Nginx, etc.):

1. Sube todos los archivos a tu servidor vía FTP/SFTP
2. Asegúrate de que la estructura de carpetas se mantiene
3. No necesita PHP ni base de datos - es 100% estático

### Apache (.htaccess opcional)
```apache
# Opcional: caché de recursos
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
</IfModule>
```

### Nginx (configuración opcional)
```nginx
location /alumbrado-pro {
    try_files $uri $uri/ /index.html;
    
    location ~* \.(png|jpg|jpeg|gif|ico)$ {
        expires 30d;
    }
    
    location ~* \.(css|js)$ {
        expires 7d;
    }
}
```

---

## Uso Offline (PWA básica)

Para usar la app sin conexión, puedes añadir un Service Worker.

Crea el archivo `sw.js` en la raíz:

```javascript
const CACHE_NAME = 'alumbrado-pro-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/css/styles.css',
    '/assets/js/config.js',
    '/assets/js/app.js',
    '/assets/icons/farola_baculo_logo.png',
    '/assets/icons/On_farola_bac_logo.png',
    '/assets/icons/farola_pared_logo.png',
    '/assets/icons/On_farola_logo.png',
    '/assets/icons/foco.jpg',
    '/assets/icons/Cofred.png',
    '/assets/icons/Ok_Cofred.png',
    '/assets/icons/Camion.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
```

Y añade al final del `index.html`, antes de `</body>`:

```html
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
</script>
```

---

## Solución de Problemas

### Los iconos no cargan
- Verifica que la carpeta `assets/icons` existe y contiene los archivos
- Comprueba que los nombres de archivo coinciden exactamente (mayúsculas/minúsculas)

### El mapa no aparece
- Asegúrate de tener conexión a Internet (Leaflet se carga desde CDN)
- Revisa la consola del navegador (F12) para ver errores

### Los datos no se guardan
- Comprueba que no estás en modo incógnito/privado
- Verifica que localStorage no está deshabilitado en el navegador

### Las capas WMS no cargan
- Los servicios WMS del IGN y Catastro a veces tienen caídas
- Prueba más tarde o usa solo OpenStreetMap como base
