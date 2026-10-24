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
            "price": money(s["price"]), "priceCurrency": "USD",
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
        "image": f"{SITE}/assets/logo.svg",
        "logo": f"{SITE}/assets/logo.svg",
        "priceRange": "$35-$500",
        "address": {"@type": "PostalAddress", "streetAddress": ADDR["street"], "addressLocality": ADDR["city"],
                    "addressRegion": ADDR["region"], "postalCode": ADDR["zip"], "addressCountry": "US"},
        "geo": {"@type": "GeoCoordinates", "latitude": 34.1929, "longitude": -118.3247},
        "hasMap": MAPS,
        "areaServed": [{"@type": "City", "name": c} for c in ("Burbank", "Glendale", "Toluca Lake", "North Hollywood", "Studio City")],
        "founder": {"@type": "Person", "name": "Roozbeh Ghobadpour", "jobTitle": "Licensed Acupuncturist (L.Ac.)"},
        "knowsAbout": ["Cosmetic acupuncture", "Microneedling", "Nanoneedling", "Acupuncture", "Chinese herbal medicine", "Cupping", "Moxibustion", "Chinese tea ceremony"],
        "makesOffer": offers,
    }


def service_ld(s):
    d = {
        "@context": "https://schema.org", "@type": "Service",
        "name": s["name"], "description": s["meta"],
        "url": f"{SITE}/service-page/{s['slug']}",
        "provider": {"@id": f"{SITE}/#business"},
        "areaServed": {"@type": "City", "name": "Burbank"},
        "offers": {"@type": "Offer", "price": money(s["price"]), "priceCurrency": "USD", "url": BOOK or f"{SITE}/book-online"},
    }
    return d


def breadcrumb_ld(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(trail)]}


# ------------------------------------------------------------------ layout
def book_btn(label="Book", cls="", small=False):
    c = "btn " + ("small " if small else "") + cls
    rel = ' rel="noopener"' if BOOK_EXTERNAL else ""
    return f'<a class="{c.strip()}" href="{e(BOOK_HREF)}"{rel}>{e(label)}</a>'


def page(path, title, meta, main, ld=None, current=None, noindex=False, og_type="website"):
    canon = SITE + (path if path != "/" else "/")
    nav_items = []
    for href, label in NAV:
        cur = ' aria-current="page"' if (current == href) else ""
        nav_items.append(f'<li><a href="{href}"{cur}>{e(label)}</a></li>')
    nav_items.append(f'<li><a class="tel" href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>')
    nav_items.append(f'<li>{book_btn("Book", small=True)}</li>')
    ld_blocks = "".join(f'<script type="application/ld+json">{json.dumps(x, separators=(",", ":"))}</script>\n' for x in (ld or []))
    robots = '<meta name="robots" content="noindex, follow">\n' if noindex else ""
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
<meta property="og:image" content="{SITE}/assets/logo.svg">
<meta name="theme-color" content="#f2e9d3">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Hanken+Grotesk:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
{ld_blocks}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="band" aria-hidden="true"></div>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="{NAME}, home">
      <img src="/assets/logo.svg" width="46" height="46" alt="">
      <span>{NAME}<small>Acupuncture &amp; Chinese medicine, Burbank</small></span>
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
        <a class="brand" href="/"><img src="/assets/logo.svg" width="46" height="46" alt=""><span>{NAME}</span></a>
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


def hero(title, lede, crumbs=None):
    cr = ""
    if crumbs:
        cr = '<p class="crumbs">' + " / ".join(f'<a href="{h}">{e(n)}</a>' for n, h in crumbs) + "</p>"
    return f'<div class="wrap page-hero">{cr}<div class="band short" aria-hidden="true"></div><h1>{title}</h1><p class="lede">{lede}</p></div>'


def contact_block():
    return f"""<ul class="contact-lines">
<li>Call <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
<li>Text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
<li>Email <a href="mailto:{EMAIL}">{EMAIL}</a></li>
</ul>"""


def cta(heading, text, label="Book a visit", extra=""):
    return f"""<section class="cta"><div class="wrap"><div class="box">
<h2>{heading}</h2><p>{text}</p>
<p style="display:flex;gap:.9rem;flex-wrap:wrap;margin-top:1.4rem">{book_btn(label)} <a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>{extra}</p>
</div></div></section>"""


def quotes(items):
    out = []
    for text, who in items:
        out.append(f'<blockquote><p>{e(text)}</p><cite>{e(who)}</cite></blockquote>')
    return '<div class="quotes">' + "".join(out) + "</div>"


def rate_item(slug, desc=None):
    s = BY_SLUG[slug]
    meta = f'<span class="meta">{s["minutes"]} min</span>' if s["minutes"] else ""
    return f'<li><span class="name"><a href="/service-page/{slug}">{e(s["name"])}</a>{meta}</span><span class="price">${s["price"]}</span><p class="desc">{e(desc or s["short"])}</p></li>'


OUT = {}


# ------------------------------------------------------------------ pages
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
  <div class="seal-wrap"><img src="/assets/logo.svg" width="352" height="352" alt="Full Lotus Health lotus seal"></div>
</div></section>

<div class="trust"><div class="wrap"><p>Trusted by 300+ patients for over 10 years in Burbank for integrative healing, stress relief, natural beauty, pain relief, sleep, and lasting vitality.</p></div></div>

<section><div class="wrap">
  <h2>Healing paths</h2>
  <div class="paths">
    <div class="path"><h3>Acupuncture</h3><p>Dedicated acupuncture and specialized recovery treatments for jet lag and travel fatigue, tailored for those visiting the Burbank area.</p><p><a href="/acupuncture">Acupuncture in Burbank</a></p></div>
    <div class="path"><h3>Natural beauty</h3><p>Unlock lasting vitality and skin rejuvenation through holistic facial treatments and constitutional cosmetic acupuncture techniques.</p><p><a href="/treatments">Explore treatments</a></p></div>
    <div class="path"><h3>Heal from within</h3><p>Comprehensive integrative care addressing nervous system overload, chronic pain, and stress relief for deep restoration.</p><p><a href="/consult-heal">Consult &amp; heal</a></p></div>
  </div>
</div></section>

<section class="tint"><div class="wrap split">
  <div>
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

<section><div class="wrap">
  <h2>Healing is more than skin deep. It is a return to whole-system harmony.</h2>
  <p>At Full Lotus Health, we treat the whole person, not just the symptom. Our integrative approach harmonizes your nervous system and internal vitality to create a state of lasting balance, allowing your natural radiance to flourish from within.</p>
</div></section>

<section class="deep"><div class="wrap">
  <h2>What patients say</h2>
  {quotes(TESTIMONIALS_HOME)}
</div></section>

<section><div class="wrap split">
  <div><h2>Meet Roozbeh</h2></div>
  <div>
    <p>Hi, I'm Roozbeh. I've been studying and practicing the healing arts for over twenty-five years and have been a licensed acupuncturist and practitioner of Traditional Chinese Medicine since 2015. Over the years I have learned and integrated many modalities into my treatment method. Many of these ways of looking at the body and the world have been inspired by obstacles I have encountered in my own health journey.</p>
    <p>Full Lotus Health is a special place where I present everything I have learned to the local community: from acupuncture to herbal medicine, gut testing, tea ceremony, and truly natural cosmetic acupuncture. It is my sincere wish that everyone who comes here leaves a happier person.</p>
    <p>If you have any questions about me or any of the offerings at Full Lotus Health, please feel free to reach out at <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  </div>
</div></section>

<section class="tint"><div class="wrap split">
  <div><h2>The art of tea</h2></div>
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
        "Advanced, chemical-free facial rejuvenation that restores your skin and hair from the inside out. Holistic beauty that heals the mind while elevating your natural radiance.") + f"""
<section><div class="wrap">
  <h2>Facial and skin treatments in Burbank</h2>
  <ul class="rates">
    {rate_item("medical-microneedling-session", "Collagen induction therapy using medical-grade microneedles to trigger your skin's natural repair response. Targets fine lines, acne scarring, uneven texture, and hair loss, stimulating deep renewal that builds over time. Custom Chinese herbal serums are applied during treatment and absorbed far more efficiently than topical application alone. Red light therapy is included.")}
    {rate_item("facial-nano-needling", "Nanoneedling combines ultra-fine nanotips with pure botanical serums for instant radiance with zero downtime. The tips open micro-channels in the skin's surface, infusing hyaluronic acid, vitamins, and custom herbal serums exactly where they're needed. Ideal for sensitive skin, a pre-event glow, or between microneedling sessions. Includes red light therapy.")}
    {rate_item("full-lotus-lift", "Cosmetic acupuncture (the Full Lotus Lift). In Chinese medicine the mind is represented by the heart, and it opens to the face. We calm the mind, balance the body, and focus on specific tension-releasing and lifting points on the face. Includes red light therapy.")}
  </ul>
  <p style="margin-top:1.6rem">{book_btn("Book a treatment")}</p>
  <p class="fine" style="margin-top:1rem">How it works: your first session includes a detailed intake and treatment plan. Then relax and enjoy. Best done in a series. Prices are per session.</p>
</div></section>

<section class="deep"><div class="wrap">
  <h2>What patients say</h2>
  {quotes(TESTIMONIALS_BEAUTY)}
  <p class="fine">Individual results vary.</p>
  <p>{book_btn("Book a treatment")}</p>
</div></section>

<section><div class="wrap split">
  <div><h2>Whatever resides in the heart is expressed in the face</h2></div>
  <div>
    <p>Full Lotus Health treats skin as the visible end of your whole health. Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist, chooses the herbal serums, the points, and the pace of your series from a Chinese medicine assessment, not from a fixed protocol.</p>
    <p>Not sure which treatment fits? Book a session and we'll decide together, or text a question to <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
    <p>Our clinic is at {ADDR_LINE}, convenient to Glendale, Toluca Lake, North Hollywood, and Studio City.</p>
  </div>
</div></section>

<section class="tint"><div class="wrap">
  <h2>Questions before you book?</h2>
  <p>Reach us directly. Please keep health details for the intake form.</p>
  {contact_block()}
</div></section>
""" + cta("Ready for your natural glow?", "Choose a time that works for you.", "Book a treatment")
    OUT["treatments.html"] = page("/treatments", "Cosmetic Acupuncture and Microneedling in Burbank, CA",
        "Microneedling, nanoneedling, and cosmetic acupuncture in Burbank with custom Chinese herbal serums and red light therapy, from a licensed acupuncturist.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments")])], current="/treatments")


def acupuncture():
    main = hero("Restore your natural rhythm.",
        "Acupuncture at Full Lotus Health is a ritual of restoration. By harmonizing your nervous system and internal vitality, we help you return to a state of wholeness where healing happens naturally.") + f"""
<section><div class="wrap">
  <p>{book_btn("Book your session")}</p>
  <div class="paths" style="margin-top:2.2rem">
    <div class="path"><h3>Traditional acupuncture</h3><p>A precise modality to balance the body's vital energy, addressing chronic pain, digestive issues, and nervous system health.</p></div>
    <div class="path"><h3>Cosmetic acupuncture</h3><p>Unlock natural radiance and skin vitality using constitutional techniques for rejuvenation and lasting facial glow.</p><p><a href="/service-page/full-lotus-lift">Cosmetic acupuncture in Burbank</a></p></div>
    <div class="path"><h3>Recovery and wellness</h3><p>Integrated care designed to address travel fatigue, jet lag, and immune depletion through advanced restorative protocols.</p></div>
  </div>
</div></section>

<section class="tint"><div class="wrap split">
  <div><h2>Healing beyond the surface</h2></div>
  <div>
    <p>Acupuncture is more than a physical treatment; it is a method of regulating the nervous system. By gently stimulating specific points, we signal the body to shift from a state of stress into deep restoration. This physiological reset supports healthy circulation and a return to your natural state of whole-body harmony and lasting vitality.</p>
    <p>Fees: <a href="/service-page/acupuncture-initial-treatment">initial treatment $180</a> (60 minutes), <a href="/service-page/acupuncture-repeat-treatment">repeat treatment $120</a> (45 minutes).</p>
  </div>
</div></section>

<section><div class="wrap">
  <h2>What to expect</h2>
  <ol class="steps">
    <li><h3>Consultation</h3><p>We begin with a deep dive into your health history, lifestyle, and goals to create a personalized treatment mapping.</p></li>
    <li><h3>Gentle placement</h3><p>Ultra-fine, sterile needles are gently placed. Most patients feel only a slight sensation or nothing at all.</p></li>
    <li><h3>Restorative rest</h3><p>You will rest for 20 to 30 minutes in a calm environment, allowing the needles to stimulate your body's healing response.</p></li>
    <li><h3>Post-care ritual</h3><p>We conclude with herbal recommendations and a moment in our tea ceremony space for deep integration.</p></li>
  </ol>
</div></section>

<section class="deep"><div class="wrap">
  <h2>Patient journeys</h2>
  {quotes([TESTIMONIALS_HOME[0], TESTIMONIALS_HOME[3], TESTIMONIALS_HOME[4]])}
</div></section>
""" + cta("Begin your journey to vitality", "Reserve your personalized treatment in Burbank and discover the benefits of whole-system harmony.", "Book online now")
    OUT["acupuncture.html"] = page("/acupuncture", "Acupuncture in Burbank, CA | Full Lotus Health",
        "Acupuncture in Burbank, CA with Roozbeh Ghobadpour, L.Ac.: pain, digestion, stress, sleep, and recovery, with herbal recommendations and tea.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Acupuncture", "/acupuncture")])], current="/acupuncture")


def consult():
    main = hero("Your health has a story. Let's read it together.",
        "Roozbeh brings over 15 years of Chinese medicine training to every consultation, reading your body as a whole system, not a list of isolated symptoms.") + f"""
<section><div class="wrap">
  <p>{book_btn("Book your online consultation")}</p>
</div></section>
<section class="tint"><div class="wrap split">
  <div><h2>We treat the whole system</h2></div>
  <div>
    <p>Most medicine asks: what is the symptom? Chinese medicine asks: why is the system out of balance? Roozbeh's approach combines classical diagnosis with modern clinical insight, drawing on long-form published writing in a tea magazine.</p>
    <h3>Who this is for</h3>
    <p>This work is a good fit if you're navigating:</p>
    <ul class="checks">
      <li>Chronic gut issues and IBS</li><li>Hormonal imbalance</li><li>Chronic fatigue and low energy</li>
      <li>Stress and nervous system dysregulation</li><li>Conventional medicine that hasn't brought lasting results</li>
    </ul>
  </div>
</div></section>
<section><div class="wrap">
  <h2>What's offered</h2>
  <ul class="rates">
    <li><span class="name"><a href="/service-page/initial-consultation-online">Online consultation</a><span class="meta">60 min</span></span><span class="price">$180</span><p class="desc">Remote Chinese medicine consultation with herbal and dietary recommendations.</p></li>
    <li><span class="name">Chinese herbal medicine for gut health</span><span class="price"></span><p class="desc">Custom herbal formulas targeting the root cause of digestive imbalance.</p></li>
    <li><span class="name">Dietary guidance</span><span class="price"></span><p class="desc">Food as medicine. Practical recommendations rooted in Chinese medicine.</p></li>
  </ul>
  <p class="fine" style="margin-top:1rem">Follow-up sessions: <a href="/service-page/repeat-consultation-online">repeat online consultation $180</a> (45 minutes).</p>
</div></section>
<section class="deep"><div class="wrap">
  <h2>How it works</h2>
  <ol class="steps">
    <li><h3>Book a consultation</h3><p>Choose a time that works for you. Then complete the <a href="/new-patients">new patient intake form</a> with a brief health history.</p></li>
    <li><h3>Receive your assessment and herbal protocol</h3><p>We'll meet online to map your system, then you'll receive a tailored plan.</p></li>
    <li><h3>Follow up and refine</h3><p>We adjust your herbs and diet as your system responds, aiming for steady, sustainable change.</p></li>
  </ol>
</div></section>
""" + cta("Ready to begin?", "Your first consultation is the first step toward a plan built around you.", "Book your online consultation")
    OUT["consult-heal.html"] = page("/consult-heal", "Chinese Herbal Medicine Consultation | Burbank or Remote",
        "Chinese herbal medicine consultations in Burbank or online with Roozbeh Ghobadpour, L.Ac.: gut health, hormones, fatigue, stress, and dietary guidance.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Consult & heal", "/consult-heal")])], current="/consult-heal")


def tea():
    main = hero("The sacred art of presence.",
        "Our tea ceremonies are designed to help you step into a meditative rhythm. By focusing on the intentional ritual of tea, we create a space to slow the breath, calm the nervous system, and return to whole-system harmony. This practice is open to anyone seeking stress relief and a moment of true inner balance.") + f"""
<section><div class="wrap">
  <p>{book_btn("Book a seat")}</p>
  <ul class="rates" style="margin-top:2rem">
    <li><span class="name"><a href="/service-page/gong-fu-tea-ceremony">Gong Fu ceremony</a><span class="meta">60 min</span></span><span class="price">$55</span><p class="desc">Gong Fu ceremony is about making the perfect cup of tea. Every element of good tea, including water, teaware, tea, atmosphere, and heat, is controlled to create the perfect cup, an unattainable goal which we strive for each time.</p></li>
    <li><span class="name"><a href="/service-page/bowl-tea-ceremony">Bowl tea ceremony</a></span><span class="price">$35</span><p class="desc">Bowl tea ceremony has been around for several centuries but has recently been adapted for the modern world by tea master Wu De. We drink tea in silence with mindfulness, observing its effect on our mind and experiencing meditation.</p></li>
    <li><span class="name"><a href="/service-page/private-gong-fu-tea-ceremony">Private Gong Fu ceremony</a></span><span class="price">$250</span><p class="desc">A private session for up to five guests.</p></li>
  </ul>
</div></section>
<section class="tint"><div class="wrap split">
  <div><h2>The magic of tea</h2></div>
  <div>
    <p>In Chinese medicine, tea is known as the premier Chinese herb for the mind. In tea ceremony we drink aged, old growth, organic teas, which have a profound ability to calm and energize the mind and allow one to access the heart/mind in meditation.</p>
    <p>We provide tea ceremony in the tradition of Wu De, a foremost expert on tea who has written many books on tea and owns Global Tea Hut. Roozbeh has been studying with Wu De for over fifteen years, and Wu De has served tea at Full Lotus Health.</p>
  </div>
</div></section>
<section><div class="wrap">
  <h2>Join the circle</h2>
  <p>To hear about special community tea sits, events, and unique tea offerings, email <a href="mailto:{EMAIL}?subject=Tea%20circle">{EMAIL}</a> and ask to be added.</p>
</div></section>
""" + cta("Reserve your seat", "Pour a cup and slow down.", "Book a seat")
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
        blocks.append(f"<h2 style='margin-top:2.4rem'>{label}</h2><ul class='svc-list'>{''.join(rows)}</ul>")
    fallback = ""
    if not BOOK:
        fallback = f'<div class="notice"><p><strong>Online booking is being set up.</strong> To book now, call or text <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></div>'
    main = hero("Book online.", "Pick a service, then choose a time on the calendar. New patients, please complete the intake form before your first visit.") + f"""
<section><div class="wrap">
  {fallback}
  <p><a class="btn ghost" href="{e(INTAKE_HREF)}">New patient intake form</a></p>
  {''.join(blocks)}
  <p class="fine" style="margin-top:2rem">Prices are per session. To reschedule or cancel, call or text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
</div></section>"""
    OUT["book-online.html"] = page("/book-online", "Book Online | Full Lotus Health",
        "Book acupuncture, microneedling, nanoneedling, cosmetic acupuncture, consultations, or tea ceremony at Full Lotus Health in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Book online", "/book-online")])])


def blog():
    main = hero("Blog.", "Notes on acupuncture, Chinese herbal medicine, skin, and tea are coming soon.") + f"""
<section><div class="wrap">
  <p>In the meantime, explore <a href="/treatments">natural beauty treatments</a>, <a href="/acupuncture">acupuncture</a>, or <a href="/tea-ceremonies">tea ceremonies</a>.</p>
</div></section>"""
    OUT["blog.html"] = page("/blog", "Blog | Full Lotus Health",
        "Notes on acupuncture, Chinese herbal medicine, skin care, and tea from Full Lotus Health in Burbank, CA.",
        main, ld=[business_ld()])


def new_patients():
    if INTAKE:
        action = f'<p><a class="btn" href="{e(INTAKE)}" rel="noopener">Open the intake form</a></p><p class="fine">The form opens in Google Forms. It is not part of this website.</p>'
    else:
        action = f'<div class="notice"><p><strong>The intake form link is being added.</strong> Until then, call or text <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> and we will send it to you.</p></div>'
    main = hero("New patients.", "Welcome. Two steps before your first visit: choose a time, then fill out the intake form.") + f"""
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
    <h3 style="margin-top:2rem">Questions</h3>
    {contact_block()}
  </div>
</div></section>"""
    OUT["new-patients.html"] = page("/new-patients", "New Patients | Full Lotus Health, Burbank",
        "New to Full Lotus Health? Book a time, then complete the new patient intake form before your first visit in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("New patients", "/new-patients")])], current="/new-patients")


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
        dur = f'<dt>Time</dt><dd>{s["minutes"]} minutes</dd>' if s["minutes"] else ""
        loc = "Online, by video" if "Online" in s["name"] else ADDR_LINE
        main = hero(e(s["name"]), e(s["tagline"]), crumbs=[("Home", "/"), ("Book online", "/book-online")]) + f"""
<section><div class="wrap split">
  <div>
    <dl class="facts"><dt>Fee</dt><dd class="price">${s["price"]}</dd>{dur}<dt>Where</dt><dd>{e(loc)}</dd></dl>
    <p>{book_btn("Book")}</p>
    <p class="fine">Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>.</p>
    <h3 style="margin-top:2rem">Also see</h3>
    <ul class="checks">{rel}</ul>
  </div>
  <div>{''.join(parts)}
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


def notfound():
    main = hero("Page not found.", "That address doesn't lead anywhere. Try one of these.") + """
<section><div class="wrap"><ul class="checks"><li><a href="/">Home</a></li><li><a href="/treatments">Natural beauty</a></li><li><a href="/acupuncture">Acupuncture</a></li><li><a href="/book-online">Book online</a></li></ul></div></section>"""
    OUT["404.html"] = page("/404", "Page not found | Full Lotus Health", "Page not found.", main, noindex=True)


def seo_files():
    urls = ["/", "/treatments", "/acupuncture", "/consult-heal", "/tea-ceremonies", "/new-patients", "/book-online", "/blog"] + [f"/service-page/{s['slug']}" for s in SERVICES]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        pri = "1.0" if u == "/" else ("0.9" if u in ("/treatments",) or "needling" in u or "lift" in u or "microneedling" in u else "0.7")
        sm.append(f"<url><loc>{SITE}{u if u != '/' else '/'}</loc><lastmod>{TODAY}</lastmod><priority>{pri}</priority></url>")
    sm.append("</urlset>")
    OUT["sitemap.xml"] = "\n".join(sm) + "\n"
    OUT["robots.txt"] = f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n"
    OUT["CNAME"] = "www.fulllotushealth.com\n"
    OUT[".nojekyll"] = ""


for fn in (home, treatments, acupuncture, consult, tea, book_online, blog, new_patients, service_pages, notfound, seo_files):
    fn()

for rel, content in OUT.items():
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
print(f"Built {len(OUT)} files.")
