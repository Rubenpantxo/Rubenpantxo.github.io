# 🌱 Rubenpantxo · Garden Manager

Aplicación web profesional para la gestión integral de un huerto/cultivo. Vista isométrica clickable estilo "Los Sims", con secciones independientes para plantas, riego, stock, alertas, calendarios e infografías.

## ✨ Características

- 🎨 **Vista isométrica interactiva** con hotspots clickables (efecto glow profesional)
- 🌿 **Gestión de plantas** con ciclo completo (germinación → enraizamiento → crecimiento → floración → cosecha)
- 💧 **Sistema de riego** con cálculo automático de dosis según tabla Top Crop SOIL
- 📦 **Inventario de productos** + lista de compra + growshops + bancos de semillas
- ⚠️ **Alertas automáticas** (riego olvidado, cambio de fase, bidones bajos, plagas, meteo)
- 📅 **3 calendarios**: General, Riego, Lunar 2026
- 📊 **Galería de infografías** con lightbox y filtros por categoría
- 💾 **Persistencia LocalStorage** + export/import JSON para backups
- 🎯 **100% estático**: funciona desde GitHub Pages sin servidor backend

## 🚀 Despliegue en GitHub Pages + dominio rubenpantxo.com

### Paso 1: Crear el repositorio en GitHub

1. Crea un nuevo repositorio en https://github.com/new
2. Nómbralo `rubenpantxo-garden` (o cualquier nombre)
3. Hazlo **público** (requerido para GitHub Pages gratis)

### Paso 2: Subir los archivos

**Opción A - desde la web de GitHub** (más sencillo):
- Pulsa "uploading an existing file"
- Arrastra TODO el contenido de este ZIP (NO la carpeta superior, sino su contenido)
- Commit los cambios

**Opción B - por línea de comandos**:
```bash
cd rubenpantxo-garden
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/rubenpantxo-garden.git
git push -u origin main
```

### Paso 3: Activar GitHub Pages

1. En tu repo → **Settings** → **Pages**
2. En "Source", elige **Deploy from a branch**
3. Selecciona `main` / `(root)` → **Save**
4. Espera ~1 minuto y tu sitio estará en `https://TU_USUARIO.github.io/rubenpantxo-garden/`

### Paso 4: Configurar el dominio `rubenpantxo.com`

1. En **Settings → Pages → Custom domain**, escribe `rubenpantxo.com` y guarda
2. GitHub creará un archivo `CNAME` en tu repo automáticamente
3. En tu **proveedor de dominio** (donde compraste rubenpantxo.com), añade estos registros DNS:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | TU_USUARIO.github.io |

4. Espera 24-48h para la propagación DNS
5. Activa **Enforce HTTPS** en Settings → Pages

## 📁 Estructura del proyecto

```
rubenpantxo-garden/
├── index.html                   # Punto de entrada
├── README.md                    # Esta guía
├── css/
│   ├── fonts.css                # Carga de las 6 fuentes locales
│   ├── palettes.css             # Variables CSS de paletas por sección
│   ├── style.css                # Estilos globales + hub isométrico
│   └── sections.css             # Estilos por sección (plantas, riego, etc.)
├── js/
│   ├── app.js                   # Router de hash + inicialización
│   ├── storage.js               # LocalStorage + carga seed
│   ├── plants.js                # CRUD plantas
│   ├── watering.js              # Riego + cálculo dosis Top Crop
│   ├── stock.js                 # Inventario + lista compra
│   ├── alerts.js                # Sistema de alertas
│   ├── calendar.js              # 3 calendarios
│   └── infographics.js          # Galería con lightbox
├── assets/
│   ├── fonts/                   # 6 fuentes (.ttf/.otf)
│   ├── icons/                   # 67 iconos de la carpeta Mari
│   └── img/                     # parcela, fachada, interior, tabla
└── data/
    └── seed-data.json           # 11 plantas iniciales + stock + tabla cultivo
```

## 🌿 Plantas precargadas (puedes editarlas)

| # | Nombre | Raza | Banco | Ubicación | Fase |
|---|--------|------|-------|-----------|------|
| 1-2 | Jealousy #1, #2 | Jealousy | Barney's Farm | Invernadero | Crecimiento (sem. 2) |
| 3-4 | Nordle #1, #2 | Nordle | Sweet Seeds | Invernadero | Crecimiento (sem. 2) |
| 5 | Jealousy SM | Jealousy | Barney's Farm | Semillero | Enraizamiento (sem. 1) |
| 6 | Nordle SM | Nordle | Sweet Seeds | Semillero | Enraizamiento (sem. 1) |
| 7-10 | Monster #1-#4 | Monster | Eva Seeds | Germinación | Germinación |
| 11 | Jack Herer | Jack Herer | Sensi Seeds | Germinación | Germinación |

## 🎨 Paletas de colores por sección

| Sección | Color principal | HEX |
|---------|----------------|-----|
| Stock | Reddish Brown | `#8E412E` |
| Riego | Bud Green | `#5FAD56` |
| Alertas | Stormy Teal | `#1A615D` |
| Plantas | Hunter Green | `#3C5223` |
| Calendarios | Tea Green | `#CCD5AE` |
| Infografías | Light Bronze | `#D4A373` |

## 🖥 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge - últimas versiones)
- Pantalla mínima de **1024px** (optimizada para escritorio y tablet horizontal)
- JavaScript habilitado

## 💾 Backup de datos

- **Exportar**: Pulsa el botón ⬇ en la barra superior → descarga un JSON con todos tus datos
- **Importar**: Pulsa ⬆ → selecciona un backup → confirma para restaurar

Los datos se guardan automáticamente en el LocalStorage del navegador. Recuerda hacer backup periódicamente.

## 🔧 Desarrollo local

Simplemente abre `index.html` en cualquier navegador (no requiere servidor).

Para evitar problemas de CORS al cargar `data/seed-data.json`, puedes usar un servidor local:
```bash
# Python 3
python3 -m http.server 8000
# Luego visita http://localhost:8000
```

## 📜 Licencia y créditos

Aplicación personal desarrollada para `rubenpantxo.com`.
- Iconos: carpeta `Mari` (proporcionados por el usuario)
- Fuentes: Kestaik, Vito Bold, Coolvetica, Ketika Light, CFPlants
- Datos de cultivo: tabla oficial Top Crop SOIL

---

🌱 **Happy growing!**
