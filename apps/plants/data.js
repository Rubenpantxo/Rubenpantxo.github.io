// =====================================================
// EcoGrow Cabanillas — Base de Datos Completa
// =====================================================

const strainDatabase = [
  // ============ ÍNDICA DOMINANTE ============
  {
    id: 'i1', subtype: 'indica', name: 'Northern Lights #5',
    tags: ['95% Índica', 'THC 18-22%', 'Fácil'],
    ratio: '95% Índica / 5% Sativa', thc: '18-22%', cbd: '<0.1%',
    floracion: '7-9 semanas', rendimiento: '400-500 g/m² interior',
    dificultad: 'Fácil',
    siembra: 'Mayo (exterior) / Todo el año (interior)',
    cosecha: 'Septiembre-Octubre (exterior)',
    summary: 'Una de las índicas más legendarias del mundo. Compacta, robusta, aroma dulce-terroso. Perfecta para iniciarse en el cultivo.',
    viabilidad: 'Excelente adaptación al clima continental de la Ribera de Navarra. Su ciclo corto (7-9 semanas de floración) permite cosechar antes de las lluvias otoñales. Tolera fluctuaciones de temperatura y resiste bien el estrés hídrico moderado. El cierzo puede ser beneficioso al fortalecer los tallos si se controla la exposición directa.',
    cultivo: 'Prefiere un régimen de nutrientes moderado; tolera bien la sobrealimentación pero rinde mejor con fertilización equilibrada. En vegetativo responde al 18/6 de luz. Cambiar a 12/12 para inducir floración. No necesita mucho espacio vertical (60-120 cm). Riego moderado dejando secar el sustrato entre riegos. pH ideal: 6.0-6.5 en tierra.',
    tecnicas: 'Responde excepcionalmente bien al Topping y al LST. Su estructura compacta la hace ideal para SCROG en interior. No requiere defoliación agresiva; basta con retirar las hojas que bloqueen la luz a los cogollos inferiores en la semana 3 de floración.',
    plagas: 'Alta resistencia genética a botrytis y oídio. Vigilar araña roja en ambientes secos y calurosos (>28°C, <40% HR). Tratamiento preventivo: aceite de neem cada 15 días en vegetativo. En floración, usar Bacillus thuringiensis contra orugas.',
    tricpiomas: 'Cosechar con 70-80% tricomas lechosos y 20-30% ámbar para efecto sedante completo tipo "couchlock". Para efecto más equilibrado, cosechar con 90% lechosos y 10% ámbar.'
  },
  {
    id: 'i2', subtype: 'indica', name: 'Hindu Kush',
    tags: ['100% Índica', 'THC 16-20%', 'Fácil'],
    ratio: '100% Índica pura', thc: '16-20%', cbd: '~0.5%',
    floracion: '7-8 semanas', rendimiento: '350-450 g/m²',
    dificultad: 'Fácil',
    siembra: 'Mayo (exterior)',
    cosecha: 'Finales de Septiembre',
    summary: 'Landrace pura de las montañas de Afganistán y Pakistán. Produce una resina densa y aromática con perfil terpénico a sándalo y especias.',
    viabilidad: 'Adaptada genéticamente a climas extremos de montaña (fríos nocturnos, calor diurno), por lo que el gradiente térmico de la Ribera le resulta familiar. Tolera suelos pobres y secos. Su porte bajo (80-100 cm) reduce el impacto del viento.',
    cultivo: 'Necesidades nutricionales bajas-medias. Excelente productora de resina. Mantener la humedad relativa por debajo del 50% en floración para maximizar la producción de tricomas. En exterior, plantar en la zona más soleada y protegida del viento directo.',
    tecnicas: 'Su estructura compacta tipo "arbusto de navidad" la hace ideal para SOG (Sea of Green) con múltiples plantas pequeñas. El LST es opcional; su baja altura ya permite buena penetración lumínica.',
    plagas: 'Resistencia natural elevada. Susceptible a ácaros en ambientes muy secos. El exceso de humedad en floración puede provocar botrytis en los cogollos centrales más densos. Ventilar y separar las ramas.',
    tricpiomas: 'Maduración uniforme. Los tricomas pasan de claros a lechosos rápidamente en la semana 7. Para efecto medicinal relajante, esperar a 40-50% ámbar.'
  },
  {
    id: 'i3', subtype: 'indica', name: 'Granddaddy Purple',
    tags: ['80% Índica', 'THC 17-23%', 'Media'],
    ratio: '80% Índica / 20% Sativa', thc: '17-23%', cbd: '<0.1%',
    floracion: '8-9 semanas', rendimiento: '450-550 g/m²',
    dificultad: 'Media',
    siembra: 'Mayo',
    cosecha: 'Octubre (primera quincena)',
    summary: 'Famosa por sus espectaculares tonos púrpuras y su perfil aromático a uva, bayas y lavanda. Efecto potente y relajante con euforia inicial.',
    viabilidad: 'Los colores púrpura se intensifican con las noches frescas de otoño en Navarra (diferencia >10°C entre día y noche), lo que convierte a Cabanillas en un lugar idóneo para expresar todo su potencial cromático. Necesita más atención que las anteriores.',
    cultivo: 'Alimentación media-alta; responde bien a fósforo y potasio extra durante la floración. Requiere soporte para las ramas en las últimas semanas ya que los cogollos se vuelven muy pesados. Regar con agua a pH 6.2-6.5.',
    tecnicas: 'El Topping en vegetativo produce excelentes resultados con 4 colas principales. SCROG muy recomendable. Defoliación moderada en semana 3 de floración para airear el interior de la planta.',
    plagas: 'Susceptibilidad media al oídio y botrytis. Las flores densas retienen humedad. Imprescindible buena circulación de aire. Tratamiento preventivo: extracto de cola de caballo cada 10 días.',
    tricpiomas: 'Maduración gradual. Cosechar cuando los tricomas de las hojas de azúcar (no las grandes) muestren 60% lechoso + 30% ámbar + 10% claro.'
  },
  {
    id: 'i4', subtype: 'indica', name: 'Critical Mass',
    tags: ['80% Índica', 'THC 19-22%', 'Fácil'],
    ratio: '80% Índica / 20% Sativa', thc: '19-22%', cbd: '1-2%',
    floracion: '6-8 semanas', rendimiento: '500-650 g/m² (masivo)',
    dificultad: 'Fácil',
    siembra: 'Mayo',
    cosecha: 'Finales de Septiembre',
    summary: 'Rendimiento descomunal. Los cogollos son tan densos y pesados que las ramas necesitan soporte. Floración rápida y aroma dulce-terroso con notas a madera.',
    viabilidad: 'Su floración ultra-rápida (6-8 semanas) es una ventaja estratégica en Cabanillas: permite cosechar a finales de septiembre, antes de que las nieblas del Ebro se instalen. El contenido de CBD (1-2%) le confiere propiedades medicinales interesantes.',
    cultivo: 'Alimentación alta; es una planta voraz que convierte nutrientes en biomasa floral con eficiencia brutal. Entutorar obligatoriamente desde la semana 4 de floración. Los cogollos pueden alcanzar el tamaño de un puño y partir ramas si no se soportan con mallas o cañas.',
    tecnicas: 'Ideal para SCROG y SOG. La poda apical (Topping) maximiza el número de colas. Defoliación necesaria en semana 2-3 de floración para evitar zonas de humedad estancada entre el follaje denso.',
    plagas: 'PUNTO CRÍTICO: la densidad extrema de los cogollos la hace MUY susceptible a botrytis (moho gris). En Cabanillas esto es un riesgo real por la humedad otoñal. Inspeccionar cogollos a diario desde semana 6. Retirar inmediatamente cualquier zona marrón/gris. Preventivo: Trichoderma harzianum en sustrato.',
    tricpiomas: 'Maduración rápida y uniforme. Los tricomas alcanzan el estado lechoso en la semana 6-7. No esperar mucho más: la densidad del cogollo y la humedad ambiental hacen que el riesgo de moho aumente cada día extra.'
  },

  // ============ SATIVA DOMINANTE ============
  {
    id: 's1', subtype: 'sativa', name: 'Amnesia Haze',
    tags: ['70% Sativa', 'THC 20-25%', 'Difícil'],
    ratio: '70% Sativa / 30% Índica', thc: '20-25%', cbd: '<0.1%',
    floracion: '10-12 semanas', rendimiento: '500-600 g/m²',
    dificultad: 'Difícil',
    siembra: 'Abril-Mayo (semillero) / Mayo exterior',
    cosecha: 'Noviembre (exterior) — RIESGO EN NAVARRA',
    summary: 'Sativa holandesa legendaria. Efecto cerebral eufórico, creativo e intensamente energizante. Aroma cítrico-terroso con notas a incienso.',
    viabilidad: 'ATENCIÓN: Su larguísima floración (10-12 semanas) la convierte en una apuesta arriesgada en exterior en Cabanillas. La cosecha caería en noviembre, en plena temporada de lluvias y nieblas. Solo recomendable en invernadero o en interior. En exterior, únicamente si el otoño es excepcionalmente seco.',
    cultivo: 'Planta alta (hasta 2 m en interior, 3 m en exterior). Necesita control de altura mediante poda y LST. Alimentación moderada-alta con énfasis en nitrógeno durante vegetativo. En floración, paciencia: parece que no engorda durante las primeras 4-5 semanas, pero luego explota.',
    tecnicas: 'Topping obligatorio para controlar altura. SCROG muy recomendable en interior. El supercropping ayuda a mantener las ramas dentro del dosel. En exterior, FIM para multiplicar colas y reducir la altura total de la planta.',
    plagas: 'Resistencia media. Su estructura abierta y aireada reduce el riesgo de botrytis respecto a las índicas densas. Vigilar trips y mosca blanca en las últimas semanas. La floración larga da tiempo a que se establezcan plagas persistentes.',
    tricpiomas: 'Maduración escalonada (típico de sativas). Los cogollos superiores maduran antes que los inferiores. Posible cosecha por etapas. Buscar 80% lechosos + 15% ámbar + 5% claros para equilibrio euforia/relajación.'
  },
  {
    id: 's2', subtype: 'sativa', name: 'Jack Herer',
    tags: ['55% Sativa', 'THC 18-23%', 'Media'],
    ratio: '55% Sativa / 45% Índica', thc: '18-23%', cbd: '<0.1%',
    floracion: '8-10 semanas', rendimiento: '450-550 g/m²',
    dificultad: 'Media',
    siembra: 'Mayo',
    cosecha: 'Octubre',
    summary: 'Bautizada en honor al activista cannábico. Equilibrio perfecto entre euforia sativa y relajación índica. Aroma complejo a pimienta, pino y madera.',
    viabilidad: 'Buena viabilidad en Cabanillas. Su floración de 8-10 semanas permite cosechar en octubre, al límite pero factible si el otoño no se adelanta. La genética híbrida le da más resistencia al frío que las sativas puras.',
    cultivo: 'Altura moderada (100-170 cm). Alimentación equilibrada NPK. Responde excepcionalmente a la optimización del espectro lumínico: en interior, añadir luz roja lejana (730nm) durante las últimas semanas para potenciar la producción de resina.',
    tecnicas: 'Excelente candidata para cualquier técnica: Topping, FIM, LST, SCROG. Su estructura ramificada natural produce múltiples sitios de floración sin intervención. Defoliación ligera.',
    plagas: 'Resistencia buena. Su perfil terpénico rico en pineno actúa como repelente natural de ciertos insectos. Vigilar oídio si las noches otoñales son húmedas.',
    tricpiomas: 'Tricomas de cabeza grande y tallo largo, muy visibles a simple vista en las últimas semanas. Cosechar con 70-80% lechosos para maximizar el efecto creativo/social.'
  },
  {
    id: 's3', subtype: 'sativa', name: 'Durban Poison',
    tags: ['100% Sativa', 'THC 20-26%', 'Media'],
    ratio: '100% Sativa pura', thc: '20-26%', cbd: '<0.2%',
    floracion: '9 semanas (rápida para sativa)', rendimiento: '400-500 g/m²',
    dificultad: 'Media',
    siembra: 'Mayo',
    cosecha: 'Primera quincena de Octubre',
    summary: 'Landrace sudafricana 100% sativa con floración sorprendentemente rápida. Efecto energizante puro, ideal para el día. Aroma a anís, regaliz y menta.',
    viabilidad: 'Una de las pocas sativas puras viables en exterior en Cabanillas. Su floración en solo 9 semanas (extraordinario para una sativa pura) permite cosechar a principios de octubre. Su origen subtropical la hace tolerante al calor extremo estival.',
    cultivo: 'Puede alcanzar 2-3 m en exterior sin control. Alimentación moderada; no sobrealimentar con nitrógeno para evitar estirón excesivo. La planta produce resina abundante y pegajosa incluso en las hojas de abanico.',
    tecnicas: 'Topping imprescindible en exterior para controlar altura. FIM produce 4-5 colas de buen tamaño. LST agresivo desde vegetativo temprano para mantenerla por debajo de 1.5 m.',
    plagas: 'Excelente resistencia natural a moho y plagas (adaptación genética a climas húmedos subtropicales). La producción masiva de resina actúa como barrera física contra insectos pequeños.',
    tricpiomas: 'Los tricomas maduran de forma bastante uniforme para ser una sativa. Buscar 85% lechosos + 10% ámbar para el efecto energizante característico. No dejar pasar de 20% ámbar o el efecto pierde su carácter sativa.'
  },
  {
    id: 's4', subtype: 'sativa', name: 'Sour Diesel',
    tags: ['90% Sativa', 'THC 19-25%', 'Difícil'],
    ratio: '90% Sativa / 10% Índica', thc: '19-25%', cbd: '<0.2%',
    floracion: '10-12 semanas', rendimiento: '450-600 g/m²',
    dificultad: 'Difícil',
    siembra: 'Abril (semillero) / Mayo exterior',
    cosecha: 'Noviembre — Solo invernadero en Navarra',
    summary: 'Icono de la costa este americana. Aroma inconfundible a diésel, cítrico y herbal. Efecto cerebral potente, energizante y creativo de larga duración.',
    viabilidad: 'Como la Amnesia Haze, su larga floración la hace inviable en exterior abierto en Cabanillas. Recomendable exclusivamente en invernadero o interior. En un invernadero sin calefacción en la Ribera, puede terminar su ciclo aprovechando el calor acumulado si septiembre y octubre no son excesivamente lluviosos.',
    cultivo: 'Planta alta y vigorosa que estira mucho en las primeras semanas de floración (puede triplicar su altura). Planificar el espacio vertical. Necesita mucha luz. Alimentación moderada; sensible a excesos de nutrientes. pH 6.0-6.3.',
    tecnicas: 'Topping y supercropping obligatorios para controlar la altura. SCROG ideal en interior. La defoliación estratégica es importante: retirar las hojas grandes que sombrean los cogollos inferiores en las semanas 3 y 6 de floración.',
    plagas: 'Su estructura abierta y aireada protege contra botrytis. Susceptible a mosca blanca y pulgón en ambientes cerrados. Trampas cromáticas amarillas como prevención.',
    tricpiomas: 'Maduración lenta y escalonada. Cosechar los cogollos superiores primero (alcanzan madurez 7-10 días antes que los inferiores). Buscar 75% lechosos + 20% ámbar.'
  },

  // ============ HÍBRIDOS ============
  {
    id: 'h1', subtype: 'hibrido', name: 'Frisian Dew',
    tags: ['50/50 Híbrido', 'THC 15-17%', 'Fácil'],
    ratio: '50% Índica / 50% Sativa', thc: '15-17%', cbd: '~0.3%',
    floracion: '8-9 semanas', rendimiento: '350-500 g/planta exterior',
    dificultad: 'Fácil',
    siembra: 'Mediados de Mayo',
    cosecha: 'Finales de Septiembre - Principios de Octubre',
    summary: 'Híbrido holandés de prestigio internacional por su resistencia hercúlea al moho y su rápida floración. Ideal para el clima de la Ribera.',
    viabilidad: 'Cultivar cannabis al aire libre en Cabanillas supone una carrera contrarreloj contra las nieblas húmedas y las lluvias otoñales del Valle del Ebro que se instalan en octubre. Frisian Dew resuelve este cuello de botella gracias a su genotipo que induce maduración acelerada en 8-9 semanas, permitiendo la recolección antes de que el clima se deteriore.',
    cultivo: 'En un entorno azotado por el cierzo, dejar crecer un fenotipo de este vigor de forma apical (vertical) es un error que culmina en ramas fracturadas. El sustrato debe ser rico y bien drenado. Riego moderado, dejando que la capa superior del suelo seque entre riegos.',
    tecnicas: 'Se exige la aplicación de LST o podas apicales repetidas (FIM, Topping) en junio. Esto altera la dominancia auxínica, obligando a desarrollar una estructura en candelabro multicéfalo, reduciendo el centro de gravedad aerodinámico y multiplicando el rendimiento floral.',
    plagas: 'A pesar de su formidable resistencia genética a la Botrytis cinerea, se recomienda instalar las plantas en áreas de alta insolación y ventilación natural, evitando vaguadas donde el aire frío y húmedo se estanque durante la noche. Frente al oídio, aspersiones preventivas con extracto de cola de caballo (Equisetum arvense) fortalecen la pared celular.',
    tricpiomas: 'Maduración bastante uniforme. Los tonos púrpuras del fenotipo colorido aparecen naturalmente con las noches frescas. Cosechar con 70% lechosos + 25% ámbar para efecto equilibrado cuerpo/mente.'
  },
  {
    id: 'h2', subtype: 'hibrido', name: 'OG Kush',
    tags: ['75% Índica', 'THC 19-26%', 'Difícil'],
    ratio: '75% Índica / 25% Sativa', thc: '19-26%', cbd: '~0.3%',
    floracion: '8-9 semanas', rendimiento: '400-500 g/m²',
    dificultad: 'Difícil',
    siembra: 'Mayo',
    cosecha: 'Octubre',
    summary: 'La genética más influyente de la historia moderna del cannabis. Base de cientos de cruces. Aroma complejo a tierra, pino, limón y combustible.',
    viabilidad: 'Viable en Cabanillas pero exige atención. Es una planta "diva" que no tolera bien los cambios bruscos de temperatura ni el estrés hídrico. Mejor en invernadero o en ubicación protegida. Su floración en 8-9 semanas la coloca en el límite temporal aceptable para exterior.',
    cultivo: 'Muy sensible al pH del agua y sustrato (rango estrecho: 6.2-6.5). Propensa a mostrar deficiencias de calcio y magnesio. Suplementar con CalMag desde vegetativo. Alimentación media; no tolera excesos de nutrientes (puntas quemadas rápidamente).',
    tecnicas: 'Responde bien al Topping y LST. SCROG produce resultados excepcionales. Es una planta que "premia" al cultivador experimentado con cosechas espectaculares y "castiga" los errores con deficiencias y estrés.',
    plagas: 'Susceptible a oídio, especialmente con cambios bruscos de temperatura (día/noche). Preventivo: mantener HR <55% en floración. Susceptible a araña roja en ambiente seco.',
    tricpiomas: 'Producción masiva de tricomas que se extienden por todas las hojas de azúcar. Cosechar con 60% lechosos + 30% ámbar para el efecto "OG" clásico (euforia seguida de relajación profunda).'
  },
  {
    id: 'h3', subtype: 'hibrido', name: 'White Widow',
    tags: ['60% Índica', 'THC 18-25%', 'Media'],
    ratio: '60% Índica / 40% Sativa', thc: '18-25%', cbd: '~0.2%',
    floracion: '8-9 semanas', rendimiento: '450-500 g/m²',
    dificultad: 'Media',
    siembra: 'Mayo',
    cosecha: 'Finales de Septiembre - Octubre',
    summary: 'Clásica holandesa de los coffeeshops de Ámsterdam desde los 90. Su nombre proviene de la capa blanca de tricomas que cubre los cogollos como escarcha.',
    viabilidad: 'Muy buena adaptación a climas templados europeos. Resistencia natural al frío y a la humedad por encima de la media. Es una de las opciones más equilibradas para exterior en Cabanillas: floración razonable, resistencia aceptable y rendimiento consistente.',
    cultivo: 'Planta de mantenimiento medio. Tolera errores de riego y fertilización mejor que la OG Kush. Altura moderada (100-150 cm). Prefiere sustrato bien aireado con perlita (30%).',
    tecnicas: 'Topping estándar para duplicar colas principales. LST ligero para abrir la estructura. No necesita defoliación agresiva; su estructura natural permite buena penetración de luz.',
    plagas: 'Resistencia al moho por encima de la media. En otoños húmedos, vigilar botrytis en los cogollos principales. Los tricomas densos pueden atrapar humedad: asegurar ventilación.',
    tricpiomas: 'La "viuda blanca" debe su nombre a los tricomas: son grandes, abundantes y muy visibles. El momento óptimo de cosecha es cuando esa capa blanca empieza a tornarse ligeramente ámbar (70% lechosos + 25% ámbar).'
  },
  {
    id: 'h4', subtype: 'hibrido', name: 'Blue Dream',
    tags: ['60% Sativa', 'THC 17-24%', 'Fácil'],
    ratio: '60% Sativa / 40% Índica', thc: '17-24%', cbd: '<0.1%',
    floracion: '9-10 semanas', rendimiento: '500-600 g/m²',
    dificultad: 'Fácil',
    siembra: 'Mayo',
    cosecha: 'Primera-segunda semana de Octubre',
    summary: 'La variedad más popular de la costa oeste americana. Efecto equilibrado y accesible. Aroma dulce a arándanos, vainilla y notas frutales.',
    viabilidad: 'Sorprendentemente adaptable a climas variados. Su herencia Blueberry (índica) le confiere resistencia al frío mientras que la Haze aporta vigor. Su floración de 9-10 semanas es ajustada para Cabanillas pero viable en años con octubre seco.',
    cultivo: 'Planta vigorosa y "fácil de contentar". Tolera bien la alimentación abundante sin mostrar signos de toxicidad. Puede estirarse bastante en las primeras semanas de floración. Riego generoso pero sin encharcamiento.',
    tecnicas: 'Excelente respuesta al SCROG. El Topping produce una canopia uniforme ideal. FIM también funciona bien. Su vigor natural la hace muy recuperable: tolera podas agresivas sin detenerse.',
    plagas: 'Susceptible a araña roja en ambientes calurosos y secos. Resistencia moderada a moho. Sus cogollos son medianamente densos, lo que reduce el riesgo de botrytis respecto a índicas puras.',
    tricpiomas: 'Maduración gradual y uniforme. Para el efecto "Blue Dream" clásico (euforia suave con relajación corporal), cosechar con 75% lechosos + 20% ámbar.'
  },

  // ============ AUTOFLORECIENTES ============
  {
    id: 'a1', subtype: 'auto', name: 'Amnesia Auto',
    tags: ['Auto/Sativa', 'THC 15-20%', 'Fácil'],
    ratio: 'Ruderalis x Sativa dominante', thc: '15-20%', cbd: '<0.2%',
    floracion: 'Ciclo completo: 60-70 días', rendimiento: '40-80 g/planta',
    dificultad: 'Fácil',
    siembra: 'Primeros de Junio',
    cosecha: 'Mediados de Agosto',
    summary: 'Genética Ruderalis cruzada con sativa. Su independencia del fotoperiodo permite programar siembras para que el ciclo completo ocurra en los meses más secos y seguros del verano.',
    viabilidad: 'Representa el pináculo de la mitigación de riesgos climáticos en Navarra. Estas plantas no dependen del acortamiento de los días para iniciar la floración; su reloj biológico detona el proceso a las 3-4 semanas de germinar. Plantadas en junio, capitalizan la radiación solar extrema del solsticio, madurando íntegramente en julio y agosto, burlando el rocío patógeno de septiembre.',
    cultivo: 'Debido a su vida comprimida a 70 días, no perdonan errores. Sembrar directamente en maceta definitiva (mínimo 15-20 litros con sustrato oxigenado con perlita), ya que el estrés de un trasplante detiene el crecimiento varios días. Fertilización orgánica progresiva y altamente biodisponible.',
    tecnicas: 'NO admite podas apicales (Topping/FIM) bajo ningún concepto: no hay tiempo de recuperación. Solo LST suave para abrir la estructura. La defoliación debe ser mínima y quirúrgica.',
    plagas: 'La velocidad de su ciclo las convierte en blancos difíciles para muchas plagas estacionales. Vigilar microácaros y mosca del sustrato. Prevención: tierra de diatomeas en la superficie del suelo.',
    tricpiomas: 'Maduración rápida. Vigilar diariamente a partir del día 55. Los tricomas pasan de claros a lechosos en pocos días. Cosechar cuando alcancen 70% lechosos + 20% ámbar.'
  },
  {
    id: 'a2', subtype: 'auto', name: 'Northern Lights Auto',
    tags: ['Auto/Índica', 'THC 14-18%', 'Muy Fácil'],
    ratio: 'Ruderalis x Índica dominante', thc: '14-18%', cbd: '~0.5%',
    floracion: 'Ciclo completo: 55-65 días', rendimiento: '30-70 g/planta',
    dificultad: 'Muy Fácil',
    siembra: 'Junio',
    cosecha: 'Principios de Agosto',
    summary: 'La versión autofloreciente de la legendaria Northern Lights. Perfecta para principiantes absolutos. Discreta, compacta y prácticamente a prueba de errores.',
    viabilidad: 'La opción más segura y conservadora para cultivar en Cabanillas. Su ciclo de apenas 55-65 días y su tamaño reducido (40-80 cm) permiten cultivarla incluso en balcones o terrazas con discreción total. Cosecha en pleno agosto, sin ningún riesgo climático.',
    cultivo: 'Mínimas necesidades. Maceta de 10-15 litros suficiente. Sustrato ligero con algo de perlita. Riego moderado. Fertilización suave (la mitad de lo que indica el fabricante). Es la planta que "perdona todo".',
    tecnicas: 'No requiere entrenamiento. Su porte natural es compacto y productivo. Si acaso, un LST muy suave para exponer los cogollos laterales a la luz. Nada más.',
    plagas: 'Resistencia excepcional heredada de la Northern Lights. Raramente sufre problemas si se mantienen condiciones higiénicas básicas.',
    tricpiomas: 'Los tricomas alcanzan el estado lechoso muy rápido (día 50-55). Para efecto relajante, dejar hasta 40% ámbar. Es difícil equivocarse con esta planta.'
  },
  {
    id: 'a3', subtype: 'auto', name: 'Gorilla Glue Auto',
    tags: ['Auto/Híbrido', 'THC 24-26%', 'Media'],
    ratio: 'Ruderalis x Híbrido (GG#4)', thc: '24-26%', cbd: '<0.1%',
    floracion: 'Ciclo completo: 63-70 días', rendimiento: '60-100 g/planta',
    dificultad: 'Media',
    siembra: 'Junio',
    cosecha: 'Mediados-finales de Agosto',
    summary: 'Potencia extrema en formato autofloreciente. Produce cantidades obscenas de resina que literalmente pega las tijeras al manicurar. Aroma a pino, chocolate y diesel.',
    viabilidad: 'Excelente para Cabanillas: ciclo seguro en verano, potencia de élite. La producción de resina es tan elevada que resulta interesante también para extracciones (hachís, rosin). Necesita más atención que otras autos pero recompensa con creces.',
    cultivo: 'Maceta de 15-20 litros mínimo. Sustrato premium con micorriza. Alimentación progresiva media-alta. Sensible al exceso de riego. Dejar secar bien entre riegos. La resina empieza a ser visible desde la semana 4.',
    tecnicas: 'Tolera LST suave desde el principio. Algunos cultivadores experimentados hacen un Topping muy temprano (día 15-18) en esta genética específica con buenos resultados, pero solo si la planta muestra vigor excepcional. Para principiantes: solo LST.',
    plagas: 'La capa de resina actúa como trampa natural para insectos pequeños. Vigilar oídio si hay contraste térmico fuerte. La densidad del cogollo requiere vigilancia contra botrytis en las últimas semanas.',
    tricpiomas: 'Producción masiva. Los tricomas son grandes y fácilmente visibles. Cosechar con 65% lechosos + 30% ámbar para el efecto "Gorilla" completo: golpe cerebral seguido de relajación total.'
  },

  // ============ CBD / CÁÑAMO ============
  {
    id: 'cbd1', subtype: 'cbd', name: 'Cáñamo Industrial (Midwest/Northwest)',
    tags: ['THC <0.2%', 'CBD 3-8%', 'Agrícola'],
    ratio: 'Variable según variedad', thc: '<0.2% (legal)', cbd: '3-8%',
    floracion: 'Septiembre (fotoperiódico)', rendimiento: '1-2 Tn/hectárea biomasa',
    dificultad: 'Fácil',
    siembra: 'Abril - Mayo',
    cosecha: 'Septiembre',
    summary: 'Cultivo agrícola en auge con ensayos exitosos en Navarra (INTIA). Variedades certificadas bajas en THC destinadas a fibra, semillas y biomasa CBD.',
    viabilidad: 'Según datos del INTIA y la UPNA (campañas 2023-2024), genéticas como Midwest, Northwest y OGK demuestran adaptabilidad fenotípica extraordinaria a la Ribera. Su raíz pivotante descompacta el suelo aluvial, consolidándose como cultivo de rotación estratégico previo a cereales de invierno.',
    cultivo: 'Siembra temprana en abril-mayo aprovecha el incremento de luz diurna para desarrollo vegetativo explosivo. Laboreo profundo del lecho. Densidad alta: las plantas compiten por luz, creciendo rectas y altas (favorece fibra). Requiere menos riego que el maíz pero demanda abonado basal rico en nitrógeno orgánico las primeras seis semanas.',
    tecnicas: 'En producción agrícola no se aplican técnicas de entrenamiento. La clave es la densidad de siembra y el momento de cosecha según el objetivo (fibra vs. flor CBD).',
    plagas: 'Las orugas defoliadoras (Spodoptera exigua) y larvas del gusano del cogollo (Helicoverpa armigera) pueden diezmar las inflorescencias. Tratamiento ecológico: Bacillus thuringiensis var. kurstaki foliar.',
    tricpiomas: 'No aplica de la misma forma que en variedades psicoactivas. Para producción de CBD, cosechar cuando las flores estén maduras pero antes de que las semillas cuajen.'
  },
  {
    id: 'cbd2', subtype: 'cbd', name: 'Charlotte\'s Web',
    tags: ['THC <0.3%', 'CBD 15-20%', 'Medicinal'],
    ratio: 'Híbrido alto CBD', thc: '<0.3%', cbd: '15-20%',
    floracion: '9-10 semanas', rendimiento: '400-500 g/m²',
    dificultad: 'Media',
    siembra: 'Mayo',
    cosecha: 'Octubre',
    summary: 'La variedad que revolucionó el cannabis medicinal. Desarrollada para tratar epilepsia infantil. Ratio CBD:THC de hasta 30:1. Sin efecto psicoactivo.',
    viabilidad: 'Viable en Cabanillas con precauciones estándar de otoño. Su uso medicinal (aceites, infusiones, tópicos) la convierte en una opción interesante para autocultivo terapéutico. La legalidad varía: consultar normativa vigente.',
    cultivo: 'Similar a cualquier híbrido fotoperiódico. Cambiar a 12/12 para inducir floración. Alimentación moderada. No sobrealimentar: el exceso de nitrógeno puede reducir el contenido de CBD. Suelo ligeramente ácido (pH 6.0-6.5).',
    tecnicas: 'Topping y LST estándar. SCROG funciona bien. El objetivo no es maximizar el tamaño del cogollo sino la calidad del perfil de cannabinoides: cosechar en el momento justo es más importante que el rendimiento total.',
    plagas: 'Resistencia media. Aplicar las mismas precauciones que con cualquier híbrido. El bajo contenido de THC implica menos resina protectora.',
    tricpiomas: 'En variedades CBD, los tricomas son igualmente importantes. Cosechar cuando estén mayoritariamente lechosos (80%+). Los tricomas ámbar indican degradación de CBD a otros cannabinoides menos deseados para uso medicinal.'
  }
];

// =====================================================
// AMIGAS DEL HUERTO — Plantas del código original
// =====================================================

const gardenDatabase = [
  // ============ FRUTALES Y ÁRBOLES ============
  {
    id: 'f1', category: 'frutas', name: 'Manzano Reina de Reinetas',
    tags: ['Frutal Autóctono', 'Clima Ideal', 'Exigente'],
    siembra: 'Finales de Febrero - Marzo (Raíz Desnuda)',
    cosecha: 'Agosto - Septiembre',
    summary: 'Variedad autóctona y clásica. Manzana de excelente calidad gustativa que se adapta perfectamente al invierno navarro.',
    viabilidad: 'Excepcional rusticidad. Requiere alta acumulación de horas-frío invernales para romper el letargo de las yemas, condición que se cumple sobradamente en Cabanillas. Su floración moderadamente tardía escapa al riesgo de escarchas primaverales severas. Arraigo excelente en suelos francos de las terrazas del Ebro.',
    cuidados: 'Plantación obligatoria durante parada vegetativa (enero-marzo). Poda de formación en vaso para que la radiación solar penetre y coloree los frutos. Poda de fructificación a finales de febrero. Para evitar vecera, aclareo manual riguroso en mayo dejando un solo fruto por corimbo.',
    plagas: 'Carpocapsa (Cydia pomonella) y pulgón lanígero son las principales amenazas. Confusión sexual con difusores de feromonas en abril. Pulverización foliar con aceite de Neem para interrumpir ciclos de muda larval.'
  },
  {
    id: 'f2', category: 'frutas', name: 'Ciruelo de Urrizola',
    tags: ['Autóctono Navarro', 'Sin Tratamientos', 'Fácil'],
    siembra: 'Enero - Febrero',
    cosecha: 'Finales de Junio - Principios de Julio',
    summary: 'Variedad local excepcionalmente rústica. Frutos oscuros, pequeños y dulces sin requerir prácticamente cuidados.',
    viabilidad: 'Descrito en catálogos etnobotánicos navarros como híbrido espontáneo entre pacharán y ciruela. Vigor genético sobresaliente. Resiste el cierzo y tolera riegos por inundación. Capacidad productiva anual y masiva.',
    cuidados: 'Podas ligeras de limpieza en julio (post-cosecha) y sanitaria menor en febrero. Propenso a emitir hijuelos basales que deben arrancarse mecánicamente.',
    plagas: 'Inmunidad natural contra la mayoría de patógenos. En primaveras húmedas, posible pulgón controlable con jabón potásico en horas de menor insolación.'
  },
  {
    id: 'f3', category: 'frutas', name: 'Azufaifo (Ziziphus jujuba)',
    tags: ['Exótico Adaptado', 'Resistencia Extrema', 'Media'],
    siembra: 'Marzo',
    cosecha: 'Finales de Septiembre - Octubre',
    summary: 'Frutal exótico de origen asiático de extremada dureza. Frutos ricos en vitamina C con sabor a manzana.',
    viabilidad: 'Una de las especies frutales exóticas más recomendables para Cabanillas. Raíz pivotante profunda resistente a sequía y suelos alcalinos. Floración tardía (mayo-junio) que anula riesgo de heladas. El cierzo apenas afecta a sus hojas coriáceas.',
    cuidados: 'Exposición a pleno sol innegociable. Poda meramente estética. Factor limitante: lluvias otoñales pueden provocar rajado ("cracking") de frutos maduros. Instalar plásticos cobertores temporales.',
    plagas: 'Libre de plagas sistémicas. Si los frutos maduros se mantienen excesivamente en el árbol, la mosca de la fruta (Ceratitis capitata) depositará huevos. Cosechar en momento óptimo y colgar trampas de vinagre de manzana.'
  },
  {
    id: 'f4', category: 'frutas', name: 'Feijoa (Acca sellowiana)',
    tags: ['Subtropical', 'Reto Técnico', 'Difícil'],
    siembra: 'Abril (Evitar heladas)',
    cosecha: 'Noviembre',
    summary: 'Guayabo del Brasil. Arbusto frutal exótico de flores espectaculares y frutos subtropicales, todo un reto en la Ribera.',
    viabilidad: 'Reto técnico superlativo. No tolera heladas continuadas bajo -5°C. El cierzo provoca abrasión foliar y caída de flores. Debe ubicarse en microclima protegido: adosado a muro sur que actúe como masa térmica.',
    cuidados: 'Cubrir con manta térmica los tres primeros inviernos. Los suelos calizos inducen clorosis férrica: aportar mensualmente quelatos de hierro (EDDHA) con abonos de reacción ácida.',
    plagas: 'En ambientes cálidos confinados prolifera cochinilla algodonosa y trips. Aspersiones con agua y aceite de Neem empapando el envés de las hojas.'
  },

  // ============ VERDURAS Y HORTALIZAS ============
  {
    id: 'v1', category: 'verduras', name: 'Espárrago Blanco de Navarra',
    tags: ['Insignia Ribera', 'Técnica Exigente', 'Media'],
    siembra: 'Febrero - Marzo (Plantación de garras)',
    cosecha: 'Abril - Junio (A partir del segundo año)',
    summary: 'El cultivo insignia de la Ribera. Turiones desarrollados en caballones de tierra para evitar la fotosíntesis.',
    viabilidad: 'Los perfiles edáficos de las terrazas del Ebro (franco-arenosos a franco-limosos) son el hábitat supremo para las garras del espárrago. El clima continental asegura el reposo invernal para acumulación de reservas amiláceas en el rizoma.',
    cuidados: 'Preparación del lecho extremadamente profunda. Compost o estiércol maduro como abonado de fondo en invierno. Aporcar formando caballones antes de que el turión emerja. Recolección manual al alba con gubia.',
    plagas: 'Mosca del espárrago (Plioreocepta poeciloptera) y criocero (Crioceris asparagi). Tratamiento preventivo: siega y destrucción total de la parte aérea seca en noviembre.'
  },
  {
    id: 'v2', category: 'verduras', name: 'Borraja (Borago officinalis)',
    tags: ['Endémica Valle Ebro', 'Huerto Invierno', 'Fácil'],
    siembra: 'Agosto-Septiembre (invierno) / Marzo (primavera)',
    cosecha: 'Diciembre-Marzo / Mayo',
    summary: 'Hortaliza endémica del Valle del Ebro de consumo reverencial en Navarra. Pilar del huerto de invierno.',
    viabilidad: 'Especie perfectamente sincronizada con los ritmos biológicos de Cabanillas. Tricomas foliares protegen contra micro-congelaciones y deshidratación. Prospera en suelos pesados y calcáreos.',
    cuidados: 'Siembras de agosto-septiembre garantizan verdura en invierno. Riegos iniciales abundantes para germinación homogénea. Las siembras tardías de primavera sufrirán espigado prematuro con el calor estival.',
    plagas: 'Los ápices tiernos atraen pulgón verde. Control con fauna auxiliar (mariquitas) y jabón potásico al 2%.'
  },
  {
    id: 'v3', category: 'verduras', name: 'Cebolla para Calçots',
    tags: ['Ciclo Largo', 'Técnica Especial', 'Media'],
    siembra: 'Abril (Semilla) / Septiembre (Replante bulbo)',
    cosecha: 'Enero - Marzo',
    summary: 'Cultivo de ciclo largo con dos fases de plantación. Tallos etiolados tiernos, ideales para asar.',
    viabilidad: 'Aunque es cultivo tradicionalmente catalán, las cebollas blancas tardías se aclimatan bien a las condiciones invernales de Navarra. Aprovecha el reposo vegetativo del frío para generar múltiples brotes.',
    cuidados: 'Abril: sembrar semilla. Septiembre: desentierrar, recortar parte superior, replantar en zanjas profundas. Conforme emergen brotes, amontonar tierra (etiolación) para blancura y ternura.',
    plagas: 'Mosca de la cebolla (Delia antiqua). Defensa ecológica: alternar hileras con zanahorias (enmascaramiento olfativo recíproco).'
  },
  {
    id: 'v4', category: 'verduras', name: 'Tomate de la Ribera (Variedades Antiguas)',
    tags: ['Emblema Estival', 'Exigente', 'Media'],
    siembra: 'Semillero Febrero / Trasplante Mayo',
    cosecha: 'Julio - Septiembre',
    summary: 'El cultivo hortícola de verano más emblemático. Suelos ricos, riegos calculados y entutorado sólido.',
    viabilidad: 'La radiación solar y temperaturas maximizan la acumulación de azúcares y ácidos orgánicos. Heladas tardías de abril obligan a retrasar trasplante hasta primera-segunda semana de mayo (suelo >12°C).',
    cuidados: 'Entutorado en "barraca" o trípode robusto contra el cierzo. Desnietado sistemático. Rotación de cultivos obligatoria: nunca plantar donde hubo solanáceas en los 3 años anteriores.',
    plagas: 'Araña roja (Tetranychus urticae) endémica en veranos secos. Tratamiento: humedad foliar puntual y azufre micronizado. Mosca blanca: trampas cromáticas amarillas.'
  },

  // ============ FLORES VISTOSAS ============
  {
    id: 'fv1', category: 'vistosas', name: 'Lantana (Lantana camara)',
    tags: ['Xerojardinería', 'Floración Eterna', 'Fácil'],
    siembra: 'Abril (Trasplante de plantón)',
    cosecha: 'Floración Mayo a Noviembre',
    summary: 'Arbusto ornamental de primer orden. Racimos florales que cambian de tonalidad mágicamente y supervivencia inaudita.',
    viabilidad: 'Reina de la xerojardinería en la Ribera. Soporta temperaturas abrasadoras del estío. Punto débil: a -2°C la parte aérea colapsa.',
    cuidados: 'Acolchado de paja o corteza en noviembre. Poda de rejuvenecimiento severa en febrero-marzo. La planta rebrotará con vigor explosivo.',
    plagas: 'Defensas químicas naturales potentes. Ocasionalmente mosca blanca en invernaderos. Solución: plantas aromáticas compañeras o infusión de ajo.'
  },
  {
    id: 'fv2', category: 'vistosas', name: 'Caléndula (Calendula officinalis)',
    tags: ['Aliada del Huerto', 'Control Biológico', 'Muy Fácil'],
    siembra: 'Abril (Siembra directa al voleo)',
    cosecha: 'Flores todo el verano',
    summary: 'Flores anaranjadas espectaculares. Herramienta indispensable para el control biológico de plagas en el huerto ecológico.',
    viabilidad: 'Germinación fulgurante con calentamiento del suelo (10-15°C). Tolera suelos calizos, arcillosos y pedregosos. Auto-resiembra garantiza presencia en años venideros.',
    cuidados: 'Exigencias irrisorias. Único cuidado: descabezado sistemático (deadheading) de capítulos marchitos para redirigir energía a nuevas flores.',
    plagas: 'Funciona como "planta trampa": atrae magnéticamente pulgones apartándolos de tomates y pimientos. Una vez colonizada, atrae predadores (crisopas, sírfidos, mariquitas) restableciendo el equilibrio ecológico.'
  },

  // ============ EXÓTICAS Y RARAS ============
  {
    id: 'fe1', category: 'raras', name: 'Alcaparra (Capparis spinosa)',
    tags: ['Litófita', 'Sequía Extrema', 'Media'],
    siembra: 'Primavera (Esquejes)',
    cosecha: 'Botones florales en pleno verano',
    summary: 'Rareza botánica rastrera. Prospera en grietas, roquedales y bajo sol aplastante. Genera los codiciados alcaparrones.',
    viabilidad: 'El suelo alcalino, rocoso y calizo de Cabanillas es el sustrato idílico. Entra en letargo total en invierno. El exceso de riego es sentencia de muerte.',
    cuidados: 'Ubicar en el talud más seco y soleado. Drenaje torrencial obligatorio. Si no se recolectan los botones, regala flores espectaculares efímeras con pétalos blancos y estambres púrpuras.',
    plagas: 'Inmunidad casi absoluta. Eventualmente orugas de mariposa de la col, retirables manualmente.'
  },
  {
    id: 'fe2', category: 'raras', name: 'Palmera Coco Plumoso (Syagrus romanzoffiana)',
    tags: ['Tropical', 'Desafío Paisajístico', 'Difícil'],
    siembra: 'Finales de Primavera',
    cosecha: 'N/A (Crecimiento vegetativo)',
    summary: 'Palmera exótica de aspecto tropical con hojas pinnadas plumosas. Soporta más frío del que su aspecto sugiere.',
    viabilidad: 'Soporta heladas fugaces de hasta -4°C e incluso nevadas ligeras. El cierzo fractura y quiebra sus folíolos pinnados si no se planta tras pantalla cortavientos.',
    cuidados: 'Suelos profundos y riegos generosos en verano. Sensible a deficiencia de manganeso y magnesio: sulfato de magnesio y microelementos quelatados bimensualmente.',
    plagas: 'PELIGRO: Picudo Rojo (Rhynchophorus ferrugineus) y polilla Paysandisia archon. Las larvas taladran el tronco y causan muerte súbita. Obligatorias duchas profilácticas con nematodos entomopatógenos o inyecciones endoterapéuticas dos veces al año.'
  }
];
