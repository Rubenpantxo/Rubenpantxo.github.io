# 💡 AlumbradoPro

**Aplicación web de gestión de alumbrado público para instaladores eléctricos**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 📋 Descripción

AlumbradoPro es una herramienta interactiva diseñada para instaladores eléctricos especializados en alumbrado público. Permite gestionar y visualizar el estado de los puntos de luz de una localidad directamente sobre un mapa, facilitando el trabajo de campo.

### ✨ Características principales

- 🗺️ **Mapa interactivo** con capas OpenStreetMap, PNOA Ortofoto y Catastro
- 💡 **Gestión de luminarias**: Báculos, Focos y Farolas de pared
- 📦 **Control de Cofres**: Seguimiento del estado de fusibles
- 🚐 **Marcador de vehículo**: Localiza tu cesta/camión en el mapa
- 📊 **Estadísticas en tiempo real**: Encendidas, apagadas, cofres OK/NOT OK
- 💾 **Guardado automático**: Tus datos se guardan en el navegador
- 📥 **Exportación JSON**: Genera informes de tu trabajo
- 📱 **Responsive**: Funciona en móvil y tablet

## 🚀 Demo

La aplicación está configurada por defecto para **Ribafrecha, La Rioja**, pero puede adaptarse a cualquier localidad.

## 📁 Estructura del proyecto

```
alumbrado-pro/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   └── styles.css      # Estilos de la aplicación
│   ├── js/
│   │   ├── config.js       # Configuración (ubicación, iconos, capas)
│   │   └── app.js          # Lógica de la aplicación
│   └── icons/
│       ├── farola_baculo_logo.png
│       ├── On_farola_bac_logo.png
│       ├── farola_pared_logo.png
│       ├── On_farola_logo.png
│       ├── foco.jpg
│       ├── Cofred.png
│       ├── Ok_Cofred.png
│       └── Camion.jpg
├── docs/                   # Documentación adicional
├── README.md
├── LICENSE
└── .gitignore
```

## 🛠️ Instalación

### Opción 1: GitHub Pages (Recomendado)

1. Haz fork de este repositorio
2. Ve a **Settings > Pages**
3. Selecciona la rama `main` y carpeta `/ (root)`
4. Tu app estará disponible en `https://tuusuario.github.io/alumbrado-pro`

### Opción 2: Servidor local

```bash
# Clona el repositorio
git clone https://github.com/tuusuario/alumbrado-pro.git

# Entra en la carpeta
cd alumbrado-pro

# Abre con un servidor local (ejemplo con Python)
python -m http.server 8000

# O con Node.js
npx serve
```

Abre `http://localhost:8000` en tu navegador.

## ⚙️ Configuración

### Cambiar la localidad

Edita el archivo `assets/js/config.js`:

```javascript
const APP_CONFIG = {
    defaultLocation: {
        name: 'Tu Localidad, Provincia',
        lat: 42.0000,  // Latitud
        lng: -2.0000,  // Longitud
        zoom: 17
    },
    storageKey: 'alumbrado-tu-localidad',
    // ...
};
```

### Capas WMS adicionales

Puedes añadir más capas WMS en `LAYERS_CONFIG`:

```javascript
const LAYERS_CONFIG = {
    // ... capas existentes
    nuevaCapa: {
        url: 'https://url-del-servicio-wms',
        options: {
            layers: 'nombre_capa',
            format: 'image/png',
            transparent: true
        },
        isWMS: true,
        isBase: false,
        name: 'Nombre visible'
    }
};
```

## 📖 Uso

1. **Selecciona una herramienta** en el panel derecho (Báculo, Foco, Pared, Cofre o Vehículo)
2. **Haz clic en el mapa** para colocar el elemento
3. **Haz clic en un elemento** para cambiar su estado:
   - Luminarias: Encendida/Apagada
   - Cofres: OK/NOT OK (estado del fusible)
4. **Usa los filtros** para ver solo elementos pendientes o apagados
5. **Exporta tus datos** en formato JSON para informes

### Atajos de teclado

- 🎯 Botón centrar: Vuelve a la vista inicial
- 📑 Botón leyenda: Muestra/oculta la leyenda
- 🗺️ Botón capas: Cambia entre mapas y activa catastro

## 🗺️ Capas disponibles

| Capa | Fuente | Descripción |
|------|--------|-------------|
| OpenStreetMap | OSM | Callejero con nombres de calles |
| PNOA Ortofoto | IGN España | Fotografía aérea alta resolución |
| Catastro | DGC | Delimitación de parcelas |

## 📱 Compatibilidad

- ✅ Chrome (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ iOS Safari
- ✅ Android Chrome

## 🔧 Tecnologías utilizadas

- **HTML5** - Estructura
- **CSS3** - Estilos y responsive design
- **JavaScript ES6** - Lógica de aplicación
- **Leaflet.js** - Mapas interactivos
- **localStorage** - Persistencia de datos
- **WMS** - Capas cartográficas oficiales (IGN, Catastro)

## 📄 Formato de exportación

El archivo JSON exportado incluye:

```json
{
  "application": "AlumbradoPro",
  "version": "1.0.0",
  "location": "Ribafrecha, La Rioja",
  "exportDate": "2025-01-14T12:00:00.000Z",
  "summary": {
    "totalLuminarias": 25,
    "encendidas": 18,
    "apagadas": 7,
    "cofresOK": 20,
    "cofresNotOK": 3,
    "vehiculos": 1
  },
  "elements": [
    {
      "id": "B001",
      "type": "baculo",
      "lat": 42.3897,
      "lng": -2.3567,
      "status": "on",
      "createdAt": "2025-01-14T10:30:00.000Z"
    }
  ]
}
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👤 Autor

**Rubén Pantxo**
- Instalador eléctrico especializado en alumbrado público
- La Rioja / Navarra, España

## 🙏 Agradecimientos

- [Leaflet.js](https://leafletjs.com/) - Librería de mapas
- [IGN España](https://www.ign.es/) - Servicio PNOA
- [Catastro](https://www.catastro.meh.es/) - Servicio WMS
- [OpenStreetMap](https://www.openstreetmap.org/) - Datos cartográficos

---

⭐ Si te resulta útil, ¡dale una estrella al repositorio!
