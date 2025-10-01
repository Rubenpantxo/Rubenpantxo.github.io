// Archivo único para mantener el contenido editable de la página principal.
// Modifica estos arrays para añadir noticias, aplicaciones o grupos de enlaces
// sin tocar el HTML. Usa el formato indicado en README.md para evitar errores.

window.siteData = {
  news: [
    {
      id: 'disco-optico-125tb',
      title: 'Nuevo récord de almacenamiento óptico: 125 TB en un solo disco',
      summary:
        'Investigadores de la Universidad de Shanghái logran un soporte óptico multicapa capaz de archivar 125 terabytes, pensado para centros de datos y bibliotecas científicas.',
      image: 'img/Noticias/Img_Noti_1.png',
      link: 'https://www.xataka.com/componentes/equipo-chino-crea-disco-optico-capaz-almacenar-125-tb',
      source: 'Xataka',
      tags: ['almacenamiento', 'hardware'],
      publishedAt: '2024-11-05'
    },
    {
      id: 'black-panther-robot',
      title: 'Black Panther 2.0, el perro-robot que corre a 36 km/h',
      summary:
        'La start-up china Dogture presenta un cuadrúpedo que combina motores de alto par e inteligencia artificial para misiones de logística y rescate urbano.',
      image: 'img/Noticias/Img_Noti_2.png',
      link: 'https://www.scmp.com/tech/big-tech/article/3256673/chinas-black-panther-20-robot-dog-can-sprint-36kmh',
      source: 'South China Morning Post',
      tags: ['robótica', 'movilidad'],
      publishedAt: '2024-10-19'
    },
    {
      id: 'photon-matrix-laser',
      title: 'Photon Matrix promete un verano sin mosquitos con láser e IA',
      summary:
        'La compañía estadounidense señala que su sistema identifica y neutraliza hasta 40 mosquitos por segundo, aunque aún busca certificaciones de seguridad ocular.',
      image: 'img/Noticias/Img_Noti_3.png',
      link: 'https://spectrum.ieee.org/mosquito-laser-ai',
      source: 'IEEE Spectrum',
      tags: ['salud', 'láseres', 'IA'],
      publishedAt: '2024-08-08'
    },
    {
      id: 'navarra-visor-3d',
      title: 'Navarra publica un visor 3D con ortofotos históricas y LiDAR',
      summary:
        'El nuevo portal cartográfico integra relieve de alta resolución y vuelos históricos para planificar proyectos territoriales y educativos en la Comunidad Foral.',
      image: 'img/Noticias/Img_Noti_4.jpg',
      link: 'https://www.navarra.es/es/noticias/2025/01/12/visor-3d-cartografia',
      source: 'Gobierno de Navarra',
      tags: ['cartografía', 'navarra'],
      publishedAt: '2025-01-12'
    }
  ],
  apps: [
    {
      id: 'solar-designer',
      title: 'Diseño Solar Visual',
      subtitle: 'Prototipo interactivo',
      description: 'Calcula la disposición de módulos fotovoltaicos y herrajes en cubiertas inclinadas con controles drag & drop.',
      icon: 'fa-solid fa-solar-panel',
      keywords: ['energía', 'fotovoltaica', 'diseño']
    },
    {
      id: 'menu-planner',
      title: 'Planificador semanal de menús',
      subtitle: 'Versión beta',
      description: 'Gestiona platos, calendario y lista de la compra sin salir del navegador. Ideal para organizar comidas familiares.',
      icon: 'fa-solid fa-bowl-food',
      keywords: ['hogar', 'organización', 'alimentación']
    },
    {
      id: 'creative-sketchbook',
      title: 'Cuaderno creativo digital',
      subtitle: 'En desarrollo',
      description: 'Espacio experimental para anotar ideas, wireframes y pequeñas pruebas interactivas directamente en el sitio.',
      icon: 'fa-solid fa-pen-ruler',
      keywords: ['creatividad', 'prototipos']
    }
  ],
  linkGroups: [
    {
      id: 'cartografia',
      title: 'Cartografía y territorio',
      description: 'Recursos oficiales para explorar datos geográficos de Navarra y su entorno.',
      icon: 'fa-solid fa-map-location-dot',
      links: [
        {
          label: 'Comparador de Mapas Navarra',
          url: 'https://comparamapas.navarra.es/?lang=es',
          description: 'Visualiza y compara ortofotos históricas, mapas topográficos y cartografía temática.',
          icon: 'fa-solid fa-map'
        },
        {
          label: 'IDENA',
          url: 'https://idena.navarra.es/',
          description: 'Infraestructura de Datos Espaciales de Navarra con descarga y visualización de capas oficiales.',
          icon: 'fa-solid fa-layer-group'
        }
      ]
    },
    {
      id: 'herramientas',
      title: 'Herramientas digitales',
      description: 'Utilidades en la nube para transformar documentos, imágenes y diagramas rápidamente.',
      icon: 'fa-solid fa-screwdriver-wrench',
      links: [
        {
          label: 'TinyWow',
          url: 'https://tinywow.com/',
          description: 'Suite gratuita de conversores para PDF, vídeo, imágenes y más tareas frecuentes.',
          icon: 'fa-solid fa-toolbox'
        },
        {
          label: 'Diagrams.net',
          url: 'https://app.diagrams.net/',
          description: 'Crea diagramas de flujo, mapas mentales y planos con guardado en la nube.',
          icon: 'fa-solid fa-diagram-project'
        }
      ]
    },
    {
      id: 'aprendizaje',
      title: 'Aprendizaje y recursos',
      description: 'Plataformas para seguir formándose y compartir documentación con tu equipo.',
      icon: 'fa-solid fa-graduation-cap',
      links: [
        {
          label: 'Alison',
          url: 'https://alison.com/',
          description: 'Miles de cursos online gratuitos con certificados opcionales.',
          icon: 'fa-solid fa-book-open'
        },
        {
          label: 'Almacenamiento en la Nube',
          url: 'https://mega.nz/folder/Uc4U3KpL#uzR3-BaRzcS9DZNo3nAxaw/folder/5RJQQLwD',
          description: 'Carpeta compartida para intercambiar archivos, manuales y material de apoyo.',
          icon: 'fa-solid fa-cloud'
        }
      ]
    },
    {
      id: 'ia-creatividad',
      title: 'Creatividad e inteligencia artificial',
      description: 'Explora herramientas de IA generativa para texto, imagen y prototipado rápido.',
      icon: 'fa-solid fa-robot',
      links: [
        {
          label: 'Google AI Studio',
          url: 'https://aistudio.google.com/prompts/new_chat',
          description: 'Experimenta con los modelos de Gemini para prototipar asistentes y flujos conversacionales.',
          icon: 'fa-solid fa-microchip'
        },
        {
          label: 'Midjourney',
          url: 'https://www.midjourney.com/home',
          description: 'Generador de imágenes por texto con estilo artístico y parámetros avanzados.',
          icon: 'fa-solid fa-palette'
        }
      ]
    }
  ]
};
