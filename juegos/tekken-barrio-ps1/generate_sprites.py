#!/usr/bin/env python3
"""
Genera placeholders PNG para los 15 personajes + iconos de la PWA.

- thumbs: 192x192
- full: 512x512
- icon-192.png e icon-512.png: iconos de la app

Uso:
    pip install Pillow
    python3 generate_sprites.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

CHARACTERS = [
    ("brawler-amarillo",      "BRAWLER\nAMARILLO",      "#FFDD00"),
    ("matriarca-azul",        "MATRIARCA\nAZUL",        "#0066FF"),
    ("sulima-x-fighter",      "SULIMA-X\nFIGHTER",      "#FF99CC"),
    ("duo-rayas-cadena",      "DUO RAYAS\n& CADENA",    "#FFFFFF"),
    ("la-patai-hija",         "LA PATAI\n& HIJA",       "#FFCC66"),
    ("caballero-negro",       "CABALLERO\nNEGRO",       "#444444"),
    ("el-chacal",             "EL\nCHACAL",             "#88FF88"),
    ("dona-mercado",          "DOÑA\nMERCADO",          "#FF6600"),
    ("panas-del-barrio",      "PANAS\nDEL BARRIO",      "#00FFAA"),
    ("la-graffitera",         "LA\nGRAFFITERA",         "#FF00FF"),
    ("el-mecanico",           "EL\nMECÁNICO",           "#888888"),
    ("los-primos",            "LOS\nPRIMOS",            "#FFAA00"),
    ("el-viejo-del-barrio",   "EL VIEJO\nDEL BARRIO",   "#AA8800"),
    ("la-reina-del-ring",     "LA REINA\nDEL RING",     "#FF2266"),
    ("el-rapero",             "EL\nRAPERO",             "#00AAFF"),
]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def get_font(size):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except Exception: pass
    return ImageFont.load_default()


def darken(rgb, f=0.6): return tuple(max(0, int(c * f)) for c in rgb)
def lighten(rgb, f=0.4): return tuple(min(255, int(c + (255 - c) * f)) for c in rgb)


class OffsetDraw:
    def __init__(self, d, ox, oy): self.d, self.ox, self.oy = d, ox, oy
    def ellipse(self, b, fill): self.d.ellipse([b[0]+self.ox,b[1]+self.oy,b[2]+self.ox,b[3]+self.oy], fill=fill)
    def rectangle(self, b, fill): self.d.rectangle([b[0]+self.ox,b[1]+self.oy,b[2]+self.ox,b[3]+self.oy], fill=fill)
    def polygon(self, pts, fill): self.d.polygon([(x+self.ox,y+self.oy) for (x,y) in pts], fill=fill)


def draw_silhouette(draw, w, h, color):
    cx = w / 2
    head_r = w * 0.13
    head_cy = h * 0.18
    draw.ellipse([cx-head_r,head_cy-head_r,cx+head_r,head_cy+head_r], fill=color)

    neck_w = w * 0.05
    draw.rectangle([cx-neck_w,head_cy+head_r*0.7,cx+neck_w,head_cy+head_r*1.4], fill=color)

    tt_y = head_cy + head_r * 1.2
    tb_y = h * 0.62
    tt_w = w * 0.16
    tb_w = w * 0.22
    draw.polygon([(cx-tt_w,tt_y),(cx+tt_w,tt_y),(cx+tb_w,tb_y),(cx-tb_w,tb_y)], fill=color)

    aw = w * 0.08
    draw.polygon([(cx-tt_w,tt_y+4),(cx-tt_w-aw*1.2,tt_y+4),
                  (cx-tb_w-aw*1.5,tb_y),(cx-tb_w-aw*0.3,tb_y)], fill=color)
    draw.polygon([(cx+tt_w,tt_y+4),(cx+tt_w+aw*1.2,tt_y+4),
                  (cx+tb_w+aw*1.5,tb_y),(cx+tb_w+aw*0.3,tb_y)], fill=color)

    fr = w * 0.06
    draw.ellipse([cx-tb_w-aw*1.5-fr*0.8,tb_y-fr*0.5,cx-tb_w-aw*1.5+fr*1.2,tb_y+fr*1.5], fill=color)
    draw.ellipse([cx+tb_w+aw*1.5-fr*1.2,tb_y-fr*0.5,cx+tb_w+aw*1.5+fr*0.8,tb_y+fr*1.5], fill=color)

    lt_y = tb_y - 2
    lb_y = h * 0.95
    lw = w * 0.08
    draw.polygon([(cx-lw*1.6,lt_y),(cx-lw*0.2,lt_y),(cx-lw*0.2,lb_y),(cx-lw*2.0,lb_y)], fill=color)
    draw.polygon([(cx+lw*0.2,lt_y),(cx+lw*1.6,lt_y),(cx+lw*2.0,lb_y),(cx+lw*0.2,lb_y)], fill=color)


def make_sprite(size, name_text, color_hex, is_thumb=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    color = hex_to_rgb(color_hex)
    pad = int(size * 0.04)

    draw.rectangle([pad,pad,size-pad,size-pad], fill=darken(color, 0.18) + (255,))
    bw = max(2, int(size * 0.012))
    draw.rectangle([pad+bw,pad+bw,size-pad-bw,size-pad-bw],
                   outline=lighten(color, 0.2)+(255,), width=bw)

    for i in range(0, size, max(8, size // 20)):
        draw.line([(0, i), (i, 0)], fill=(255, 255, 255, 14), width=1)

    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_silhouette(OffsetDraw(ImageDraw.Draw(sh), int(size*0.018), int(size*0.018)),
                    size, size, (0, 0, 0, 140))
    img = Image.alpha_composite(img, sh)

    silh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_silhouette(ImageDraw.Draw(silh), size, size, lighten(color, 0.05) + (255,))
    img = Image.alpha_composite(img, silh)

    hl = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(hl).polygon([
        (size*0.25, 0), (size*0.45, 0), (size*0.20, size), (0, size)
    ], fill=lighten(color, 0.5) + (90,))
    img.paste(hl, (0, 0), mask=silh.split()[3])

    draw = ImageDraw.Draw(img)
    fs = max(10, int(size * (0.075 if is_thumb else 0.06)))
    font = get_font(fs)
    text_y = int(size * 0.04)
    for line in name_text.split("\n"):
        try:
            bb = draw.textbbox((0, 0), line, font=font)
            tw, th = bb[2]-bb[0], bb[3]-bb[1]
        except Exception:
            tw, th = len(line) * fs * 0.6, fs
        tx = (size - tw) // 2
        for ox, oy in [(2, 2), (-1, -1)]:
            draw.text((tx+ox, text_y+oy), line, fill=(0, 0, 0, 220), font=font)
        draw.text((tx, text_y), line, fill=(255, 255, 255, 255), font=font)
        text_y += int(th * 1.3)

    return img


def make_app_icon(size):
    """Genera el icono cuadrado de la PWA."""
    img = Image.new("RGBA", (size, size), (0, 17, 51, 255))
    draw = ImageDraw.Draw(img)

    # Marco rojo
    pad = int(size * 0.05)
    draw.rectangle([pad, pad, size - pad, size - pad],
                   fill=(0, 17, 51, 255), outline=(255, 48, 48, 255), width=max(4, int(size*0.025)))

    # Líneas grid cyan
    step = max(20, size // 12)
    for x in range(pad, size - pad, step):
        draw.line([(x, pad), (x, size - pad)], fill=(0, 229, 255, 60), width=1)
    for y in range(pad, size - pad, step):
        draw.line([(pad, y), (size - pad, y)], fill=(0, 229, 255, 60), width=1)

    # "VS" central
    fs = int(size * 0.42)
    font = get_font(fs)
    text = "VS"
    try:
        bb = draw.textbbox((0, 0), text, font=font)
        tw, th = bb[2]-bb[0], bb[3]-bb[1]
    except Exception:
        tw, th = fs * 1.5, fs

    tx = (size - tw) // 2
    ty = int(size * 0.32)

    # Sombra
    for ox, oy in [(6, 6), (3, 3)]:
        draw.text((tx + ox, ty + oy), text, fill=(0, 0, 0, 220), font=font)
    # Color
    draw.text((tx, ty), text, fill=(255, 230, 0, 255), font=font)

    # Texto inferior "TEKKEN BARRIO"
    fs2 = int(size * 0.10)
    f2 = get_font(fs2)
    label = "TEKKEN BARRIO"
    try:
        bb2 = draw.textbbox((0, 0), label, font=f2)
        tw2, th2 = bb2[2]-bb2[0], bb2[3]-bb2[1]
    except Exception:
        tw2, th2 = fs2 * len(label) * 0.6, fs2

    tx2 = (size - tw2) // 2
    ty2 = int(size * 0.78)
    for ox, oy in [(2, 2), (-1, -1)]:
        draw.text((tx2 + ox, ty2 + oy), label, fill=(0, 0, 0, 220), font=f2)
    draw.text((tx2, ty2), label, fill=(0, 229, 255, 255), font=f2)

    return img


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    thumbs_dir = os.path.join(base, "sprites", "thumbs")
    full_dir = os.path.join(base, "sprites", "full")
    icons_dir = os.path.join(base, "icons")
    os.makedirs(thumbs_dir, exist_ok=True)
    os.makedirs(full_dir, exist_ok=True)
    os.makedirs(icons_dir, exist_ok=True)

    for slug, label, color in CHARACTERS:
        make_sprite(192, label, color, is_thumb=True).save(os.path.join(thumbs_dir, slug + ".png"))
        make_sprite(512, label, color, is_thumb=False).save(os.path.join(full_dir, slug + ".png"))
        print(f"OK: {slug}")

    print("Generando iconos PWA...")
    make_app_icon(192).save(os.path.join(icons_dir, "icon-192.png"))
    make_app_icon(512).save(os.path.join(icons_dir, "icon-512.png"))
    print("OK: icon-192.png, icon-512.png")

    total = len(CHARACTERS) * 2 + 2
    print(f"\nTotal generados: {total} PNG.")


if __name__ == "__main__":
    main()
