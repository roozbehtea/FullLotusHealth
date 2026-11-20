#!/usr/bin/env python3
"""Builds the private clinic tools into /clinic-tools/. They are not linked from the site,
not in the sitemap, and every page carries noindex. Run: python3 _src/clinic-tools/build.py"""
import pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = ROOT / "clinic-tools"

APPS = {
    "formula-maker": {"css": ["style.css"], "data": ["herbs.js", "formulas.js", "patterns.js"]},
    "point-finder": {"css": ["base.css", "points.css"], "data": ["pts1.js", "pts2.js", "pts3.js", "tung.js", "ehr-codes.js"]},
}

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="/assets/favicon-64.png">
<style>body{margin:0}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>
"""

def build(name, cfg):
    d = HERE / name
    shell = (d / "shell.html").read_text(encoding="utf-8")
    css = "\n".join((d / f).read_text(encoding="utf-8") for f in cfg["css"])
    data = "\n".join((d / f).read_text(encoding="utf-8") for f in cfg["data"])
    app = (d / "app.js").read_text(encoding="utf-8")
    page = shell.replace("/*STYLE*/", css).replace("/*DATA*/", data).replace("/*APP*/", app)
    head, sep, body = page.partition('<header class="top">')
    head = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n?', "", head)
    html = HEAD + head + "</head>\n<body>\n" + sep + body + "\n</body>\n</html>\n"
    target = OUT / name / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")
    return target

INDEX = HEAD + """<title>Clinic Tools</title>
<style>
body{font-family:"IBM Plex Sans",system-ui,sans-serif;background:#ECEEE6;color:#1C2220;line-height:1.5}
main{max-width:640px;margin:0 auto;padding-block:48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
h1{font-family:"Young Serif",Georgia,serif;font-weight:400;font-size:1.8rem;margin:0 0 6px}
p{color:#47514C;margin:0 0 24px}
a.tool{display:block;background:#F8F9F4;border:1px solid #C6CCC1;border-radius:8px;padding:16px 18px;margin-bottom:12px;color:inherit;text-decoration:none}
a.tool:hover{border-color:#47514C}
a.tool b{font-family:"Young Serif",Georgia,serif;font-weight:400;font-size:1.2rem;display:block}
a.tool span{color:#68716C;font-size:.92rem}
@media (prefers-color-scheme:dark){body{background:#121614;color:#E4E8DF}p{color:#BAC3BC}a.tool{background:#1A1F1C;border-color:#343C37}a.tool span{color:#8C968F}}
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=Young+Serif&display=swap">
</head>
<body><main>
<h1>Clinic tools</h1>
<p>Private working tools. Not linked from the main site.</p>
<a class="tool" href="formula-maker/"><b>Formula Maker</b><span>Pattern identification, herbs by function, base formulas and a prescription slip.</span></a>
<a class="tool" href="point-finder/"><b>Point Finder</b><span>Channel, extra and Master Tung points, special point tables, combinations and treatment plans.</span></a>
</main></body></html>
"""

if __name__ == "__main__":
    for n, c in APPS.items():
        print("Built", build(n, c).relative_to(ROOT))
    (OUT / "index.html").write_text(INDEX, encoding="utf-8")
    print("Built", (OUT / "index.html").relative_to(ROOT))
