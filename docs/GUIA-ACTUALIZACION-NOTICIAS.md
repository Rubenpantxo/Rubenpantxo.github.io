# Guía de Actualización de Noticias

Esta guía explica cómo actualizar la sección de noticias de Rubenpantxo.com de forma manual o automática.

## Sistema de Actualización Automática

Se ha configurado un **GitHub Action** que se ejecuta automáticamente el primer día de cada trimestre (enero, abril, julio, octubre) y crea un **Issue de recordatorio** con instrucciones detalladas para actualizar las noticias.

### Frecuencia de Actualización
- **Trimestral**: Se recomienda actualizar las noticias cada 3 meses
- **Mantener 30-36 noticias**: Añadir 4-6 nuevas y eliminar las más antiguas

## Cómo Actualizar Manualmente

### Paso 1: Buscar Noticias Relevantes

Busca noticias recientes sobre:
- **Tecnología**: Nuevos productos, servicios, tendencias
- **Inteligencia Artificial**: Modelos, aplicaciones, avances
- **Robótica**: Robots humanoides, cobots, automatización
- **Mega-ingeniería**: Proyectos de construcción, infraestructura

#### Fuentes Recomendadas:
- [TechCrunch](https://techcrunch.com/)
- [Ars Technica](https://arstechnica.com/)
- [The Verge](https://www.theverge.com/)
- [Wired](https://www.wired.com/)
- [IEEE Spectrum](https://spectrum.ieee.org/)
- [MIT Technology Review](https://www.technologyreview.com/)
- [Xataka](https://www.xataka.com/) (en español)

### Paso 2: Editar el archivo index.html

1. Abre el archivo `index.html`
2. Busca la sección `<!-- Grid de noticias -->`
3. Añade las nuevas noticias **al principio** del grid (después del comentario)
4. Usa la siguiente plantilla:

```html
<!-- [Nombre de la noticia] -->
<article class="news-card bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
    <div class="news-image-container h-48 bg-gradient-to-br from-[COLOR1]-500 to-[COLOR2]-600 flex items-center justify-center">
        <i class="fas fa-[ICONO] text-white text-6xl"></i>
    </div>
    <div class="p-5">
        <span class="text-xs font-semibold text-[COLOR]-600 bg-[COLOR]-100 px-2 py-1 rounded mb-2 inline-block">[ETIQUETA]</span>
        <h3 class="font-bold text-lg mb-2 text-gray-800">[TÍTULO DE LA NOTICIA]</h3>
        <div class="news-preview text-sm text-gray-600 mb-3">
            <p>[Resumen de 1-2 líneas que termine en ...]</p>
        </div>
        <div class="news-full-content hidden text-sm text-gray-600 mb-3">
            <p>[Contenido completo de 4-6 líneas con más detalles]</p>
        </div>
        <button class="read-more-btn text-blue-600 hover:text-blue-800 font-semibold text-sm">Leer más →</button>
    </div>
</article>
```

### Paso 3: Actualizar el JSON (opcional pero recomendado)

Edita el archivo `data/noticias.json` para mantener un registro estructurado:

```json
{
  "id": "identificador-unico",
  "titulo": "Título de la Noticia",
  "resumen": "Resumen breve...",
  "contenido": "Contenido completo de la noticia.",
  "icono": "fa-robot",
  "gradiente": "from-blue-500 to-cyan-600",
  "etiqueta": "Categoría",
  "etiqueta_color": "blue",
  "fecha": "2026-01-01"
}
```

## Referencia de Iconos y Colores

### Iconos FontAwesome Recomendados

| Icono | Uso |
|-------|-----|
| `fa-robot` | Robótica |
| `fa-brain` | IA / Machine Learning |
| `fa-microchip` | Hardware / Procesadores |
| `fa-memory` | Memoria / Semiconductores |
| `fa-bolt` | Energía / Innovación |
| `fa-globe` | Global / Tendencias |
| `fa-satellite` | Espacio / Comunicaciones |
| `fa-rocket` | Innovación / Startups |
| `fa-atom` | Física / Cuántica |
| `fa-dna` | Biotecnología |
| `fa-solar-panel` | Energía renovable |
| `fa-car` | Automoción |
| `fa-industry` | Industria |
| `fa-building` | Construcción |
| `fa-server` | Infraestructura / Cloud |
| `fa-home` | Hogar inteligente |

### Colores de Gradiente

| Color | Clases |
|-------|--------|
| Azul | `from-blue-500 to-cyan-600` |
| Morado | `from-purple-500 to-pink-600` |
| Verde | `from-green-500 to-teal-600` |
| Naranja | `from-orange-500 to-red-600` |
| Amarillo | `from-amber-500 to-yellow-600` |
| Índigo | `from-indigo-500 to-purple-600` |
| Rosa | `from-pink-500 to-rose-600` |

### Colores de Etiqueta

| Etiqueta | Color de texto | Color de fondo |
|----------|----------------|----------------|
| Azul | `text-blue-600` | `bg-blue-100` |
| Verde | `text-green-600` | `bg-green-100` |
| Naranja | `text-orange-600` | `bg-orange-100` |
| Morado | `text-purple-600` | `bg-purple-100` |
| Rojo | `text-red-600` | `bg-red-100` |

## Ejecutar el Recordatorio Manualmente

Si necesitas ejecutar el workflow de recordatorio manualmente:

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona **Recordatorio Actualización de Noticias**
3. Clic en **Run workflow**
4. Se creará un Issue con las instrucciones

## Consejos

1. **Varía los colores**: Evita usar el mismo gradiente en noticias consecutivas
2. **Escribe resúmenes atractivos**: Termina siempre con `...` para generar curiosidad
3. **Contenido de calidad**: El contenido completo debe dar valor añadido al resumen
4. **Verifica los enlaces**: Si incluyes enlaces externos, verifica que funcionen
5. **Prueba localmente**: Abre el archivo HTML en un navegador antes de hacer commit

---

*Última actualización de esta guía: Enero 2026*
