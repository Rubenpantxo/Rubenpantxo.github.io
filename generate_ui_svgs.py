import random
import math

WIDTH = 3840
HEIGHT = 2160

def save(name, content):
    with open(f"img/cine-sistemas/{name}.svg", "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}" preserveAspectRatio="xMidYMid slice">\n')
        f.write(content)
        f.write('\n</svg>')

# 00-fondo.svg (Architectural design grid, columns, typography baselines)
fondo = """
<defs>
    <radialGradient id="bg-grad" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0%" stop-color="#1E293B"/>
        <stop offset="60%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="1.5" fill="#64748B" opacity="0.15"/>
    </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#bg-grad)"/>
<rect width="100%" height="100%" fill="url(#dotGrid)"/>

<!-- 12-column Layout Grid faintly visible -->
<g fill="#3B82F6" opacity="0.02">
"""
col_width = (WIDTH - 400) / 12
for i in range(12):
    fondo += f'<rect x="{200 + i*col_width + 20}" y="0" width="{col_width - 40}" height="100%"/>\n'
fondo += """
</g>
<!-- Typography baselines -->
<g stroke="#64748B" stroke-width="1" stroke-dasharray="8 8" opacity="0.1">
"""
for y in range(400, HEIGHT, 200):
    fondo += f'<line x1="0" y1="{y}" x2="100%" y2="{y}"/>\n'
    fondo += f'<text x="100" y="{y - 10}" fill="#64748B" font-family="monospace" font-size="24">BASELINE {y}</text>\n'
fondo += "</g>\n"
save("00-fondo", fondo)


# 10-lejania.svg (Floating design tokens: color swatches, spacing boxes, typography sizes)
lejania = "<g opacity='0.4'>\n"
random.seed(101)
# Swatches
colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"]
for i in range(12):
    cx = random.randint(200, 3600)
    cy = random.randint(200, 1800)
    c = random.choice(colors)
    lejania += f'<rect x="{cx}" y="{cy}" width="80" height="120" rx="8" fill="{c}" opacity="0.2" stroke="{c}" stroke-width="2"/>\n'
# Spacing token boxes (squares with X in them)
for i in range(15):
    cx = random.randint(200, 3600)
    cy = random.randint(200, 1800)
    size = random.choice([32, 48, 64, 96])
    lejania += f'<g transform="translate({cx},{cy})" stroke="#64748B" stroke-width="1.5" opacity="0.2">'
    lejania += f'<rect width="{size}" height="{size}" fill="none"/>'
    lejania += f'<line x1="0" y1="0" x2="{size}" y2="{size}"/><line x1="0" y1="{size}" x2="{size}" y2="0"/>'
    lejania += f'</g>\n'
# Font sizes
sizes = ["Aa", "Ag", "H1", "H2"]
for i in range(10):
    cx = random.randint(200, 3600)
    cy = random.randint(200, 1800)
    text = random.choice(sizes)
    lejania += f'<text x="{cx}" y="{cy}" fill="#94A3B8" opacity="0.15" font-family="sans-serif" font-weight="bold" font-size="{random.randint(60, 120)}">{text}</text>\n'
lejania += "</g>\n"
save("10-lejania", lejania)

# 20-medio.svg (Wireframes of UI components: Cards, graphs, sliders)
medio = "<g opacity='0.6'>\n"
for i in range(6):
    cx = random.randint(400, 3400)
    cy = random.randint(400, 1800)
    # Card wireframe
    medio += f'<g transform="translate({cx},{cy})">'
    medio += '<rect width="400" height="300" rx="16" fill="#0F172A" stroke="#334155" stroke-width="3" opacity="0.8"/>'
    medio += '<rect x="40" y="40" width="320" height="140" rx="8" fill="#1E293B"/>'
    medio += '<rect x="40" y="210" width="200" height="20" rx="4" fill="#334155"/>'
    medio += '<rect x="40" y="240" width="120" height="20" rx="4" fill="#334155"/>'
    medio += '<circle cx="330" cy="235" r="24" fill="#3B82F6" opacity="0.5"/>'
    # Padding indicator lines
    medio += '<line x1="40" y1="0" x2="40" y2="300" stroke="#10B981" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>'
    medio += '<line x1="360" y1="0" x2="360" y2="300" stroke="#10B981" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>'
    medio += '</g>\n'
medio += "</g>\n"
save("20-medio", medio)


# 30-heroe.svg (A central structured Design System inspector / portal)
heroe = """
<defs>
    <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1E293B" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="shadowHero" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
</defs>
<g transform="translate(1920, 1080)">
    <!-- Central massive canvas window -->
    <rect x="-800" y="-450" width="1600" height="900" rx="24" fill="url(#hero-grad)" stroke="#475569" stroke-width="4" filter="url(#shadowHero)"/>
    
    <!-- Top toolbar of the canvas -->
    <rect x="-800" y="-450" width="1600" height="80" rx="24" fill="#0F172A" opacity="0.6"/>
    <circle cx="-750" cy="-410" r="8" fill="#EF4444"/>
    <circle cx="-720" cy="-410" r="8" fill="#F59E0B"/>
    <circle cx="-690" cy="-410" r="8" fill="#10B981"/>
    <rect x="-150" y="-425" width="300" height="30" rx="6" fill="#1E293B"/>
    
    <!-- Left sidebar (Layers/Components) -->
    <rect x="-800" y="-370" width="300" height="820" fill="#0F172A" opacity="0.4"/>
    <g fill="#334155" opacity="0.7">
        <rect x="-760" y="-330" width="180" height="16" rx="4"/>
        <rect x="-720" y="-290" width="140" height="16" rx="4"/>
        <rect x="-720" y="-250" width="120" height="16" rx="4"/>
        <rect x="-760" y="-210" width="200" height="16" rx="4"/>
        <rect x="-720" y="-170" width="160" height="16" rx="4"/>
    </g>

    <!-- Right sidebar (Properties Panel) -->
    <rect x="500" y="-370" width="300" height="820" fill="#0F172A" opacity="0.4"/>
    <g fill="#334155" opacity="0.7">
        <rect x="540" y="-330" width="100" height="16" rx="4"/>
        <!-- Color swatches in prop panel -->
        <circle cx="560" cy="-280" r="20" fill="#3B82F6"/>
        <circle cx="620" cy="-280" r="20" fill="#10B981"/>
        <circle cx="680" cy="-280" r="20" fill="#F59E0B"/>
        <!-- inputs -->
        <rect x="540" y="-220" width="220" height="40" rx="6" fill="#1E293B"/>
        <rect x="540" y="-160" width="100" height="40" rx="6" fill="#1E293B"/>
        <rect x="660" y="-160" width="100" height="40" rx="6" fill="#1E293B"/>
    </g>

    <!-- The central stage (left empty for the text/panels to float in) -->
    <!-- Rulers for the central stage -->
    <line x1="-500" y1="-370" x2="500" y2="-370" stroke="#334155" stroke-width="20" stroke-dasharray="2 10"/>
    <line x1="-500" y1="-370" x2="-500" y2="450" stroke="#334155" stroke-width="20" stroke-dasharray="2 10"/>
</g>
"""
save("30-heroe", heroe)


# 40 y 41 (Planos cercanos: grandes elementos UI muy desenfocados como cursores y tipografia gigante)
plano_izq = """
<defs>
    <filter id="glassBlurL" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="24" result="blur" />
    </filter>
</defs>
<g filter="url(#glassBlurL)">
    <!-- Giant UI Cursor -->
    <path d="M400,600 L1200,1400 L800,1500 L600,2000 Z" fill="#E2E8F0" opacity="0.1"/>
    <!-- Giant bounding box -->
    <rect x="-200" y="400" width="1200" height="1400" fill="none" stroke="#3B82F6" stroke-width="20" stroke-dasharray="50 50" opacity="0.3"/>
    <!-- Giant resize handle -->
    <rect x="950" y="1750" width="100" height="100" fill="#FFFFFF" stroke="#3B82F6" stroke-width="15" opacity="0.4"/>
</g>
"""
save("40-plano-izq", plano_izq)

plano_der = """
<defs>
    <filter id="glassBlurR" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="20" result="blur" />
    </filter>
</defs>
<g filter="url(#glassBlurR)">
    <!-- Giant typography 'A' -->
    <text x="2600" y="1600" fill="#E2E8F0" font-family="serif" font-weight="bold" font-size="1400" opacity="0.08">Aa</text>
    <!-- Baseline and X-height lines for the giant text -->
    <line x1="2400" y1="1600" x2="4200" y2="1600" stroke="#10B981" stroke-width="15" stroke-dasharray="40 40" opacity="0.3"/>
    <line x1="2400" y1="800" x2="4200" y2="800" stroke="#10B981" stroke-width="15" stroke-dasharray="40 40" opacity="0.3"/>
</g>
"""
save("41-plano-der", plano_der)


# 50-marco.svg (HUD UI perimetral tipo programa de diseno)
marco = """
<g fill="#475569" font-family="sans-serif" font-size="20" opacity="0.5">
    <!-- Top ruler -->
    <rect x="0" y="0" width="3840" height="40" fill="#0F172A" opacity="0.8"/>
    <line x1="0" y1="40" x2="3840" y2="40" stroke="#334155" stroke-width="2"/>
    <!-- Top ruler ticks -->
"""
for i in range(0, 3840, 100):
    marco += f'<line x1="{i}" y1="20" x2="{i}" y2="40" stroke="#475569" stroke-width="2"/>'
    if i % 400 == 0:
        marco += f'<text x="{i+5}" y="18">{i}</text>'
        
marco += """
    <!-- Left ruler -->
    <rect x="0" y="0" width="40" height="2160" fill="#0F172A" opacity="0.8"/>
    <line x1="40" y1="0" x2="40" y2="2160" stroke="#334155" stroke-width="2"/>
    <!-- Left ruler ticks -->
"""
for i in range(0, 2160, 100):
    marco += f'<line x1="20" y1="{i}" x2="40" y2="{i}" stroke="#475569" stroke-width="2"/>'
    
marco += """
    <!-- Crosshairs in corners -->
    <path d="M60,60 L120,60 M60,60 L60,120" stroke="#F59E0B" stroke-width="4" fill="none"/>
    <path d="M3780,60 L3720,60 M3780,60 L3780,120" stroke="#F59E0B" stroke-width="4" fill="none"/>
    <path d="M60,2100 L120,2100 M60,2100 L60,2040" stroke="#F59E0B" stroke-width="4" fill="none"/>
    <path d="M3780,2100 L3720,2100 M3780,2100 L3780,2040" stroke="#F59E0B" stroke-width="4" fill="none"/>
    
    <text x="60" y="2140" fill="#94A3B8" font-size="24">ZOOM: 142%</text>
    <text x="3600" y="2140" fill="#94A3B8" font-size="24">DESIGN_SYSTEM.FIG</text>
</g>
"""
save("50-marco", marco)

