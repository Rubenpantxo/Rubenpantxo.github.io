#!/usr/bin/env python3
"""
Genera sprites SVG para Tekken Barrio PS1.
Sin dependencias externas - solo Python stdlib.

Uso:  python3 generate_sprites.py
"""
import os
import math

# ── Color helpers ────────────────────────────────────────────────
def _rgb(color):
    """Normalize to (r,g,b) tuple."""
    if isinstance(color, str):
        h = color.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    return tuple(int(c) for c in color[:3])

def dk(color, f=0.60):
    r, g, b = _rgb(color)
    return (max(0, int(r * f)), max(0, int(g * f)), max(0, int(b * f)))

def lt(color, f=0.35):
    r, g, b = _rgb(color)
    return (min(255, int(r + (255 - r) * f)),
            min(255, int(g + (255 - g) * f)),
            min(255, int(b + (255 - b) * f)))

def css(color):
    r, g, b = _rgb(color)
    return f"#{r:02x}{g:02x}{b:02x}"

# ── SVG primitive helpers ────────────────────────────────────────
def _rect(x, y, w, h, fill, rx=0, opacity=1.0):
    op = f' fill-opacity="{opacity:.2f}"' if opacity < 1 else ''
    rx_s = f' rx="{rx:.1f}"' if rx else ''
    return (f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}"'
            f' fill="{css(fill)}"{rx_s}{op}/>')

def _ell(cx, cy, rx, ry, fill, opacity=1.0):
    op = f' fill-opacity="{opacity:.2f}"' if opacity < 1 else ''
    return (f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{rx:.2f}" ry="{ry:.2f}"'
            f' fill="{css(fill)}"{op}/>')

def _circ(cx, cy, r, fill, opacity=1.0):
    op = f' fill-opacity="{opacity:.2f}"' if opacity < 1 else ''
    return f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{css(fill)}"{op}/>'

def _poly(pts, fill, opacity=1.0):
    op = f' fill-opacity="{opacity:.2f}"' if opacity < 1 else ''
    p = ' '.join(f'{x:.2f},{y:.2f}' for x, y in pts)
    return f'<polygon points="{p}" fill="{css(fill)}"{op}/>'

def _line(x1, y1, x2, y2, stroke, width=1.5, opacity=0.25):
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"'
            f' stroke="{css(stroke)}" stroke-width="{width:.1f}" stroke-opacity="{opacity:.2f}"/>')

def _text(x, y, txt, fill, fsize, anchor="middle"):
    fam = "font-family=\"'Press Start 2P',monospace,sans-serif\""
    shadow = (f'<text x="{x+2:.1f}" y="{y+2:.1f}" {fam} font-size="{fsize}"'
              f' font-weight="bold" fill="rgba(0,0,0,0.75)" text-anchor="{anchor}">'
              f'{txt}</text>')
    main = (f'<text x="{x:.1f}" y="{y:.1f}" {fam} font-size="{fsize}"'
            f' font-weight="bold" fill="{css(fill)}" text-anchor="{anchor}">'
            f'{txt}</text>')
    return shadow + '\n' + main

# ── Tonos de piel ────────────────────────────────────────────────
SKIN_FAIR  = (255, 215, 178)
SKIN_LIGHT = (238, 192, 150)
SKIN_MED   = (210, 156, 110)
SKIN_TAN   = (180, 130, 84)
SKIN_DARK  = (125, 80, 46)
SKIN_DEEP  = (80, 46, 24)

# ── Colores de pelo ──────────────────────────────────────────────
HAIR_BLACK  = (18, 10, 6)
HAIR_DBROWN = (58, 32, 14)
HAIR_BROWN  = (108, 68, 32)
HAIR_BLONDE = (205, 170, 65)
HAIR_WHITE  = (225, 220, 210)
HAIR_RED    = (175, 42, 18)
HAIR_NONE   = None

# ── Diseños de personajes ────────────────────────────────────────
DESIGNS = [
    {
        "slug": "brawler-amarillo", "label": "BRAWLER\nAMARILLO", "accent": "#FFDD00",
        "skin": SKIN_MED, "hair": HAIR_NONE, "hair_style": None,
        "top": (255, 220, 0), "bottom": (70, 45, 20), "shoes": (28, 18, 8),
        "body": "muscular", "acc": "tape", "extras": ["stubble"],
    },
    {
        "slug": "matriarca-azul", "label": "MATRIARCA\nAZUL", "accent": "#0066FF",
        "skin": SKIN_TAN, "hair": HAIR_BLACK, "hair_style": "bun",
        "top": (0, 80, 215), "bottom": (0, 48, 148), "shoes": (18, 14, 58),
        "body": "large", "acc": None, "extras": [],
    },
    {
        "slug": "sulima-x-fighter", "label": "SULIMA-X\nFIGHTER", "accent": "#FF99CC",
        "skin": SKIN_DARK, "hair": HAIR_BLACK, "hair_style": "ponytail",
        "top": (255, 118, 178), "bottom": (178, 48, 118), "shoes": (158, 28, 88),
        "body": "slim_f", "acc": "headband", "extras": [],
    },
    {
        "slug": "duo-rayas-cadena", "label": "DUO RAYAS\n& CADENA", "accent": "#DDDDDD",
        "skin": SKIN_LIGHT, "hair": HAIR_DBROWN, "hair_style": "short",
        "top": (210, 210, 215), "bottom": (52, 52, 72), "shoes": (32, 32, 38),
        "body": "normal", "acc": "chain", "extras": ["stripes"],
    },
    {
        "slug": "la-patai-hija", "label": "LA PATAI\n& HIJA", "accent": "#FFCC66",
        "skin": SKIN_MED, "hair": HAIR_DBROWN, "hair_style": "wavy",
        "top": (255, 192, 68), "bottom": (98, 62, 18), "shoes": (48, 28, 8),
        "body": "normal_f", "acc": "flower", "extras": [],
    },
    {
        "slug": "caballero-negro", "label": "CABALLERO\nNEGRO", "accent": "#555555",
        "skin": SKIN_FAIR, "hair": HAIR_BLACK, "hair_style": "short",
        "top": (52, 52, 58), "bottom": (32, 32, 38), "shoes": (18, 18, 22),
        "body": "armored", "acc": "shoulder_pad", "extras": ["cape"],
    },
    {
        "slug": "el-chacal", "label": "EL\nCHACAL", "accent": "#88FF88",
        "skin": SKIN_TAN, "hair": HAIR_DBROWN, "hair_style": "short",
        "top": (78, 198, 78), "bottom": (42, 108, 42), "shoes": (28, 58, 28),
        "body": "athletic", "acc": None, "extras": [],
    },
    {
        "slug": "dona-mercado", "label": "DONA\nMERCADO", "accent": "#FF6600",
        "skin": SKIN_TAN, "hair": HAIR_DBROWN, "hair_style": "curly",
        "top": (255, 98, 0), "bottom": (195, 68, 0), "shoes": (78, 38, 0),
        "body": "large_f", "acc": "bag", "extras": [],
    },
    {
        "slug": "panas-del-barrio", "label": "PANAS\nDEL BARRIO", "accent": "#00FFAA",
        "skin": SKIN_DARK, "hair": HAIR_BLACK, "hair_style": "cap_short",
        "top": (0, 198, 148), "bottom": (18, 78, 58), "shoes": (22, 22, 28),
        "body": "athletic", "acc": "cap", "extras": [],
    },
    {
        "slug": "la-graffitera", "label": "LA\nGRAFFITERA", "accent": "#FF00FF",
        "skin": SKIN_MED, "hair": HAIR_RED, "hair_style": "wild",
        "top": (218, 0, 218), "bottom": (118, 0, 158), "shoes": (78, 0, 98),
        "body": "slim_f", "acc": "spray", "extras": [],
    },
    {
        "slug": "el-mecanico", "label": "EL\nMECANICO", "accent": "#888888",
        "skin": SKIN_LIGHT, "hair": HAIR_DBROWN, "hair_style": "messy",
        "top": (108, 108, 112), "bottom": (88, 78, 62), "shoes": (48, 38, 28),
        "body": "stocky", "acc": "wrench", "extras": ["oil"],
    },
    {
        "slug": "los-primos", "label": "LOS\nPRIMOS", "accent": "#FFAA00",
        "skin": SKIN_TAN, "hair": HAIR_BLACK, "hair_style": "short",
        "top": (255, 158, 0), "bottom": (98, 62, 0), "shoes": (52, 32, 0),
        "body": "normal", "acc": "sunglasses", "extras": [],
    },
    {
        "slug": "el-viejo-del-barrio", "label": "EL VIEJO\nDEL BARRIO", "accent": "#AA8800",
        "skin": SKIN_FAIR, "hair": HAIR_WHITE, "hair_style": "balding",
        "top": (152, 122, 38), "bottom": (78, 62, 18), "shoes": (48, 38, 18),
        "body": "stocky", "acc": "cane", "extras": ["wrinkles"],
    },
    {
        "slug": "la-reina-del-ring", "label": "LA REINA\nDEL RING", "accent": "#FF2266",
        "skin": SKIN_DEEP, "hair": HAIR_BLACK, "hair_style": "braids",
        "top": (218, 18, 78), "bottom": (168, 8, 52), "shoes": (98, 4, 28),
        "body": "athletic_f", "acc": "gloves", "extras": [],
    },
    {
        "slug": "el-rapero", "label": "EL\nRAPERO", "accent": "#00AAFF",
        "skin": SKIN_DARK, "hair": HAIR_BLACK, "hair_style": "cap_under",
        "top": (0, 148, 255), "bottom": (22, 28, 58), "shoes": (12, 18, 42),
        "body": "slim", "acc": "cap_chain", "extras": [],
    },
]

# ── Generador SVG principal ──────────────────────────────────────
def gen_sprite(design, size=512):
    """Returns an SVG string for the given character design."""
    els = []   # SVG element strings
    cx = size / 2.0
    sc = size / 512.0

    def s(v): return v * sc  # scale value

    skin   = design["skin"]
    top    = design["top"]
    bot    = design["bottom"]
    shoes  = design.get("shoes", (30, 20, 10))
    btype  = design.get("body", "normal")
    extras = design.get("extras", [])
    accent = design["accent"]

    # ── Dimensiones según tipo de cuerpo ──
    sw  = s(112)   # shoulder half-width
    ww  = s(78)    # waist half-width
    lw  = s(37)    # leg half-width
    aw  = s(38)    # arm half-width
    hr  = s(68)    # head radius

    if btype in ("muscular",):
        sw, ww, lw, aw = s(132), s(96), s(44), s(45)
    elif btype in ("large", "large_f"):
        sw, ww, lw, aw = s(128), s(100), s(46), s(42)
    elif btype in ("slim", "slim_f"):
        sw, ww, lw, aw = s(92), s(62), s(32), s(34)
    elif btype in ("athletic", "athletic_f"):
        sw, ww, lw, aw = s(108), s(70), s(36), s(38)
    elif btype in ("stocky",):
        sw, ww, lw, aw = s(120), s(90), s(42), s(42)
    elif btype in ("armored",):
        sw, ww, lw, aw = s(125), s(88), s(40), s(48)

    ground_y   = s(458)
    shoe_h     = s(28)
    shoe_half  = s(60)
    shoe_gap   = s(16)
    ankle_y    = ground_y - shoe_h
    knee_y     = s(332)
    waist_y    = s(272)
    shoulder_y = s(172)
    hand_y     = s(380)
    neck_top   = s(126)
    hcy        = s(88)    # head center y
    elbow_y    = s(308)

    # Leg centers
    lcx = cx - shoe_gap - shoe_half / 2 + s(14)
    rcx = cx + shoe_gap + shoe_half / 2 - s(14)
    lhx = cx - sw - aw + s(7)
    rhx = cx + sw + aw - s(7)
    fist_r = s(26)

    # ── Fondo ──
    bg_color = dk(accent, 0.14)
    els.append(_rect(0, 0, size, size, bg_color))
    # Hatch lines
    step = max(10, size // 28)
    for i in range(-size, size * 2, step):
        els.append(_line(i, 0, i + size, size, (255, 255, 255), 1.0, 0.08))
    # Border
    pad = s(20)
    bw = max(2, s(6))
    border_c = lt(accent, 0.25)
    els.append(_rect(pad, pad, size - 2*pad, size - 2*pad, border_c, rx=4, opacity=0.0))
    # border as stroke rect
    els.append(
        f'<rect x="{pad:.1f}" y="{pad:.1f}" width="{size-2*pad:.1f}" height="{size-2*pad:.1f}"'
        f' fill="none" stroke="{css(border_c)}" stroke-width="{bw:.1f}" rx="4"/>'
    )

    # ── Capa trasera (capa) ──
    if "cape" in extras:
        cape_c = dk(top, 0.42)
        els.append(_poly([
            (cx - sw - s(18), shoulder_y + s(8)),
            (cx + sw + s(18), shoulder_y + s(8)),
            (cx + sw + s(45), waist_y + s(52)),
            (cx,              waist_y + s(24)),
            (cx - sw - s(45), waist_y + s(52)),
        ], cape_c))

    # ── Zapatos ──
    els.append(_ell(lcx, ground_y - shoe_h/2, shoe_half + s(12), shoe_h/2 + s(6), shoes))
    els.append(_ell(rcx, ground_y - shoe_h/2, shoe_half + s(12), shoe_h/2 + s(6), shoes))
    # Suela (línea más oscura)
    sole = dk(shoes, 0.55)
    els.append(_ell(lcx, ground_y - s(4), shoe_half + s(8), s(8), sole))
    els.append(_ell(rcx, ground_y - s(4), shoe_half + s(8), s(8), sole))

    # ── Pantorrillas ──
    els.append(_poly([
        (lcx - lw, knee_y), (lcx + lw, knee_y),
        (lcx + lw - s(4), ankle_y), (lcx - lw + s(4), ankle_y),
    ], bot))
    els.append(_poly([
        (rcx - lw, knee_y), (rcx + lw, knee_y),
        (rcx + lw - s(4), ankle_y), (rcx - lw + s(4), ankle_y),
    ], bot))

    # ── Muslos ──
    els.append(_poly([
        (cx - ww * 0.72, waist_y), (cx - s(10), waist_y),
        (lcx + lw, knee_y), (lcx - lw, knee_y),
    ], bot))
    els.append(_poly([
        (cx + s(10), waist_y), (cx + ww * 0.72, waist_y),
        (rcx + lw, knee_y), (rcx - lw, knee_y),
    ], bot))

    # ── Torso ──
    els.append(_poly([
        (cx - sw, shoulder_y), (cx + sw, shoulder_y),
        (cx + ww, waist_y),   (cx - ww, waist_y),
    ], top))

    # Collar / cuello (V oscuro)
    els.append(_poly([
        (cx - s(36), shoulder_y), (cx + s(36), shoulder_y),
        (cx + s(16), shoulder_y + s(24)), (cx - s(16), shoulder_y + s(24)),
    ], dk(top, 0.70)))

    # Mancha aceite (El Mecánico)
    if "oil" in extras:
        oil_c = (38, 28, 18)
        els.append(_ell(cx - s(5), waist_y - s(42), s(28), s(22), oil_c, 0.85))
        els.append(_ell(cx + s(22), waist_y - s(62), s(18), s(14), oil_c, 0.85))

    # Rayas en torso (Duo)
    if "stripes" in extras:
        sc2 = dk(top, 0.48)
        y2 = shoulder_y + s(22)
        while y2 < waist_y - s(8):
            w2 = sw - s(5)
            els.append(_rect(cx - w2, y2, w2 * 2, s(9), sc2))
            y2 += s(22)

    # ── Brazos ──
    # Izquierdo
    els.append(_poly([
        (cx - sw + s(8),  shoulder_y + s(8)),
        (cx - sw - aw + s(8), shoulder_y + s(12)),
        (cx - sw - aw + s(4), elbow_y),
        (cx - sw + s(10), elbow_y),
    ], skin))
    els.append(_poly([
        (cx - sw + s(10),     elbow_y),
        (cx - sw - aw + s(4), elbow_y),
        (cx - sw - aw,        hand_y),
        (cx - sw + s(14),     hand_y),
    ], skin))
    # Derecho
    els.append(_poly([
        (cx + sw - s(8),  shoulder_y + s(8)),
        (cx + sw + aw - s(8), shoulder_y + s(12)),
        (cx + sw + aw - s(4), elbow_y),
        (cx + sw - s(10), elbow_y),
    ], skin))
    els.append(_poly([
        (cx + sw - s(10),     elbow_y),
        (cx + sw + aw - s(4), elbow_y),
        (cx + sw + aw,        hand_y),
        (cx + sw - s(14),     hand_y),
    ], skin))

    # ── Manos ──
    els.append(_ell(lhx, hand_y + fist_r * 0.5, fist_r, fist_r * 1.3, skin))
    els.append(_ell(rhx, hand_y + fist_r * 0.5, fist_r, fist_r * 1.3, skin))

    # ── Cuello ──
    neck_w = s(26)
    els.append(_rect(cx - neck_w, neck_top, neck_w * 2, shoulder_y - neck_top, skin))

    # ── Cabeza ──
    els.append(_ell(cx, hcy, hr, hr, skin))
    # Mandíbula cuadrada (hombres)
    if btype not in ("slim_f", "normal_f", "large_f", "athletic_f"):
        els.append(_poly([
            (cx - hr, hcy + s(18)), (cx + hr, hcy + s(18)),
            (cx + hr - s(8), hcy + hr), (cx - hr + s(8), hcy + hr),
        ], skin))

    # ── Pelo ──
    hair_c = design.get("hair")
    hair_s = design.get("hair_style")
    if hair_c and hair_s:
        els.extend(_draw_hair(cx, hcy, hr, hair_c, hair_s))

    # ── Cara ──
    els.extend(_draw_face(cx, hcy, hr, skin, extras))

    # ── Accesorios ──
    acc = design.get("acc")
    if acc:
        els.extend(_draw_acc(acc, design, cx, shoulder_y, sw, aw, hand_y,
                             fist_r, lhx, rhx, hcy, hr, waist_y, ground_y, skin))

    # ── SVG wrapper ──
    body = '\n'.join(els)
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {size} {size}" width="{size}" height="{size}">\n'
            f'{body}\n</svg>')


# ── Pelo ─────────────────────────────────────────────────────────
def _draw_hair(cx, hcy, hr, color, style):
    els = []
    r = hr

    if style == "short":
        els.append(_poly([
            (cx - r * 0.92, hcy - r * 0.05),
            (cx - r * 0.80, hcy - r * 0.92),
            (cx,            hcy - r * 1.07),
            (cx + r * 0.80, hcy - r * 0.92),
            (cx + r * 0.92, hcy - r * 0.05),
        ], color))

    elif style == "bun":
        els.append(_ell(cx, hcy - r * 0.55, r * 0.88, r * 0.50, color))
        els.append(_circ(cx, hcy - r * 1.38, r * 0.28, color))

    elif style == "ponytail":
        els.append(_ell(cx, hcy - r * 0.38, r * 0.90, r * 0.65, color))
        # Cola lateral
        els.append(_poly([
            (cx + r * 0.68, hcy - r * 0.42),
            (cx + r * 1.32, hcy - r * 0.10),
            (cx + r * 1.12, hcy + r * 0.55),
            (cx + r * 0.52, hcy + r * 0.22),
        ], color))

    elif style == "wavy":
        els.append(_ell(cx, hcy - r * 0.32, r * 0.90, r * 0.72, color))
        for sx in [-1, 1]:
            els.append(_poly([
                (cx + sx * r * 0.78, hcy - r * 0.18),
                (cx + sx * r * 1.20, hcy + r * 0.12),
                (cx + sx * r * 1.02, hcy + r * 0.52),
                (cx + sx * r * 0.68, hcy + r * 0.32),
            ], color))

    elif style == "curly":
        blobs = [
            (-0.38, -0.92, 0.42), (0.02, -1.12, 0.36), (0.42, -0.92, 0.42),
            (-0.65, -0.52, 0.32), (0.68, -0.52, 0.32),
            (-0.50, -0.15, 0.30), (0.52, -0.15, 0.30),
        ]
        for ox, oy, br in blobs:
            els.append(_circ(cx + ox * r, hcy + oy * r, r * br, color))

    elif style == "messy":
        els.append(_ell(cx, hcy - r * 0.48, r * 0.86, r * 0.52, color))
        for ox in [-0.50, -0.20, 0.08, 0.38, 0.64]:
            els.append(_poly([
                (cx + ox * r - r * 0.11, hcy - r * 0.88),
                (cx + ox * r + r * 0.02, hcy - r * 1.32),
                (cx + ox * r + r * 0.14, hcy - r * 0.88),
            ], color))

    elif style == "wild":
        els.append(_ell(cx, hcy - r * 0.44, r * 0.88, r * 0.56, color))
        spikes = [(-0.58, -0.88), (-0.28, -1.10), (0.12, -1.15), (0.45, -1.00), (0.70, -0.70)]
        for ox, oy in spikes:
            els.append(_poly([
                (cx + ox * r - r * 0.10, hcy + oy * r),
                (cx + ox * r + r * 0.05, hcy + oy * r - r * 0.36),
                (cx + ox * r + r * 0.20, hcy + oy * r),
            ], color))

    elif style == "braids":
        els.append(_ell(cx, hcy - r * 0.46, r * 0.88, r * 0.56, color))
        for sx in [-1, 1]:
            bx = cx + sx * r * 0.54
            by0 = hcy + r * 0.10
            bw2 = r * 0.18
            blen = r * 0.72
            els.append(_rect(bx - bw2, by0, bw2 * 2, blen, color, rx=bw2))
            els.append(_circ(bx, by0 + blen, bw2 * 1.1, color))

    elif style == "balding":
        els.append(_ell(cx, hcy - r * 0.60, r * 0.48, r * 0.42, color))
        for sx in [-1, 1]:
            els.append(_poly([
                (cx + sx * r * 0.44, hcy - r * 0.68),
                (cx + sx * r * 0.93, hcy - r * 0.48),
                (cx + sx * r * 0.86, hcy - r * 0.08),
                (cx + sx * r * 0.38, hcy - r * 0.18),
            ], color))

    elif style in ("cap_short", "cap_under"):
        # Solo pelo por debajo de gorra
        els.append(_ell(cx, hcy + r * 0.20, r * 0.86, r * 0.22, color))

    return els


# ── Cara ─────────────────────────────────────────────────────────
def _draw_face(cx, hcy, hr, skin, extras=None):
    els = []
    r = hr
    eye_y   = hcy + r * 0.06
    eye_sep = r * 0.38
    ew = r * 0.22
    eh = r * 0.17

    # Blancos de ojos
    for sx in [-1, 1]:
        ex = cx + sx * eye_sep
        els.append(_ell(ex, eye_y, ew, eh, (255, 255, 255)))
    # Pupilas
    pw = ew * 0.58
    ph = eh * 0.78
    for sx in [-1, 1]:
        ex = cx + sx * eye_sep
        els.append(_ell(ex, eye_y, pw, ph, (20, 12, 8)))
        # Brillo
        dot = pw * 0.35
        els.append(_circ(ex - pw * 0.4, eye_y - ph * 0.4, dot, (255, 255, 255)))

    # Cejas
    brow_y = hcy - r * 0.26
    bw2 = r * 0.26
    bh = max(2, r * 0.08)
    brow_c = dk(skin, 0.40)
    for sx in [-1, 1]:
        ex = cx + sx * eye_sep
        els.append(_rect(ex - bw2, brow_y, bw2 * 2, bh, brow_c))

    # Nariz
    ny = hcy + r * 0.30
    nr = max(2, r * 0.08)
    els.append(_ell(cx, ny + nr, nr, nr * 1.2, dk(skin, 0.72)))

    # Boca
    my = hcy + r * 0.58
    mw = r * 0.34
    mh = max(2, r * 0.10)
    els.append(_rect(cx - mw, my, mw * 2, mh, (155, 48, 48), rx=mh / 2))

    # Extras
    if extras:
        if "wrinkles" in extras:
            wc = dk(skin, 0.68)
            wy2 = eye_y + r * 0.26
            for ox in [-r * 0.14, r * 0.14]:
                els.append(
                    f'<line x1="{cx+ox:.2f}" y1="{wy2:.2f}" '
                    f'x2="{cx+ox+r*0.09:.2f}" y2="{wy2+r*0.10:.2f}" '
                    f'stroke="{css(wc)}" stroke-width="{max(1,r*0.04):.1f}"/>'
                )
        if "stubble" in extras:
            sy2 = my + mh + r * 0.06
            sw2 = r * 0.52
            sh = r * 0.24
            els.append(_ell(cx, sy2 + sh / 2, sw2, sh / 2, dk(skin, 0.55), 0.80))

    return els


# ── Accesorios ───────────────────────────────────────────────────
def _draw_acc(acc, design, cx, shoulder_y, sw, aw, hand_y,
              fist_r, lhx, rhx, hcy, hr, waist_y, ground_y, skin):
    els = []
    top   = design["top"]
    shoes = design.get("shoes", (30, 20, 10))
    accent = design["accent"]

    if acc == "tape":
        tape = (220, 198, 175)
        for hx in [lhx, rhx]:
            bw2 = fist_r * 1.15
            bh = fist_r * 0.55
            els.append(_rect(hx - bw2, hand_y - bh / 2, bw2 * 2, bh, tape, rx=bh / 3))

    elif acc == "headband":
        band = lt(top, 0.32)
        bh = hr * 0.20
        by = hcy - hr * 0.28
        els.append(_rect(cx - hr + 3, by, (hr - 3) * 2, bh, band, rx=bh / 2))

    elif acc == "chain":
        gold = (228, 192, 72)
        cy2 = shoulder_y + hr * 0.32
        step = max(8, hr * 0.26)
        x2 = cx - hr * 0.86
        while x2 < cx + hr * 0.86:
            cr = max(4, hr * 0.10)
            els.append(_circ(x2, cy2, cr, gold))
            x2 += step

    elif acc == "flower":
        fc = (255, 95, 95)
        fpx = cx + hr * 0.55
        fpy = hcy - hr * 0.46
        fr = hr * 0.26
        for ang_deg in range(0, 360, 60):
            rad = math.radians(ang_deg)
            px = fpx + math.cos(rad) * fr
            py = fpy + math.sin(rad) * fr
            els.append(_circ(px, py, fr * 0.55, fc))
        els.append(_circ(fpx, fpy, fr * 0.38, (255, 220, 0)))

    elif acc == "shoulder_pad":
        pad_c = dk(top, 0.72)
        hl = lt(pad_c, 0.28)
        for sx in [-1, 1]:
            px = cx + sx * sw
            els.append(_ell(px, shoulder_y + hr * 0.04, hr * 0.38, hr * 0.33, pad_c))
            els.append(_ell(px, shoulder_y + hr * 0.04, hr * 0.24, hr * 0.22, hl))

    elif acc == "bag":
        bag = (192, 142, 75)
        bx = lhx
        by2 = hand_y + fist_r * 1.5
        bw2 = fist_r * 2.0
        bh = fist_r * 2.4
        els.append(_rect(bx - bw2, by2, bw2 * 2, bh, bag, rx=4))
        els.append(_rect(bx - bw2, by2, bw2 * 2, bh * 0.12, dk(bag, 0.65), rx=4))
        # Asas
        handle_c = dk(bag, 0.55)
        for hox in [-bw2 * 0.4, bw2 * 0.4]:
            els.append(_rect(bx + hox - bw2 * 0.08, by2 - fist_r * 0.55,
                             bw2 * 0.16, fist_r * 0.55, handle_c, rx=2))

    elif acc == "cap":
        cap_c = dk(top, 0.68)
        # Cuerpo de la gorra
        els.append(_ell(cx, hcy - hr * 0.62, hr * 0.88, hr * 0.55, cap_c))
        # Visera hacia la derecha
        els.append(_poly([
            (cx - hr * 0.05, hcy - hr * 0.08),
            (cx + hr * 1.30, hcy - hr * 0.05),
            (cx + hr * 1.26, hcy + hr * 0.14),
            (cx - hr * 0.05, hcy + hr * 0.12),
        ], dk(cap_c, 0.78)))
        # Botón
        els.append(_circ(cx, hcy - hr * 1.14, hr * 0.07, lt(cap_c, 0.25)))

    elif acc == "spray":
        can_c = (195, 198, 202)
        can_x = rhx
        can_y = hand_y + fist_r * 0.5
        cw = fist_r * 0.70
        ch = fist_r * 2.0
        els.append(_rect(can_x - cw, can_y, cw * 2, ch, can_c, rx=cw * 0.8))
        els.append(_ell(can_x, can_y, cw, cw * 0.50, dk(can_c, 0.78)))
        # Boquilla
        noz_c = (90, 92, 95)
        els.append(_rect(can_x - cw * 0.28, can_y - ch * 0.38, cw * 0.56, ch * 0.20, noz_c, rx=2))
        # Spray burst
        spray_c = _rgb(accent)
        for ang_deg in range(20, 160, 25):
            rad = math.radians(ang_deg)
            ex = can_x + math.cos(rad) * fist_r * 1.8
            ey = can_y - ch * 0.38 + math.sin(rad) * fist_r * 1.2
            els.append(_circ(ex, ey, fist_r * 0.35, spray_c, 0.75))

    elif acc == "wrench":
        wr_c = (158, 158, 160)
        wx = rhx
        wy2 = hand_y + fist_r * 0.4
        ww2 = fist_r * 0.28
        wh = fist_r * 2.2
        els.append(_rect(wx - ww2, wy2, ww2 * 2, wh, wr_c, rx=ww2))
        els.append(_ell(wx, wy2, fist_r * 0.62, fist_r * 0.48, wr_c))
        els.append(_ell(wx, wy2, fist_r * 0.40, fist_r * 0.30, dk(wr_c, 0.48)))

    elif acc == "sunglasses":
        gc = (18, 18, 22)
        gy = hcy + hr * 0.06
        gw = hr * 0.52
        gh = hr * 0.22
        els.append(_rect(cx - gw - 4, gy - gh, gw, gh * 2, gc, rx=gh * 0.5))
        els.append(_rect(cx + 4, gy - gh, gw, gh * 2, gc, rx=gh * 0.5))
        els.append(_rect(cx - 4, gy - gh * 0.3, 8, gh * 0.6, gc))

    elif acc == "cane":
        cane_c = (138, 98, 48)
        stick_w = max(3, fist_r * 0.28)
        els.append(
            f'<line x1="{lhx:.2f}" y1="{hand_y + fist_r:.2f}" '
            f'x2="{lhx - fist_r*0.4:.2f}" y2="{ground_y:.2f}" '
            f'stroke="{css(cane_c)}" stroke-width="{stick_w:.1f}" stroke-linecap="round"/>'
        )
        # Mango curvo
        els.append(
            f'<path d="M {lhx:.2f},{hand_y+fist_r:.2f} '
            f'Q {lhx-fist_r*0.6:.2f},{hand_y-fist_r*0.2:.2f} '
            f'{lhx:.2f},{hand_y-fist_r*0.6:.2f}" '
            f'fill="none" stroke="{css(cane_c)}" stroke-width="{stick_w:.1f}" stroke-linecap="round"/>'
        )

    elif acc == "gloves":
        glov_c = lt(top, 0.18)
        lace_c = dk(top, 0.55)
        gr = fist_r * 1.55
        for hx in [lhx, rhx]:
            els.append(_ell(hx, hand_y + gr * 0.5, gr, gr * 1.3, glov_c))
            els.append(_rect(hx - gr * 0.75, hand_y + gr * 0.25, gr * 1.5, gr * 0.25, lace_c, rx=2))

    elif acc == "cap_chain":
        cap_c = dk(top, 0.62)
        els.append(_ell(cx, hcy - hr * 0.62, hr * 0.88, hr * 0.55, cap_c))
        els.append(_poly([
            (cx - hr * 0.05, hcy - hr * 0.10),
            (cx + hr * 1.30, hcy - hr * 0.05),
            (cx + hr * 1.26, hcy + hr * 0.14),
            (cx - hr * 0.05, hcy + hr * 0.12),
        ], dk(cap_c, 0.78)))
        els.append(_circ(cx, hcy - hr * 1.14, hr * 0.07, lt(cap_c, 0.25)))
        # Cadena dorada
        gold = (218, 182, 58)
        cy2 = shoulder_y + hr * 0.48
        cr = max(4, hr * 0.14)
        step = cr * 2.2
        x2 = cx - hr * 0.80
        while x2 < cx + hr * 0.80:
            drop = abs(x2 - cx) * 0.18
            els.append(_circ(x2, cy2 + drop, cr, gold))
            x2 += step

    return els


# ── Icono PWA ────────────────────────────────────────────────────
def gen_icon(size=512):
    els = []
    cx = size / 2
    bg = (0, 17, 51)
    red = (255, 48, 48)
    cyan = (0, 229, 255)
    yellow = (255, 230, 0)

    els.append(_rect(0, 0, size, size, bg))
    pad = size * 0.05
    bw = max(4, size * 0.025)
    els.append(
        f'<rect x="{pad:.1f}" y="{pad:.1f}" width="{size-2*pad:.1f}" height="{size-2*pad:.1f}"'
        f' fill="none" stroke="{css(red)}" stroke-width="{bw:.1f}"/>'
    )
    step = max(20, size // 12)
    for x in range(int(pad), int(size - pad), step):
        els.append(_line(x, pad, x, size - pad, cyan, 1, 0.12))
    for y in range(int(pad), int(size - pad), step):
        els.append(_line(pad, y, size - pad, y, cyan, 1, 0.12))

    # "VS" central
    fs_big = size * 0.40
    els.append(_text(cx + 4, size * 0.68 + 4, "VS", (0, 0, 0), fs_big))
    els.append(_text(cx, size * 0.68, "VS", yellow, fs_big))

    # Sub-label
    fs_sm = size * 0.09
    els.append(_text(cx + 2, size * 0.82 + 2, "TEKKEN BARRIO", (0, 0, 0), fs_sm))
    els.append(_text(cx, size * 0.82, "TEKKEN BARRIO", cyan, fs_sm))

    body = '\n'.join(els)
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {size} {size}" width="{size}" height="{size}">\n'
            f'{body}\n</svg>')


# ── Main ─────────────────────────────────────────────────────────
def main():
    base       = os.path.dirname(os.path.abspath(__file__))
    thumbs_dir = os.path.join(base, "sprites", "thumbs")
    full_dir   = os.path.join(base, "sprites", "full")
    icons_dir  = os.path.join(base, "icons")
    os.makedirs(thumbs_dir, exist_ok=True)
    os.makedirs(full_dir,   exist_ok=True)
    os.makedirs(icons_dir,  exist_ok=True)

    for design in DESIGNS:
        slug = design["slug"]
        # Full sprite (512)
        svg_full = gen_sprite(design, 512)
        with open(os.path.join(full_dir, slug + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg_full)
        # Thumb (192)
        svg_thumb = gen_sprite(design, 192)
        with open(os.path.join(thumbs_dir, slug + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg_thumb)
        print(f"OK: {slug}")

    # PWA icons (SVG)
    for sz in [192, 512]:
        with open(os.path.join(icons_dir, f"icon-{sz}.svg"), "w", encoding="utf-8") as f:
            f.write(gen_icon(sz))
    print("OK: icons")
    print(f"\nTotal: {len(DESIGNS) * 2 + 2} SVG.")


if __name__ == "__main__":
    main()
