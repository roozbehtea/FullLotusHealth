#!/usr/bin/env python3
"""Layered, slowly moving gold clouds for the black tea sections.

Art: Roozbeh's chosen Midjourney band and three single clouds, traced to paths
(_src/clouds/clouds.json holds each cloud's line path and a filled silhouette).
Each cloud is its own small SVG: its silhouette in the night colour with its gold line
on top, so a cloud in front hides the clouds behind it, as in thangka cloud painting.
Further-back clouds are smaller and dimmer. Every cloud stays upright.

The page places the clouds of a field with cloud_field() (used by build.py) and moves
each one with a CSS transform animation (see "Layered gold clouds" in style.css), so the
browser only slides finished images and never redraws the art.

Run: python3 _src/make_cloud_fields.py   (writes assets/orn-cloud-<cloud>-<layer>.svg)
"""
import json, os

HERE = os.path.dirname(__file__)
ART = json.load(open(os.path.join(HERE, "clouds", "clouds.json")))
NIGHT = (0x1E, 0x1B, 0x18)   # --night; the clouds only sit on night backgrounds
GOLD = (0xB8, 0x94, 0x3F)    # same gold as the earlier cloud ornament


def mix(a):
    """Gold at strength a over night, as a solid colour (so silhouettes still occlude)."""
    return "#" + "".join(f"{round(n + (g - n) * a):02x}" for g, n in zip(GOLD, NIGHT))


TONE = {"back": mix(0.26), "mid": mix(0.40), "front": mix(0.60)}

# A field is W x H units; the page sizes it with --cloud-w / --cloud-h (same W:H ratio, see style.css).
W, H = 2400, 420
# (cloud, x, y, width, layer); drawn in list order, back to front. x/y = top-left in the field.
FIELDS = {
    "a": [
        ("curls", 40, 30, 250, "back"),
        ("band", 330, 60, 760, "back"),
        ("bold", 1090, 20, 270, "back"),
        ("band", 1380, 55, 720, "back"),
        ("tail", 2120, 35, 260, "back"),
        ("tail", -30, 140, 330, "mid"),
        ("curls", 700, 120, 290, "mid"),
        ("bold", 1260, 130, 300, "mid"),
        ("curls", 2050, 140, 330, "mid"),
        ("band", 230, 225, 1150, "front"),
        ("tail", 1330, 215, 360, "front"),
        ("band", 1600, 250, 820, "front"),
    ],
    "b": [
        ("bold", 60, 25, 260, "back"),
        ("band", 360, 55, 740, "back"),
        ("tail", 1120, 30, 260, "back"),
        ("band", 1420, 60, 700, "back"),
        ("curls", 2140, 30, 240, "back"),
        ("curls", -20, 135, 320, "mid"),
        ("tail", 760, 125, 300, "mid"),
        ("curls", 1300, 135, 290, "mid"),
        ("bold", 2040, 135, 340, "mid"),
        ("band", 10, 245, 820, "front"),
        ("bold", 780, 215, 360, "front"),
        ("band", 1100, 225, 1150, "front"),
    ],
}

# Motion: back bands drift furthest, single clouds drift and turn a little (the swirl),
# the front band only sways. Each cloud gets its own speed and starting point.
MOTION = {"back": ("drift", 11), "mid": ("swirl", 6), "front": ("sway", 8)}


def asset(c, layer):
    return f"orn-cloud-{c}-{layer}.svg"


def cloud_svg(c, layer):
    a = ART[c]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {a["w"]:g} {a["h"]:g}" fill-rule="evenodd">'
            f'<path fill="#{"%02x%02x%02x" % NIGHT}" d="{a["fill"]}"/><path fill="{TONE[layer]}" d="{a["line"]}"/></svg>\n')


def cloud_field(name, where):
    """Markup for one field; where is 'top' or 'bottom' of its section."""
    spans = []
    for i, (c, x, y, w, layer) in enumerate(FIELDS[name]):
        h = w * ART[c]["h"] / ART[c]["w"]
        motion, dur = MOTION[layer if c == "band" else "mid"]   # single clouds always swirl
        dur += (i * 1.3) % 3          # slightly different speed per cloud
        delay = -((i * 7.1) % dur)    # and a different starting point
        way = "alternate-reverse" if i % 2 else "alternate"
        spans.append(
            f'<span class="cl {motion}" style="left:{x / W * 100:.2f}%;top:{y / H * 100:.2f}%;'
            f'width:{w / W * 100:.2f}%;height:{h / H * 100:.2f}%;background-image:url(/assets/{asset(c, layer)});'
            f'animation-duration:{dur:.1f}s;animation-delay:{delay:.1f}s;animation-direction:{way}"></span>')
    return f'<div class="cloud-field {where}" aria-hidden="true">{"".join(spans)}</div>'


if __name__ == "__main__":
    used = sorted({(c, layer) for items in FIELDS.values() for c, _, _, _, layer in items})
    for c, layer in used:
        out = os.path.join(HERE, "..", "assets", asset(c, layer))
        open(out, "w").write(cloud_svg(c, layer))
        print("wrote", os.path.relpath(out))
