#!/usr/bin/env python3
"""Compose the layered gold cloud fields for the black tea sections.

Art: Roozbeh's chosen Midjourney band and three single clouds, traced to paths
(_src/clouds/clouds.json holds each cloud's line path and a filled silhouette).
Each cloud is drawn as its silhouette in the night colour with its gold line on top,
so a cloud in front hides the clouds behind it, as in thangka cloud painting.
Further-back clouds are smaller and dimmer. Every cloud stays upright.

Run: python3 _src/make_cloud_fields.py   (writes assets/orn-clouds-tea-*.svg)
"""
import json, os

HERE = os.path.dirname(__file__)
ART = json.load(open(os.path.join(HERE, "clouds", "clouds.json")))
NIGHT = (0x1E, 0x1B, 0x18)   # --night; the fields only sit on night backgrounds
GOLD = (0xB8, 0x94, 0x3F)    # same gold as the earlier cloud ornament


def mix(a):
    """Gold at strength a over night, as a solid colour (so silhouettes still occlude)."""
    return "#" + "".join(f"{round(n + (g - n) * a):02x}" for g, n in zip(GOLD, NIGHT))


TONE = {"back": mix(0.26), "mid": mix(0.40), "front": mix(0.60)}

W, H = 2400, 510
# (cloud, x, y, width, layer); drawn in list order, back to front. x/y = top-left in the field.
FIELDS = {
    "a": [
        ("curls", 120, 70, 330, "back"),
        ("band", 520, 100, 1150, "back"),
        ("bold", 1820, 60, 360, "back"),
        ("tail", -40, 200, 470, "mid"),
        ("curls", 1880, 190, 470, "mid"),
        ("band", 300, 230, 1800, "front"),
    ],
    "b": [
        ("bold", 200, 60, 340, "back"),
        ("band", 760, 95, 1120, "back"),
        ("tail", 1900, 80, 380, "back"),
        ("bold", 1860, 200, 520, "mid"),
        ("tail", 30, 190, 490, "mid"),
        ("band", 340, 230, 1800, "front"),
    ],
}


def svg(items):
    used = sorted({c for c, *_ in items})
    defs = "".join(f'<path id="{c}-f" d="{ART[c]["fill"]}"/><path id="{c}-l" d="{ART[c]["line"]}"/>' for c in used)
    body = []
    for c, x, y, w, layer in items:
        s = w / ART[c]["w"]
        body.append(f'<g transform="translate({x} {y}) scale({s:.4f})"><use href="#{c}-f" fill="#{"%02x%02x%02x" % NIGHT}"/><use href="#{c}-l" fill="{TONE[layer]}"/></g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill-rule="evenodd">'
            f'<defs>{defs}</defs>{"".join(body)}</svg>\n')


if __name__ == "__main__":
    for name, items in FIELDS.items():
        out = os.path.join(HERE, "..", "assets", f"orn-clouds-tea-{name}.svg")
        open(out, "w").write(svg(items))
        print("wrote", os.path.relpath(out))
