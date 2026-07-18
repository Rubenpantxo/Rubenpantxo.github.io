# Seguridad de rubenpantxo.com

Guía para reforzar la seguridad del sitio y cerrar los avisos que marca en rojo
el analizador de dominio (HSTS, CSP, X-Frame-Options, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy).

## El problema

`rubenpantxo.com` se sirve desde **GitHub Pages**, que **no permite configurar
cabeceras HTTP propias**. Por eso el análisis muestra todas esas cabeceras como
ausentes. El archivo `.htaccess` del repo **no se aplica** (es config de Apache
que GitHub Pages ignora). Lo único que GitHub Pages sí hace es enviar HSTS
automáticamente **si activas «Enforce HTTPS»**.

## Qué ya está hecho en este repo

1. **CSP por `<meta>`** en `index.html` (conservadora, no rompe Tailwind/Font
   Awesome/Google Fonts): bloquea plugins (`object-src 'none'`), restringe
   `<base>` y fuerza HTTPS en subrecursos (`upgrade-insecure-requests`).
2. **`Referrer-Policy`** a nivel de documento vía `<meta name="referrer">`.
3. **`.htaccess` limpio y documentado**: antes eran ~660 líneas con casi todo
   comentado (falsa sensación de seguridad); ahora es corto, correcto y avisa de
   que GitHub Pages no lo usa.

Esto es un refuerzo, pero **no basta**: `<meta>` no puede fijar HSTS,
`X-Frame-Options`, `X-Content-Type-Options` ni `Permissions-Policy`. Para eso
hace falta un intermediario que sí añada cabeceras HTTP.

## El fix real: Cloudflare por delante (gratis)

Poner el sitio tras el proxy gratuito de Cloudflare permite inyectar todas las
cabeceras. Pasos:

### 1. Añadir el dominio a Cloudflare
1. Crea una cuenta en [cloudflare.com](https://www.cloudflare.com) y **Add a site**
   → `rubenpantxo.com` (plan Free).
2. Cloudflare te dará **dos nameservers**. Cámbialos en tu registrador
   (Squarespace Domains, según el WHOIS actual) para delegar el DNS a Cloudflare.
3. En Cloudflare, deja los registros que apuntan a GitHub Pages (los `A` a
   `185.199.108–111.153` y/o el `CNAME`) con el **proxy activado** (nube naranja).
4. En **SSL/TLS → Overview** elige **Full** (GitHub Pages ya sirve HTTPS válido).

### 2. Añadir las cabeceras (Rules → Transform Rules → Modify Response Header)

Crea una regla «Set static» para todas las peticiones (`hostname eq
"rubenpantxo.com"`) con estas cabeceras:

| Cabecera | Valor |
|----------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Content-Security-Policy` | ver más abajo |

CSP compatible con los CDN actuales (Tailwind Play necesita `'unsafe-eval'`):

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self';
img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com;
connect-src 'self' https:
```

> Para endurecer la CSP en el futuro: pasa de Tailwind Play (CDN, compila en el
> navegador) a **Tailwind precompilado**; entonces podrás quitar `'unsafe-eval'`
> y `'unsafe-inline'` de `script-src`.

### 3. Alternativa: Cloudflare Worker

Si prefieres un Worker en vez de Transform Rules, uno mínimo que añade las
cabeceras a cada respuesta:

```js
export default {
  async fetch(request, env, ctx) {
    const resp = await fetch(request);
    const h = new Headers(resp.headers);
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    h.set('X-Frame-Options', 'SAMEORIGIN');
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    return new Response(resp.body, { status: resp.status, headers: h });
  },
};
```

## Complementos en GitHub

- **Settings → Pages → Enforce HTTPS**: actívalo (HSTS automático de GitHub).
- Mantén el repo sin secretos: la zona privada usa un hash SHA-256 en cliente,
  que **solo oculta a curiosos**; no guardes ahí nada sensible.

## La app «Red Hogar» (repo aparte, en Vercel)

Su repositorio ya envía todas estas cabeceras vía `vercel.json` (Vercel sí
permite cabeceras HTTP propias), con una CSP estricta (`script-src 'self'`). No
necesita Cloudflare para esto.

## Cómo comprobarlo

Tras aplicar Cloudflare, vuelve a pasar el analizador de dominio de la app (o
`curl -I https://rubenpantxo.com`) y verás las seis cabeceras en verde.
