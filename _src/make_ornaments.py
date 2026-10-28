#!/usr/bin/env python3
"""Generate the gold embroidery section topper (assets/orn-topper-*.svg).

An original lotus-and-scroll motif in the manner of Tibetan/Chinese silk embroidery:
a lotus on a shallow saucer (echoing the logo), flanked by ruyi cloud scrolls, drawn as
satin-stitch fill plus a thread outline and a thin highlight. Two colourways: gold for
light sections, gold-light for dark ones. Run: python3 _src/make_ornaments.py
"""
import math, os

W, H = 400, 44
CX = 200
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

def petal(L):
    a, b = .28 * L, .26 * L
    return (f"M0 0 C{a:.2f} {-.22*L:.2f} {b:.2f} {-.7*L:.2f} 0 {-L:.2f} "
            f"C{-b:.2f} {-.7*L:.2f} {-a:.2f} {-.22*L:.2f} 0 0Z")

def lotus(col, hi):
    out = []
    # back petals first, centre petal last
    for ang, L in [(-76, 14), (76, 14), (-52, 20), (52, 20), (-26, 25), (26, 25), (0, 29)]:
        t = f'transform="translate({CX} 33) rotate({ang})"'
        out.append(f'<path {t} d="{petal(L)}" fill="{col}" fill-opacity=".2" stroke="{col}" stroke-width="2" stroke-linejoin="round"/>')
        out.append(f'<path {t} d="{petal(L)}" fill="none" stroke="{hi}" stroke-width=".6" stroke-opacity=".8"/>')
        out.append(f'<path {t} d="M0 -{.2*L:.1f} L0 -{.72*L:.1f}" stroke="{col}" stroke-width="1" stroke-linecap="round" stroke-dasharray="2 2"/>')
    # saucer
    out.append(f'<path d="M176 34.5 Q{CX} 44 224 34.5" fill="none" stroke="{col}" stroke-width="2" stroke-linecap="round"/>')
    out.append(f'<path d="M176 34.5 Q{CX} 44 224 34.5" fill="none" stroke="{hi}" stroke-width=".6" stroke-opacity=".8"/>')
    return out

SCROLL = [
    # main vine with first curl
    "M228 34 C240 35 246 28 254 27 C264 26 268 17 260 14 C253 12 248 19 253 22",
    # second branch, tapering outward
    "M254 27 C264 35 278 37 290 31 C299 26 297 18 290 19 C285 20 286 26 291 25",
    # tail that meets the stitched rule
    "M290 31 C302 37 316 36 326 31",
]

def side(col, hi, mirror):
    t = f'transform="matrix(-1 0 0 1 {W} 0)"' if mirror else ""
    g = [f"<g {t}>"]
    for d in SCROLL:
        g.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2.1" stroke-linecap="round"/>')
        g.append(f'<path d="{d}" fill="none" stroke="{hi}" stroke-width=".6" stroke-opacity=".8" stroke-linecap="round"/>')
    for x, y, r in [(236, 25, 1.7), (272, 33, 1.5), (302, 24, 1.3)]:
        g.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{col}"/>')   # French knots
    g.append("</g>")
    return g

def build(col, hi):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Gold embroidered lotus and scroll ornament">']
    parts += lotus(col, hi) + side(col, hi, False) + side(col, hi, True)
    parts.append("</svg>")
    return "\n".join(parts) + "\n"

if __name__ == "__main__":
    for name, col, hi in [("gold", "#a8843e", "#f0dfae"), ("light", "#e7cf9c", "#fff6d8")]:
        p = os.path.join(OUT, f"orn-topper-{name}.svg")
        open(p, "w").write(build(col, hi)); print("wrote", p)
