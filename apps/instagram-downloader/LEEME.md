# Instagram Downloader

Descarga vídeos y reels públicos de Instagram pegando el enlace.

## Cómo usarlo

1. Doble clic en **`Iniciar.bat`**.
2. Se abre solo `http://localhost:8787` en el navegador.
3. Pega el enlace del reel y pulsa **Descargar Vídeo** → **Guardar vídeo (MP4)**.
4. Para cerrar: `Ctrl + C` en la ventana negra, o simplemente ciérrala.

En la parte superior verás el estado: verde = servidor listo, rojo = hay que arrancar `Iniciar.bat`.

## Por qué hace falta un servidor local

Instagram ya no permite leer los vídeos desde el navegador: exige sesión iniciada y bloquea
las peticiones entre dominios (CORS). Por eso la descarga la hace `server.js` desde tu propio
ordenador usando [yt-dlp](https://github.com/yt-dlp/yt-dlp), que mantiene actualizado el
método de extracción. No se usa ningún servicio externo y no se envía nada a terceros.

Consecuencia: la descarga ocurre siempre en tu PC. La versión publicada en
[rubenpantxo.com](https://rubenpantxo.com/apps/instagram-downloader/index_insta_down.html)
no puede descargar por sí sola (el navegador bloquea `https://` → `http://localhost`), así que
hace de puente: pegas el enlace, pulsas **Descargar** y te lleva a `http://localhost:8787`
con el enlace ya escrito en el campo. La descarga **no** arranca sola: hay que pulsar el botón.

## Requisitos

- **Node.js** — https://nodejs.org
- **yt-dlp** — `Iniciar.bat` lo instala solo la primera vez (necesita Python).

Si Instagram cambia algo y deja de funcionar, casi siempre se arregla actualizando yt-dlp:

```bash
python -m pip install -U yt-dlp
```

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index_insta_down.html` | La interfaz |
| `server.js` | Servidor local (puerto 8787) que llama a yt-dlp |
| `Iniciar.bat` | Lanzador: comprueba requisitos, arranca y abre el navegador |

## Seguridad

Este servidor lanza procesos en tu ordenador, así que tiene tres cerrojos:

- **Token por arranque.** Cada vez que arranca genera un secreto distinto, lo imprime en la
  ventana negra y lo inyecta en la página que sirve él mismo. Todo `/api/*` lo exige. Por eso
  hay que entrar por **`http://localhost:8787`**: si abres el `.html` a mano (doble clic,
  `file://`) no hay token y el servidor responde 403.
- **Host y origen comprobados.** Solo atiende peticiones cuyo `Host` sea `localhost:8787` o
  `127.0.0.1:8787`, y solo a una lista corta de orígenes. Esto corta el *DNS rebinding* y que
  cualquier web que visites use tu servidor de descargador mientras lo tienes abierto.
- **Cookies solo si las pides.** Antes, si Instagram exigía sesión, el servidor probaba
  automáticamente las cookies de Chrome, Edge, Firefox, Brave y Opera. Eso es prestarle tu
  sesión de Instagram a `yt-dlp`. Ahora no lo hace nunca por su cuenta. Para permitirlo en una
  sesión concreta, cierra el navegador del todo y arranca así:

  ```bat
  set IGDL_COOKIES_BROWSER=chrome
  node server.js
  ```

Además hay un tope de **2 descargas simultáneas**, para que una ráfaga de peticiones no deje
la máquina sin CPU ni haga que Instagram marque tu IP.

## Límites

- Solo cuentas **públicas**. Las privadas requieren iniciar sesión y no están soportadas.
- Si haces muchas peticiones seguidas, Instagram limita temporalmente: espera unos minutos.
- Descarga contenido solo para uso personal y respeta los derechos de autor de cada creador.
