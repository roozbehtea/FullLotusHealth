#!/usr/bin/env python3
"""Generate the gold Tibetan-style cloud band, assets/orn-clouds-gold.svg.

An original drawing in the manner of thangka cloud painting: a mass of scalloped lobes stacked
in rows, each lobe's tip curling into a hook, with a rolled inner edge and a scalloped underside.
Flat single-weight gold line work. Lobes are filled with the black of the tea section so each
row hides the one behind it. The tile repeats seamlessly (the cloud stays inside the tile).
Run: python3 _src/make_clouds.py
"""
import math, os

W, H = 420, 120
GOLD = "#b8943f"
NIGHT = "#1e1b18"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "orn-clouds-gold.svg")

def hook(cx, cy, R, start_deg, turns, sign, n=36):
    pts, total = [], turns * 2 * math.pi
    for i in range(n + 1):
        t = total * i / n
        r = R * (1 - .86 * t / total)
        a = math.radians(start_deg) + sign * t
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)

def scallop(x, y, w, h, flip=1, down=False, curl=True):
    """One lobe on base line y from x to x+w, bulging up (or down), hook at the right (flip=1) or left tip."""
    s = -1 if not down else 1
    x0, x1 = (x, x + w) if flip > 0 else (x + w, x)
    sweep = 1 if (flip > 0) != down else 0
    out = []
    body = f"M{x0:.1f} {y:.1f} A{w/2:.1f} {h:.1f} 0 0 {sweep} {x1:.1f} {y:.1f}"
    out.append(f'<path d="{body} Z" fill="{NIGHT}" stroke="none"/>')
    out.append(f'<path d="{body}" stroke-width="2"/>')
    # rolled inner edge, on the lit side
    iw, ih = w * .36, h * .72
    ix0 = x + w * .13 if flip > 0 else x + w * .87
    mid = x + w * .5
    out.append(f'<path d="M{ix0:.1f} {y + s*h*.04:.1f} A{iw:.1f} {ih:.1f} 0 0 {sweep} {mid:.1f} {y + s*h*.78:.1f}" stroke-width="1.1" stroke-opacity=".8"/>')
    if not curl:
        return out
    # tip curls into a hook inside the lobe
    c = w * .2
    hx = x1 - flip * c
    hy = y
    ang = 0 if flip > 0 else 180
    sg = -1 if (flip > 0) != down else 1
    out.append(f'<path d="{hook(hx, hy + s*c*.2, c, ang, 1.45, sg)}" stroke-width="1.7"/>')
    return out

parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none" stroke="{GOLD}" stroke-linecap="round" stroke-linejoin="round">']
# back row, tallest in the middle
for x, y, w, h, f in [(128, 50, 70, 38, 1), (275, 52, 60, 34, -1), (196, 50, 82, 44, 1)]:
    parts += scallop(x, y, w, h, f)
# middle row
for x, y, w, h, f in [(70, 70, 64, 32, -1), (310, 70, 62, 30, 1), (126, 70, 62, 34, 1), (248, 70, 66, 34, -1), (184, 70, 70, 38, 1)]:
    parts += scallop(x, y, w, h, f)
# front row
for x, y, w, h, f in [(32, 90, 60, 24, -1), (352, 90, 46, 22, 1), (86, 90, 56, 26, 1), (298, 90, 56, 26, -1), (138, 90, 60, 28, 1), (244, 90, 56, 28, -1), (190, 90, 60, 30, 1)]:
    parts += scallop(x, y, w, h, f)
# scalloped underside, lobes hanging down
for x, y, w, h, f in [(40, 90, 50, 14, 1), (92, 90, 48, 16, -1), (142, 90, 52, 16, 1), (194, 90, 54, 18, -1), (246, 90, 52, 16, 1), (298, 90, 48, 14, -1), (346, 90, 44, 12, 1)]:
    parts += scallop(x, y, w, h, f, down=True, curl=False)
parts.append("</svg>")
open(OUT, "w").write("\n".join(parts) + "\n")
print("wrote", OUT)
