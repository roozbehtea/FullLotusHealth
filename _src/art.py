"""Original line art for the microneedling and nanoneedling guide pages.
Returned as inline SVG strings so the page fonts and colours apply. Palette: thangka minerals on rice paper."""

CIN, GOLD, MAL, LAP, INK = "#8b3a3a", "#a8843e", "#2f5d4e", "#2e4a7a", "#1e1b18"
PAPER, SAND, PARCH, CIN_W, GOLD_W = "#f4ecdf", "#eae0d2", "#dccfbc", "#ecd6cf", "#efe3c3"

_ICONS = {
    "lines": "M6 16c4-4 8-4 12 0s8 4 12 0 8-4 12 0M6 25c4-4 8-4 12 0s8 4 12 0 8-4 12 0M6 34c4-4 8-4 12 0s8 4 12 0 8-4 12 0",
    "scar": "M8 31c6-10 26-10 32 0M17 26.5v.1M24 24v.1M31 26.5v.1M13 36h22",
    "texture": "M5 30c3-7 6-7 9 0s6 7 9 0 6-7 9 0 6 7 9 0M8 18h32",
    "pores": "M12 12a2.6 2.6 0 1 0 .1 0M24 12a2.6 2.6 0 1 0 .1 0M36 12a2.6 2.6 0 1 0 .1 0M12 24a2.6 2.6 0 1 0 .1 0M24 24a2.6 2.6 0 1 0 .1 0M36 24a2.6 2.6 0 1 0 .1 0M12 36a2.6 2.6 0 1 0 .1 0M24 36a2.6 2.6 0 1 0 .1 0M36 36a2.6 2.6 0 1 0 .1 0",
    "hair": "M9 38c0-15 7-24 15-24s15 9 15 24M17 22v-8M24 19V9M31 22v-8",
    "drop": "M24 7c8 10 12 16 12 22a12 12 0 0 1-24 0c0-6 4-12 12-22z",
    "glow": "M24 17a7 7 0 1 0 .1 0M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.2 4.2M33.3 33.3l4.2 4.2M10.5 37.5l4.2-4.2M33.3 14.7l4.2-4.2",
    "leaf": "M10 38C10 21 21 9 40 9c0 18-11 29-30 29zM10 38l18-18",
    "spark": "M24 6l4.5 13.5L42 24l-13.5 4.5L24 42l-4.5-13.5L6 24l13.5-4.5z",
    "repeat": "M37 17a14 14 0 1 0 2 9M38 8v9h-9",
    "chat": "M8 11h32v21H23l-9 8v-8H8z",
    "intake": "M13 9h22v32H13zM19 6h10v6H19zM19 21h10M19 28h10M19 35h6",
    "jar": "M12 14h24v6H12zM14 20h20v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2zM19 29h10",
    "needle": "M38 8l4 4-6 6-4-4zM32 14L10 36l-3 5 5-3 22-22",
    "light": "M24 30a4 4 0 1 0 .1 0M14 22a14 14 0 0 1 20 0M8 16a22 22 0 0 1 32 0M24 36v8",
    "tea": "M9 20h24v8a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10zM33 22h3a4 4 0 0 1 0 8h-3M16 7c-2 3 2 4 0 8M22 7c-2 3 2 4 0 8M28 7c-2 3 2 4 0 8",
    "bottle": "M20 5h8v7h-8zM16 14h16v6l2 4v14a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V24l2-4zM19 30h10",
    "shield": "M24 5l15 5v12c0 10-6 16-15 20C15 38 9 32 9 22V10zM17 24l5 5 9-10",
    "heart": "M24 41C9 31 7 20 13 14.5s11-2 11 3c0-5 5-8.500 11-3S39 31 24 41z",
}


def icon(name, size=48):
    return (f'<svg class="ico" viewBox="0 0 48 48" width="{size}" height="{size}" aria-hidden="true" focusable="false">'
            f'<path d="{_ICONS[name]}" fill="none" stroke="{CIN}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def _skin(x0, x1, epi_top, epi_h, derm_h, sub_h, labels=False):
    """Layered skin block: epidermis, dermis with collagen fibres, subcutis with fat cells."""
    w = x1 - x0
    epi_bot, derm_bot, sub_bot = epi_top + epi_h, epi_top + epi_h + derm_h, epi_top + epi_h + derm_h + sub_h
    s = [f'<rect x="{x0}" y="{epi_bot}" width="{w}" height="{derm_h}" fill="{CIN_W}"/>',
         f'<rect x="{x0}" y="{derm_bot}" width="{w}" height="{sub_h}" fill="{SAND}"/>',
         f'<rect x="{x0}" y="{epi_top}" width="{w}" height="{epi_h}" fill="{GOLD_W}"/>',
         f'<path d="M{x0} {epi_top}H{x1}" stroke="{GOLD}" stroke-width="2.5"/>',
         f'<path d="M{x0} {epi_bot}H{x1}" stroke="{GOLD}" stroke-width="1.2" stroke-dasharray="5 4"/>',
         f'<path d="M{x0} {derm_bot}H{x1}" stroke="{PARCH}" stroke-width="1.5"/>']
    # collagen fibres: gentle waves across the dermis
    for i in range(4):
        y = epi_bot + derm_h * (0.22 + 0.19 * i)
        a = 6 + (i % 2) * 3
        d = f"M{x0 + 6} {y:.0f}"
        x = x0 + 6
        while x < x1 - 30:
            d += f"c14 -{a} 28 {a} 42 0"
            x += 42
        s.append(f'<path d="{d}" fill="none" stroke="{CIN}" stroke-opacity=".5" stroke-width="2.6" stroke-linecap="round"/>')
    # fat cells in the subcutis
    cx = x0 + 26
    r = sub_h * 0.22
    while cx < x1 - 16:
        s.append(f'<ellipse cx="{cx:.0f}" cy="{derm_bot + sub_h * 0.5:.0f}" rx="{r * 1.15:.0f}" ry="{r:.0f}" fill="none" stroke="{PARCH}" stroke-width="1.6"/>')
        cx += r * 3.1
    return "".join(s), epi_bot, derm_bot


def skin_layers():
    """Hero art for microneedling: a needle pen above a skin cross-section, needles reaching into the dermis."""
    skin, epi_bot, derm_bot = _skin(24, 496, 190, 28, 118, 62)
    xs = [150, 205, 260, 315, 370]
    needles = "".join(
        f'<path d="M{x} 92V{epi_bot + 52}" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>'
        f'<path d="M{x} {epi_bot + 52}l0 6" stroke="{INK}" stroke-width="1.2"/>'
        f'<path d="M{x - 7} 190v28M{x + 7} 190v28" stroke="{GOLD}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 5" opacity=".0"/>'
        for x in xs)
    glow = "".join(f'<circle cx="{x}" cy="{epi_bot + 24}" r="9" fill="{GOLD}" fill-opacity=".28"/>' for x in xs)
    pen = (f'<rect x="124" y="30" width="272" height="62" rx="12" fill="{CIN}"/>'
           f'<rect x="124" y="30" width="272" height="9" rx="4" fill="{GOLD}"/>'
           f'<path d="M148 62h224" stroke="{PAPER}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>')
    labels = (f'<g font-family="Instrument Sans, Helvetica Neue, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1.6" fill="{INK}">'
              f'<text x="38" y="208">EPIDERMIS</text><text x="38" y="{epi_bot + 24}">DERMIS</text>'
              f'<text x="38" y="{derm_bot - 10}" fill="{CIN}">NEW COLLAGEN BUILDS HERE</text></g>')
    return (f'<svg class="art" viewBox="0 0 520 420" role="img" aria-label="Cross-section of skin: a microneedling pen sends fine needles through the epidermis into the dermis, where collagen fibres lie." focusable="false">'
            f'{skin}{glow}{needles}{pen}{labels}</svg>')


def nano_layers():
    """Hero art for nanoneedling: nano-tips resting at the surface, with serum entering shallow channels only."""
    skin, epi_bot, derm_bot = _skin(24, 496, 190, 28, 118, 62)
    xs = [140, 190, 240, 290, 340, 390]
    tips = "".join(
        f'<path d="M{x} 100V{190 + 12}" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
        f'<path d="M{x - 5} 190v12M{x + 5} 190v12" stroke="{LAP}" stroke-width="1.6" stroke-linecap="round" opacity=".0"/>'
        f'<circle cx="{x}" cy="{192 + 14}" r="4" fill="{LAP}" fill-opacity=".55"/>' for x in xs)
    drops = "".join(f'<path d="M{x + 14} 128c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="{LAP}" fill-opacity=".75"/>' for x in xs[:-1])
    pen = (f'<rect x="108" y="46" width="306" height="54" rx="12" fill="{LAP}"/>'
           f'<rect x="108" y="46" width="306" height="9" rx="4" fill="{GOLD}"/>'
           f'<path d="M132 76h258" stroke="{PAPER}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>')
    labels = (f'<g font-family="Instrument Sans, Helvetica Neue, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1.6" fill="{INK}">'
              f'<text x="38" y="208">EPIDERMIS</text><text x="38" y="{epi_bot + 24}">DERMIS</text>'
              f'<text x="38" y="{derm_bot - 10}" fill="{LAP}">SURFACE ONLY: NO DEEPER</text></g>')
    return (f'<svg class="art" viewBox="0 0 520 420" role="img" aria-label="Cross-section of skin: nano-tips open microscopic channels in the surface of the epidermis only, letting serum absorb without going deeper." focusable="false">'
            f'{skin}{pen}{tips}{drops}{labels}</svg>')


def depth(kind):
    """Small side-by-side depth diagram. kind: 'nano' (surface) or 'micro' (deeper)."""
    skin, epi_bot, derm_bot = _skin(8, 312, 92, 20, 62, 30)
    n = 5
    xs = [56 + i * 52 for i in range(n)]
    tip_y = 92 + 12 if kind == "nano" else epi_bot + 34
    col = LAP if kind == "nano" else CIN
    needles = "".join(f'<path d="M{x} 16V{tip_y}" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
                      f'<circle cx="{x}" cy="{tip_y}" r="3.6" fill="{col}"/>' for x in xs)
    return (f'<svg class="art" viewBox="0 0 320 200" role="img" aria-label="{"Nanoneedling tips stop in the surface layer of the skin" if kind == "nano" else "Microneedling needles reach into the dermis below the surface layer"}." focusable="false">'
            f'{skin}{needles}</svg>')
