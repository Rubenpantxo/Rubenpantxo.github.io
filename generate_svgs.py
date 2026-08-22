import random
import math

WIDTH = 3840
HEIGHT = 2160

def save(name, content):
    with open(f"img/cine-sistemas/{name}.svg", "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}" preserveAspectRatio="xMidYMid slice">\n')
        f.write(content)
        f.write('\n</svg>')

# 00-fondo.svg (Fondo profundo con grid hexagonal y orbes)
fondo = """
<defs>
    <radialGradient id="bg-grad" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0%" stop-color="#0F2420"/>
        <stop offset="60%" stop-color="#050C0A"/>
        <stop offset="100%" stop-color="#020403"/>
    </radialGradient>
    <pattern id="hexGrid" width="60" height="103.923" patternUnits="userSpaceOnUse">
        <path d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z" fill="none" stroke="#25E6A3" stroke-width="1.5" stroke-opacity="0.05"/>
        <path d="M30 103.92 L60 86.60 L60 51.96 L30 69.28 L0 51.96 L0 86.60 Z" fill="none" stroke="#25E6A3" stroke-width="1.5" stroke-opacity="0.05"/>
    </pattern>
    <filter id="glowFondo" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="80" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
</defs>
<rect width="100%" height="100%" fill="url(#bg-grad)"/>
<rect width="100%" height="100%" fill="url(#hexGrid)"/>
<!-- Orbes brillantes de fondo -->
<circle cx="1000" cy="800" r="400" fill="#25E6A3" opacity="0.03" filter="url(#glowFondo)"/>
<circle cx="2800" cy="1400" r="600" fill="#1C7E9A" opacity="0.03" filter="url(#glowFondo)"/>
<circle cx="1920" cy="2000" r="500" fill="#25E6A3" opacity="0.04" filter="url(#glowFondo)"/>
"""
save("00-fondo", fondo)

# 10-lejania.svg (Nodos conectados y ondas)
lejania = """
<defs>
    <filter id="glow10" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="10" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
</defs>
<g opacity="0.4">
"""
random.seed(42)
nodes = []
for i in range(50):
    nodes.append((random.randint(200, 3600), random.randint(200, 1800)))
for x, y in nodes:
    for ox, oy in nodes:
        if 200 < math.hypot(x-ox, y-oy) < 450:
            lejania += f'<line x1="{x}" y1="{y}" x2="{ox}" y2="{oy}" stroke="#1C7E9A" stroke-width="1.5" stroke-opacity="0.3"/>\n'
for x, y in nodes:
    r = random.randint(4, 12)
    lejania += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#25E6A3" opacity="0.6" filter="url(#glow10)"/>\n'

for i in range(12):
    cx = random.randint(400, 3400)
    cy = random.randint(300, 1900)
    r1 = random.randint(100, 300)
    lejania += f'<circle cx="{cx}" cy="{cy}" r="{r1}" fill="none" stroke="#25E6A3" stroke-width="2" stroke-dasharray="10 20" stroke-opacity="0.1"/>\n'
lejania += "</g>"
save("10-lejania", lejania)

# 20-medio.svg (Plataformas de datos y circulos rotatorios)
medio = """
<defs>
    <linearGradient id="panel-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#25E6A3" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#050C0A" stop-opacity="0.4"/>
    </linearGradient>
    <filter id="glow20" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
</defs>
<g opacity="0.75">
"""
for i in range(8):
    cx = random.randint(400, 3400)
    cy = random.randint(400, 1800)
    # Radares
    medio += f'<circle cx="{cx}" cy="{cy}" r="250" fill="url(#panel-grad)" stroke="#25E6A3" stroke-width="1.5" stroke-opacity="0.2"/>\n'
    medio += f'<circle cx="{cx}" cy="{cy}" r="180" fill="none" stroke="#1C7E9A" stroke-width="4" stroke-dasharray="5 15 40 10" stroke-opacity="0.4"/>\n'
    medio += f'<circle cx="{cx}" cy="{cy}" r="120" fill="none" stroke="#25E6A3" stroke-width="2" stroke-dasharray="2 6" stroke-opacity="0.6"/>\n'
    medio += f'<line x1="{cx-300}" y1="{cy}" x2="{cx+300}" y2="{cy}" stroke="#25E6A3" stroke-width="1" stroke-opacity="0.2"/>\n'
    medio += f'<line x1="{cx}" y1="{cy-300}" x2="{cx}" y2="{cy+300}" stroke="#25E6A3" stroke-width="1" stroke-opacity="0.2"/>\n'
medio += "</g>"
save("20-medio", medio)

# 30-heroe.svg (Core central elaborado en vez de simple UI)
heroe = """
<defs>
    <linearGradient id="core-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#25E6A3" stop-opacity="0.15"/>
        <stop offset="50%" stop-color="#1C7E9A" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#050C0A" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="glowHero" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="25" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
</defs>
<g transform="translate(1920, 1080)">
    <!-- Aura -->
    <circle cx="0" cy="0" r="700" fill="#25E6A3" opacity="0.04" filter="url(#glowHero)"/>
    
    <!-- Anillos exteriores elaborados -->
    <circle cx="0" cy="0" r="750" fill="none" stroke="#1C7E9A" stroke-width="3" stroke-dasharray="10 40 80 20" opacity="0.3"/>
    <circle cx="0" cy="0" r="720" fill="none" stroke="#25E6A3" stroke-width="1.5" stroke-dasharray="4 12" opacity="0.4"/>
    <circle cx="0" cy="0" r="680" fill="none" stroke="#25E6A3" stroke-width="6" stroke-dasharray="1 10" opacity="0.5"/>
    <circle cx="0" cy="0" r="640" fill="none" stroke="#1C7E9A" stroke-width="2" opacity="0.4"/>
    <circle cx="0" cy="0" r="600" fill="url(#core-grad)" stroke="#25E6A3" stroke-width="4" opacity="0.8"/>
    
    <!-- Geometria interior -->
    <polygon points="0,-450 389,-225 389,225 0,450 -389,225 -389,-225" fill="none" stroke="#25E6A3" stroke-width="5" opacity="0.7"/>
    <polygon points="0,-350 303,-175 303,175 0,350 -303,175 -303,-175" fill="none" stroke="#1C7E9A" stroke-width="3" stroke-dasharray="15 15" opacity="0.8"/>
    <polygon points="0,-250 216,-125 216,125 0,250 -216,125 -216,-125" fill="#25E6A3" opacity="0.1"/>
    
    <!-- Core resplandeciente -->
    <circle cx="0" cy="0" r="180" fill="#0A201A" stroke="#25E6A3" stroke-width="8" opacity="0.9"/>
    <circle cx="0" cy="0" r="120" fill="#25E6A3" filter="url(#glowHero)" opacity="0.5"/>
    <circle cx="0" cy="0" r="60" fill="#FFFFFF" filter="url(#glowHero)" opacity="0.9"/>
    
    <!-- Flujos de datos saliendo del centro -->
"""
for angle in range(0, 360, 15):
    rad = math.radians(angle)
    x1 = math.cos(rad) * 200
    y1 = math.sin(rad) * 200
    x2 = math.cos(rad) * 1200
    y2 = math.sin(rad) * 1200
    sw = 4 if angle % 90 == 0 else 1.5
    heroe += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#25E6A3" stroke-width="{sw}" stroke-dasharray="10 30 50 20" opacity="0.6"/>\n'
heroe += "</g>"
save("30-heroe", heroe)

# 40 y 41 (Planos cercanos: grandes paneles de cristal desenfocados)
plano_izq = """
<defs>
    <filter id="glassBlurL" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="15" result="blur" />
    </filter>
    <linearGradient id="glass-gradL" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#25E6A3" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#020403" stop-opacity="0.7"/>
    </linearGradient>
</defs>
<g filter="url(#glassBlurL)">
    <path d="M-200,200 L1200,400 L1000,1900 L-200,2100 Z" fill="url(#glass-gradL)" stroke="#25E6A3" stroke-width="6" opacity="0.8"/>
    <path d="M100,500 L900,600 L800,1000 L50,900 Z" fill="none" stroke="#25E6A3" stroke-width="3" stroke-dasharray="20 10"/>
    <path d="M50,1100 L750,1200 L650,1700 L-50,1600 Z" fill="none" stroke="#1C7E9A" stroke-width="4" stroke-dasharray="5 15"/>
    <circle cx="500" cy="800" r="100" fill="none" stroke="#25E6A3" stroke-width="8" opacity="0.5"/>
</g>
"""
save("40-plano-izq", plano_izq)

plano_der = """
<defs>
    <filter id="glassBlurR" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="18" result="blur" />
    </filter>
    <linearGradient id="glass-gradR" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1C7E9A" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#020403" stop-opacity="0.7"/>
    </linearGradient>
</defs>
<g filter="url(#glassBlurR)">
    <path d="M4040,100 L2600,300 L2800,2000 L4040,2200 Z" fill="url(#glass-gradR)" stroke="#1C7E9A" stroke-width="6" opacity="0.8"/>
    <path d="M3700,400 L2900,500 L3000,900 L3800,800 Z" fill="none" stroke="#25E6A3" stroke-width="3" stroke-dasharray="20 10"/>
    <path d="M3800,1100 L3100,1200 L3200,1600 L3900,1500 Z" fill="none" stroke="#1C7E9A" stroke-width="4" stroke-dasharray="5 15"/>
    <circle cx="3400" cy="700" r="120" fill="none" stroke="#25E6A3" stroke-width="10" opacity="0.5"/>
</g>
"""
save("41-plano-der", plano_der)

# 50-marco.svg (HUD UI perimetral de camara)
marco = """
<g fill="none" stroke="#25E6A3" stroke-width="2" opacity="0.6">
    <!-- Esquinas -->
    <path d="M100,300 L100,100 L300,100" stroke-width="8"/>
    <path d="M3740,300 L3740,100 L3540,100" stroke-width="8"/>
    <path d="M100,1860 L100,2060 L300,2060" stroke-width="8"/>
    <path d="M3740,1860 L3740,2060 L3540,2060" stroke-width="8"/>
    
    <!-- Cruces de enfoque -->
    <path d="M1920,80 L1920,120 M1900,100 L1940,100"/>
    <path d="M1920,2040 L1920,2080 M1900,2060 L1940,2060"/>
    <path d="M80,1080 L120,1080 M100,1060 L100,1100"/>
    <path d="M3720,1080 L3760,1080 M3740,1060 L3740,1100"/>
    
    <!-- Barras de status laterales -->
    <rect x="60" y="800" width="10" height="560" fill="#25E6A3" opacity="0.2"/>
    <rect x="55" y="1000" width="20" height="160" fill="#25E6A3" opacity="0.8"/>
    <rect x="3770" y="800" width="10" height="560" fill="#25E6A3" opacity="0.2"/>
    <rect x="3765" y="900" width="20" height="120" fill="#25E6A3" opacity="0.8"/>
    
    <!-- Texto tecnico -->
    <text x="140" y="150" fill="#25E6A3" font-family="monospace" font-size="30" letter-spacing="4">SYS.CORE // v9.0.4</text>
    <text x="3400" y="150" fill="#1C7E9A" font-family="monospace" font-size="30" letter-spacing="4">TARGET AQUIRED</text>
</g>
"""
save("50-marco", marco)

