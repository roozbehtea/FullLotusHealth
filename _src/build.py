#!/usr/bin/env python3
"""Generate the Full Lotus Health static site.

Usage:  python3 _src/build.py            # preview build; missing links fall back to phone/text
        python3 _src/build.py --launch   # refuses to build until the two Google links are set

Edit _src/config.json (booking_url, intake_url), re-run, commit, push.
Output pages are plain .html files in the repo root. GitHub Pages serves
treatments.html at /treatments, so the old Wix addresses keep working with no redirects.
"""
import json, sys, html, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "_src" / "config.json").read_text())
LAUNCH = "--launch" in sys.argv
TODAY = datetime.date.today().isoformat()

SITE = "https://www.fulllotushealth.com"
NAME = "Full Lotus Health"
PHONE_DISPLAY = "(818) 253-9307"
PHONE_TEL = "+18182539307"
EMAIL = "info@fulllotushealth.com"
ADDR = dict(street="2116 N Glenoaks Blvd, Ste 3", city="Burbank", region="CA", zip="91504")
ADDR_LINE = "2116 N Glenoaks Blvd, Ste 3, Burbank, CA 91504"
MAPS = "https://www.google.com/maps/search/?api=1&query=" + "2116+N+Glenoaks+Blvd+Ste+3+Burbank+CA+91504"

BOOK = CFG.get("booking_url", "").strip()
INTAKE = CFG.get("intake_url", "").strip()
SIGNUP = CFG.get("signup_url", "").strip()   # optional: Apps Script web app that saves signup emails
missing = [k for k, v in (("booking_url", BOOK), ("intake_url", INTAKE)) if not v]
if missing:
    msg = "Missing in _src/config.json: " + ", ".join(missing)
    if LAUNCH:
        sys.exit("LAUNCH BUILD REFUSED. " + msg)
    print("WARNING (preview build):", msg)
BOOK_HREF = BOOK or "/book-online"
INTAKE_HREF = INTAKE or "/new-patients"
BOOK_EXTERNAL = bool(BOOK)


def e(s):
    return html.escape(s, quote=True)


# ------------------------------------------------------------------ data
SERVICES = [
    dict(slug="medical-microneedling-session", name="Microneedling", wix_name="Medical Microneedling Session",
         price=500, minutes=90, group="beauty",
         tagline="Revitalize your skin with collagen induction therapy for skin or hair.",
         title="Microneedling in Burbank, CA | Full Lotus Health",
         meta="Medical microneedling in Burbank with custom Chinese herbal serums and red light therapy. For fine lines, acne scars, texture, and thinning hair.",
         short="Collagen induction therapy with custom Chinese herbal serums and red light therapy. For fine lines, acne scars, uneven texture, and thinning hair.",
         body=[
            ("p", "Medical microneedling in Burbank, performed by Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience."),
            ("p", "Microneedling, also called collagen induction therapy, uses fine, sterile, medical-grade needles to create tiny controlled channels in the skin. This prompts your skin's natural repair process, which builds new collagen over the following weeks."),
            ("h2", "What it can help with"),
            ("ul", ["Fine lines and wrinkles, including crow's feet", "Acne scarring", "Uneven texture and tone", "Enlarged pores", "Thinning hair along the hairline (scalp microneedling)"]),
            ("h2", "What makes it different here"),
            ("p", "Every session uses custom Chinese herbal serums chosen for your skin, which absorb through the open channels during treatment. Red light therapy is included. Because your practitioner is trained in Chinese medicine, your skin is looked at as part of your whole health, not in isolation."),
            ("h2", "What to expect"),
            ("p", "Sessions are 90 minutes, and your first visit includes an intake and a treatment plan. A numbing cream is applied first, and most people find the treatment comfortable. Expect some redness afterward, similar to a mild sunburn, that usually settles within a day or two. Results build over time, and most people do a series of sessions spaced several weeks apart."),
            ("h2", "What patients say"),
            ("q", "The improvement seen in my crows feet as well as the overall tone and brightness of my skin is amazing! … The numbing cream is great and the whole procedure was completely painless.", "Stephany"),
            ("q", "I have also started microneedling for hair loss. After about 3 treatments, I have new tiny hairs growing around my hairline.", "Rosa"),
            ("small", "Individual results vary."),
            ("h2", "Microneedling or nanoneedling?"),
            ("p", "Microneedling works deeper, for scarring, lines, and thinning hair. Nanoneedling is a gentler surface treatment for glow and hydration, with no downtime. Not sure which fits you? Book a session and we'll decide together, or text or email a question."),
         ], related=["facial-nano-needling", "full-lotus-lift"]),
    dict(slug="facial-nano-needling", name="Nanoneedling", wix_name="Facial Nano Needling",
         price=350, minutes=60, group="beauty",
         tagline="Unveil your skin's natural glow with advanced nano-infusion technology.",
         title="Nanoneedling Facial in Burbank, CA | Full Lotus Health",
         meta="Nanoneedling facial in Burbank with custom Chinese herbal serums and red light therapy. A gentle, no-downtime treatment for glowing, hydrated skin.",
         short="A gentle surface treatment with custom herbal serums and red light therapy. No downtime. For glow, hydration, and sensitive skin.",
         body=[
            ("p", "Nanoneedling facial in Burbank, performed by Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience."),
            ("p", "Nanoneedling is a gentle alternative to microneedling. It uses ultra-fine nano-tips that open microscopic channels in the very surface of the skin, without going deeper. Those channels let hyaluronic acid, vitamins, and custom Chinese herbal serums absorb where your skin needs them."),
            ("h2", "What it can help with"),
            ("ul", ["Dull, dehydrated, or tired-looking skin", "Fine lines and uneven texture", "Sensitive skin that doesn't do well with stronger treatments", "A glow before an event", "Maintenance between microneedling sessions"]),
            ("h2", "What makes it different here"),
            ("p", "Every treatment uses custom Chinese herbal serums chosen for your skin, and red light therapy is included. Because your practitioner is trained in Chinese medicine, your skin is looked at as part of your whole health, not in isolation."),
            ("h2", "What to expect"),
            ("p", "Sessions are 60 minutes. There's no downtime, so you can go straight back to your day. Skin often looks brighter right away and keeps improving over the following days. It works well on its own or as a regular series."),
            ("h2", "What patients say"),
            ("q", "When Roozbeh mentioned he added microneedling and nano needling services, I was interested but a little hesitant, not sure whether it would hurt or be effective. I took the plunge and am glad I did. … My skin feels smoother and firmer. (And neither hurt.)", "Rosa"),
            ("small", "Individual results vary."),
            ("h2", "Nanoneedling or microneedling?"),
            ("p", "Nanoneedling is a surface-level treatment for glow and hydration, with no downtime. Microneedling works deeper, for scarring, lines, and thinning hair. Not sure which fits you? Book a session and we'll decide together, or text or email a question."),
         ], related=["medical-microneedling-session", "full-lotus-lift"]),
    dict(slug="full-lotus-lift", name="Cosmetic Acupuncture", wix_name="Full Lotus Lift",
         price=250, minutes=60, group="beauty",
         tagline="Rejuvenate your skin and quiet your mind.",
         title="Cosmetic Acupuncture in Burbank, CA | Full Lotus Health",
         meta="Cosmetic acupuncture (the Full Lotus Lift) in Burbank: facial acupuncture with red light therapy, from a licensed acupuncturist. Natural lifting and glow.",
         short="Facial acupuncture at tension-releasing and lifting points, combined with constitutional body points. Red light therapy included.",
         body=[
            ("p", "Cosmetic acupuncture in Burbank, offered at Full Lotus Health as the Full Lotus Lift."),
            ("p", "The Full Lotus Lift is a holistic, personalized beauty treatment designed to bring out your natural, radiant glow. Using premium organic products and gentle, effective techniques, this service deeply nourishes the skin while promoting a profound sense of inner calm. Leave looking refreshed, luminous, and completely restored."),
            ("h2", "Whatever resides in the heart is expressed in the face"),
            ("p", "In Chinese medicine the mind is represented by the heart, and it opens to the face. In this cosmetic acupuncture treatment, we calm the mind, balance the body, and focus on specific tension-releasing and lifting points on the face. Red light therapy is included."),
            ("h2", "How it works"),
            ("p", "Your first session includes a detailed intake and treatment plan. Then relax and enjoy. It is best done as a series."),
         ], related=["medical-microneedling-session", "facial-nano-needling"]),
    dict(slug="acupuncture-initial-treatment", name="Acupuncture: Initial Treatment", wix_name="Acupuncture Initial Treatment",
         price=180, minutes=60, group="acu",
         tagline="Your first acupuncture session.",
         title="Acupuncture in Burbank: Initial Treatment | Full Lotus Health",
         meta="Your first acupuncture visit in Burbank: a detailed intake, a treatment plan, and an acupuncture treatment with Roozbeh Ghobadpour, L.Ac.",
         short="A detailed intake, a treatment plan, and your first acupuncture treatment.",
         body=[("p", "Your first acupuncture session will include a detailed intake, treatment plan, and acupuncture treatment."),
               ("p", "Please complete the new patient intake form before your visit. You can find it on the New patients page.")],
         related=["acupuncture-repeat-treatment", "initial-consultation-online"]),
    dict(slug="acupuncture-repeat-treatment", name="Acupuncture: Repeat Treatment", wix_name="Acupuncture Repeat Treatment",
         price=120, minutes=45, group="acu",
         tagline="Repeat acupuncture.",
         title="Acupuncture in Burbank: Repeat Treatment | Full Lotus Health",
         meta="Follow-up acupuncture treatment in Burbank, following the plan made at your first visit with Roozbeh Ghobadpour, L.Ac.",
         short="Acupuncture treatment following your plan from the initial intake.",
         body=[("p", "Acupuncture treatment following the treatment plan made after your initial intake.")],
         related=["acupuncture-initial-treatment"]),
    dict(slug="initial-consultation-online", name="Initial Consultation (Online)", wix_name="Initial Consultation (Online)",
         price=180, minutes=60, group="consult",
         tagline="Harmonize your body, mind, and spirit through ancient wisdom and modern science.",
         title="Online Chinese Medicine Consultation | Full Lotus Health",
         meta="Online Chinese herbal medicine consultation with Roozbeh Ghobadpour, L.Ac.: classical diagnosis, herbal prescriptions, and nutritional guidance.",
         short="A comprehensive online consultation with herbal prescriptions and nutritional guidance.",
         body=[("p", "A comprehensive analysis integrating Classical Chinese Medicine, herbal prescriptions, and nutritional guidance. This session utilizes a unique diagnostic method that bridges physical health with mind and spirit, incorporating modern testing and Vedic Astrology for a complete view of your well-being."),
               ("p", "This session takes place online by video.")],
         related=["repeat-consultation-online"]),
    dict(slug="repeat-consultation-online", name="Repeat Consultation (Online)", wix_name="Repeat Consultation (Online)",
         price=180, minutes=45, group="consult",
         tagline="Continue your journey to whole-system healing from the comfort of your home.",
         title="Repeat Online Consultation | Full Lotus Health",
         meta="Follow-up online Chinese medicine consultation: review your progress and adjust your herbal and wellness plan with Roozbeh Ghobadpour, L.Ac.",
         short="A follow-up session to review progress and adjust your wellness plan.",
         body=[("p", "A follow-up session designed to review your progress and adjust your holistic wellness plan. We dive deeper into your results to ensure you are achieving lasting vitality and balance."),
               ("p", "This session takes place online by video.")],
         related=["initial-consultation-online"]),
    dict(slug="gong-fu-tea-ceremony", name="Gong Fu Tea Ceremony", wix_name="Gong Fu Tea Ceremony",
         price=55, minutes=60, group="tea",
         tagline="A high-quality tea ritual for mindfulness and holistic balance.",
         title="Gong Fu Tea Ceremony in Burbank | Full Lotus Health",
         meta="Gong Fu tea ceremony in Burbank: premium tea prepared with precision for mindfulness, relaxation, and an appreciation of tea's subtle nuances.",
         short="Premium tea prepared with precision, for mindfulness and deep relaxation.",
         body=[("p", "Experience the meditative art of Gong Fu tea, where premium tea leaves are prepared with precision using the highest quality teaware and water. This ritual is designed to promote mindfulness, deep relaxation, and an appreciation for the subtle nuances of tea.")],
         related=["private-gong-fu-tea-ceremony", "bowl-tea-ceremony"]),
    dict(slug="private-gong-fu-tea-ceremony", name="Private Gong Fu Tea Ceremony", wix_name="Private Gong Fu Tea Ceremony",
         price=250, minutes=None, group="tea",
         tagline="A meditative journey through the rich heritage of tea.",
         title="Private Gong Fu Tea Ceremony in Burbank | Full Lotus Health",
         meta="Private Gong Fu tea ceremony in Burbank for up to five guests: high-quality loose-leaf tea, prepared with precision and mindfulness.",
         short="A private session for up to five guests, with loose-leaf tea prepared with precision and mindfulness.",
         body=[("p", "Experience the traditional art of Gong Fu tea, where high-quality loose-leaf teas are prepared with precision and mindfulness. This immersive session focuses on the aroma, flavor profiles, and meditative qualities of premium teas in an intimate setting."),
               ("p", "Private sessions hold up to five guests.")],
         related=["gong-fu-tea-ceremony", "bowl-tea-ceremony"]),
    dict(slug="bowl-tea-ceremony", name="Bowl Tea Ceremony", wix_name="Bowl Tea Ceremony",
         price=35, minutes=None, group="tea",
         tagline="Joy in every sip.",
         title="Bowl Tea Ceremony in Burbank | Full Lotus Health",
         meta="Bowl tea ceremony in Burbank: drink tea in silence with mindfulness, in a small group. Based on the tradition of tea master Wu De.",
         short="A small-group ceremony of silent, mindful tea drinking.",
         body=[("p", "Experience the meditative art of a traditional Bowl Tea Ceremony, designed to cultivate mindfulness and inner peace. Through the rhythmic ritual of tea preparation and silent drinking, you will find a space for reflection and group connection. This session promotes deep relaxation and a sense of shared presence."),
               ("p", "Groups hold up to six guests.")],
         related=["gong-fu-tea-ceremony", "private-gong-fu-tea-ceremony"]),
]
BY_SLUG = {s["slug"]: s for s in SERVICES}

# ------------------------------------------------------------------ Five Element Rejuvenation series
# First-pass copy. Roozbeh will rewrite the element text in his own words.
# Series price follows the acupuncture pattern ($120 single, five at $100): about 17% off five single sessions.
SERIES = "Five Element Rejuvenation™"
PACKAGES = {
    "medical-microneedling-session": dict(price=2100, guide="/microneedling-burbank"),
    "facial-nano-needling": dict(price=1450, guide="/nanoneedling-burbank"),
}
for _slug, _p in PACKAGES.items():
    _p["per"] = _p["price"] // 5
    _p["name"] = f'{SERIES} series: {BY_SLUG[_slug]["name"]}'

# (element, theme, colour, focus, text, signature serum)
# Fire and Water serums are not chosen yet, so the copy describes what they do rather than naming an ingredient.
FIVE_ELEMENTS = [
    ("Wood", "Release", "var(--malachite)", "Tension and expression lines",
     "In Chinese medicine, Wood governs smooth, easy movement. When it is held back, it shows in the face as tension: a furrowed brow, a set jaw, lines that come from expression. This session focuses on letting that tension go.",
     "Apple stem cell extract, for renewal and new growth"),
    ("Fire", "Radiance", "var(--cinnabar)", "Redness and a lack of glow",
     "Fire relates to the Heart, which Chinese medicine says shows in the complexion. Too much heat shows as redness and irritation; too little, as dullness. This session calms redness and brings back a natural glow.",
     "A cooling, heat-clearing botanical serum"),
    ("Earth", "Lift", "var(--gold)", "Puffiness and sagging",
     "Earth holds things in place and keeps fluids moving. When it is weak, the face can look puffy or start to lose its shape. This session focuses on firmness and lift.",
     "Shiitake mushroom extract"),
    ("Metal", "Refine", "#9b968f", "Texture and pores",
     "In Chinese medicine, Metal governs the skin and the pores. This session focuses on smoothness, texture, and pore size.",
     "White snow fungus (tremella) extract, prized for moisture"),
    ("Water", "Restore", "var(--lapis)", "Dark circles and deeper signs of ageing",
     "Water is the body's deepest reserve, and Chinese medicine links it to ageing. It shows around the eyes as dark circles and hollowness. The final session works on these deeper signs and seals in what the series has built.",
     "A deeply nourishing botanical serum"),
]

TESTIMONIALS_HOME = [
    ("Finding Roozbeh was like finding a rare and precious treasure. His insight and knowledge never ceases to amaze me and every treatment I have had from him over the past 5 years has felt in tune with what I needed at the time. His skillful application of needles means that even if in pain or sick, I can go to him for help and feel confident that he will be kind and gentle in his endeavor to help me feel better. After treatment I often stay for tea and meditation in the purpose built tea lounge… all in all Full Lotus Health is wonderful experience for body and mind and spirit.", "Sue"),
    ("Roozbeh brings together tea, acupuncture and TCM for a holistic healing experience. I've been doing tea and acupuncture with him for some time now and thoroughly enjoy his company. He is well versed in tea with many years of experience making the combination with his traditional Chinese medicine expertise truly rich and edifying. Roozbeh's passion for the healing arts and care for his clients is genuinely something I admire. There are few people here in California with the combination of expertise that he has and I consider myself fortunate to know him!", "Amelia"),
    ("I've been a patient of Rooz's for 8 years now, and it's been life changing. He helped me overcome illness and has kept me healthy since. He's kind, patient and truly cares about his patients.", "Marissa"),
    ("Roozbeh is the best. Great knowledge, great tea, great acupuncture, great company. I always feel so much better and more grounded leaving his place than I did before I entered. Can't recommend it enough.", "Marcus"),
    ("I have been a patient here for 5 years and I can't speak highly enough about what it's done for me and my life. Leaving here I feel rejuvenated and aligned. The wisdom and intuition that Roozbeh brings into his practice is one of a kind. He addresses issues methodically. His tea space also offers a place to ground and let go for the moment. I always leave with a full cup of abundant health. Thank you Roozbeh!", "Iman"),
]
TESTIMONIALS_BEAUTY = [
    ("I highly recommend Roozbeh for micro needling. The improvement seen in my crows feet as well as the overall tone and brightness of my skin is amazing! Way better than any of the numerous creams and peels I have tried over the years. The numbing cream is great and the whole procedure was completely painless.", "Stephany"),
    ("When Roozbeh mentioned he added microneedling and nano needling services, I was interested but a little hesitant, not sure whether it would hurt or be effective. I took the plunge and am glad I did. The very large bags under my eyes (they are called festoons by doctors) have diminished quite a bit and my skin feels smoother and firmer. (And neither hurt.) I have also started microneedling for hair loss. After about 3 treatments, I have new tiny hairs growing around my hairline and am looking forward to seeing what a few more treatments will do. Even though I am not using Minoxidil, I am seeing promising results.", "Rosa"),
    ("Rooz is also incredibly easy to talk to. Very down-to-earth, thoughtful, and never rushed. The whole experience is calm and comfortable, and I genuinely look forward to my appointments. He's also started offering microneedling for hair regrowth, which I've been doing, and the results have been very encouraging to say the least. Overall, it's just consistently good care from someone who clearly knows what he's doing and actually cares about the people he's working with. I'm really grateful I found him.", "Chris"),
]

NAV = [
    ("/", "Home"),
    ("/treatments", "Natural beauty"),
    ("/acupuncture", "Acupuncture"),
    ("/consult-heal", "Consult & heal"),
    ("/tea-ceremonies", "Tea ceremonies"),
    ("/new-patients", "New patients"),
]


# ------------------------------------------------------------------ structured data
def money(n):
    return f"{n:.2f}"


def business_ld():
    offers = []
    for s in SERVICES:
        offers.append({
            "@type": "Offer",
            "itemOffered": {"@type": "Service", "name": s["name"], "url": f"{SITE}/service-page/{s['slug']}"},
        })
    return {
        "@context": "https://schema.org",
        "@type": ["HealthAndBeautyBusiness", "LocalBusiness"],
        "@id": f"{SITE}/#business",
        "name": NAME,
        "url": SITE + "/",
        "description": "Acupuncture and Chinese herbal medicine clinic in Burbank, CA offering microneedling, nanoneedling, cosmetic acupuncture, cupping, moxibustion, and tea ceremony.",
        "telephone": PHONE_TEL,
        "email": EMAIL,
        "image": f"{SITE}/assets/logo-seal.png",
        "logo": f"{SITE}/assets/logo-seal.png",
        "priceRange": "$35-$500",
        "address": {"@type": "PostalAddress", "streetAddress": ADDR["street"], "addressLocality": ADDR["city"],
                    "addressRegion": ADDR["region"], "postalCode": ADDR["zip"], "addressCountry": "US"},
        "geo": {"@type": "GeoCoordinates", "latitude": 34.1929, "longitude": -118.3247},
        "hasMap": MAPS,
        "areaServed": [{"@type": "City", "name": c} for c in ("Burbank", "Glendale", "Toluca Lake", "North Hollywood", "Studio City")],
        "founder": {"@type": "Person", "name": "Roozbeh Ghobadpour", "jobTitle": "Licensed Acupuncturist (L.Ac.)"},
        "knowsAbout": ["Cosmetic acupuncture", "Microneedling", "Nanoneedling", "Acupuncture", "Chinese herbal medicine", "Chinese medicine for skin conditions", "Fertility acupuncture", "Cupping", "Moxibustion", "Chinese tea ceremony"],
        "makesOffer": offers,
    }


def service_ld(s, url=None, desc=None, priced=True):
    d = {
        "@context": "https://schema.org", "@type": "Service",
        "name": s["name"], "description": desc or s["meta"],
        "url": url or f"{SITE}/service-page/{s['slug']}",
        "provider": {"@id": f"{SITE}/#business"},
        "areaServed": {"@type": "City", "name": "Burbank"},
    }
    if priced:
        d["offers"] = {"@type": "Offer", "price": money(s["price"]), "priceCurrency": "USD", "url": BOOK or f"{SITE}/book-online"}
        pk = PACKAGES.get(s.get("slug"))
        if pk:
            d["offers"] = [d["offers"], {"@type": "Offer", "name": pk["name"] + " (5 sessions)", "price": money(pk["price"]),
                                         "priceCurrency": "USD", "url": BOOK or f"{SITE}/book-online"}]
    return d


def breadcrumb_ld(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(trail)]}


# ------------------------------------------------------------------ layout
def book_btn(label="Book", cls="", small=False):
    c = "btn " + ("small " if small else "") + cls
    rel = ' rel="noopener"' if BOOK_EXTERNAL else ""
    return f'<a class="{c.strip()}" href="{e(BOOK_HREF)}"{rel}>{e(label)}</a>'


OG_IMAGE = f"{SITE}/assets/og-share.jpg"
OG_ALT = "A quiet tea table at Full Lotus Health, an acupuncture and skin clinic in Burbank, CA"


def page(path, title, meta, main, ld=None, current=None, noindex=False, og_type="website", og_image=None):
    canon = SITE + (path if path != "/" else "/")
    nav_items = []
    for href, label in NAV:
        cur = ' aria-current="page"' if (current == href) else ""
        nav_items.append(f'<li><a href="{href}"{cur}>{e(label)}</a></li>')
    nav_items.append(f'<li><a class="tel" href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>')
    nav_items.append(f'<li>{book_btn("Book", small=True)}</li>')
    ld_blocks = "".join(f'<script type="application/ld+json">{json.dumps(x, separators=(",", ":"))}</script>\n' for x in (ld or []))
    feed_link = f'<link rel="alternate" type="application/rss+xml" title="{NAME} blog" href="/feed.xml">\n' if POSTS else ""
    robots = ('<meta name="robots" content="noindex, follow">\n' if noindex
              else '<meta name="robots" content="index, follow, max-image-preview:large">\n')
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(meta)}">
{robots}<link rel="canonical" href="{canon}">
<meta property="og:site_name" content="{NAME}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(meta)}">
<meta property="og:url" content="{canon}">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="{og_image or OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{e(OG_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(meta)}">
<meta name="twitter:image" content="{og_image or OG_IMAGE}">
<meta name="twitter:image:alt" content="{e(OG_ALT)}">
<meta name="theme-color" content="#f4ecdf">
<link rel="icon" href="/assets/favicon-64.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
{feed_link}{ld_blocks}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="band" aria-hidden="true"></div>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="Full Lotus Health, home">
      <img src="/assets/logo-horizontal.svg" width="260" height="78" alt="{NAME}">
    </a>
    <input type="checkbox" id="menu-check" class="menu-check" aria-label="Open menu">
    <label for="menu-check" class="menu-toggle">Menu</label>
    <nav class="nav" aria-label="Main">
      <ul>
        {"".join(nav_items)}
      </ul>
    </nav>
  </div>
</header>
<main id="main">
{main}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <a href="/" aria-label="Full Lotus Health, home"><img class="foot-seal" src="/assets/logo-seal.png" width="84" height="84" alt=""></a>
        <p>Roozbeh Ghobadpour, L.Ac.<br>{ADDR["street"]}<br>{ADDR["city"]}, {ADDR["region"]} {ADDR["zip"]}</p>
        <p><a href="{MAPS}" rel="noopener">Get directions</a></p>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li>Call: <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
          <li>Text: <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
          <li>Email: <a href="mailto:{EMAIL}">{EMAIL}</a></li>
        </ul>
        <p style="margin-top:.8rem">Please don't text or email health details. Use the <a href="/new-patients">new patient intake form</a> instead.</p>
      </div>
      <div>
        <h2>Visit</h2>
        <ul>
          <li><a href="/treatments">Natural beauty</a></li>
          <li><a href="/acupuncture">Acupuncture</a></li>
          <li><a href="/consult-heal">Consult &amp; heal</a></li>
          <li><a href="/tea-ceremonies">Tea ceremonies</a></li>
          <li><a href="/new-patients">New patients</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/book-online">Book online</a></li>
        </ul>
      </div>
    </div>
    <p class="legal">&copy; {datetime.date.today().year} {NAME}. Individual results vary. Information on this site is educational and is not a substitute for medical advice.</p>
  </div>
</footer>
</body>
</html>
"""


def hero(title, lede, crumbs=None, tone="c"):
    cr = ""
    if crumbs:
        cr = '<p class="crumbs">' + " / ".join(f'<a href="{h}">{e(n)}</a>' for n, h in crumbs) + "</p>"
    return f'<div class="hero-band tone-{tone}"><div class="wrap page-hero">{cr}<div class="band short" aria-hidden="true"></div><h1>{title}</h1><p class="lede">{lede}</p></div></div>'


def contact_block():
    return f"""<ul class="contact-lines">
<li>Call <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
<li>Text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
<li>Email <a href="mailto:{EMAIL}">{EMAIL}</a></li>
</ul>"""


def cta(heading, text, label="Book a visit", extra="", tone=""):
    return f"""<section class="cta {tone}"><div class="wrap">
<h2>{heading}</h2><p>{text}</p>
<p style="display:flex;gap:.9rem;flex-wrap:wrap;margin-top:1.4rem">{book_btn(label)} <a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>{extra}</p>
</div></section>"""


def quotes(items):
    out = []
    for text, who in items:
        out.append(f'<blockquote><p>{e(text)}</p><cite>{e(who)}</cite></blockquote>')
    return '<div class="quotes">' + "".join(out) + "</div>"


import os as _os
def photo(name, alt):
    """Returns a figure only when assets/photos/<name>.jpg exists, so the site is clean with or without photos."""
    root = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "assets", "photos")
    for ext in ("jpg", "jpeg", "webp", "png"):
        if _os.path.exists(_os.path.join(root, f"{name}.{ext}")):
            fp = _os.path.join(root, f"{name}.{ext}")
            try:
                from PIL import Image
                with Image.open(fp) as im:
                    w, h = im.size
                dims = f' width="{w}" height="{h}"'
            except Exception:
                dims = ""
            return f'<figure class="photo"><img src="/assets/photos/{name}.{ext}" alt="{e(alt)}"{dims} loading="lazy"></figure>'
    return ""


def hero_art():
    """Home hero art: the hero photo (no logo overlay) when assets/photos/hero.* exists, else the badge alone."""
    ph = photo("hero", "A calm woman in front of a lotus-patterned wall")
    if ph:
        return f'<div class="seal-wrap has-photo">{ph}</div>'
    return '<div class="seal-wrap"><img src="/assets/logo-badge.svg" width="440" height="440" alt="Full Lotus Health badge: a lotus rising from an offering dish, ringed by the words Tea, Acupuncture, Herbal Medicine"></div>'


def rate_item(slug, desc=None):
    s = BY_SLUG[slug]
    meta = f'<span class="meta">{s["minutes"]} min</span>' if s["minutes"] else ""
    return f'<li><span class="name"><a href="/service-page/{slug}">{e(s["name"])}</a>{meta}</span><p class="desc">{e(desc or s["short"])}</p></li>'


def five_element_section(slug):
    """The Five Element Rejuvenation series, one section per element. No prices (fees stay on the service pages)."""
    if slug == "medical-microneedling-session":
        intro = ("Our signature microneedling series: five sessions, one for each element of Chinese medicine. "
                 "Each session has its own focus and its own signature serum, mixed into a hyaluronic acid base in the clinic "
                 "and carried into the skin during treatment. Together they treat your face as a whole, the way Chinese medicine treats the whole person.")
        pace = ("The series follows the generating cycle, from Wood to Water, so each session builds on the one before. "
                "Microneedling sessions are spaced about four weeks apart, so the full series takes around five months.")
    else:
        intro = ("The same five-element approach as a gentler series, with no downtime. Five sessions, one for each element of Chinese medicine, "
                 "each with its own focus and its own signature serum, mixed into a hyaluronic acid base in the clinic and carried into the skin's surface.")
        pace = ("The series follows the generating cycle, from Wood to Water, so each session builds on the one before. "
                "Nanoneedling sessions can be closer together than microneedling, and your plan sets the pace.")
    rows = []
    for i, (el, theme, colour, focus, text, serum) in enumerate(FIVE_ELEMENTS, 1):
        rows.append(
            f'<li class="element" style="--tone:{colour}"><div><p class="es">Session {i}</p><h3 class="en">{el}</h3><p class="et">{e(theme)}</p></div>'
            f'<div><p class="ef">{e(focus)}</p><p>{e(text)}</p><p class="serum"><strong>Signature serum:</strong> {e(serum)}</p></div></li>')
    return f"""<section class="sand" id="five-element" aria-labelledby="fe-h"><div class="wrap">
  <p class="eyebrow">Signature series</p>
  <h2 id="fe-h">{e(SERIES)}</h2>
  <p>{e(intro)}</p>
  <p>{e(pace)}</p>
  <ol class="elements">{"".join(rows)}</ol>
  <p class="fine" style="margin-top:1.4rem">Your first session includes an intake and a plan. Individual results vary.</p>
  <p style="display:flex;gap:.9rem;flex-wrap:wrap;margin-top:1.2rem">{book_btn("Book your first session")} <a class="btn ghost" href="/service-page/{slug}">Series fee and details</a></p>
</div></section>"""


# ------------------------------------------------------------------ blog posts
import re as _re
try:
    import markdown as _md
except ImportError:  # pip install markdown
    sys.exit("The blog needs the 'markdown' package: pip install markdown")


def load_posts():
    posts = []
    for f in sorted(p for p in (ROOT / "_src" / "posts").glob("*.md") if p.name.lower() != "readme.md"):
        raw = f.read_text(encoding="utf-8")
        m = _re.match(r"---\s*\n(.*?)\n---\s*\n(.*)", raw, _re.S)
        if not m:
            sys.exit(f"{f.name}: missing front matter (--- title/description/date ---)")
        meta = {}
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        if meta.get("draft", "").lower() in ("true", "yes"):
            continue
        for k in ("title", "description", "date"):
            if not meta.get(k):
                sys.exit(f"{f.name}: front matter needs {k}")
        slug = meta.get("slug") or _re.sub(r"^\d{4}-\d{2}-\d{2}-", "", f.stem)
        body_md = m.group(2).strip()
        body = _md.markdown(body_md, extensions=["extra", "smarty"])
        words = len(_re.sub(r"<[^>]+>", " ", body).split())
        posts.append(dict(slug=slug, title=meta["title"], desc=meta["description"], date=meta["date"],
                          image=meta.get("image", ""), alt=meta.get("image_alt", ""), body=body,
                          minutes=max(1, round(words / 220))))
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


POSTS = load_posts()


def pretty_date(iso):
    d = datetime.date.fromisoformat(iso)
    return d.strftime("%B ") + str(d.day) + d.strftime(", %Y")


OUT = {}


# ------------------------------------------------------------------ pages
# ------------------------------------------------------------------ homepage guide
def _fee(slug):
    sv = BY_SLUG[slug]
    t = f'${sv["price"]}'
    if sv["minutes"]:
        t += f' · {sv["minutes"]} min'
    return t


GUIDE_RESULTS = {
    # id: (service slug, tone, why, (link label, href))
    "acu": ("acupuncture-initial-treatment", "malachite",
            "A detailed intake, a treatment plan, and your first acupuncture treatment. Visits are unhurried and often end with tea.",
            ("About acupuncture", "/acupuncture")),
    "tea": ("gong-fu-tea-ceremony", "gold",
            "In Chinese medicine, tea is the premier herb for the mind. Sit, sip, and slow down. No needles and no preparation.",
            ("About tea ceremonies", "/tea-ceremonies")),
    "consult": ("initial-consultation-online", "lapis",
                "A full look at your health history and patterns, with herbal and dietary recommendations, by video from home.",
                ("About consultations", "/consult-heal")),
    "micro": ("medical-microneedling-session", "cinnabar",
              "For fine lines, acne scars, texture, and thinning hair along the hairline, with custom herbal serums and red light therapy.",
              ("Microneedling guide", "/microneedling-burbank")),
    "nano": ("facial-nano-needling", "cinnabar",
             "A gentle surface treatment with herbal serums and red light therapy. Skin often looks brighter right away.",
             ("Nanoneedling guide", "/nanoneedling-burbank")),
    "lift": ("full-lotus-lift", "cinnabar",
             "Facial acupuncture at lifting, tension-releasing points to calm the mind and bring out your natural glow.",
             ("Cosmetic acupuncture guide", "/cosmetic-acupuncture-burbank")),
}

# (panel id, question, [(title, sub, target panel or result id, fallback href, tone)])
GUIDE_STEPS = [
    ("start", "What brings you in?", [
        ("Pain or tension", "Aches, stiffness, or something that keeps coming back", "r-acu", "/acupuncture", "malachite"),
        ("Stress, sleep, or feeling run down", "Wound up, wiped out, or both", "stress", "/acupuncture", "gold"),
        ("Digestion, hormones, or low energy", "A longer story that needs a closer look", "r-consult", "/consult-heal", "lapis"),
        ("Skin or hair", "Lines, scars, glow, or thinning hair", "skin", "/treatments", "cinnabar"),
        ("Not sure yet", "Talk it through before you book", "r-unsure", "/new-patients", "ink"),
    ]),
    ("stress", "How would you like to begin?", [
        ("A treatment", "Acupuncture to settle the nervous system", "r-acu", "/acupuncture", "malachite"),
        ("A quiet cup of tea", "A tea ceremony. No needles.", "r-tea", "/tea-ceremonies", "gold"),
    ]),
    ("skin", "What would you most like?", [
        ("Soften lines and scars, or support thinning hair", "Microneedling", "r-micro", "/microneedling-burbank", "cinnabar"),
        ("A glow with no downtime", "Nanoneedling", "r-nano", "/nanoneedling-burbank", "cinnabar"),
        ("A lift and a calmer face", "Cosmetic acupuncture", "r-lift", "/cosmetic-acupuncture-burbank", "cinnabar"),
    ]),
]

_GNAV_END = '<p class="gnav"><button type="button" class="glink" data-back>Back</button> <button type="button" class="glink" data-restart>Start over</button></p>'


def guide_signup():
    """Email-only signup. Saves nothing about what the visitor chose in the guide."""
    if LAUNCH and not SIGNUP:
        return ""
    demo = "" if SIGNUP else " data-demo"
    return f'''<form class="gsignup" id="g-signup" method="post" action="{e(SIGNUP) if SIGNUP else "#"}"{demo}>
    <h3 id="g-signup-h">Get occasional notes from Full Lotus Health</h3>
    <p>Notes on acupuncture, skin, and tea from Roozbeh. Unsubscribe anytime. Please don't send health details by email.</p>
    <div class="grow"><label for="g-email" class="sr">Email address</label>
      <input id="g-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required maxlength="254">
      <button class="btn" type="submit">Join the list</button></div>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <input type="hidden" name="source" value="home-guide">
    <p class="gmsg" role="status" aria-live="polite"></p>
  </form>'''


def guide_section():
    out = []
    for pid, q, choices in GUIDE_STEPS:
        cs = "".join(
            f'<a class="choice" style="--tone:var(--{tone})" href="{href}" data-go="{tgt}"><span class="ct">{e(t)}</span><span class="cs">{e(sub)}</span></a>'
            for t, sub, tgt, href, tone in choices)
        back = "" if pid == "start" else '<p class="gnav"><button type="button" class="glink" data-back>Back</button></p>'
        on = " on" if pid == "start" else ""
        out.append(f'<div class="gstep{on}" id="g-{pid}"><h3 class="gq" tabindex="-1">{e(q)}</h3><div class="choices">{cs}</div>{back}</div>')
    for rid, (slug, tone, why, more) in GUIDE_RESULTS.items():
        sv = BY_SLUG[slug]
        out.append(
            f'<div class="gstep" id="g-r-{rid}" style="--tone:var(--{tone})"><h3 class="gq" tabindex="-1">We would start with</h3>'
            f'<div class="gresult"><p class="gname"><a href="/service-page/{slug}">{e(sv["name"])}</a></p>'
            f'<p class="gfacts">{e(_fee(slug))}</p><p>{e(why)}</p>'
            f'<p class="gacts">{book_btn("Book this visit")}<a class="btn ghost" href="{more[1]}">{e(more[0])}</a></p></div>'
            f'{_GNAV_END}</div>')
    out.append(
        f'<div class="gstep" id="g-r-unsure" style="--tone:var(--ink)"><h3 class="gq" tabindex="-1">That is common. Here are two easy ways in.</h3>'
        f'<div class="gresult"><p>Text a question and we will point you to the right visit, or read the new patient steps. '
        f'You can also book a first acupuncture visit and decide your plan together. Please keep health details for the intake form.</p>'
        f'<p class="gacts"><a class="btn" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a><a class="btn ghost" href="/new-patients">New patient steps</a></p></div>'
        f'{_GNAV_END}</div>')
    return f"""<section class="wash-l guide" id="guide" aria-labelledby="guide-h"><div class="wrap">
  <p class="eyebrow l">Not sure where to begin?</p>
  <h2 id="guide-h">Find your starting point</h2>
  <p class="guide-intro">Answer one or two quick questions and we will point you to the right visit. Nothing you choose here is saved or sent.</p>
  <div class="gstage">{"".join(out)}</div>
  {guide_signup()}
</div>
<script src="/assets/guide.js" defer></script></section>"""


def home():
    main = f"""
<section class="hero"><div class="wrap grid">
  <div>
    <div class="band short" aria-hidden="true"></div>
    <h1>When you're out of balance, it shows everywhere.</h1>
    <p class="lede">Full Lotus Health is an acupuncture and Chinese herbal medicine clinic in Burbank, CA. Facial and skin treatments (microneedling, nanoneedling, and cosmetic acupuncture) sit alongside acupuncture, herbal medicine, and tea ceremony.</p>
    <p class="lede">Come find your center, and express it in greater vitality and a radiant glow.</p>
    <div class="actions">{book_btn("Book your visit")}<a class="btn ghost" href="/new-patients">New patients start here</a></div>
  </div>
  {hero_art()}
</div></section>

<div class="trust"><div class="wrap"><p>Trusted by 300+ patients for over 10 years in Burbank for integrative healing, stress relief, natural beauty, pain relief, sleep, and lasting vitality.</p></div></div>

{guide_section()}

<section class="sand"><div class="wrap">
  <p class="eyebrow">Care at Full Lotus</p>
  <h2>Healing paths</h2>
  <div class="paths">
    <div class="path"><h3>Acupuncture</h3><p>Dedicated acupuncture and specialized recovery treatments for jet lag and travel fatigue, tailored for those visiting the Burbank area.</p><p><a href="/acupuncture">Acupuncture in Burbank</a></p></div>
    <div class="path"><h3>Natural beauty</h3><p>Unlock lasting vitality and skin rejuvenation through holistic facial treatments and constitutional cosmetic acupuncture techniques.</p><p><a href="/treatments">Explore treatments</a></p></div>
    <div class="path"><h3>Heal from within</h3><p>Comprehensive integrative care addressing nervous system overload, chronic pain, and stress relief for deep restoration.</p><p><a href="/consult-heal">Consult &amp; heal</a></p></div>
  </div>
</div></section>

<section class="wash-c"><div class="wrap split">
  <div>
    <p class="eyebrow">Cosmetic acupuncture and skin</p>
    <h2>Facial and skin treatments in Burbank</h2>
    <p>Each treatment uses custom Chinese herbal serums chosen for your skin, and red light therapy is included. A licensed acupuncturist performs every session.</p>
    <p>{book_btn("Book a treatment")}</p>
  </div>
  <ul class="rates">
    {rate_item("medical-microneedling-session")}
    {rate_item("facial-nano-needling")}
    {rate_item("full-lotus-lift")}
  </ul>
</div></section>

<section class="deep-m"><div class="wrap">
  <h2>Healing is more than skin deep. It is a return to whole-system harmony.</h2>
  <p>At Full Lotus Health, we treat the whole person, not just the symptom. Our integrative approach harmonizes your nervous system and internal vitality to create a state of lasting balance, allowing your natural radiance to flourish from within.</p>
</div></section>

<section class="wash-g"><div class="wrap">
  <p class="eyebrow">Reviews</p>
  <h2>What patients say</h2>
  {quotes(TESTIMONIALS_HOME)}
</div></section>

<section class="deep-l"><div class="wrap split">
  <div><p class="eyebrow">Your practitioner</p><h2>Meet Roozbeh</h2>{photo("roozbeh", "Roozbeh Ghobadpour, L.Ac., in the clinic")}</div>
  <div>
    <p>Hi, I'm Roozbeh. I've been studying and practicing the healing arts for over twenty-five years and have been a licensed acupuncturist and practitioner of Traditional Chinese Medicine since 2015. Over the years I have learned and integrated many modalities into my treatment method. Many of these ways of looking at the body and the world have been inspired by obstacles I have encountered in my own health journey.</p>
    <p>Full Lotus Health is a special place where I present everything I have learned to the local community: from acupuncture to herbal medicine, gut testing, tea ceremony, and truly natural cosmetic acupuncture. It is my sincere wish that everyone who comes here leaves a happier person.</p>
    <p>If you have any questions about me or any of the offerings at Full Lotus Health, please feel free to reach out at <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  </div>
</div></section>

<section class="night"><div class="wrap split">
  <div><p class="eyebrow">Tea ceremony</p><h2>The art of tea</h2>{photo("tea-space", "The tea space at Full Lotus Health")}</div>
  <div>
    <p>Experience the best Chinese medicinal herb for calming and energizing the mind: old growth tea in a ritual where it can truly shine. If you are not sure about Chinese medicine, this is the best place to start.</p>
    <p><a class="btn ghost" href="/tea-ceremonies">Reserve your seat</a></p>
  </div>
</div></section>

{cta("Ready to feel like yourself again?", "Book online, or text us a question. New patients, please fill out the intake form before your first visit.", "Book now")}
"""
    OUT["index.html"] = page("/", "Microneedling & Acupuncture in Burbank | Full Lotus Health",
        "Acupuncture, Chinese herbal medicine, and cosmetic microneedling in Burbank, CA. Licensed acupuncturist treating body, mind, and skin from the same diagnosis.",
        main, ld=[business_ld()], current="/")


def treatments():
    main = hero("Turn back the clock, naturally.",
        "Advanced, chemical-free facial rejuvenation that restores your skin and hair from the inside out. Holistic beauty that heals the mind while elevating your natural radiance.", tone="c") + f"""
<section><div class="wrap">
  <p class="eyebrow">Skin treatments</p>
  <h2>Facial and skin treatments in Burbank</h2>
  <ul class="rates">
    {rate_item("medical-microneedling-session", "Collagen induction therapy using medical-grade microneedles to trigger your skin's natural repair response. Targets fine lines, acne scarring, uneven texture, and hair loss, stimulating deep renewal that builds over time. Custom Chinese herbal serums are applied during treatment and absorbed far more efficiently than topical application alone. Red light therapy is included. Also offered as the five-session " + SERIES + " series.")}
    {rate_item("facial-nano-needling", "Nanoneedling combines ultra-fine nanotips with pure botanical serums for instant radiance with zero downtime. The tips open micro-channels in the skin's surface, infusing hyaluronic acid, vitamins, and custom herbal serums exactly where they're needed. Ideal for sensitive skin, a pre-event glow, or between microneedling sessions. Includes red light therapy. Also offered as the five-session " + SERIES + " series.")}
    {rate_item("full-lotus-lift", "Cosmetic acupuncture (the Full Lotus Lift). In Chinese medicine the mind is represented by the heart, and it opens to the face. We calm the mind, balance the body, and focus on specific tension-releasing and lifting points on the face. Includes red light therapy.")}
    <li><span class="name"><a href="/skin-conditions-burbank">Skin conditions</a></span><p class="desc">Chinese herbal medicine and acupuncture for acne, eczema, psoriasis, rosacea, and other skin conditions, treating the pattern underneath, not just the surface.</p></li>
  </ul>
  <p style="margin-top:1.6rem">{book_btn("Book a treatment")}</p>
  <p style="margin-top:1.6rem">Read more: <a href="/microneedling-burbank">microneedling in Burbank</a>, <a href="/nanoneedling-burbank">nanoneedling in Burbank</a>, <a href="/cosmetic-acupuncture-burbank">cosmetic acupuncture in Burbank</a>, <a href="/skin-conditions-burbank">Chinese medicine for skin conditions</a>.</p>
  <p class="fine" style="margin-top:1rem">How it works: your first session includes a detailed intake and treatment plan. Then relax and enjoy. Best done in a series. Fees are on each treatment page.</p>
</div></section>

<section class="wash-g"><div class="wrap">
  <p class="eyebrow">Reviews</p>
  <h2>What patients say</h2>
  {quotes(TESTIMONIALS_BEAUTY)}
  <p class="fine">Individual results vary.</p>
  <p>{book_btn("Book a treatment")}</p>
</div></section>

<section class="deep-m"><div class="wrap split">
  <div><h2>Whatever resides in the heart is expressed in the face</h2>{photo("treatment-room", "The treatment room at Full Lotus Health in Burbank")}</div>
  <div>
    <p>Full Lotus Health treats skin as the visible end of your whole health. Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist, chooses the herbal serums, the points, and the pace of your series from a Chinese medicine assessment, not from a fixed protocol.</p>
    <p>Not sure which treatment fits? Book a session and we'll decide together, or text a question to <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
    <p>Our clinic is at {ADDR_LINE}, convenient to Glendale, Toluca Lake, North Hollywood, and Studio City.</p>
  </div>
</div></section>

<section class="sand"><div class="wrap">
  <h2>Questions before you book?</h2>
  <p>Reach us directly. Please keep health details for the intake form.</p>
  {contact_block()}
</div></section>
""" + cta("Ready for your natural glow?", "Choose a time that works for you.", "Book a treatment", tone="l")
    OUT["treatments.html"] = page("/treatments", "Cosmetic Acupuncture and Microneedling in Burbank, CA",
        "Microneedling, nanoneedling, and cosmetic acupuncture in Burbank with custom Chinese herbal serums and red light therapy, from a licensed acupuncturist.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments")])], current="/treatments")


def acupuncture():
    main = hero("Restore your natural rhythm.",
        "Acupuncture at Full Lotus Health is a ritual of restoration. By harmonizing your nervous system and internal vitality, we help you return to a state of wholeness where healing happens naturally.", tone="m") + f"""
<section><div class="wrap">
  <p>{book_btn("Book your session")}</p>
  <h2 style="margin-top:2.2rem">Types of acupuncture care</h2>
  <div class="paths four" style="margin-top:1.2rem">
    <div class="path"><h3>Traditional acupuncture</h3><p>A precise modality to balance the body's vital energy, addressing chronic pain, digestive issues, and nervous system health.</p></div>
    <div class="path"><h3>Cosmetic acupuncture</h3><p>Unlock natural radiance and skin vitality using constitutional techniques for rejuvenation and lasting facial glow.</p><p><a href="/service-page/full-lotus-lift">Cosmetic acupuncture in Burbank</a></p></div>
    <div class="path"><h3>Fertility support</h3><p>Acupuncture and herbal medicine to support you while you try to conceive, naturally or alongside IVF and IUI, working with your doctor.</p><p><a href="/fertility-acupuncture-burbank">Fertility acupuncture in Burbank</a></p></div>
    <div class="path"><h3>Recovery and wellness</h3><p>Integrated care designed to address travel fatigue, jet lag, and immune depletion through advanced restorative protocols.</p></div>
  </div>
</div></section>

<section class="tint"><div class="wrap split">
  <div><p class="eyebrow m">Acupuncture</p><h2>Healing beyond the surface</h2></div>
  <div>
    <p>Acupuncture is more than a physical treatment; it is a method of regulating the nervous system. By gently stimulating specific points, we signal the body to shift from a state of stress into deep restoration. This physiological reset supports healthy circulation and a return to your natural state of whole-body harmony and lasting vitality.</p>
    <p>Sessions: <a href="/service-page/acupuncture-initial-treatment">initial treatment</a> (60 minutes) and <a href="/service-page/acupuncture-repeat-treatment">repeat treatment</a> (45 minutes). Fees are on each session page.</p>
  </div>
</div></section>

<section><div class="wrap">
  <p class="eyebrow">Your first visit</p>
  <h2>What to expect</h2>
  <ol class="steps">
    <li><h3>Consultation</h3><p>We begin with a deep dive into your health history, lifestyle, and goals to create a personalized treatment mapping.</p></li>
    <li><h3>Gentle placement</h3><p>Ultra-fine, sterile needles are gently placed. Most patients feel only a slight sensation or nothing at all.</p></li>
    <li><h3>Restorative rest</h3><p>You will rest for 20 to 30 minutes in a calm environment, allowing the needles to stimulate your body's healing response.</p></li>
    <li><h3>Post-care ritual</h3><p>We conclude with herbal recommendations and a moment in our tea ceremony space for deep integration.</p></li>
  </ol>
</div></section>

<section class="wash-g"><div class="wrap">
  <h2>Patient journeys</h2>
  {quotes([TESTIMONIALS_HOME[0], TESTIMONIALS_HOME[3], TESTIMONIALS_HOME[4]])}
</div></section>
""" + cta("Begin your journey to vitality", "Reserve your personalized treatment in Burbank and discover the benefits of whole-system harmony.", "Book online now", tone="l")
    OUT["acupuncture.html"] = page("/acupuncture", "Acupuncture in Burbank, CA | Full Lotus Health",
        "Acupuncture in Burbank, CA with Roozbeh Ghobadpour, L.Ac.: pain, digestion, stress, sleep, and recovery, with herbal recommendations and tea.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Acupuncture", "/acupuncture")])], current="/acupuncture")


def consult():
    main = hero("Your health has a story. Let's read it together.",
        "Roozbeh brings over 15 years of Chinese medicine training to every consultation, reading your body as a whole system, not a list of isolated symptoms.", tone="l") + f"""
<section><div class="wrap">
  <p>{book_btn("Book your online consultation")}</p>
</div></section>
<section class="tint"><div class="wrap split">
  <div><p class="eyebrow m">Chinese herbal medicine</p><h2>We treat the whole system</h2></div>
  <div>
    <p>Most medicine asks: what is the symptom? Chinese medicine asks: why is the system out of balance? Roozbeh's approach combines classical diagnosis with modern clinical insight, drawing on long-form published writing in a tea magazine.</p>
    <h3>Who this is for</h3>
    <p>This work is a good fit if you're navigating:</p>
    <ul class="checks">
      <li>Chronic gut issues and IBS</li><li>Hormonal imbalance</li><li>Chronic fatigue and low energy</li>
      <li>Stress and nervous system dysregulation</li>
      <li><a href="/skin-conditions-burbank">Skin conditions</a> such as acne, eczema, and psoriasis</li>
      <li><a href="/fertility-acupuncture-burbank">Fertility</a>, while trying naturally or alongside IVF</li>
      <li>Conventional medicine that hasn't brought lasting results</li>
    </ul>
  </div>
</div></section>
<section><div class="wrap">
  <h2>What's offered</h2>
  <ul class="rates">
    <li><span class="name"><a href="/service-page/initial-consultation-online">Online consultation</a><span class="meta">60 min</span></span><p class="desc">Remote Chinese medicine consultation with herbal and dietary recommendations.</p></li>
    <li><span class="name">Chinese herbal medicine for gut health</span><p class="desc">Custom herbal formulas targeting the root cause of digestive imbalance.</p></li>
    <li><span class="name">Dietary guidance</span><p class="desc">Food as medicine. Practical recommendations rooted in Chinese medicine.</p></li>
  </ul>
  <p class="fine" style="margin-top:1rem">Follow-up sessions: <a href="/service-page/repeat-consultation-online">repeat online consultation</a> (45 minutes).</p>
</div></section>
<section class="wash-g"><div class="wrap">
  <h2>How it works</h2>
  <ol class="steps">
    <li><h3>Book a consultation</h3><p>Choose a time that works for you. Then complete the <a href="/new-patients">new patient intake form</a> with a brief health history.</p></li>
    <li><h3>Receive your assessment and herbal protocol</h3><p>We'll meet online to map your system, then you'll receive a tailored plan.</p></li>
    <li><h3>Follow up and refine</h3><p>We adjust your herbs and diet as your system responds, aiming for steady, sustainable change.</p></li>
  </ol>
</div></section>
""" + cta("Ready to begin?", "Your first consultation is the first step toward a plan built around you.", "Book your online consultation", tone="m")
    OUT["consult-heal.html"] = page("/consult-heal", "Chinese Herbal Medicine Consultation | Burbank or Remote",
        "Chinese herbal medicine consultations in Burbank or online with Roozbeh Ghobadpour, L.Ac.: gut health, hormones, fatigue, stress, and dietary guidance.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Consult & heal", "/consult-heal")])], current="/consult-heal")


def tea():
    main = hero("The sacred art of presence.",
        "Our tea ceremonies are designed to help you step into a meditative rhythm. By focusing on the intentional ritual of tea, we create a space to slow the breath, calm the nervous system, and return to whole-system harmony. This practice is open to anyone seeking stress relief and a moment of true inner balance.", tone="n") + f"""
<section><div class="wrap">
  <p>{book_btn("Book a seat")}</p>
  <ul class="rates" style="margin-top:2rem">
    <li><span class="name"><a href="/service-page/gong-fu-tea-ceremony">Gong Fu ceremony</a><span class="meta">60 min</span></span><p class="desc">Gong Fu ceremony is about making the perfect cup of tea. Every element of good tea, including water, teaware, tea, atmosphere, and heat, is controlled to create the perfect cup, an unattainable goal which we strive for each time.</p></li>
    <li><span class="name"><a href="/service-page/bowl-tea-ceremony">Bowl tea ceremony</a></span><p class="desc">Bowl tea ceremony has been around for several centuries but has recently been adapted for the modern world by tea master Wu De. We drink tea in silence with mindfulness, observing its effect on our mind and experiencing meditation.</p></li>
    <li><span class="name"><a href="/service-page/private-gong-fu-tea-ceremony">Private Gong Fu ceremony</a></span><p class="desc">A private session for up to five guests.</p></li>
  </ul>
</div></section>
<section class="night"><div class="wrap split">
  <div><p class="eyebrow">Tea and Chinese medicine</p><h2>The magic of tea</h2>{photo("tea-space", "The tea space at Full Lotus Health")}</div>
  <div>
    <p>In Chinese medicine, tea is known as the premier Chinese herb for the mind. In tea ceremony we drink aged, old growth, organic teas, which have a profound ability to calm and energize the mind and allow one to access the heart/mind in meditation.</p>
    <p>We provide tea ceremony in the tradition of Wu De, a foremost expert on tea who has written many books on tea and owns Global Tea Hut. Roozbeh has been studying with Wu De for over fifteen years, and Wu De has served tea at Full Lotus Health.</p>
  </div>
</div></section>
<section><div class="wrap">
  <h2>Join the circle</h2>
  <p>To hear about special community tea sits, events, and unique tea offerings, email <a href="mailto:{EMAIL}?subject=Tea%20circle">{EMAIL}</a> and ask to be added.</p>
</div></section>
""" + cta("Reserve your seat", "Pour a cup and slow down.", "Book a seat", tone="g")
    OUT["tea-ceremonies.html"] = page("/tea-ceremonies", "Chinese Tea Ceremony in Burbank | Full Lotus Health",
        "Gong Fu and bowl tea ceremony in Burbank in the tradition of Wu De: aged, old growth, organic tea for stress relief and inner balance.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Tea ceremonies", "/tea-ceremonies")])], current="/tea-ceremonies")


def book_online():
    groups = [("Facial and skin", "beauty"), ("Acupuncture", "acu"), ("Consultations (online)", "consult"), ("Tea ceremony", "tea")]
    blocks = []
    for label, g in groups:
        rows = []
        for s in [x for x in SERVICES if x["group"] == g]:
            meta = f' <span class="fine">{s["minutes"]} min</span>' if s["minutes"] else ""
            rows.append(f'<li><span class="n"><a href="/service-page/{s["slug"]}">{e(s["name"])}</a>{meta}</span><span class="p">${s["price"]}</span>{book_btn("Book", small=True)}</li>')
            pk = PACKAGES.get(s["slug"])
            if pk:
                rows.append(f'<li><span class="n"><a href="/service-page/{s["slug"]}#series">{e(pk["name"])}</a> <span class="fine">5 sessions</span></span><span class="p">${pk["price"]:,}</span>{book_btn("Book", small=True)}</li>')
        blocks.append(f"<h2 style='margin-top:2.4rem'>{label}</h2><ul class='svc-list'>{''.join(rows)}</ul>")
    fallback = ""
    if not BOOK:
        fallback = f'<div class="notice"><p><strong>Online booking is being set up.</strong> To book now, call or text <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></div>'
    main = hero("Book online.", "Pick a service, then choose a time on the calendar. New patients, please complete the intake form before your first visit.", tone="l") + f"""
<section><div class="wrap">
  {fallback}
  <p><a class="btn ghost" href="{e(INTAKE_HREF)}">New patient intake form</a></p>
  {''.join(blocks)}
  <p class="fine" style="margin-top:2rem">Prices are per session, except the {SERIES} series, which covers five sessions. To reschedule or cancel, call or text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
  {faq_block([
    ("Where are visits?", f"In person at {ADDR_LINE}, except the online consultations, which are by video."),
    ("I'm new. What should I do first?", "Complete the <a href=\"/new-patients\">new patient intake form</a> before your first visit. It is reviewed before you arrive."),
    ("Which treatment should I choose?", "Not sure? Book the session closest to what you need and we'll decide together, or text a question. Skin treatments are described on the <a href=\"/treatments\">natural beauty page</a> and acupuncture on the <a href=\"/acupuncture\">acupuncture page</a>."),
    ("How long are visits?", "Times are listed beside each service above. Visits are unhurried and often end with tea."),
  ], "Before you book")}
</div></section>"""
    OUT["book-online.html"] = page("/book-online", "Book Online | Full Lotus Health",
        "Book acupuncture, microneedling, nanoneedling, cosmetic acupuncture, consultations, or tea ceremony at Full Lotus Health in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Book online", "/book-online")])])


def blog():
    if not POSTS:
        main = hero("Blog.", "Notes on acupuncture, Chinese herbal medicine, skin, and tea are coming soon.", tone="m") + f"""
<section><div class="wrap">
  <p>In the meantime, explore <a href="/treatments">natural beauty treatments</a>, <a href="/acupuncture">acupuncture</a>, or <a href="/tea-ceremonies">tea ceremonies</a>.</p>
</div></section>"""
        OUT["blog.html"] = page("/blog", "Blog | Full Lotus Health",
            "Notes on acupuncture, Chinese herbal medicine, skin care, and tea from Full Lotus Health in Burbank, CA.",
            main, ld=[business_ld()], noindex=True)
        return
    cards = []
    for p in POSTS:
        img = ""
        if p["image"]:
            img = f'<img src="{e(p["image"])}" alt="{e(p["alt"])}" loading="lazy">'
        cards.append(f'<li class="post-card">{img}<h2><a href="/post/{p["slug"]}">{e(p["title"])}</a></h2>'
                     f'<p class="fine">{pretty_date(p["date"])} &middot; {p["minutes"]} min read</p><p>{e(p["desc"])}</p></li>')
    main = hero("Blog.", "Notes on acupuncture, Chinese herbal medicine, skin, and tea from Roozbeh Ghobadpour, L.Ac.", tone="m") + f"""
<section><div class="wrap"><ul class="post-list">{''.join(cards)}</ul></div></section>""" + cta("Questions about your own care?", "Choose a time, or text a question first.", "Book online")
    OUT["blog.html"] = page("/blog", "Blog: Acupuncture and Skin Care | Full Lotus Health",
        "Notes on acupuncture, Chinese herbal medicine, skin care, and tea from Roozbeh Ghobadpour, L.Ac., at Full Lotus Health in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Blog", "/blog")])])


def blog_posts():
    for i, p in enumerate(POSTS):
        url = f"/post/{p['slug']}"
        img_abs = (SITE + p["image"]) if p["image"].startswith("/") else None
        others = [q for q in POSTS if q is not p][:3]
        more = ""
        if others:
            more = '<h2 class="h3" style="margin-top:2.4rem">More from the blog</h2><ul class="checks">' + "".join(f'<li><a href="/post/{q["slug"]}">{e(q["title"])}</a></li>' for q in others) + "</ul>"
        main = hero(e(p["title"]), f'By Roozbeh Ghobadpour, L.Ac. &middot; {pretty_date(p["date"])} &middot; {p["minutes"]} min read',
                    crumbs=[("Home", "/"), ("Blog", "/blog")], tone="m") + f"""
<section><div class="wrap"><article class="prose">
{p["body"]}
<hr>
<p class="fine">This article is educational and is not a substitute for medical advice. Individual results vary.</p>
<p>{book_btn("Book a visit")}</p>
{more}
</article></div></section>"""
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "description": p["desc"],
              "datePublished": p["date"], "dateModified": p["date"], "mainEntityOfPage": SITE + url,
              "author": {"@type": "Person", "name": "Roozbeh Ghobadpour", "jobTitle": "Licensed Acupuncturist (L.Ac.)"},
              "publisher": {"@id": f"{SITE}/#business"}, "image": img_abs or OG_IMAGE}
        OUT[f"post/{p['slug']}.html"] = page(url, p["title"][:60], p["desc"], main,
            ld=[business_ld(), ld, breadcrumb_ld([("Home", "/"), ("Blog", "/blog"), (p["title"], url)])],
            og_type="article", og_image=img_abs)


def feed():
    if not POSTS:
        return
    items = "".join(
        f"<item><title>{e(p['title'])}</title><link>{SITE}/post/{p['slug']}</link><guid>{SITE}/post/{p['slug']}</guid>"
        f"<pubDate>{datetime.date.fromisoformat(p['date']).strftime('%a, %d %b %Y')} 12:00:00 GMT</pubDate><description>{e(p['desc'])}</description></item>"
        for p in POSTS)
    OUT["feed.xml"] = f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>{NAME} blog</title><link>{SITE}/blog</link><description>Notes on acupuncture, Chinese herbal medicine, skin, and tea.</description><language>en-us</language>{items}</channel></rss>\n'


def new_patients():
    if INTAKE:
        action = f'<p><a class="btn" href="{e(INTAKE)}" rel="noopener">Open the intake form</a></p><p class="fine">The form opens in Google Forms. It is not part of this website.</p>'
    else:
        action = f'<div class="notice"><p><strong>The intake form link is being added.</strong> Until then, call or text <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> and we will send it to you.</p></div>'
    main = hero("New patients.", "Welcome. Two steps before your first visit: choose a time, then fill out the intake form.", tone="g") + f"""
<section><div class="wrap split">
  <div>
    <h2>Before your first visit</h2>
    <ol class="steps">
      <li><h3>Book a time</h3><p>Pick your service and a time on the calendar.</p><p style="margin-top:.8rem">{book_btn("Book")}</p></li>
      <li><h3>Complete the intake form</h3><p>Tell us about your health history and goals. Roozbeh reviews it before you arrive, so your visit can begin with what matters most.</p></li>
      <li><h3>Arrive a few minutes early</h3><p>We're at {ADDR_LINE}. Visits are unhurried and often end with tea.</p></li>
    </ol>
  </div>
  <div>
    <h2>Intake form</h2>
    {action}
    <div class="notice" style="margin-top:1.6rem"><p><strong>Please keep health details off text and email.</strong> This website does not collect health information. Share it on the intake form or in person.</p></div>
    <h2 class="h3" style="margin-top:2rem">Questions</h2>
    {contact_block()}
  </div>
</div></section>
<section class="sand"><div class="wrap">{faq_block([
    ("Do I need to fill out the form before I come?", "Yes. Complete it before your first visit so your appointment can begin with what matters most."),
    ("Where do I go for my visit?", f"{ADDR_LINE}. <a href=\"{MAPS}\" rel=\"noopener\">Get directions</a>."),
    ("How do I reschedule or cancel?", f"Call or text <a href=\"sms:{PHONE_TEL}\">{PHONE_DISPLAY}</a>."),
    ("What treatments can I book?", "Acupuncture, microneedling, nanoneedling, cosmetic acupuncture, online consultations, and tea ceremonies. See <a href=\"/book-online\">all services</a>."),
  ], "New patient questions")}</div></section>"""
    OUT["new-patients.html"] = page("/new-patients", "New Patients | Full Lotus Health, Burbank",
        "New to Full Lotus Health? Book a time, then complete the new patient intake form before your first visit in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("New patients", "/new-patients")])], current="/new-patients")


def faq_block(items, h="Common questions"):
    """Visible FAQ only (no FAQPage schema). items: list of (question, answer-html)."""
    rows = "".join(f"<h3>{e(q)}</h3><p>{a}</p>" for q, a in items)
    return f'<section class="faq" aria-label="{e(h)}"><h2 style="margin-top:2rem">{e(h)}</h2>{rows}</section>'


GUIDES = {
    "medical-microneedling-session": ("/microneedling-burbank", "Microneedling in Burbank: a guide"),
    "facial-nano-needling": ("/nanoneedling-burbank", "Nanoneedling in Burbank: a guide"),
    "full-lotus-lift": ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture in Burbank: a guide"),
}


def service_faq(s):
    online = "Online" in s["name"]
    loc = ("This visit is online, by video. " if online else f"Full Lotus Health is at {ADDR_LINE}. ")
    items = []
    if not online:
        items.append(("Where do I go?", f"{e(loc)}Convenient to Glendale, Toluca Lake, North Hollywood, and Studio City. <a href=\"{MAPS}\" rel=\"noopener\">Get directions</a>."))
    else:
        items.append(("Where does this visit happen?", "Online, by video. You only need a private spot and a device with a camera."))
    if s["minutes"]:
        items.append((f"How long is a {s['name'].split(':')[-1].strip().lower()} visit?", f"Plan on {s['minutes']} minutes. Visits are unhurried."))
    items.append(("How do I book?", f"Use the Book button on this page to pick a time on the calendar. New patients, please complete the <a href=\"/new-patients\">intake form</a> before your first visit."))
    items.append(("How do I reschedule or cancel?", f"Call or text <a href=\"sms:{PHONE_TEL}\">{PHONE_DISPLAY}</a>."))
    return faq_block(items)


def service_pages():
    for s in SERVICES:
        parts = []
        for item in s["body"]:
            k = item[0]
            if k == "p":
                parts.append(f"<p>{e(item[1])}</p>")
            elif k == "h2":
                parts.append(f"<h2 style='margin-top:2rem'>{e(item[1])}</h2>")
            elif k == "ul":
                parts.append("<ul class='checks'>" + "".join(f"<li>{e(i)}</li>" for i in item[1]) + "</ul>")
            elif k == "q":
                parts.append(f'<div class="quotes" style="columns:1"><blockquote><p>{e(item[1])}</p><cite>{e(item[2])}</cite></blockquote></div>')
            elif k == "small":
                parts.append(f'<p class="fine">{e(item[1])}</p>')
        rel = "".join(f'<li><a href="/service-page/{r}">{e(BY_SLUG[r]["name"])}</a> <span class="fine">${BY_SLUG[r]["price"]}</span></li>' for r in s["related"])
        g = GUIDES.get(s["slug"])
        guide = f'<li><a href="{g[0]}">{e(g[1])}</a></li>' if g else ""
        dur = f'<dt>Time</dt><dd>{s["minutes"]} minutes</dd>' if s["minutes"] else ""
        loc = "Online, by video" if "Online" in s["name"] else ADDR_LINE
        pk = PACKAGES.get(s["slug"])
        series_fact = series_block = ""
        if pk:
            series_fact = f'<dt>Series</dt><dd><span class="price">${pk["price"]:,}</span> for 5 sessions</dd>'
            series_block = (f'<h2 id="series" style="margin-top:2rem">{e(SERIES)} series</h2>'
                            f'<p>Five sessions, one for each element of Chinese medicine: Wood, Fire, Earth, Metal, and Water. '
                            f'Each session has its own focus and its own signature serum.</p>'
                            f'<p>Booked as a series, the five sessions are ${pk["price"]:,}, which works out to ${pk["per"]} a session instead of ${s["price"]}.</p>'
                            f'<p><a href="{pk["guide"]}#five-element">How the five sessions work</a></p>')
        main = hero(e(s["name"]), e(s["tagline"]), crumbs=[("Home", "/"), ("Book online", "/book-online")], tone={"beauty":"c","acu":"m","consult":"l","tea":"n"}[s["group"]]) + f"""
<section><div class="wrap split">
  <div>
    <dl class="facts"><dt>Fee</dt><dd class="price">${s["price"]}</dd>{series_fact}{dur}<dt>Where</dt><dd>{e(loc)}</dd></dl>
    <p>{book_btn("Book")}</p>
    <p class="fine">Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>.</p>
    <h2 class="h3" style="margin-top:2rem">Also see</h2>
    <ul class="checks">{rel}{guide}</ul>
  </div>
  <div>{''.join(parts)}{series_block}
    {service_faq(s)}
    <p class="fine" style="margin-top:2rem">{NAME}, {ADDR_LINE}. Convenient to Glendale, Toluca Lake, North Hollywood, and Studio City.</p>
  </div>
</div></section>"""
        OUT[f"service-page/{s['slug']}.html"] = page(f"/service-page/{s['slug']}", s["title"], s["meta"], main,
            ld=[business_ld(), service_ld(s), breadcrumb_ld([("Home", "/"), ("Book online", "/book-online"), (s["name"], f"/service-page/{s['slug']}")])])
        # old Wix booking-calendar addresses: forward to the service page, keep out of search
        OUT[f"booking-calendar/{s['slug']}.html"] = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(s['name'])} | {NAME}</title>
<meta name="robots" content="noindex"><link rel="canonical" href="{SITE}/service-page/{s['slug']}">
<meta http-equiv="refresh" content="0; url=/service-page/{s['slug']}"></head>
<body><p><a href="/service-page/{s['slug']}">Continue to {e(s['name'])}</a></p></body></html>
"""


def landing_pages():
    """Guide pages for the three searches that matter most. No prices here (fees stay on the service pages)."""
    mi, na, li = BY_SLUG["medical-microneedling-session"], BY_SLUG["facial-nano-needling"], BY_SLUG["full-lotus-lift"]
    def link(slug, label=None):
        return f'<a href="/service-page/{slug}">{e(label or BY_SLUG[slug]["name"])}</a>'
    where = f"Full Lotus Health is at {ADDR_LINE}, convenient to Glendale, Toluca Lake, North Hollywood, and Studio City."
    pages = [
      dict(path="/microneedling-burbank", file="microneedling-burbank.html", svc=mi, tone="c",
           title="Microneedling Burbank: What to Expect | Full Lotus Health",
           meta="Microneedling in Burbank for fine lines, acne scars, texture, and thinning hair. What a 90-minute session involves, and how a series works.",
           h1="Microneedling in Burbank, CA",
           lede="Medical microneedling for skin and hair, with custom Chinese herbal serums and red light therapy, from a licensed acupuncturist.",
           body=f"""
<h2>What microneedling does</h2>
<p>Microneedling, also called collagen induction therapy, uses fine, sterile, medical-grade needles to create tiny controlled channels in the skin. This prompts your skin's natural repair process, which builds new collagen over the following weeks.</p>
<h2>What it can help with</h2>
<ul class="checks"><li>Fine lines and wrinkles, including crow's feet</li><li>Acne scarring</li><li>Uneven texture and tone</li><li>Enlarged pores</li><li>Thinning hair along the hairline (scalp microneedling)</li></ul>
<h2>Why come to Full Lotus Health</h2>
<p>Your treatment is performed by Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience. Every session uses custom Chinese herbal serums chosen for your skin, and red light therapy is included. Because he is trained in Chinese medicine, your skin is looked at as part of your whole health, not in isolation.</p>
<p>Microneedling is also offered as the <a href="#five-element">{e(SERIES)}</a> series: five sessions, one for each element of Chinese medicine, each with its own signature serum.</p>
{photo("microneedling", "A microneedling treatment at Full Lotus Health in Burbank")}
<h2>A session, start to finish</h2>
<p>Sessions are 90 minutes, and your first visit includes an intake and a treatment plan. A numbing cream goes on first, and most people find the treatment comfortable. Some redness afterward, similar to a mild sunburn, usually settles within a day or two.</p>
<p>Results build over time. Most people do a series of sessions spaced several weeks apart, and your plan is set at your first visit.</p>
<h2>What patients say</h2>
<div class="quotes" style="columns:1"><blockquote><p>I have also started microneedling for hair loss. After about 3 treatments, I have new tiny hairs growing around my hairline.</p><cite>Rosa</cite></blockquote></div>
<p class="fine">Individual results vary.</p>
{faq_block([
  ("Does microneedling hurt?", "A numbing cream is applied first, and most people find the treatment comfortable."),
  ("How long does redness last?", "Expect some redness afterward, similar to a mild sunburn. It usually settles within a day or two."),
  ("How many sessions will I need?", f"Results build over time, and most people do a series of sessions spaced several weeks apart. The five-session <a href=\"#five-element\">{e(SERIES)}</a> series is the simplest way to do it. Your first visit includes a treatment plan."),
  ("Do you offer microneedling for thinning hair?", "Yes. Scalp microneedling along the hairline is offered. Individual results vary."),
  ("Microneedling or nanoneedling?", f"Microneedling works deeper, for scarring, lines, and thinning hair. <a href=\"/nanoneedling-burbank\">Nanoneedling</a> is a gentler surface treatment for glow and hydration, with no downtime."),
  ("Where is the clinic?", where),
])}
""", extra=five_element_section("medical-microneedling-session"),
           more=[("/nanoneedling-burbank", "Nanoneedling in Burbank"), ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture in Burbank")]),
      dict(path="/nanoneedling-burbank", file="nanoneedling-burbank.html", svc=na, tone="l",
           title="Nanoneedling Burbank: Gentle Glow Facial | Full Lotus Health",
           meta="Nanoneedling facial in Burbank: a gentle, no-downtime surface treatment with herbal serums and red light therapy for glowing, hydrated skin.",
           h1="Nanoneedling in Burbank, CA",
           lede="A gentle facial with custom Chinese herbal serums and red light therapy. No downtime.",
           body=f"""
<h2>What nanoneedling is</h2>
<p>Nanoneedling is a gentle alternative to microneedling. It uses ultra-fine nano-tips that open microscopic channels in the very surface of the skin, without going deeper. Those channels let hyaluronic acid, vitamins, and custom Chinese herbal serums absorb where your skin needs them.</p>
<h2>Who it suits</h2>
<ul class="checks"><li>Dull, dehydrated, or tired-looking skin</li><li>Fine lines and uneven texture</li><li>Sensitive skin that doesn't do well with stronger treatments</li><li>A glow before an event</li><li>Maintenance between microneedling sessions</li></ul>
<h2>What happens at Full Lotus Health</h2>
<p>Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience, chooses the herbal serums for your skin, and red light therapy is included. Sessions are 60 minutes.</p>
<p>There's no downtime, so you can go straight back to your day. Skin often looks brighter right away and keeps improving over the following days. It works well on its own or as a regular series.</p>
<p>Nanoneedling is also offered as the <a href="#five-element">{e(SERIES)}</a> series: five sessions, one for each element of Chinese medicine, each with its own signature serum.</p>
{photo("nanoneedling", "A nanoneedling facial at Full Lotus Health in Burbank")}
<h2>What patients say</h2>
<div class="quotes" style="columns:1"><blockquote><p>My skin feels smoother and firmer. (And neither hurt.)</p><cite>Rosa</cite></blockquote></div>
<p class="fine">Individual results vary.</p>
{faq_block([
  ("Is there downtime after nanoneedling?", "No. You can go straight back to your day."),
  ("How long is a session?", "Sixty minutes."),
  ("Nanoneedling or microneedling?", f"Nanoneedling is a surface-level treatment for glow and hydration. <a href=\"/microneedling-burbank\">Microneedling</a> works deeper, for scarring, lines, and thinning hair. If you're not sure which fits, book a session and we'll decide together, or text a question."),
  ("Can I do nanoneedling as a series?", f"Yes. It works well on its own or as a regular series, and the five-session <a href=\"#five-element\">{e(SERIES)}</a> series is the simplest way to do it."),
  ("Where is the clinic?", where),
])}
""", extra=five_element_section("facial-nano-needling"),
           more=[("/microneedling-burbank", "Microneedling in Burbank"), ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture in Burbank")]),
      dict(path="/cosmetic-acupuncture-burbank", file="cosmetic-acupuncture-burbank.html", svc=li, tone="n",
           title="Cosmetic Acupuncture Burbank: Facial Lift | Full Lotus Health",
           meta="Cosmetic acupuncture in Burbank, the Full Lotus Lift: facial acupuncture at lifting and tension-releasing points, with red light therapy.",
           h1="Cosmetic acupuncture in Burbank, CA",
           lede="The Full Lotus Lift: facial acupuncture that calms the mind, balances the body, and brings out your natural glow.",
           body=f"""
<h2>Whatever resides in the heart is expressed in the face</h2>
<p>In Chinese medicine the mind is represented by the heart, and it opens to the face. In this cosmetic acupuncture treatment, we calm the mind, balance the body, and focus on specific tension-releasing and lifting points on the face. Red light therapy is included.</p>
<h2>What the treatment is</h2>
<p>The Full Lotus Lift is a holistic, personalized beauty treatment designed to bring out your natural, radiant glow. It uses premium organic products and gentle techniques to nourish the skin while promoting a profound sense of inner calm.</p>
<h2>Who gives it</h2>
<p>Roozbeh Ghobadpour, L.Ac., is a licensed acupuncturist with over 10 years of clinical experience. Your first session includes a detailed intake and treatment plan. Then you relax and enjoy. It is best done as a series.</p>
{faq_block([
  ("What is cosmetic acupuncture?", "Facial acupuncture at tension-releasing and lifting points, combined with constitutional body points and red light therapy."),
  ("Should I book one session or a series?", "Cosmetic acupuncture is best done as a series. Your first session includes a detailed intake and treatment plan."),
  ("How is it different from microneedling?", f"Cosmetic acupuncture works with acupuncture points and the mind-body connection. <a href=\"/microneedling-burbank\">Microneedling</a> and <a href=\"/nanoneedling-burbank\">nanoneedling</a> work on the skin's surface and layers with herbal serums."),
  ("Where is the clinic?", where),
])}
""", more=[("/microneedling-burbank", "Microneedling in Burbank"), ("/nanoneedling-burbank", "Nanoneedling in Burbank")]),
    ]
    for pg in pages:
        svc = pg["svc"]
        more = "".join(f'<li><a href="{h}">{e(t)}</a></li>' for h, t in pg["more"])
        main = hero(e(pg["h1"]), e(pg["lede"]), crumbs=[("Home", "/"), ("Natural beauty", "/treatments")], tone=pg["tone"]) + f"""
<section><div class="wrap split">
  <div>
    <p>{book_btn("Book a treatment")}</p>
    <p class="fine">Fees and booking are on the <a href="/service-page/{svc['slug']}">{e(svc['name'])}</a> page. Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>.</p>
    <h2 class="h3" style="margin-top:2rem">Also see</h2>
    <ul class="checks">{more}<li><a href="/treatments">All natural beauty treatments</a></li></ul>
  </div>
  <div>{pg['body']}</div>
</div></section>{pg.get('extra', '')}""" + cta("Ready to book?", "Choose a time that works for you.", "Book a treatment")
        OUT[pg["file"]] = page(pg["path"], pg["title"], pg["meta"], main,
            ld=[business_ld(), service_ld(svc, url=SITE + pg["path"], desc=pg["meta"], priced=False),
                breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments"), (pg["h1"], pg["path"])])])


def condition_pages():
    """Skin conditions and fertility. No prices (fees stay on the service pages); visits book as acupuncture or an online consultation."""
    where = f"Full Lotus Health is at {ADDR_LINE}, convenient to Glendale, Toluca Lake, North Hollywood, and Studio City."
    acu, onl = "acupuncture-initial-treatment", "initial-consultation-online"
    pages = [
      dict(path="/skin-conditions-burbank", file="skin-conditions-burbank.html", tone="c",
           name="Chinese medicine for skin conditions",
           crumbs=[("Home", "/"), ("Natural beauty", "/treatments")],
           title="Chinese Medicine for Skin Conditions in Burbank | Full Lotus Health",
           meta="Chinese herbal medicine and acupuncture in Burbank for acne, eczema, psoriasis, rosacea, and hives, treating the pattern underneath, alongside your doctor.",
           h1="Chinese medicine for skin conditions in Burbank",
           lede="Herbal medicine and acupuncture for acne, eczema, psoriasis, rosacea, and other skin conditions, looking for the pattern underneath, not just the rash.",
           start=f'Start with an <a href="/service-page/{acu}">acupuncture initial treatment</a> in person, or an <a href="/service-page/{onl}">online consultation</a> if you are further away. Fees are on those pages.',
           body=f"""
<h2>Your skin shows what is happening inside</h2>
<p>In Chinese medicine, the skin reflects the health of the whole body. Two people with the same diagnosis, eczema for example, can have very different patterns underneath: heat, dryness, dampness, or a system that is simply run down. Treatment is built around your pattern, not just the name of the condition.</p>
<h2>What we can help with</h2>
<ul class="checks"><li>Acne, including hormonal and adult acne</li><li>Eczema and dermatitis</li><li>Psoriasis</li><li>Rosacea and facial redness</li><li>Hives and itchy skin</li><li>Skin that flares with stress, digestion, or your cycle</li></ul>
<h2>How treatment works</h2>
<ol class="steps">
  <li><h3>A detailed intake</h3><p>We look at your skin and at the rest of you: history, diet, sleep, digestion, and what makes flares better or worse. If your skin comes and goes, bring photos of it at its worst to your visit.</p></li>
  <li><h3>An herbal formula for your pattern</h3><p>For most skin conditions, Chinese herbal medicine taken internally is the main treatment. Your formula is matched to your pattern and adjusted as your skin changes.</p></li>
  <li><h3>Acupuncture and diet, where they help</h3><p>Acupuncture can help with stress-driven flares and itch, and some food changes often matter more than people expect.</p></li>
  <li><h3>Steady follow-ups</h3><p>Skin changes gradually. Expect regular follow-ups over several months, with your formula refined as you go.</p></li>
</ol>
<h2>Alongside your dermatologist</h2>
<p>Chinese medicine can work alongside the care you already have. Please don't stop any prescribed medicine without talking to the doctor who prescribed it, and bring a list of everything you use, including creams, to your first visit.</p>
<p class="fine">Individual results vary.</p>
{faq_block([
  ("How long until I see a change?", "Skin conditions change gradually. Many people need a few months of treatment, with regular follow-ups to adjust the formula. Individual results vary."),
  ("Can I do this online?", f"Yes. Herbal treatment works well by <a href=\"/service-page/{onl}\">online consultation</a>, though seeing your skin in person at the first visit helps."),
  ("Is this the same as microneedling?", "No. <a href=\"/microneedling-burbank\">Microneedling</a> and <a href=\"/nanoneedling-burbank\">nanoneedling</a> are cosmetic treatments for lines, scars, and texture. Needling isn't done on skin that is actively inflamed, so conditions like eczema or active breakouts are treated from the inside first."),
  ("Where is the clinic?", where),
])}
""", more=[("/consult-heal", "Chinese herbal medicine consultations"), ("/microneedling-burbank", "Microneedling in Burbank"), ("/treatments", "All natural beauty treatments")]),
      dict(path="/fertility-acupuncture-burbank", file="fertility-acupuncture-burbank.html", tone="m",
           name="Fertility acupuncture",
           crumbs=[("Home", "/"), ("Acupuncture", "/acupuncture")],
           title="Fertility Acupuncture in Burbank, CA | Full Lotus Health",
           meta="Fertility acupuncture and Chinese herbal medicine in Burbank, alongside your doctor, IVF, or IUI: support for your cycle, stress, and sleep while you try to conceive.",
           h1="Fertility acupuncture in Burbank, CA",
           lede="Acupuncture and Chinese herbal medicine to support you while you try to conceive, naturally or alongside IVF and IUI.",
           start=f'Start with an <a href="/service-page/{acu}">acupuncture initial treatment</a>. The fee is on that page.',
           body=f"""
<h2>Support, alongside your doctor</h2>
<p>Fertility care at Full Lotus Health is support, not a replacement for your doctor or fertility clinic. Many people use acupuncture and Chinese medicine while trying naturally, or alongside IVF or IUI, to support their cycle, sleep, and stress through what can be a demanding time.</p>
<h2>What we can help with</h2>
<ul class="checks"><li>Preparing your body in the months before trying, or before an IVF cycle</li><li>Irregular or painful cycles</li><li>Stress, sleep, and the emotional weight of trying to conceive</li><li>Support around IVF and IUI, timed to your cycle</li><li>Partners too: fertility is a two-person picture</li></ul>
<h2>How it works</h2>
<ol class="steps">
  <li><h3>A detailed intake</h3><p>We go through your health history, your cycle, and any testing and treatment so far. Bring recent test results to your first visit if you have them.</p></li>
  <li><h3>A plan for your timeline</h3><p>Usually regular acupuncture, often weekly, with herbal medicine where it fits. If you're doing IVF, sessions are planned around your clinic's dates.</p></li>
  <li><h3>Steady support</h3><p>Visits are unhurried and often end with tea. It is a calm place to come back to while you go through the process.</p></li>
</ol>
<h2>What we won't promise</h2>
<p>No one can honestly promise a pregnancy, and we won't. What we offer is careful, consistent support that works with your medical care, not against it.</p>
<p class="fine">Individual results vary.</p>
{faq_block([
  ("Can I have acupuncture during IVF?", "Yes, many people do. Sessions are planned around your clinic's schedule. Please let your fertility clinic know you're having acupuncture."),
  ("Can I take Chinese herbs during IVF?", "Only with your fertility clinic's agreement. Many clinics ask patients to pause herbs during a cycle, and we follow their guidance."),
  ("How often will I come in?", "Often weekly, with extra sessions timed to your cycle or IVF dates. Your plan is set at your first visit."),
  ("Where is the clinic?", where),
])}
""", more=[("/acupuncture", "Acupuncture in Burbank"), ("/consult-heal", "Chinese herbal medicine consultations")]),
    ]
    for pg in pages:
        more = "".join(f'<li><a href="{h}">{e(t)}</a></li>' for h, t in pg["more"])
        main = hero(e(pg["h1"]), e(pg["lede"]), crumbs=pg["crumbs"], tone=pg["tone"]) + f"""
<section><div class="wrap split">
  <div>
    <p>{book_btn("Book a visit")}</p>
    <p class="fine">{pg['start']}</p>
    <p class="fine">Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>. Please keep health details for the <a href="/new-patients">intake form</a>.</p>
    <h2 class="h3" style="margin-top:2rem">Also see</h2>
    <ul class="checks">{more}</ul>
  </div>
  <div>{pg['body']}</div>
</div></section>""" + cta("Ready to start?", "Choose a time that works for you, or text a question first.", "Book a visit")
        svc = dict(name=pg["name"], meta=pg["meta"])
        OUT[pg["file"]] = page(pg["path"], pg["title"], pg["meta"], main,
            ld=[business_ld(), service_ld(svc, url=SITE + pg["path"], priced=False),
                breadcrumb_ld(pg["crumbs"] + [(pg["h1"], pg["path"])])])


def notfound():
    main = hero("Page not found.", "That address doesn't lead anywhere. Try one of these.", tone="c") + """
<section><div class="wrap"><ul class="checks"><li><a href="/">Home</a></li><li><a href="/treatments">Natural beauty</a></li><li><a href="/acupuncture">Acupuncture</a></li><li><a href="/book-online">Book online</a></li></ul></div></section>"""
    OUT["404.html"] = page("/404", "Page not found | Full Lotus Health", "That page was not found. Visit the Full Lotus Health home page or book acupuncture, microneedling, or a tea ceremony in Burbank, CA.", main, noindex=True)


def seo_files():
    urls = ["/", "/treatments", "/acupuncture", "/consult-heal", "/tea-ceremonies", "/new-patients", "/book-online", "/microneedling-burbank", "/nanoneedling-burbank", "/cosmetic-acupuncture-burbank", "/skin-conditions-burbank", "/fertility-acupuncture-burbank"] + (["/blog"] + [f"/post/{p['slug']}" for p in POSTS] if POSTS else []) + [f"/service-page/{s['slug']}" for s in SERVICES]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        post = next((q for q in POSTS if u == f"/post/{q['slug']}"), None)
        pri = "0.6" if post else "1.0" if u == "/" else ("0.9" if u == "/treatments" or "burbank" in u or "needling" in u or "lift" in u else "0.7")
        sm.append(f"<url><loc>{SITE}{u if u != '/' else '/'}</loc><lastmod>{post['date'] if post else TODAY}</lastmod><priority>{pri}</priority></url>")
    sm.append("</urlset>")
    OUT["sitemap.xml"] = "\n".join(sm) + "\n"
    OUT["robots.txt"] = f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n"
    OUT["CNAME"] = "www.fulllotushealth.com\n"
    OUT[".nojekyll"] = ""


for fn in (home, treatments, acupuncture, consult, tea, book_online, blog, new_patients, service_pages, landing_pages, condition_pages, blog_posts, feed, notfound, seo_files):
    fn()

for rel, content in OUT.items():
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
print(f"Built {len(OUT)} files.")
