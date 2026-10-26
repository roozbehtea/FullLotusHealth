#!/usr/bin/env python3
"""Generate the gold auspicious-cloud (xiangyun) band, assets/orn-clouds-gold.svg.

One hand-built cloud in the Chinese/Tibetan manner: a spiral head, a body that sweeps back
into a long flowing tail, and two small trailing curls. Flat single-weight gold line work.
The tile repeats seamlessly: the tail leaves and re-enters at the same height.
Run: python3 _src/make_clouds.py
"""
import os

W, H = 240, 72
GOLD = "#b8943f"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "orn-clouds-gold.svg")

PATHS = [
    # head: rises out of the tail, loops over, and winds into a spiral
    "M90 55 C82 50 80 40 86 30 C94 14 124 10 134 28 C142 42 132 56 118 54 "
    "C106 52 102 38 112 32 C121 27 130 34 126 41 C123 46 116 45 117 40",
    # lower lobe on the right of the head, flowing out into the tail
    "M134 28 C146 26 156 34 154 44 C152 54 140 58 130 56",
    # long tail: enters from the left edge, sweeps under the head, trails off right and re-joins the edge
    "M0 60 C20 60 30 52 46 52 C62 52 70 58 86 56 C100 55 110 60 130 56 "
    "C150 62 166 62 184 58 C206 53 220 60 240 60",
    # two trailing curls riding the tail
    "M46 52 C40 44 46 36 54 38 C61 40 60 49 53 48 C49 47 49 43 52 43",
    "M186 58 C182 50 188 42 196 44 C203 46 201 55 195 54 C191 53 191 49 194 49",
]

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none" stroke="{GOLD}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">']
svg += [f'<path d="{d}"/>' for d in PATHS]
svg.append("</svg>")
open(OUT, "w").write("\n".join(svg) + "\n")
print("wrote", OUT)
