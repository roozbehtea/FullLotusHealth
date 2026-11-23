#!/usr/bin/env python3
"""Generate the Full Lotus Health static site.

Usage:  python3 _src/build.py            # preview build; missing links fall back to phone/text
        python3 _src/build.py --launch   # refuses to build until the two Google links are set

Edit _src/config.json (booking_url, intake_url), re-run, commit, push.
Output pages are plain .html files in the repo root. GitHub Pages serves
treatments.html at /treatments, so the old Wix addresses keep working with no redirects.
"""
import json, sys, html, pathlib, datetime, struct
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import art
from make_cloud_fields import cloud_field

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
PLACE_ID = "ChIJJVOw4haVwoARK0UW-MPNiMw"
PARKING = "Street parking on Glenoaks."
HOURS = "By appointment. Open times show in the booking calendar."
LATE_FEE = 95
NOTICE_HOURS = 24
GOOGLE_REVIEWS = "https://www.google.com/maps/place/?q=place_id:" + PLACE_ID   # the clinic's Google listing
MAPS = "https://www.google.com/maps/search/?api=1&query=" + "2116+N+Glenoaks+Blvd+Ste+3+Burbank+CA+91504" + "&query_place_id=" + PLACE_ID
# A place_id-only embed URL draws a world map unless you send a Maps API key.
# The street address geocodes in the keyless embed. The place_id stays on the Google Maps link.
MAP_EMBED = "https://maps.google.com/maps?q=2116+N+Glenoaks+Blvd+Ste+3,+Burbank,+CA+91504&ll=34.1929,-118.3247&z=16&hl=en&output=embed"
MAPS_APPLE = "https://maps.apple.com/?ll=34.1929,-118.3247&q=Full%20Lotus%20Health&address=2116%20N%20Glenoaks%20Blvd,%20Ste%203,%20Burbank,%20CA%2091504"

BOOK = CFG.get("booking_url", "").strip()
BOOKS = {k: v.strip() for k, v in CFG.get("booking_urls", {}).items() if v.strip()}   # per-service Google Calendar booking pages, by service slug
INTAKE = CFG.get("intake_url", "").strip()
GA_ID = CFG.get("ga_id", "").strip()   # Google Analytics 4 measurement ID (G-...); leave empty to turn analytics off. The clinic tools are built separately and never get it.
SKIN_INTAKE = CFG.get("skin_intake_url", "").strip()   # Skin Treatment Intake & Consent (Google Form), for the skin services below
SKIN_SLUGS = {"full-lotus-lift", "medical-microneedling-session", "facial-nano-needling"}
SIGNUP = CFG.get("signup_url", "").strip()   # optional: Apps Script web app that saves signup emails
TEASITS = CFG.get("teasits_url", "").strip() # optional: Apps Script web app for tea sit reservations (_src/teasits)
SLOTS = CFG.get("slots_url", "").strip()   # optional: static copy of the open times (written by Booking.gs to the "slots" branch); the booking page reads it first and falls back to BOOKAPI
BOOKAPI = (CFG.get("booking_api_url", "") or TEASITS).strip()   # optional: same web app also runs appointment booking (_src/booking); when set, /book/<service> is the on-site scheduler
CHAT = CFG.get("chat_url", "").strip()   # optional: Apps Script for typed questions the guided chat does not recognize (_src/chat). Empty means guided chat only.
missing = [k for k, v in (("booking_url or booking_urls", BOOK or BOOKS), ("intake_url", INTAKE)) if not v]
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
         meta="Medical microneedling in Burbank with custom serums and red light therapy. For fine lines, acne scars, texture, and thinning hair.",
         short="Collagen induction therapy with custom serums and red light therapy. For fine lines, acne scars, uneven texture, and thinning hair.",
         body=[
            ("p", "Medical microneedling in Burbank, performed by Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience."),
            ("p", "Microneedling, also called collagen induction therapy, uses fine, sterile, medical-grade needles to create tiny controlled channels in the skin. This prompts your skin's natural repair process, which builds new collagen over the following weeks."),
            ("h2", "What it can help with"),
            ("ul", ["Fine lines and wrinkles, including crow's feet", "Acne scarring", "Uneven texture and tone", "Enlarged pores", "Thinning hair along the hairline (scalp microneedling)"]),
            ("h2", "What makes it different here"),
            ("p", "Every session uses custom serums chosen for your skin, which absorb through the open channels during treatment. Red light therapy is included. Because your practitioner is trained in Chinese medicine, your skin is looked at as part of your whole health, not in isolation."),
            ("h2", "What to expect"),
            ("p", "Sessions are 90 minutes, and your first visit includes an intake and a treatment plan. A numbing cream is applied first, and most people find the treatment comfortable. Expect some redness afterward, similar to a mild sunburn, that usually settles within a day or two. Results build over time, and most people do a series of sessions spaced several weeks apart."),
            ("h2", "What patients say"),
            ("q", "The improvement seen in my crows feet as well as the overall tone and brightness of my skin is amazing! … The numbing cream is great and the whole procedure was completely painless.", "Stephany"),
            ("q", "I have also started microneedling for hair loss. After about 3 treatments, I have new tiny hairs growing around my hairline.", "Rosa"),
            ("h2", "Microneedling or nanoneedling?"),
            ("p", "Microneedling works deeper, for scarring, lines, and thinning hair. Nanoneedling is a gentler surface treatment for glow and hydration, with no downtime. Not sure which fits you? Book a session and we'll decide together, or text or email a question."),
         ], related=["facial-nano-needling", "full-lotus-lift"]),
    dict(slug="facial-nano-needling", name="Nanoneedling", wix_name="Facial Nano Needling",
         price=350, minutes=60, group="beauty",
         tagline="Unveil your skin's natural glow with advanced nano-infusion technology.",
         title="Nanoneedling Facial in Burbank, CA | Full Lotus Health",
         meta="Nanoneedling facial in Burbank with custom serums and red light therapy. A gentle, no-downtime treatment for glowing, hydrated skin.",
         short="A gentle surface treatment with custom serums and red light therapy. No downtime. For glow, hydration, and sensitive skin.",
         body=[
            ("p", "Nanoneedling facial in Burbank, performed by Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience."),
            ("p", "Nanoneedling is a gentle alternative to microneedling. It uses ultra-fine nano-tips that open microscopic channels in the very surface of the skin, without going deeper. Those channels let hyaluronic acid, vitamins, and custom serums absorb where your skin needs them."),
            ("h2", "What it can help with"),
            ("ul", ["Dull, dehydrated, or tired-looking skin", "Fine lines and uneven texture", "Sensitive skin that doesn't do well with stronger treatments", "A glow before an event", "Maintenance between microneedling sessions"]),
            ("h2", "What makes it different here"),
            ("p", "Every treatment uses custom serums chosen for your skin, and red light therapy is included. Because your practitioner is trained in Chinese medicine, your skin is looked at as part of your whole health, not in isolation."),
            ("h2", "What to expect"),
            ("p", "Sessions are 60 minutes. There's no downtime, so you can go straight back to your day. Skin often looks brighter right away and keeps improving over the following days. It works well on its own or as a regular series."),
            ("h2", "What patients say"),
            ("q", "When Roozbeh mentioned he added microneedling and nano needling services, I was interested but a little hesitant, not sure whether it would hurt or be effective. I took the plunge and am glad I did. … My skin feels smoother and firmer. (And neither hurt.)", "Rosa"),
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

# Services that can be booked on the site (the table in _src/booking/Booking.gs), checked against SERVICES so prices and lengths never drift.
APPT = {}
_OFFER_APPT = {}   # booking slugs that are not organic services (the ads prices). Checked against ADS_OFFERS below.
if BOOKAPI:
    import re as _rx
    _gs = (pathlib.Path(__file__).parent / "booking" / "Booking.gs").read_text()
    _m = _rx.search(r"/\*json\*/\s*(\{.*?\})\s*/\*end\*/", _gs, _rx.S)
    APPT = json.loads(_m.group(1)) if _m else {}
    for _slug, _a in APPT.items():
        _s = BY_SLUG.get(_slug)
        if not _s:
            _OFFER_APPT[_slug] = _a
            continue
        if _s["price"] != _a["price"] or _s["minutes"] != _a["minutes"]:
            sys.exit(f"_src/booking/Booking.gs does not match SERVICES for {_slug}: fix the price or minutes in one of them")
# One page per treatment: the old service page points search engines here (canonical) and drops out of the sitemap.
CANON_PAGE = {"medical-microneedling-session": "/microneedling-burbank"}
# Search only: these old service pages also point Google to their Burbank page, but the site's own links still open the
# service page, since it shows the fee. Move a treatment up to CANON_PAGE once its Burbank page shows its price.
SEARCH_CANON = {"facial-nano-needling": "/nanoneedling-burbank", "full-lotus-lift": "/cosmetic-acupuncture-burbank"}
# Visits the chat may deep-link to /book/<slug>. Tea ceremonies are text-only, on purpose.
BOOK_SLUGS = (
    "acupuncture-initial-treatment", "acupuncture-repeat-treatment",
    "medical-microneedling-session", "facial-nano-needling", "full-lotus-lift",
    "initial-consultation-online", "repeat-consultation-online",
)
for _slug in BOOK_SLUGS:
    if _slug not in BY_SLUG:
        sys.exit(f"BOOK_SLUGS has {_slug}, which is not in SERVICES")

# ------------------------------------------------------------------ Five Element Rejuvenation series
# First-pass copy. Roozbeh will rewrite the element text in his own words.
# A series costs less than five single sessions (microneedling $500 x 5 = $2,500, series $2,000;
# nanoneedling $350 x 5 = $1,750, series $1,400). State that package price. Never call a session free.
SERIES = "Five Element Rejuvenation™"
PACKAGES = {
    "medical-microneedling-session": dict(price=2000, guide="/microneedling-burbank"),
    "facial-nano-needling": dict(price=1400, guide="/nanoneedling-burbank"),
}
for _slug, _p in PACKAGES.items():
    _p["per"] = _p["price"] // 5
    _p["name"] = f'{SERIES} series: {BY_SLUG[_slug]["name"]}'


def series_save(slug):
    """Dollars below five single sessions. Zero or less means there is no savings line."""
    return BY_SLUG[slug]["price"] * 5 - PACKAGES[slug]["price"]


def _series_bit(slug, with_service):
    sessions = f'5 {BY_SLUG[slug]["name"].lower()} sessions' if with_service else "5 sessions"
    bit = f'{sessions} for ${PACKAGES[slug]["price"]:,}'
    save = series_save(slug)
    if save > 0:
        bit += f' (${save:,} less than five single sessions)'
    return bit


def series_offer(slug):
    """One service, for example 'Five Element Rejuvenation™ series: 5 sessions for $2,000 ($500 less than five single sessions)'."""
    return f'{SERIES} series: {_series_bit(slug, False)}'


def series_offers():
    """Every package, each service named, so a shared page never quotes the wrong price."""
    bits = [_series_bit(slug, True) for slug in PACKAGES]
    if len(bits) == 1:
        body = bits[0]
    elif len(bits) == 2:
        body = f"{bits[0]}, or {bits[1]}"
    else:
        body = ", ".join(bits[:-1]) + f", or {bits[-1]}"
    return f"{SERIES} series: {body}"


# ------------------------------------------------------------------ acupuncture package
# 5 follow-up (repeat) visits for $500. Patients book the first visit online; the rest are booked together after it. State the package price. Never call a visit free.
ACU_PACK_SLUG = "acupuncture-repeat-treatment"
ACU_PACK = dict(name="Acupuncture 5-visit package", price=500, visits=5)
ACU_PACK["per"] = ACU_PACK["price"] // ACU_PACK["visits"]
ACU_PACK_HOW = "Book your first visit online, and we will book the rest together after your first appointment."


def acu_pack_line():
    """For example 'Acupuncture 5-visit package: 5 follow-up visits for $500 ($100 less than five single visits)'."""
    single = BY_SLUG[ACU_PACK_SLUG]["price"]
    line = f'{ACU_PACK["name"]}: {ACU_PACK["visits"]} follow-up visits for ${ACU_PACK["price"]:,}'
    save = single * ACU_PACK["visits"] - ACU_PACK["price"]
    if save > 0:
        line += f' (${save:,} less than five single visits)'
    return line

TESTIMONIALS_HOME = [
    ("Finding Roozbeh was like finding a rare and precious treasure. His insight and knowledge never ceases to amaze me and every treatment I have had from him over the past 5 years has felt in tune with what I needed at the time. His skillful application of needles means that even if in pain or sick, I can go to him for help and feel confident that he will be kind and gentle in his endeavor to help me feel better. After treatment I often stay for tea and meditation in the purpose built tea lounge… all in all Full Lotus Health is wonderful experience for body and mind and spirit.", "Sue"),
    ("Roozbeh brings together tea, acupuncture and TCM for a holistic healing experience. I've been doing tea and acupuncture with him for some time now and thoroughly enjoy his company. He is well versed in tea with many years of experience making the combination with his traditional Chinese medicine expertise truly rich and edifying. Roozbeh's passion for the healing arts and care for his clients is genuinely something I admire. There are few people here in California with the combination of expertise that he has and I consider myself fortunate to know him!", "Amelia"),
    ("I've been a patient of Rooz's for 8 years now, and it's been life changing. He helped me overcome illness and has kept me healthy since. He's kind, patient and truly cares about his patients.", "Marissa"),
    ("Roozbeh is the best. Great knowledge, great tea, great acupuncture, great company. I always feel so much better and more grounded leaving his place than I did before I entered. Can't recommend it enough.", "Marcus"),
    ("I have been a patient here for 5 years and I can't speak highly enough about what it's done for me and my life. Leaving here I feel rejuvenated and aligned. The wisdom and intuition that Roozbeh brings into his practice is one of a kind. He addresses issues methodically. His tea space also offers a place to ground and let go for the moment. I always leave with a full cup of abundant health. Thank you Roozbeh!", "Iman"),
]
TESTIMONIALS_BEAUTY = [
    ("I highly recommend Roozbeh for micro needling. The improvement seen in my crows feet as well as the overall tone and brightness of my skin is amazing! Way better than any of the numerous creams and peels I have tried over the years. The numbing cream is great and the whole procedure was completely painless.", "Stephany"),
    ("When Roozbeh mentioned he added microneedling and nano needling services, I was interested but a little hesitant, not sure whether it would hurt or be effective. I took the plunge and am glad I did. The very large bags under my eyes (they are called festoons by doctors) have diminished quite a bit and my skin feels smoother and firmer. (And neither hurt.) I have also started microneedling for hair loss. After about 3 treatments, I have new tiny hairs growing around my hairline and am looking forward to seeing what a few more treatments will do.", "Rosa"),
    ("Rooz is also incredibly easy to talk to. Very down-to-earth, thoughtful, and never rushed. The whole experience is calm and comfortable, and I genuinely look forward to my appointments. He's also started offering microneedling for hair regrowth, which I've been doing, and the results have been very encouraging to say the least. Overall, it's just consistently good care from someone who clearly knows what he's doing and actually cares about the people he's working with. I'm really grateful I found him.", "Chris"),
]

NAV = [
    ("/", "Home"),
    ("Natural beauty", [
        ("/treatments", "All beauty treatments"),
        ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture"),
        ("/microneedling-burbank", "Microneedling"),
        ("/nanoneedling-burbank", "Nanoneedling"),
        ("/five-element-rejuvenation", "Five Element Rejuvenation"),
        ("/skin-conditions-burbank", "Skin conditions"),
    ]),
    ("/acupuncture", "Acupuncture & herbs"),
    ("Tea", [
        ("/tea-ceremonies", "Tea ceremonies"),
        ("/tea-sits", "Weekly tea sits"),
    ]),
    ("/blog", "Blog"),
    ("/new-patients", "New patients"),
]
# Groups (a label plus a list of links) open as an accordion in the phone menu
# and as a small drop-down panel on desktop. Built on <details>, so they work
# with a keyboard and screen readers, and without JavaScript.
NAV_MENU_ONLY = {"/blog"}


# ------------------------------------------------------------------ structured data
def money(n):
    return f"{n:.2f}"


def person_ld():
    """The practitioner: license, board certification and education, so search engines and AI tools can verify him."""
    return {
        "@type": "Person",
        "@id": f"{SITE}/#roozbeh",
        "name": "Roozbeh Ghobadpour",
        "honorificSuffix": "L.Ac.",
        "jobTitle": "Licensed Acupuncturist (L.Ac.)",
        "description": "Licensed acupuncturist in Burbank, CA with over 10 years of clinical experience in Chinese medicine, focused on skin and cosmetic treatments. Head Chinese Medicine Writer for Global Tea Hut magazine.",
        "worksFor": {"@id": f"{SITE}/#business"},
        "alumniOf": [{"@type": "CollegeOrUniversity", "name": "Yo San University"},
                     {"@type": "CollegeOrUniversity", "name": "University of California, Los Angeles"}],
        "hasCredential": [
            {"@type": "EducationalOccupationalCredential", "credentialCategory": "license",
             "name": "Licensed Acupuncturist, California Acupuncture Board, license #17220",
             "recognizedBy": {"@type": "Organization", "name": "California Acupuncture Board"}},
            {"@type": "EducationalOccupationalCredential", "credentialCategory": "certification",
             "name": "NCCAOM Board-Certified Diplomate, ID #848037",
             "recognizedBy": {"@type": "Organization", "name": "NCCAOM"}},
            {"@type": "EducationalOccupationalCredential", "credentialCategory": "degree",
             "name": "M.A., Traditional Chinese Medicine, Yo San University (2015)"},
        ],
        "knowsAbout": ["Acupuncture", "Chinese herbal medicine", "Chinese medicine dermatology", "Microneedling",
                       "Nanoneedling", "Cosmetic acupuncture", "Chinese tea"],
    }


def business_ld():
    offers = []
    for s in SERVICES:
        offers.append({
            "@type": "Offer",
            "itemOffered": {"@type": "Service", "name": s["name"], "url": f"{SITE}/service-page/{s['slug']}"},
        })
    return {
        "@context": "https://schema.org",
        "@type": ["MedicalClinic", "HealthAndBeautyBusiness", "LocalBusiness"],
        "@id": f"{SITE}/#business",
        "name": NAME,
        "url": SITE + "/",
        "slogan": "The calmest hour of your week.",
        "foundingDate": "2016-10",
        "description": "Acupuncture and Chinese herbal medicine clinic in Burbank, CA, run by one licensed acupuncturist and focused on skin: microneedling, nanoneedling, and cosmetic acupuncture. Also offers acupuncture, herbal medicine, cupping, moxibustion, and tea ceremony.",
        "sameAs": [GOOGLE_REVIEWS],
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
        "founder": person_ld(),
        "employee": {"@id": f"{SITE}/#roozbeh"},
        "knowsAbout": ["Cosmetic acupuncture", "Microneedling", "Nanoneedling", "Acupuncture", "Chinese herbal medicine", "Chinese medicine for skin conditions", "Cupping", "Moxibustion", "Chinese tea ceremony"],
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
        d["offers"] = {"@type": "Offer", "price": money(s["price"]), "priceCurrency": "USD", "url": BOOKS.get(s.get("slug")) or BOOK or f"{SITE}/book-online"}
        pk = PACKAGES.get(s.get("slug"))
        if pk:
            d["offers"] = [d["offers"], {"@type": "Offer", "name": pk["name"] + " (5 sessions)", "price": money(pk["price"]),
                                         "priceCurrency": "USD", "url": BOOKS.get(s.get("slug")) or BOOK or f"{SITE}/book-online"}]
        if s.get("slug") == ACU_PACK_SLUG:
            d["offers"] = [d["offers"], {"@type": "Offer", "name": ACU_PACK["name"], "price": money(ACU_PACK["price"]),
                                         "priceCurrency": "USD", "url": f"{SITE}/book/{ACU_PACK_SLUG}"}]
    return d


def breadcrumb_ld(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(trail)]}


# ------------------------------------------------------------------ layout
BOOK_HERE = None   # a treatment's slug while its guide page is built, so that page's Book buttons book that treatment


def book_btn(label="Book", cls="", small=False, slug=None, direct=False, site_wide=False):
    c = "btn " + ("small " if small else "") + cls
    if slug is None and BOOK_HERE and not site_wide:
        slug = BOOK_HERE
    if slug and (slug in BOOKS or slug in APPT) and not direct:   # first the confirm step, where the fee is easy to read
        return f'<a class="{c.strip()}" href="/book/{slug}">{e(label)}</a>'
    if slug and slug in BOOKS:
        return f'<a class="{c.strip()}" href="{e(BOOKS[slug])}" rel="noopener">{e(label)}</a>'
    if slug and BOOKS and slug not in BOOKS:   # no online calendar for this one: text to book
        return f'<a class="{c.strip()}" href="sms:{PHONE_TEL}">Text to book</a>'
    rel = ' rel="noopener"' if BOOK_EXTERNAL else ""
    return f'<a class="{c.strip()}" href="{e(BOOK_HREF)}"{rel}>{e(label)}</a>'


OG_IMAGE = f"{SITE}/assets/og-share.jpg"
OG_ALT = "A quiet tea table at Full Lotus Health, an acupuncture and skin clinic in Burbank, CA"


def service_book(s):
    """Where the chat sends someone who is ready to book this service."""
    if s["group"] == "tea":
        return f"sms:{PHONE_TEL}", "Text to book"
    if s["slug"] in BOOK_SLUGS and (s["slug"] in BOOKS or s["slug"] in APPT):
        return f"/book/{s['slug']}", "Book " + s["name"]
    return "/book-online", "Book online"


def map_embed():
    return (
        f'<figure class="visit-map"><iframe title="Map of {e(NAME)}, {e(ADDR_LINE)}" '
        f'width="400" height="256" loading="lazy" referrerpolicy="no-referrer-when-downgrade" '
        f'src="{e(MAP_EMBED)}"></iframe></figure>'
    )


def map_links():
    return (
        f'<p class="visit-links"><a href="{e(MAPS)}" rel="noopener">Open in Google Maps</a>'
        f'<a href="{e(MAPS_APPLE)}" rel="noopener">Open in Apple Maps</a></p>'
    )


def visit_section(heading_id="visit-h"):
    """Address, parking, hours, and the map. Used where the location is the point of the section."""
    return f"""<section class="visit" aria-labelledby="{heading_id}"><div class="wrap split">
  <div>
    <p class="eyebrow">Visit</p>
    <h2 id="{heading_id}">The clinic</h2>
    <p>Roozbeh Ghobadpour, L.Ac.<br>{e(ADDR["street"])}<br>{e(ADDR["city"])}, {e(ADDR["region"])} {e(ADDR["zip"])}</p>
    <p>{e(PARKING)}</p>
    <p>{e(HOURS)}</p>
    {contact_block()}
    {map_links()}
  </div>
  <div>{map_embed()}</div>
</div></section>"""


def chat_widget():
    return f"""<div class="flh-chat" id="flh-chat" data-endpoint="{e(CHAT)}">
  <button type="button" class="flh-chat-launch" aria-expanded="false" aria-controls="flh-chat-panel" aria-label="Ask the virtual assistant">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.2a1.5 1.5 0 0 1-1.5 1.5H10l-4.2 3.1a.6.6 0 0 1-.9-.5v-2.6H5A1.5 1.5 0 0 1 3.5 15.2V7A1.5 1.5 0 0 1 5 5.5z"/></svg>
    <span>Ask</span>
  </button>
  <div id="flh-chat-panel" class="flh-chat-panel" role="dialog" aria-modal="false" aria-labelledby="flh-chat-title" hidden>
    <div class="band" aria-hidden="true"></div>
    <div class="flh-chat-head">
      <p class="eyebrow" id="flh-chat-title">Virtual assistant</p>
      <button type="button" class="flh-chat-close">Close</button>
    </div>
    <p class="flh-chat-note">Please don't share health details here. This assistant can't give medical advice.</p>
    <div class="flh-chat-log" role="log" aria-live="polite" aria-relevant="additions"></div>
    <form class="flh-chat-form">
      <label class="sr" for="flh-chat-q">Your question</label>
      <input id="flh-chat-q" class="flh-chat-input" maxlength="400" autocomplete="off" placeholder="Ask about fees, parking, booking">
      <button class="btn small" type="submit">Send</button>
    </form>
    <p class="flh-chat-fail" hidden>The assistant couldn't load. Text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  </div>
</div>
<script src="/assets/chat.js" defer></script>"""


def booking_head(slug):
    """Start the open-times request before fonts and CSS, and remember a recent answer for the next visit.
    The saved file on GitHub is tried first (fast, no Apps Script); the Apps Script answer is the fallback."""
    if not BOOKAPI:
        return ""
    boot = json.dumps({
        "endpoint": BOOKAPI,
        "slots": SLOTS,
        "slug": slug,
        "key": "fl-appt-slots-v1:" + slug,
        "ttl": 180000,
        "maxAge": 5400000,   # the saved file is rewritten at least hourly; older than 90 minutes means the refresh stopped, so ask the calendar
    }, separators=(",", ":")).replace("<", "\\u003c")
    hosts = ""
    if SLOTS:
        origin = "/".join(SLOTS.split("/")[:3])
        hosts = f'<link rel="preconnect" href="{e(origin)}" crossorigin>\n'
    return hosts + """<link rel="dns-prefetch" href="https://script.google.com">
<link rel="dns-prefetch" href="https://script.googleusercontent.com">
<link rel="preconnect" href="https://script.google.com">
<link rel="preconnect" href="https://script.googleusercontent.com" crossorigin>
<script>
(function () {
  var boot = __BOOT__;
  window.__flAppt = { slug: boot.slug, cache: null, pending: null };
  try {
    var raw = localStorage.getItem(boot.key);
    if (raw) {
      var c = JSON.parse(raw);
      if (c && c.t && (Date.now() - c.t) < boot.ttl && c.data && c.data.days && c.data.days.length && c.data.service && c.data.service.slug === boot.slug && !c.data.partial)
        window.__flAppt.cache = c.data;
    }
  } catch (e) {}
  function live() {
    return fetch(boot.endpoint + "?action=appt_slots&service=" + encodeURIComponent(boot.slug) + "&span=soon", { redirect: "follow", cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function saved() {
    if (!boot.slots) return Promise.reject(new Error("off"));
    return fetch(boot.slots, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("none"); return r.json(); }).then(function (f) {
      var p = f && f.services && f.services[boot.slug], age = Date.now() - ((f && f.generated) || 0);
      if (!p || !p.days || !p.days.length || p.partial || age < -300000 || age > boot.maxAge) throw new Error("stale");
      return p;
    });
  }
  window.__flAppt.pending = saved().catch(live);
})();
</script>
""".replace("__BOOT__", boot)


def teasits_head():
    """Tea sits page: connect to Google and ask for the schedule while the rest of the page loads (same idea as booking_head)."""
    boot = json.dumps({"endpoint": TEASITS, "slots": SLOTS, "key": "fl-teasits-v1", "ttl": 180000, "maxAge": 5400000}, separators=(",", ":")).replace("<", "\\u003c")
    hosts = ""
    if SLOTS:
        origin = "/".join(SLOTS.split("/")[:3])
        hosts = f'<link rel="preconnect" href="{e(origin)}" crossorigin>\n'
    return hosts + """<link rel="dns-prefetch" href="https://script.google.com">
<link rel="dns-prefetch" href="https://script.googleusercontent.com">
<link rel="preconnect" href="https://script.google.com">
<link rel="preconnect" href="https://script.googleusercontent.com" crossorigin>
<script>
(function () {
  var boot = __BOOT__;
  window.__flTea = { cache: null, pending: null };
  try {
    var raw = localStorage.getItem(boot.key);
    if (raw) {
      var c = JSON.parse(raw);
      if (c && c.t && (Date.now() - c.t) < boot.ttl && c.sits && c.sits.length) window.__flTea.cache = c.sits;
    }
  } catch (e) {}
  if (/[?&](paid|cancelled)=/.test(location.search)) return;
  // The saved copy on GitHub (refreshed every 5 minutes by Booking.gs) answers in a fraction of a second; Apps Script is the fallback.
  function live() { return fetch(boot.endpoint, { redirect: "follow", cache: "no-store" }).then(function (r) { return r.json(); }); }
  function saved() {
    if (!boot.slots) return Promise.reject(new Error("off"));
    return fetch(boot.slots, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("none"); return r.json(); }).then(function (f) {
      var age = Date.now() - ((f && f.generated) || 0);
      if (!f || !f.teasits || age < -300000 || age > boot.maxAge) throw new Error("stale");
      return { sits: f.teasits, saved: true };
    });
  }
  window.__flTea.pending = saved().catch(live);
})();
</script>
""".replace("__BOOT__", boot)


def ads_click_script():
    """Book and text clicks on the ads landing page. gtag is a no-op when GA4 is not configured."""
    return """<script>
(function () {
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var name = href.indexOf("/book/") === 0 ? "book_click" : (href.indexOf("sms:") === 0 ? "sms_click" : "");
    if (!name) return;
    var params = { link_url: href, link_text: (a.textContent || "").replace(/\\s+/g, " ").trim() };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, link_url: params.link_url, link_text: params.link_text });
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  });
})();
</script>
"""


def ga_tag():
    """Google Analytics 4. The Stripe return codes (?paid=, ?cancelled=) are left out of the page address it records."""
    if not GA_ID:
        return ""
    return f"""<script async src="https://www.googletagmanager.com/gtag/js?id={e(GA_ID)}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){{dataLayer.push(arguments);}}
gtag('js', new Date());
var gaUrl = new URL(location.href); gaUrl.searchParams.delete('paid'); gaUrl.searchParams.delete('cancelled');
gtag('config', '{e(GA_ID)}', {{ page_location: gaUrl.href }});
</script>
"""


def page(path, title, meta, main, ld=None, current=None, noindex=False, og_type="website", og_image=None, focus=False, canonical=None, book_slug=None, footer_map=True, head_extra="", chrome=None):
    canon = canonical or (SITE + (path if path != "/" else "/"))
    current = current or path   # pages that don't name a menu item still light up their own link
    nav_items = []
    for href, label in NAV:
        if isinstance(label, list):   # a group: accordion on phones, drop-down on desktop
            here = any(current == h for h, _ in label)
            links = "".join(
                f'<li><a href="{h}"{" aria-current=\"page\"" if current == h else ""}>{e(t)}</a></li>' for h, t in label)
            nav_items.append(
                f'<li class="nav-group"><details name="nav-group"><summary{" class=\"is-current\"" if here else ""}>{e(href)}</summary>'
                f'<ul>{links}</ul></details></li>')
            continue
        cur = ' aria-current="page"' if (current == href) else ""
        if href == "/new-patients" and INTAKE:   # first-time patients go straight to the form
            nav_items.append(f'<li><a href="{e(INTAKE)}" rel="noopener">New patient form</a></li>')
            continue
        li = ' class="nav-menu-only"' if href in NAV_MENU_ONLY else ""
        nav_items.append(f'<li{li}><a href="{href}"{cur}>{e(label)}</a></li>')
    if focus:   # email landing page: no menu to wander off into
        nav_items = []
    nav_items.append(f'<li><a class="tel" href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>')
    nav_items.append(f'<li>{book_btn("Book", small=True, site_wide=True)}</li>')
    sticky = "" if (focus or path in ("/book-online", "/new-patients") or path.startswith("/book/")) else \
        f'<div class="sticky-cta">{book_btn("Book", small=True, slug=book_slug)}<a class="btn ghost small" href="sms:{PHONE_TEL}">Text us</a></div>'
    body_cls = ' class="has-sticky"' if sticky else ""
    ads = chrome == "ads"
    nav_script = '<script src="/assets/nav.js" defer></script>\n'
    foot_brand = f'<a href="/" aria-label="{NAME}, home"><img class="foot-seal" src="/assets/logo-seal-168.png" width="84" height="84" alt="" loading="lazy"></a>'
    end_script = ""
    if ads:
        # Ads landing page: logo back to the top of this page, one book button, no site menu.
        sticky = (f'<div class="sticky-cta">{book_btn("Book Online", small=True, slug=book_slug)}'
                  f'<a class="btn ghost small" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a></div>')
        body_cls = ' id="top" class="ads-lp has-sticky"'
        nav_script = ""
        foot_brand = ""
        end_script = ads_click_script()
        header_html = f"""<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="#top" aria-label="{NAME}">
      <img src="/assets/logo-horizontal.svg" width="260" height="78" alt="{NAME}">
    </a>
    {book_btn("Book Microneedling", cls="ads-nav-book", slug=book_slug)}
  </div>
</header>"""
    else:
        header_html = f"""<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="{NAME}, home">
      <img src="/assets/logo-horizontal.svg" width="260" height="78" alt="{NAME}">
    </a>
    <input type="checkbox" id="menu-check" class="menu-check" aria-label="Open menu">
    {book_btn("Book", cls="call-mobile", small=True, site_wide=True)}
    <label for="menu-check" class="menu-toggle">Menu</label>
    <nav class="nav" aria-label="Main">
      <ul>
        {"".join(nav_items)}
      </ul>
    </nav>
  </div>
</header>"""
    loc_extra = f"<p>{e(PARKING)}</p><p>{e(HOURS)}</p>" + (map_embed() if footer_map else "") + map_links()
    ld_blocks = "".join(f'<script type="application/ld+json">{json.dumps(x, separators=(",", ":"))}</script>\n' for x in (ld or []))
    feed_link = f'<link rel="alternate" type="application/rss+xml" title="{NAME} blog" href="/feed.xml">\n' if POSTS else ""
    robots = ('<meta name="robots" content="noindex, follow">\n' if noindex
              else '<meta name="robots" content="index, follow, max-image-preview:large">\n')
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{ga_tag()}<title>{e(title)}</title>
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
{head_extra}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
{nav_script}{feed_link}{ld_blocks}</head>
<body{body_cls}>
<a class="skip" href="#main">Skip to content</a>
<div class="band" aria-hidden="true"></div>
{header_html}
<main id="main">
{main}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        {foot_brand}
        <p>Roozbeh Ghobadpour, L.Ac.<br>{ADDR["street"]}<br>{ADDR["city"]}, {ADDR["region"]} {ADDR["zip"]}</p>
        {loc_extra}
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
          <li><a href="/acupuncture">Acupuncture &amp; herbal medicine</a></li>
          <li><a href="/tea-ceremonies">Tea ceremonies</a></li>
          <li><a href="/new-patients">New patients</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/book-online">Book online</a></li>
        </ul>
      </div>
    </div>
    <p class="legal">{NAME}</p>
  </div>
</footer>
{chat_widget()}
{sticky}
{end_script}</body>
</html>
"""


def hero(title, lede, crumbs=None, tone="c", cta_html="", cls="", deco=""):
    cr = ""
    if crumbs:
        cr = '<p class="crumbs">' + " / ".join(f'<a href="{h}">{e(n)}</a>' for n, h in crumbs) + "</p>"
    return f'<div class="hero-band tone-{tone}{(" " + cls) if cls else ""}"><div class="wrap page-hero">{cr}<div class="band short" aria-hidden="true"></div><h1>{title}</h1><p class="lede">{lede}</p>{("<p class=\"g-actions\">" + cta_html + "</p>") if cta_html else ""}</div>{deco}</div>'


def rating_strip():
    return f'<section class="rating-strip" aria-label="Google reviews"><div class="wrap"><p class="pb-rating"><span class="stars" role="img" aria-label="Rated 5.0 out of 5">{STAR * 5}</span><a href="{GOOGLE_REVIEWS}" rel="noopener">5.0 on Google &middot; 40+ reviews</a></p></div></section>'


def contact_block():
    return f"""<ul class="contact-lines">
<li>Call <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
<li>Text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
<li>Email <a href="mailto:{EMAIL}">{EMAIL}</a></li>
</ul>"""


def cta(heading, text, label="Book a visit", extra="", tone="", slug=None):
    return f"""<section class="cta {tone}"><div class="wrap">
<h2>{heading}</h2><p>{text}</p>
<p style="display:flex;gap:.9rem;flex-wrap:wrap;margin-top:1.4rem">{book_btn(label, slug=slug)} <a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>{extra}</p>
</div></section>"""


def quotes(items):
    out = []
    for text, who in items:
        out.append(f'<blockquote><p>{e(text)}</p><cite>{e(who)}</cite></blockquote>')
    return '<div class="quotes">' + "".join(out) + "</div>"


import os as _os
def photo(name, alt, lazy=True):
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
            return f'<figure class="photo"><img src="/assets/photos/{name}.{ext}"{srcset(name)} alt="{e(alt)}"{dims}{' loading="lazy"' if lazy else ''}></figure>'
    return ""


def srcset(name, sizes="(min-width: 52rem) 45vw, 100vw"):
    """Smaller WebP copies made by _src/make_images.py, so phones don't download the full-size JPG."""
    root = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "assets", "photos")
    sub, base = _os.path.split(name)   # "elements/wood" lives in assets/photos/elements
    found = []
    for fn in _os.listdir(_os.path.join(root, sub)):
        stem, ext = _os.path.splitext(fn)
        if ext == ".webp" and stem.startswith(base + "-") and stem[len(base) + 1:].isdigit():
            found.append(int(stem[len(base) + 1:]))
    if not found:
        return ""
    return ' srcset="' + ", ".join(f"/assets/photos/{name}-{w}.webp {w}w" for w in sorted(found)) + f'" sizes="{sizes}"'


def _webp_size(path):
    """Width and height from a WebP header. VP8, VP8L, and VP8X."""
    data = open(path, "rb").read(30)
    if data[0:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    fmt = data[12:16]
    if fmt == b"VP8 ":
        w, h = struct.unpack_from("<HH", data, 26)
        return w & 0x3FFF, h & 0x3FFF
    if fmt == b"VP8L":
        b0, b1, b2, b3 = data[21:25]
        return 1 + (((b1 & 0x3F) << 8) | b0), 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
    if fmt == b"VP8X":
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
    return None


def webp_figure(name, alt, lazy=True, sizes="(min-width: 52rem) 46vw, 100vw", priority=False):
    """A content photo as WebP only: compressed variants from make_images.py, with width and height set."""
    root = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "assets", "photos")
    folder = _os.path.join(root, _os.path.dirname(name))
    base = _os.path.basename(name)
    widths = []
    if _os.path.isdir(folder):
        for fn in _os.listdir(folder):
            stem, ext = _os.path.splitext(fn)
            if ext == ".webp" and stem.startswith(base + "-") and stem[len(base) + 1:].isdigit():
                widths.append(int(stem[len(base) + 1:]))
    widths = sorted(set(widths))
    if not widths:
        return "", ""
    largest = widths[-1]
    dims = _webp_size(_os.path.join(root, f"{name}-{largest}.webp")) or (largest, largest)
    src_w = 1024 if 1024 in widths else largest
    src = f"/assets/photos/{name}-{src_w}.webp"
    srcset = ", ".join(f"/assets/photos/{name}-{n}.webp {n}w" for n in widths)
    extra = ' fetchpriority="high"' if priority else ' loading="lazy" decoding="async"'
    img = (f'<img src="{src}" srcset="{srcset}" sizes="{sizes}" alt="{e(alt)}" '
           f'width="{dims[0]}" height="{dims[1]}"{extra}>')
    fig = f'<figure class="photo">{img}</figure>'
    preload = ""
    if priority:
        preload = f'<link rel="preload" as="image" href="{src}" imagesrcset="{srcset}" imagesizes="{sizes}">\n'
    return fig, preload




def rate_item(slug, desc=None):
    s = BY_SLUG[slug]
    meta = f'<span class="meta">{s["minutes"]} min</span>' if s["minutes"] else ""
    return f'<li><span class="name"><a href="{CANON_PAGE.get(slug, "/service-page/" + slug)}">{e(s["name"])}</a>{meta}</span><p class="desc">{e(desc or s["short"])}</p></li>'


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
        tags = [t.strip() for t in meta.get("tags", "").split(",") if t.strip()]
        posts.append(dict(slug=slug, title=meta["title"], desc=meta["description"], date=meta["date"],
                          tags=tags, image=meta.get("image", ""), alt=meta.get("image_alt", ""), body=body,
                          minutes=max(1, round(words / 220))))
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


POSTS = load_posts()


def pretty_date(iso):
    d = datetime.date.fromisoformat(iso)
    return d.strftime("%B ") + str(d.day) + d.strftime(", %Y")


OUT = {}


# ------------------------------------------------------------------ pages
# ------------------------------------------------------------------ homepage
HOME_QUOTES = [
    ("Roozbeh is the best. Great knowledge, great tea, great acupuncture, great company. I always feel so much better and more grounded leaving his place than I did before I entered. Can't recommend it enough.", "Marcus"),
    ("I've been a patient of Rooz's for 8 years now, and it's been life changing. He helped me overcome illness and has kept me healthy since. He's kind, patient and truly cares about his patients.", "Marissa"),
    ("I highly recommend Roozbeh for micro needling. The improvement seen in my crows feet as well as the overall tone and brightness of my skin is amazing!", "Stephany"),
]

# (heading, hub page, one line, [(link text, href)])
HOME_WAYS = [
    ("Acupuncture and Herbal Medicine", "/acupuncture",
     "For pain, stress, sleep and digestion, with herbal formulas when they help. Herbal consultations also run online.",
     [("What we treat", "/acupuncture#what-we-treat"), ("In person or online", "/acupuncture#visits"), ("Herbal medicine", "/acupuncture#herbal-medicine")]),
    ("Tea Ceremony: Medicine for the Mind", "/tea-ceremonies",
     "In Chinese medicine, tea is the premier herb for calming and energizing the mind. Gong fu and bowl tea ceremonies in the tradition of Wu De.",
     [("Gong fu ceremony", "/service-page/gong-fu-tea-ceremony"), ("Bowl ceremony", "/service-page/bowl-tea-ceremony"),
      ("Private ceremony", "/service-page/private-gong-fu-tea-ceremony")]),
    ("Facial and Hair Rejuvenation", "/treatments",
     "Microneedling, nanoneedling and cosmetic acupuncture, with custom serums and red light therapy. Scalp microneedling for thinning hair.",
     [("Microneedling", "/microneedling-burbank"), ("Nanoneedling", "/nanoneedling-burbank"),
      ("Cosmetic acupuncture", "/cosmetic-acupuncture-burbank")]),
    ("Chinese Medicine Dermatology", "/skin-conditions-burbank",
     "Herbal medicine and acupuncture for acne, eczema, psoriasis, rosacea and other skin conditions, treating the pattern underneath, not just the rash.",
     [("Skin conditions", "/skin-conditions-burbank"), ("Online consultation", "/service-page/initial-consultation-online")]),
]


def signup_band(source):
    """Newsletter signup. Saves the email address and which page it came from, nothing else."""
    if LAUNCH and not SIGNUP:
        return ""
    demo = "" if SIGNUP else " data-demo"
    action = e(SIGNUP) if SIGNUP else "#"
    return f"""<section class="signup-band" aria-labelledby="signup-h"><div class="wrap signup-row">
  <div>
    <h2 id="signup-h">Newsletter</h2>
    <p>Keep up to date with the latest at Full Lotus Health, including tea sits, health advice, community events, and special offers. Unsubscribe anytime.</p>
  </div>
  <form class="signup" id="signup" method="post" action="{action}"{demo}>
    <div class="grow"><label for="signup-email" class="sr">Email address</label>
      <input id="signup-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required maxlength="254">
      <button class="btn" type="submit">Sign up</button></div>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <input type="hidden" name="source" value="{source}">
    <p class="gmsg" role="status" aria-live="polite"></p>
  </form>
</div>
<script src="/assets/signup.js" defer></script></section>"""


def home():
    ways = []
    for title, hub, line, links in HOME_WAYS:
        ls = "".join(f'<li><a href="{h}">{e(t)}</a></li>' for t, h in links)
        ways.append(f'<div class="path"><h3><a href="{hub}">{e(title)}</a></h3><p>{e(line)}</p><ul class="way-links">{ls}</ul></div>')
    quotes_html = "".join(f'<blockquote><p>{e(t)}</p><cite>{e(w)}</cite></blockquote>' for t, w in HOME_QUOTES)
    main = f"""
<section class="home-hero" aria-labelledby="home-h1">
  <div class="hh-grid">
    <figure class="hh-photo"><img src="/assets/photos/hero.jpg"{srcset("hero", "(min-width: 56rem) 58vw, 100vw")} width="1504" height="1128" alt="The tea room at Full Lotus Health: tatami mats, a low tea table set for tea, floor cushions, lantern lamps and a Buddhist thangka on the wall" fetchpriority="high"></figure>
    <div class="hh-panel">
      <div class="band" aria-hidden="true"></div>
      <p class="eyebrow">Full Lotus Health &middot; Burbank</p>
      <h1 id="home-h1">The calmest hour of your week</h1>
      <p class="lede">Acupuncture and skin treatments in Burbank: unhurried visits with one licensed acupuncturist, often ending with tea.</p>
      <div class="actions">{book_btn("Book a visit")}<a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a></div>
    </div>
  </div>
</section>

<section class="proof-bar" aria-label="What patients say about Full Lotus Health"><div class="wrap">
  <p class="pb-line">Trusted by hundreds of patients since 2016</p>
  <p class="pb-rating"><span class="stars" role="img" aria-label="Rated 5.0 out of 5"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg></span><a href="{GOOGLE_REVIEWS}" rel="noopener">5.0 on Google &middot; 40+ reviews</a></p>
</div></section>

<section class="sand" aria-labelledby="ways-h"><div class="wrap">
  <p class="eyebrow">Where to start</p>
  <h2 id="ways-h">Four ways in</h2>
  <div class="paths four ways">{"".join(ways)}</div>
</div></section>

<section class="series-feature" aria-labelledby="sf-h"><div class="wrap sf-grid">
  <div><p class="eyebrow">New: Full Lotus Skin</p><h2 id="sf-h">{e(SERIES)}</h2>
  <p>A journey of rejuvenation through the five elements of Chinese medicine: five sessions, each led by one element, with red light therapy included. {e(series_offers())}.</p>
  <p class="g-actions"><a class="btn" href="/five-element-rejuvenation">Explore the journey</a><a class="btn ghost" href="sms:{PHONE_TEL}">Text a question</a></p></div>
  <div class="el-dots" aria-hidden="true">{"".join(f'<img src="/assets/photos/elements/{k}.jpg"{srcset("elements/" + k, "10rem")} alt="" width="300" height="300" loading="lazy">' for k in ("wood", "fire", "earth", "metal", "water"))}</div>
</div></section>

<section class="wash-g" aria-labelledby="reviews-h"><div class="wrap">
  <p class="eyebrow">Reviews</p>
  <h2 id="reviews-h">What patients say</h2>
  <div class="quotes three">{quotes_html}</div>
  
</div></section>

<section class="deep-l" aria-labelledby="meet-h"><div class="wrap split">
  <div class="meet-photo">{photo("roozbeh-portrait", "Roozbeh Ghobadpour, L.Ac., in the clinic")}</div>
  <div>
    <p class="eyebrow">Your practitioner</p>
    <h2 id="meet-h">Meet Roozbeh</h2>
    <p>Hi, I'm Roozbeh. I've been a licensed acupuncturist and practitioner of Traditional Chinese Medicine since 2015, and I opened Full Lotus Health in 2016. Many of the ways I look at the body were shaped by obstacles in my own health.</p>
    <p>This is where I bring everything I've learned to the local community, from acupuncture and herbal medicine to tea ceremony and natural skin treatments. It is my sincere wish that everyone who comes here leaves a happier person.</p>
    <p class="creds">L.Ac., California license 17220 &middot; NCCAOM Board-Certified Diplomate &middot; M.A. in Traditional Chinese Medicine, Yo San University</p>
  </div>
</div></section>

{signup_band("home")}

{visit_section()}

{cta("Ready to feel like yourself again?", "Book online, or text us a question. New patients, please fill out the intake form before your first visit.", "Book now")}
"""
    OUT["index.html"] = page("/", "Acupuncture, Microneedling & Tea in Burbank | Full Lotus Health",
        "Natural skin treatments in Burbank, CA: microneedling, nanoneedling and cosmetic acupuncture from a licensed acupuncturist, plus Chinese herbal medicine and tea.",
        main, ld=[business_ld()], current="/", footer_map=False)


def treatments():
    main = hero("Turn back the clock, naturally.",
        "Microneedling, nanoneedling and cosmetic acupuncture from a licensed acupuncturist in Burbank. Natural skin renewal, paced to your skin, one calm session at a time.", tone="c",
        cta_html=book_btn("Book a treatment") + f'<a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>') + rating_strip() + f"""
<section><div class="wrap">
  <p class="eyebrow">Skin treatments</p>
  <h2>Facial and skin treatments in Burbank</h2>
  <ul class="rates">
    {rate_item("medical-microneedling-session", "Collagen induction therapy using medical-grade microneedles to trigger your skin's natural repair response. Targets fine lines, acne scarring, uneven texture, and hair loss, stimulating deep renewal that builds over time. Custom serums are applied during treatment and absorbed far more efficiently than topical application alone. Red light therapy is included. Also offered as the five-session " + SERIES + " series.")}
    {rate_item("facial-nano-needling", "Nanoneedling combines ultra-fine nanotips with pure botanical serums for instant radiance with zero downtime. The tips open micro-channels in the skin's surface, infusing hyaluronic acid, vitamins, and custom serums exactly where they're needed. Ideal for sensitive skin, a pre-event glow, or between microneedling sessions. Includes red light therapy. Also offered as the five-session " + SERIES + " series.")}
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
        "Microneedling, nanoneedling, and cosmetic acupuncture in Burbank with custom serums and red light therapy, from a licensed acupuncturist.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments")])], current="/treatments")


ONLINE_CONSULT = "/service-page/initial-consultation-online"

# Tap-to-open "What we treat" list on the Acupuncture and Herbal Medicine page.
# (anchor id, title, examples, [paragraphs], optional (link text, href))
ACU_CONDITIONS = [
    ("pain", "Pain and tension", "Back and neck pain, tight shoulders, headaches, old injuries",
     ["Pain is one of the most common reasons people try acupuncture. Treatment works on the area that hurts and on what keeps it tight, such as stress, poor sleep, or an old injury that never fully settled. Cupping, moxibustion or massage are added when they help.",
      "Expect a short series of visits rather than a single fix. For pain that keeps coming back, herbs can carry the work between visits."], None),
    ("stress-sleep", "Stress, anxiety and sleep", "Feeling wired or worn out, trouble falling or staying asleep",
     ["Chinese medicine treats stress as something the whole body carries, not only the mind. Acupuncture helps the nervous system shift out of a stressed state, and the quiet rest during treatment is part of the work.",
      "For sleep, an herbal formula often carries the effect between visits. We also look at digestion and daily rhythm, which affect sleep more than most people expect."], None),
    ("digestion", "Digestion and gut health", "Bloating, IBS, reflux, irregular bowels",
     ["In the school of Chinese medicine I practice, digestion sits at the center. When it struggles, energy, sleep, mood and skin often follow, so for many people this is where treatment starts.",
      "Herbal medicine usually leads, matched to your pattern and adjusted as things change, with acupuncture and practical food guidance alongside. This works well as an online consultation."], None),
    ("fatigue", "Fatigue and low energy", "Running on empty, slow recovery after illness, tired after a full night's sleep",
     ["Low energy has many roots: digestion, sleep, stress, hormones, or a body that never fully recovered from an illness. The first visit is about finding which one is driving yours.",
      "Herbs usually do the steady rebuilding, with acupuncture to support it. Travel fatigue and jet lag get a shorter plan."], None),
    ("hormones", "Hormones and women's health", "Painful or irregular cycles, PMS, perimenopause and menopause",
     ["Chinese medicine pays close attention to the menstrual cycle, which shows a lot about your overall health. Treatment follows your cycle, usually combining acupuncture with an herbal formula adjusted month to month.",
      "For perimenopause and menopause, treatment focuses on hot flashes, sleep and mood, built around your pattern rather than a fixed protocol."], None),
    ("skin", "Skin conditions", "Acne, eczema, psoriasis, rosacea",
     ["Skin often shows what is happening inside. Herbal medicine taken internally is usually the main treatment, matched to the pattern underneath the rash."],
     ("Chinese medicine dermatology", "/skin-conditions-burbank")),
]


def acupuncture():
    conds = []
    for cid, title, ex, paras, more in ACU_CONDITIONS:
        body = "".join(f"<p>{e(p)}</p>" for p in paras)
        more_html = f'<a class="cmore" href="{more[1]}">{e(more[0])}</a>' if more else ""
        conds.append(
            f'<details class="cond" id="{cid}"><summary><span class="ct">{e(title)}</span><span class="cx">{e(ex)}</span></summary>'
            f'<div class="cbody">{body}<p class="cacts">'
            f'<a class="btn ghost small" href="{ONLINE_CONSULT}">Online consultation</a>{more_html}</p></div></details>')
    main = f"""
<div class="hero-band tone-m"><div class="wrap page-hero">
  <div class="band short" aria-hidden="true"></div>
  <h1>Acupuncture and Herbal Medicine in Burbank</h1>
  <p class="lede">Acupuncture in the clinic, and Chinese herbal medicine in person or by video. Find what you're dealing with below, or book now.</p>
  <div class="actions">{book_btn("Book in person")}<a class="btn ghost" href="{ONLINE_CONSULT}">Book an online consultation</a></div>
</div></div>

<section id="what-we-treat" aria-labelledby="treat-h"><div class="wrap">
  <p class="eyebrow m">Find your condition</p>
  <h2 id="treat-h">What we treat</h2>
  <p class="guide-intro">Tap a condition to see how Chinese medicine looks at it and what treatment involves.</p>
  <div class="conds">{"".join(conds)}</div>
  <p class="fine conds-note">Don't see yours? Book a first visit and we'll talk it through, or call <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
</div></section>

<section class="sand" id="visits" aria-labelledby="visits-h"><div class="wrap">
  <p class="eyebrow">Two ways to be seen</p>
  <h2 id="visits-h">In person or online</h2>
  <div class="paths four visits">
    <div class="path"><h3>In person, in Burbank</h3>
      <p>Acupuncture with herbal medicine as needed, plus cupping, moxibustion or massage when they help. First visit 60 minutes, follow-ups 45.</p>
      <ul class="way-links"><li><a href="/service-page/acupuncture-initial-treatment">First visit</a></li><li><a href="/service-page/acupuncture-repeat-treatment">Follow-up visit</a></li></ul>
      <p class="fine">{e(acu_pack_line())}. {e(ACU_PACK_HOW)}</p>
      <p class="vbtn">{book_btn("Book in person")}</p></div>
    <div class="path"><h3>Online, by video</h3>
      <p>A Chinese herbal medicine consultation from home, for people farther away or who want to start with herbs. First consultation 60 minutes, follow-ups 45.</p>
      <ul class="way-links"><li><a href="{ONLINE_CONSULT}">First consultation</a></li><li><a href="/service-page/repeat-consultation-online">Follow-up consultation</a></li></ul>
      <p class="vbtn"><a class="btn" href="{ONLINE_CONSULT}">Book an online consultation</a></p></div>
  </div>
  <p class="fine" style="margin-top:1.2rem">Fees are on each session page.</p>
</div></section>

<section aria-labelledby="first-h"><div class="wrap">
  <p class="eyebrow m">Acupuncture</p>
  <h2 id="first-h">Your first acupuncture visit</h2>
  <ol class="steps">
    <li><h3>Consultation</h3><p>We begin with your health history, lifestyle, and goals, and map out a treatment plan.</p></li>
    <li><h3>Gentle placement</h3><p>Ultra-fine, sterile needles are gently placed. Most patients feel only a slight sensation or nothing at all.</p></li>
    <li><h3>Restorative rest</h3><p>You rest for 20 to 30 minutes in a calm room while the treatment works.</p></li>
    <li><h3>Afterward</h3><p>We finish with herbal recommendations if they suit you, and often a moment in the tea space.</p></li>
  </ol>
</div></section>

<section class="tint" id="herbal-medicine" aria-labelledby="herbs-h"><div class="wrap split">
  <div><p class="eyebrow m">Chinese herbal medicine</p><h2 id="herbs-h">How herbal medicine works here</h2></div>
  <div>
    <p>Most medicine asks what the symptom is. Chinese medicine asks why the system is out of balance. Your formula is written for your pattern, not for the name of a condition, and it changes as you do.</p>
    <ol class="steps">
      <li><h3>A full intake</h3><p>In person or by video, we go through your history, digestion, sleep, energy and what makes things better or worse. Please complete the <a href="/new-patients">new patient intake form</a> first.</p></li>
      <li><h3>A formula for your pattern</h3><p>You receive an herbal formula matched to you, with practical food guidance where it helps.</p></li>
      <li><h3>Follow up and refine</h3><p>We adjust your herbs as your body responds, aiming for steady change that lasts.</p></li>
    </ol>
  </div>
</div></section>

<section class="wash-g" aria-labelledby="journeys-h"><div class="wrap">
  <p class="eyebrow">Reviews</p>
  <h2 id="journeys-h">What patients say</h2>
  {quotes([TESTIMONIALS_HOME[0], TESTIMONIALS_HOME[1], TESTIMONIALS_HOME[4]])}
</div></section>

{signup_band("acupuncture")}

""" + cta("Ready to start?", "Book in person in Burbank, or an online consultation from home.", "Book in person", tone="l")
    OUT["acupuncture.html"] = page("/acupuncture", "Acupuncture & Herbal Medicine in Burbank | Full Lotus Health",
        "Acupuncture and Chinese herbal medicine in Burbank, CA, or by video: pain, stress, sleep, digestion, fatigue, and hormones, with Roozbeh Ghobadpour, L.Ac.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Acupuncture and herbal medicine", "/acupuncture")])], current="/acupuncture")


def consult():
    """The old Consult & heal page now lives on the Acupuncture and Herbal Medicine page. Keep the address working."""
    dest = "/acupuncture#herbal-medicine"
    OUT["consult-heal.html"] = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Acupuncture and Herbal Medicine | Full Lotus Health</title>
<meta name="robots" content="noindex, follow"><link rel="canonical" href="{SITE}/acupuncture">
<meta http-equiv="refresh" content="0; url={dest}"></head>
<body><p>This page has moved to <a href="{dest}">Acupuncture and Herbal Medicine</a>.</p></body></html>
"""


def tea():
    main = hero("The sacred art of presence.",
        "Our tea ceremonies are designed to help you step into a meditative rhythm. By focusing on the intentional ritual of tea, we create a space to slow the breath, calm the nervous system, and return to whole-system harmony. This practice is open to anyone seeking stress relief and a moment of true inner balance.", tone="n", cta_html=book_btn("Book a seat"), cls="clouds", deco=cloud_field("a", "bottom")) + f"""
<section><div class="wrap">
  <p>{book_btn("Book a seat")}</p>
  <ul class="rates" style="margin-top:2rem">
    <li><span class="name"><a href="/service-page/gong-fu-tea-ceremony">Gong Fu ceremony</a><span class="meta">60 min</span></span><p class="desc">Gong Fu ceremony is about making the perfect cup of tea. Every element of good tea, including water, teaware, tea, atmosphere, and heat, is controlled to create the perfect cup, an unattainable goal which we strive for each time.</p></li>
    <li><span class="name"><a href="/service-page/bowl-tea-ceremony">Bowl tea ceremony</a></span><p class="desc">Bowl tea ceremony has been around for several centuries but has recently been adapted for the modern world by tea master Wu De. We drink tea in silence with mindfulness, observing its effect on our mind and experiencing meditation.</p></li>
    <li><span class="name"><a href="/service-page/private-gong-fu-tea-ceremony">Private Gong Fu ceremony</a></span><p class="desc">A private session for up to five guests.</p></li>
  </ul>
</div></section>
<section class="night">{cloud_field("b", "top")}<div class="wrap split">
  <div><p class="eyebrow">Tea and Chinese medicine</p><h2>The magic of tea</h2>{photo("tea-space", "The tea space at Full Lotus Health")}</div>
  <div>
    <p>In Chinese medicine, tea is known as the premier Chinese herb for the mind. In tea ceremony we drink aged, old growth, organic teas, which have a profound ability to calm and energize the mind and allow one to access the heart/mind in meditation.</p>
    <p>We provide tea ceremony in the tradition of Wu De, a foremost expert on tea who has written many books on tea and owns Global Tea Hut. Roozbeh has been studying with Wu De for over fifteen years, and Wu De has served tea at Full Lotus Health.</p>
  </div>
</div>{cloud_field("a", "bottom")}</section>
<section><div class="wrap">
  <h2>Weekly tea sits</h2>
  <p>Every Tuesday, Wednesday and Thursday morning and Friday afternoon we sit together in the tea space and drink tea, mostly in silence. Five seats per sit. <a href="/tea-sits">See dates and seats left</a>.</p>
  <h2 style="margin-top:2.4rem">Join the circle</h2>
  <p>To hear about special community tea sits, events, and unique tea offerings, email <a href="mailto:{EMAIL}?subject=Tea%20circle">{EMAIL}</a> and ask to be added.</p>
</div></section>
""" + cta("Reserve your seat", "Pour a cup and slow down.", "Book a seat", tone="g")
    OUT["tea-ceremonies.html"] = page("/tea-ceremonies", "Chinese Tea Ceremony in Burbank | Full Lotus Health",
        "Gong Fu and bowl tea ceremony in Burbank in the tradition of Wu De: aged, old growth, organic tea for stress relief and inner balance.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Tea ceremonies", "/tea-ceremonies")])], current="/tea-ceremonies")


def tea_sits():
    if TEASITS:
        body = f"""<p>Pick a date below to save your seat.</p>
<div id="teasits" data-endpoint="{e(TEASITS)}">
  <p class="ts-status" role="status" aria-live="polite" hidden></p>
  <div class="sch-cal ts-cal" aria-busy="true"><div class="sch-grid" aria-hidden="true">{"".join(f'<span class="sch-dow">{d}</span>' for d in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"))}{"".join('<span class="sch-day sk"></span>' for _ in range(35))}</div></div>
  <ul class="ts-list"><li class="fine" style="padding:1rem 0">Loading dates&hellip;</li></ul>
  <noscript><p class="notice">To reserve a seat, text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></noscript>
</div>
<p style="margin-top:var(--space-3)">None of these times work for you? Just text me at <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> and we'll find a time.</p>
<script src="/assets/teasits.js" defer></script>"""
    else:
        body = f'<div class="notice"><p><strong>Online reservations open soon.</strong> To save a seat now, text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></div>'
    main = hero('Weekly tea sits.<span class="ts-sched">Tuesday, Wednesday &amp; Thursday at 8:30&nbsp;am<br>Friday at 3&nbsp;pm</span>',
        "A tea sit is an opportunity to still and energize the mind in a beautiful setting drinking old growth, organic, and aged teas which are tonics for the mind and body. Each sit is an hour, with five seats, so reserve ahead.", tone="n", cls="clouds roomy", deco=cloud_field("a", "bottom"),
        cta_html=('<a class="btn" href="#teasits">See dates and reserve</a>' if TEASITS else f'<a class="btn" href="sms:{PHONE_TEL}">Text to reserve a seat</a>')) + f"""
<section><div class="wrap">
  {body}
</div></section>
<section class="sand"><div class="wrap">
{faq_block([
    ("What happens at a tea sit?", "We sit on cushions around the tea table and drink several bowls or cups of tea together, mostly in silence. No experience is needed. It's a simple way to slow down and meditate with tea."),
    ("What should I wear?", "Comfortable clothes you can sit on the floor in. A cushion or low stool is provided."),
    ("Where is it?", f"In the tea space at Full Lotus Health, {ADDR_LINE}. Please arrive a few minutes early."),
    ("Can I bring friends?", "Yes. You can reserve up to three seats at once. For a group of your own, book a <a href=\"/service-page/private-gong-fu-tea-ceremony\">private ceremony</a>."),
    ("What if I can't make it?", f"Reply to your confirmation email or text {PHONE_DISPLAY} so your seat can go to someone else."),
], "Before you come")}
</div></section>""" + cta("Prefer a private ceremony?", "Gong fu and bowl tea ceremonies for you and up to five guests.", "Book a ceremony", tone="g")
    OUT["tea-sits.html"] = page("/tea-sits", "Weekly Tea Sits in Burbank | Full Lotus Health",
        "Weekly tea sits in Burbank: an hour of old growth, organic, and aged tea, mostly in silence. Five seats per sit. See dates, seats left, and reserve online.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Tea ceremonies", "/tea-ceremonies"), ("Tea sits", "/tea-sits")])], current="/tea-sits",
        head_extra=teasits_head() if TEASITS else "")


def book_online():
    """Booking page without a price list: pick what you need, then the calendar. Fees are on each service page and at checkout."""
    plan = [
        ("Skin and facial", "beauty", {
            "medical-microneedling-session": "Deeper renewal for lines, scars and texture.",
            "facial-nano-needling": "A gentle glow facial with no downtime.",
            "full-lotus-lift": "Facial acupuncture for a lifted, rested look."}),
        ("Acupuncture", "acu", {
            "acupuncture-initial-treatment": "Your first acupuncture visit, with a full intake.",
            "acupuncture-repeat-treatment": f"For returning patients. Also as a 5-visit package for ${ACU_PACK['price']}."}),
        ("Online consultation", "consult", {
            "initial-consultation-online": "A first video visit about your health and herbs.",
            "repeat-consultation-online": "A follow-up video visit."}),
    ]
    blocks = []
    for label, g, descs in plan:
        rows = []
        for s in [x for x in SERVICES if x["group"] == g]:
            meta = f' <span class="fine">{s["minutes"]} min</span>' if s["minutes"] else ""
            rows.append(f'<li><span class="n"><a href="/service-page/{s["slug"]}">{e(s["name"])}</a>{meta}<span class="d">{e(descs.get(s["slug"], s["short"]))}</span></span>{book_btn("Book", small=True, slug=s["slug"])}</li>')
        blocks.append(f'<h2 class="bk-h">{label}</h2><ul class="svc-list np">{"".join(rows)}</ul>')
    blocks.append(f'<h2 class="bk-h">Tea</h2><ul class="svc-list np"><li><span class="n"><a href="/tea-ceremonies">Tea ceremony</a><span class="d">Private or group tea ceremonies in the clinic tea room.</span></span><a class="btn small" href="/tea-ceremonies">See options</a></li></ul>')
    fallback = ""
    if not BOOK and not BOOKS:
        fallback = f'<div class="notice"><p><strong>Online booking is being set up.</strong> To book now, call or text <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></div>'
    main = f"""
<section><div class="wrap">
  <h1 class="sr-only">Book your visit</h1>
  {fallback}
  {''.join(blocks)}
  <div class="bk-new"><div><h2 class="h3">First visit?</h2><p>Fill in the short intake form first, ideally before your appointment. It takes a few minutes.</p></div><a class="btn ghost" href="{e(INTAKE_HREF)}">New patient form</a></div>
  <div class="bk-new" style="margin-top:1rem"><div><h2 class="h3">Not sure which to choose?</h2><p>Text us and we will help you choose.</p></div><a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a></div>
  <p class="fine" style="margin-top:2rem">Fees are shown on each service page and at checkout. To reschedule or cancel, call or text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> at least 24 hours ahead. Appointments cancelled or missed with less than 24 hours' notice are charged ${LATE_FEE}.</p>
  {faq_block([
    ("Where are visits?", f"In person at {ADDR_LINE}. {PARKING} {HOURS} Online consultations are by video."),
    ("Which treatment should I choose?", "Book the one closest to what you need and we will decide together, or text a question. Skin treatments are described on the <a href=\"/treatments\">natural beauty page</a> and acupuncture on the <a href=\"/acupuncture\">acupuncture page</a>."),
    ("How long are visits?", "The length is shown beside each service. Visits are unhurried and often end with tea."),
  ], "Before you book")}
</div></section>"""
    OUT["book-online.html"] = page("/book-online", "Book Acupuncture, Skin & Tea in Burbank | Full Lotus Health",
        "Book acupuncture, microneedling, nanoneedling, cosmetic acupuncture, consultations, or tea ceremony at Full Lotus Health in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Book online", "/book-online")])])


def confirm_pages():
    """One step between "Book" and the Google calendar: shows the fee large, what is included, and the policy."""
    for s in SERVICES:
        if s["slug"] not in BOOKS and s["slug"] not in APPT:
            continue
        pk = PACKAGES.get(s["slug"])
        mins = f'{s["minutes"]} minutes' if s["minutes"] else ""
        where = "Online, by video" if "Online" in s["name"] else ADDR_LINE
        new = ('<p class="cf-new">First visit? <a href="' + e(INTAKE_HREF) + '" rel="noopener">Fill in the new patient form</a> before you come. It takes a few minutes.</p>') if "initial" in s["slug"] else ""
        if s["slug"] in APPT:
            series = '<p class="cf-new">Need a series of treatments? Book your first session now, and we will schedule the rest together after your first treatment.</p>' if APPT[s["slug"]]["series"] else ""
            if s["slug"] == ACU_PACK_SLUG:
                series += f'<p class="cf-new">{e(acu_pack_line())}. That works out to ${ACU_PACK["per"]} a visit instead of ${s["price"]}. To start the package, book your first visit below, and we will book the rest together after your first appointment.</p>'
            gl = f' data-fallback="{e(BOOKS[s["slug"]])}"' if s["slug"] in BOOKS else ""
            if SKIN_INTAKE and s["slug"] in SKIN_SLUGS:
                gl += f' data-skin-intake="{e(SKIN_INTAKE)}"'
            main = f'''<section class="cf"><div class="wrap cf-wrap sch-wrap">
<p class="crumbs"><a href="/book-online">Book online</a> / {e(s["name"])}</p>
<h1>{e(s["name"])}</h1>
<p class="lede">{e(s["tagline"])}</p>
<p><strong>{e(mins)} &middot; ${s["price"]}</strong> &middot; {e(where)}</p>
{series}
<div id="sched" class="sch" data-endpoint="{e(BOOKAPI)}" data-service="{e(s["slug"])}"{gl}>
  <p class="sch-status notice" role="status" aria-live="polite" hidden></p>
  <div class="sch-cal" aria-busy="true"><p class="sch-finding" role="status">Finding open times…</p><div class="sch-grid" aria-hidden="true">{"".join(f'<span class="sch-dow">{d}</span>' for d in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"))}{"".join('<span class="sch-day sk"></span>' for _ in range(35))}</div></div>
  <div class="sch-times"></div>
  <div class="sch-details"></div>
  <noscript><p class="notice">To book, text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></noscript>
</div>
<ul class="cf-facts"><li><strong>Where:</strong> {e(where)}</li><li><strong>Payment:</strong> taken when you book your time. Nothing is booked until payment goes through.</li><li><strong>Cancelling:</strong> free up to 24 hours ahead. Less than 24 hours' notice is charged ${LATE_FEE}.</li></ul>
{new}
<p class="fine"><a href="/service-page/{s["slug"]}">More about {e(s["name"])}</a>. Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>.</p>
</div></section><script src="/assets/booking.js" defer></script>'''
            OUT[f"book/{s['slug']}.html"] = page(f"/book/{s['slug']}", f"Book {s['name']} | {NAME}", f"Book {s['name']} at Full Lotus Health in Burbank.", main, noindex=True, focus=True, head_extra=booking_head(s["slug"]))
            continue
        opt1 = f'''<div class="cf-opt"><p class="cf-name">Single session</p><p class="cf-price">${s["price"]}</p><p class="cf-sub">{e(mins)}</p><p>{book_btn("Choose a time", slug=s["slug"], direct=True)}</p></div>'''
        opt2 = ""
        if pk:
            opt2 = f'''<div class="cf-opt"><p class="cf-name">{e(pk["name"])}</p><p class="cf-price">${pk["price"]:,}</p><p class="cf-sub">{e(_series_bit(s["slug"], False))}. Your first session counts toward it.</p><p><a class="btn ghost" href="sms:{PHONE_TEL}">Text to book the series</a></p><p><a href="/five-element-rejuvenation">Learn more about the series</a></p></div>'''
        main = f'''<section class="cf"><div class="wrap cf-wrap">
<p class="crumbs"><a href="/book-online">Book online</a> / {e(s["name"])}</p>
<h1>{e(s["name"])}</h1>
<p class="lede">{e(s["tagline"])}</p>
<div class="cf-opts{" two" if opt2 else ""}">{opt1}{opt2}</div>
<ul class="cf-facts"><li><strong>Where:</strong> {e(where)}</li><li><strong>Payment:</strong> taken when you book your time.</li><li><strong>Cancelling:</strong> free up to 24 hours ahead. Less than 24 hours' notice is charged ${LATE_FEE}.</li></ul>
{new}
<p class="fine"><a href="/service-page/{s["slug"]}">More about {e(s["name"])}</a>. Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>.</p>
</div></section>'''
        OUT[f"book/{s['slug']}.html"] = page(f"/book/{s['slug']}", f"Book {s['name']} | {NAME}", f"Book {s['name']} at Full Lotus Health in Burbank.", main, noindex=True, focus=True)


def five_element():
    """The Five Element Rejuvenation journey page. Elements are a product language for skin states, not a diagnosis (per the serum-system doc).
    Draft copy: Roozbeh rewrites the element text and the 'why' answer in his own words."""
    els = [("wood", "🌿", "Wood", "Clarify, even, move", "Malachite green",
            "Wood is the element of growth and movement. In the skin, it is the session for clearing and evening out: lifting the look of congestion, dullness and puffiness so the face looks fresher and more open.",
            "Congestion, uneven tone, puffiness",
            "A fresh, clear look. Skin feels lighter and tone looks more even.",
            "Green Tea Clear", "green tea and niacinamide, for congested, oily skin", "Green tea or young sheng puerh"),
           ("fire", "🔥", "Fire", "Calm and cool", "Cinnabar red",
            "Fire is warmth and radiance. In the skin, it is the session for settling heat and reactivity: the flushed, easily irritated skin that needs soothing before it needs anything else.",
            "Redness, heat, reactive skin",
            "A calmer, cooler look, with a quiet glow.",
            "Lotus Calm", "lotus, centella and ectoin, for redness and sensitivity", "Lotus leaf or chrysanthemum"),
           ("earth", "🌾", "Earth", "Lift and nourish", "Aged gold",
            "Earth is the center. It grounds the whole journey: every session begins with Earth's nourishment and is then tuned by one other element. The Earth session itself gives that centre your full attention, for skin that has lost its bounce.",
            "Loss of firmness, tired skin",
            "Skin that looks fed, supported and more lifted.",
            "Astragalus Lift", "astragalus and signal peptides, for sagging and loss of tone", "Roasted oolong"),
           ("metal", "⚪", "Metal", "Refine and protect", "Pearl white",
            "Metal is refinement. In the skin, it is the session for smoothing the surface and protecting the barrier, so skin that feels tight, rough or easily irritated can settle.",
            "Barrier, texture, pores",
            "A smoother, finer surface that feels comfortable and dewy.",
            "Snow Mushroom Dew", "snow mushroom (tremella) and panthenol, for dewy hydration", "White tea"),
           ("water", "💧", "Water", "Restore and deepen", "Lapis and ink",
            "Water is depth and reserve. In the skin, it is the session for hydration and the finer lines that thirst leaves behind, with extra support for mature, slow-recovering skin.",
            "Dehydration, fine lines",
            "Plumper, more deeply hydrated skin, with softer fine lines.",
            "Apple Stem Cell Restore", "apple stem cell and low-weight hyaluronic acid, for mature skin and fine lines", "Shou puerh")]
    sections = []
    for i, (k, em, n, job, colour, desc, leads, feel, serum, serum_note, tea) in enumerate(els):
        wash = "sand" if i % 2 == 0 else ""
        img = photo(f"elements/{k}", f"Hand-painted {colour.lower()} painting for the {n} element", lazy=(i > 0))
        sections.append(f"""<section id="{k}" class="{wash}"><div class="wrap el-grid{' el-flip' if i % 2 else ''}">
<div class="el-text"><p class="eyebrow">Session {i + 1} of 5</p>
<h2><span class="el-emoji" aria-hidden="true">{em}</span> {e(n)}: {e(job)}</h2>
<p>{e(desc)}</p>
<dl class="el-facts">
<dt>Leads with</dt><dd>{e(leads)}</dd>
<dt>Signature serum</dt><dd><strong>{e(serum)}</strong>: {e(serum_note)}</dd>
<dt>What you may notice</dt><dd>{e(feel)}</dd>
</dl></div>
{img}</div></section>""")
    hero_html = g_hero("c", "Full Lotus Skin", SERIES,
        "A journey of rejuvenation through the five elements of Chinese medicine. Five sessions, each led by one element and its own signature serum. " + series_offers() + ".",
        [],
        "")
    apply_to = f"""<section class="wash-c"><div class="wrap">{g_head("One journey, three ways in", "Choose how deep you want to go", "The five elements guide the whole series. You choose the treatment that carries it.")}
<ul class="g-cards ty-paths">
<li class="g-card"><h3>Cosmetic acupuncture</h3><p>The gentlest way in. Fine needles along the face, with each session shaped by that session's element. No downtime.</p><p class="g-actions ty-acts">{book_btn("Book", slug="full-lotus-lift")}<a class="btn ghost" href="/cosmetic-acupuncture-burbank">About cosmetic acupuncture</a></p></li>
<li class="g-card"><h3>Nanoneedling</h3><p>A gentle glow with no downtime. Five 60-minute sessions with red light therapy.</p><p class="g-actions ty-acts">{book_btn("Book", slug="facial-nano-needling")}<a class="btn ghost" href="/nanoneedling-burbank">About nanoneedling</a></p></li>
<li class="g-card"><h3>Microneedling</h3><p>Deeper renewal for lines, scars and texture. Five 90-minute sessions with red light therapy.</p><p class="g-actions ty-acts">{book_btn("Book", slug="medical-microneedling-session")}<a class="btn ghost" href="/microneedling-burbank">About microneedling</a></p></li>
</ul></div></section>"""
    qa = f"""<section><div class="wrap g-faq">{faq_block([
  ("What does Five Element mean here?", "Chinese medicine describes nature, and the skin, through five elements: Wood, Fire, Earth, Metal and Water. Here they are a simple language for what your skin is doing right now. They are not a diagnosis."),
  ("What is a session like?", "Every journey starts with an intake. Each session then leads with one element, with Earth's nourishment as the grounding base. Red light therapy is part of the treatment."),
  ("Why is this less invasive than ordinary cosmetic microneedling?", "Sessions are paced several weeks apart and matched to what your skin needs that day, rather than run as a one-size-fits-all package. Nanoneedling stays at the surface and has no downtime."),
  ("What is the serum?", "Each element has its own signature serum, chosen for what that element's session is meant to do for the skin. It is part of the session, and your plan is set at your first visit."),
  ("Why is it beneficial?", "Skin does best when it is given time to renew between visits, and when each session has one clear job. The journey gives the series a shape, so you are not repeating the same treatment five times."),
  ("What are the short-term results?", "Most people notice skin that looks fresher and feels more hydrated in the days after a session. Microneedling can leave mild pinkness for a day or so. Nanoneedling has no downtime."),
  ("What are the long-term results?", "Results build as the sessions add up. Skin tends to look firmer, smoother and more even over the course of the series. Individual results vary."),
  ("Why did you create it?", "I wanted a way to bring the thinking of Chinese medicine into skin care that feels calm, personal and unhurried, and to give each visit its own purpose."),
  ("Do I have to do all five?", "The journey is designed as five sessions, one for each element. " + series_offers() + "."),
  ("Can I try one session first?", "Yes. If you start with a single session and decide to continue, that first session counts toward the series."),
  ("Who does the treatment?", "Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience."),
  ("Where is the clinic?", f"At {ADDR_LINE}."),
])}</div></section>"""
    ask = f"""<section class="sand"><div class="wrap ty-note" style="text-align:center">
<p class="eyebrow">Not sure where to start?</p><h2>Ask before you book</h2>
<p>Tell us about your skin and we will suggest the right way in. Text or email, whichever is easier.</p>
<p class="g-actions" style="justify-content:center"><a class="btn" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a><a class="btn ghost" href="mailto:{EMAIL}?subject=Five%20Element%20Rejuvenation">Email us</a></p>
</div></section>"""
    main = hero_html + "".join(sections) + apply_to + qa + ask
    OUT["five-element-rejuvenation.html"] = page("/five-element-rejuvenation", f"{SERIES} | Full Lotus Health",
        "Five Element Rejuvenation: a five-session journey through Wood, Fire, Earth, Metal and Water, with cosmetic acupuncture, nanoneedling or microneedling in Burbank. " + series_offers() + ".",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments"), (SERIES, "/five-element-rejuvenation")])])


def ten_years():
    """Landing page for the 10-year anniversary email to past patients. Not in the menu, sitemap or search results."""
    offer = CFG.get("anniversary_offer", "").strip()
    offer_html = f'<div class="ty-offer"><p class="eyebrow">For past patients</p><p class="ty-offer-t">{e(offer)}</p><p>{book_btn("Book your visit")}</p></div>' if offer else ""
    main = f"""<div class="hero-band tone-c ty-hero"><div class="wrap ty-grid">
<div><div class="band short" aria-hidden="true"></div><p class="eyebrow">Ten years at Full Lotus Health</p>
<h1>Thank you for ten years.</h1>
<p class="lede">It has been a privilege to care for this community since 2016. Whether you last visited last month or years ago, you are welcome back.</p>
<p class="g-actions">{book_btn("Book a visit")}<a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a></p></div>
<figure class="photo ty-photo"><img src="/assets/photos/roozbeh.jpg" width="1100" height="973" alt="Roozbeh Ghobadpour, L.Ac., licensed acupuncturist at Full Lotus Health in Burbank" fetchpriority="high"></figure>
</div></div>
<section><div class="wrap ty-note">
<p>Hello, this is Roozbeh. Ten years ago I opened the doors in Burbank with a table, a few needles and a lot of hope. Thank you to everyone who trusted me with their health along the way.</p>
<p>The clinic has grown since then. There is now a tea room, and I treat skin as well as pain, stress and sleep. If something has been on your mind, I would be glad to see you.</p>
<p class="g-sign">Roozbeh Ghobadpour, L.Ac.</p>
</div></section>
{offer_html}
<section class="sand"><div class="wrap">
<header class="g-head"><p class="eyebrow">Come back for</p><h2>Pick what fits</h2></header>
<ul class="g-cards ty-paths">
<li class="g-card"><h3>Acupuncture</h3><p>Pain, stress, sleep, digestion and more.</p><p><a class="btn small" href="{e(BOOKS.get('acupuncture-repeat-treatment') or BOOK_HREF)}">Book acupuncture</a></p></li>
<li class="g-card"><h3>Skin and facial</h3><p>Microneedling, nanoneedling and facial acupuncture with custom serums.</p><p><a class="btn small" href="/treatments">See skin treatments</a></p></li>
<li class="g-card"><h3>Tea</h3><p>Sit down for tea in the clinic tea room.</p><p><a class="btn small" href="/tea-sits">See tea sits</a></p></li>
</ul>
<p class="fine" style="margin-top:1.2rem">Not sure? Text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> and we will point you the right way.</p>
</div></section>
<section><div class="wrap">
<p class="pb-rating g-rating"><span class="stars" role="img" aria-label="Rated 5.0 out of 5">{STAR * 5}</span><a href="{GOOGLE_REVIEWS}" rel="noopener">5.0 on Google &middot; 40+ reviews</a></p>
<p style="text-align:center">{book_btn("Book a visit")}</p>
<p class="fine" style="text-align:center">{ADDR_LINE}. Cancellations need 24 hours' notice.</p>
</div></section>"""
    OUT["ten-years.html"] = page("/ten-years", "Ten years of Full Lotus Health | Thank you",
        "Thank you for ten years. Past patients are welcome back at Full Lotus Health in Burbank.", main, noindex=True, focus=True)


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
        main, ld=[business_ld(), blog_ld(), breadcrumb_ld([("Home", "/"), ("Blog", "/blog")])], current="/blog")


def blog_ld():
    """The blog as a whole, listing its articles, so search engines see one connected blog."""
    return {"@context": "https://schema.org", "@type": "Blog", "@id": f"{SITE}/blog#blog", "url": f"{SITE}/blog",
            "name": f"{NAME} blog", "inLanguage": "en-US", "publisher": {"@id": f"{SITE}/#business"},
            "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": f"{SITE}/post/{p['slug']}",
                          "datePublished": p["date"]} for p in POSTS]}


AUTHOR_BOX = """<aside class="author-box" id="author" aria-labelledby="author-h">
<img src="/assets/photos/roozbeh-author-192.jpg" width="96" height="96" alt="Roozbeh Ghobadpour, L.Ac." loading="lazy">
<div>
<p class="eyebrow">About the author</p>
<h2 class="h3" id="author-h">Roozbeh Ghobadpour, L.Ac.</h2>
<p>Licensed acupuncturist and owner of Full Lotus Health, practicing in Burbank since 2016.</p>
<p class="author-creds">California Acupuncture License #17220 &middot; NCCAOM Board-Certified Diplomate &middot; M.A. in Traditional Chinese Medicine, Yo San University</p>
</div>
</aside>"""


def blog_posts():
    for i, p in enumerate(POSTS):
        url = f"/post/{p['slug']}"
        img_abs = (SITE + p["image"]) if p["image"].startswith("/") else None
        others = [q for q in POSTS if q is not p][:3]
        more = ""
        if others:
            more = '<h2 class="h3" style="margin-top:2.4rem">More from the blog</h2><ul class="checks">' + "".join(f'<li><a href="/post/{q["slug"]}">{e(q["title"])}</a></li>' for q in others) + "</ul>"
        main = hero(e(p["title"]), f'By <a href="#author">Roozbeh Ghobadpour, L.Ac.</a> &middot; {pretty_date(p["date"])} &middot; {p["minutes"]} min read',
                    crumbs=[("Home", "/"), ("Blog", "/blog")], tone="m") + f"""
<section><div class="wrap"><article class="prose">
{p["body"]}
{AUTHOR_BOX}
<hr>

<p>{book_btn("Book a visit")}</p>
{more}
</article></div></section>"""
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "description": p["desc"],
              "datePublished": p["date"], "dateModified": p["date"], "mainEntityOfPage": SITE + url,
              "url": SITE + url, "inLanguage": "en-US", "isPartOf": {"@id": f"{SITE}/blog#blog"},
              "wordCount": len(_re.sub(r"<[^>]+>", " ", p["body"]).split()),
              "author": person_ld(),
              "publisher": {"@id": f"{SITE}/#business"}, "image": img_abs or OG_IMAGE}
        OUT[f"post/{p['slug']}.html"] = page(url, p["title"][:60], p["desc"], main,
            ld=[business_ld(), ld, breadcrumb_ld([("Home", "/"), ("Blog", "/blog"), (p["title"], url)])],
            og_type="article", og_image=img_abs, current="/blog")


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
      <li><h3>Arrive a few minutes early</h3><p>We're at {ADDR_LINE}. {PARKING} Visits are unhurried and often end with tea.</p></li>
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
{visit_section("find-h")}
<section class="sand"><div class="wrap">{faq_block([
    ("Do I need to fill out the form before I come?", "Yes. Complete it before your first visit so your appointment can begin with what matters most."),
    ("Where do I go for my visit?", f"{ADDR_LINE}. {PARKING} <a href=\"{MAPS}\" rel=\"noopener\">Open in Google Maps</a> or <a href=\"{MAPS_APPLE}\" rel=\"noopener\">Apple Maps</a>."),
    ("What are your hours?", HOURS),
    ("How do I reschedule or cancel?", f"Call or text <a href=\"sms:{PHONE_TEL}\">{PHONE_DISPLAY}</a> at least 24 hours ahead. Appointments cancelled or missed with less than 24 hours' notice are charged ${LATE_FEE}."),
    ("What treatments can I book?", "Acupuncture, microneedling, nanoneedling, cosmetic acupuncture, online consultations, and tea ceremonies. See <a href=\"/book-online\">all services</a>."),
  ], "New patient questions")}</div></section>"""
    OUT["new-patients.html"] = page("/new-patients", "New Patients | Full Lotus Health, Burbank",
        "New to Full Lotus Health? Book a time, then complete the new patient intake form before your first visit in Burbank, CA.",
        main, ld=[business_ld(), breadcrumb_ld([("Home", "/"), ("New patients", "/new-patients")])], current="/new-patients", footer_map=False)


def faq_ld(items):
    """FAQPage markup for a visible FAQ. Answers lose their links, since the markup takes plain text."""
    def plain(a):
        return html.unescape(_re.sub(r"<[^>]+>", "", a))
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in items]}


def faq_block(items, h="Common questions"):
    """Visible FAQ only (no FAQPage schema). items: list of (question, answer-html)."""
    rows = "".join(f"<h3>{e(q)}</h3><p>{a}</p>" for q, a in items)
    return f'<section class="faq" aria-label="{e(h)}"><h2 style="margin-top:2rem">{e(h)}</h2>{rows}</section>'


GUIDES = {
    "medical-microneedling-session": ("/microneedling-burbank", "Microneedling in Burbank: a guide"),
    "facial-nano-needling": ("/nanoneedling-burbank", "Nanoneedling in Burbank: a guide"),
    "full-lotus-lift": ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture in Burbank: a guide"),
}

# Diagram and photo shown at the top of a service page: the same art and photo (and alt text) the guide page uses.
SERVICE_ART = {
    "medical-microneedling-session": (art.skin_layers, "skin-texture", "Close-up of smooth, even skin in soft light"),
    "facial-nano-needling": (art.nano_layers, "serum-lotus", "A dropper bottle of golden herbal serum beside a pink lotus petal"),
}


def service_faq(s):
    online = "Online" in s["name"]
    loc = ("This visit is online, by video. " if online else f"Full Lotus Health is at {ADDR_LINE}. ")
    items = []
    if not online:
        items.append(("Where do I go?", f"{e(loc)}{e(PARKING)} {e(HOURS)} Convenient to Glendale, Toluca Lake, North Hollywood, and Studio City. <a href=\"{MAPS}\" rel=\"noopener\">Open in Google Maps</a> or <a href=\"{MAPS_APPLE}\" rel=\"noopener\">Apple Maps</a>."))
    else:
        items.append(("Where does this visit happen?", "Online, by video. You only need a private spot and a device with a camera."))
    if s["minutes"]:
        items.append((f"How long is a {s['name'].split(':')[-1].strip().lower()} visit?", f"Plan on {s['minutes']} minutes. Visits are unhurried."))
    items.append(("How do I book?", f"Use the Book button on this page to pick a time on the calendar. New patients, please complete the <a href=\"/new-patients\">intake form</a> before your first visit."))
    items.append(("How do I reschedule or cancel?", f"Call or text <a href=\"sms:{PHONE_TEL}\">{PHONE_DISPLAY}</a> at least 24 hours ahead. Appointments cancelled or missed with less than 24 hours' notice are charged ${LATE_FEE}."))
    return faq_block(items)


def render_body(items):
    out = []
    for item in items:
        k = item[0]
        if k == "p":
            out.append(f"<p>{e(item[1])}</p>")
        elif k == "h2":
            out.append(f"<h2 style='margin-top:2rem'>{e(item[1])}</h2>")
        elif k == "ul":
            out.append("<ul class='checks'>" + "".join(f"<li>{e(i)}</li>" for i in item[1]) + "</ul>")
        elif k == "small":
            out.append(f'<p class="fine">{e(item[1])}</p>')
    return "".join(out)


def beauty_service_page(s, fig, dur, loc, series_fact, series_block, guide):
    """Beauty treatments sell before they show the fee: what it does and what patients say come first,
    then fees and booking. People who only want the price can jump straight to it."""
    body = s["body"]
    qi = next((i for i, it in enumerate(body) if it[0] == "q"), None)
    if qi is not None:
        head_end = qi - 1 if qi and body[qi - 1][0] == "h2" else qi   # drop the "What patients say" heading
        last_q = max(i for i, it in enumerate(body) if it[0] == "q")
        intro, rest = body[:head_end], body[last_q + 1:]
    else:
        intro, rest = body, []
    if not fig:
        fig = f'<div class="g-after-photos">{photo("gua-sha", "A jade gua sha stone, a jar of serum and a folded linen towel on a wooden tray")}</div>'
    rel = "".join(f'<li><a href="/service-page/{r}">{e(BY_SLUG[r]["name"])}</a></li>' for r in s["related"])
    ask = f'Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>.'
    reviews = (f'<section class="wash-g"><div class="wrap"><p class="eyebrow">Reviews</p><h2>What patients say</h2>'
               f'{g_quotes(s["slug"])}<p>{book_btn("Book", slug=s["slug"])}</p></div></section>') if qi is not None else ""
    return hero(e(s["name"]), e(s["tagline"]), crumbs=[("Home", "/"), ("Book online", "/book-online")], tone="c") + f"""
<section><div class="wrap split">
  <div>{fig}</div>
  <div>{render_body(intro)}
    <p style="display:flex;gap:.9rem;flex-wrap:wrap;margin-top:1.6rem">{book_btn("Book", slug=s["slug"])} <a class="btn ghost" href="#fees">Fees and booking</a></p>
  </div>
</div></section>
{reviews}
<section class="sand" id="fees"><div class="wrap split">
  <div>
    <h2>Fees and booking</h2>
    <dl class="facts"><dt>Fee</dt><dd class="price">${s["price"]}</dd>{series_fact}{dur}<dt>Where</dt><dd>{e(loc)}</dd></dl>
    <p>{book_btn("Book", slug=s["slug"])}</p>
    <p class="fine">First visit? Please fill out the <a href="{INTAKE_HREF}">new patient form</a> before you come. {ask}</p>
  </div>
  <div>{series_block}{render_body(rest)}</div>
</div></section>
<section><div class="wrap split">
  <div><h2 class="h3">Also see</h2><ul class="checks">{rel}{guide}<li><a href="/treatments">All natural beauty treatments</a></li></ul></div>
  <div>{service_faq(s)}
    <p class="fine" style="margin-top:2rem">{NAME}, {ADDR_LINE}. Convenient to Glendale, Toluca Lake, North Hollywood, and Studio City.</p>
  </div>
</div></section>"""


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
        sa = SERVICE_ART.get(s["slug"])
        fig = (f'<div class="g-cmp-art">{sa[0]()}</div><div class="g-after-photos">{photo(sa[1], sa[2])}</div>') if sa else ""
        dur =f'<dt>Time</dt><dd>{s["minutes"]} minutes</dd>' if s["minutes"] else ""
        loc = "Online, by video" if "Online" in s["name"] else ADDR_LINE
        pk = PACKAGES.get(s["slug"])
        series_fact = series_block = ""
        if s["slug"] == ACU_PACK_SLUG:
            series_fact = f'<dt>Package</dt><dd><span class="price">${ACU_PACK["price"]:,}</span> for {ACU_PACK["visits"]} visits</dd>'
            series_block = (f'<h2 id="package" style="margin-top:2rem">{e(ACU_PACK["name"])}</h2>'
                            f'<p>{e(acu_pack_line())}. That works out to ${ACU_PACK["per"]} a visit instead of ${s["price"]}.</p>'
                            f'<p>{e(ACU_PACK_HOW)}</p><p>{book_btn("Book your first visit", slug=s["slug"])}</p>')
        if pk:
            series_fact = f'<dt>Series</dt><dd><span class="price">${pk["price"]:,}</span> for 5 sessions</dd>'
            series_block = (f'<h2 id="series" style="margin-top:2rem">{e(SERIES)} series</h2>'
                            f'<p>Five sessions, one for each element of Chinese medicine: Wood, Fire, Earth, Metal, and Water. '
                            f'Each session has its own focus and its own signature serum.</p>'
                            f'<p>{e(series_offer(s["slug"]))}. That works out to ${pk["per"]} a session instead of ${s["price"]}. If you start with a single session, it counts toward the series.</p>'
                            f'<p><a class="btn" href="/five-element-rejuvenation">Learn more about {e(SERIES)}</a></p>')
        if s["group"] == "beauty":
            main = beauty_service_page(s, fig, dur, loc, series_fact, series_block, guide)
        else:
            main = hero(e(s["name"]), e(s["tagline"]), crumbs=[("Home", "/"), ("Book online", "/book-online")], tone={"beauty":"c","acu":"m","consult":"l","tea":"n"}[s["group"]]) + f"""
<section><div class="wrap split">
  <div>
    <dl class="facts"><dt>Fee</dt><dd class="price">${s["price"]}</dd>{series_fact}{dur}<dt>Where</dt><dd>{e(loc)}</dd></dl>
    <p>{book_btn("Book", slug=s["slug"])}</p>
    {('<p><a class="btn ghost" href="' + e(INTAKE) + '" rel="noopener">New patient form</a></p><p class="fine">First visit? Please fill this out before you come.</p>') if (INTAKE and "initial" in s["slug"]) else ""}
    <p class="fine">Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>.</p>
    <h2 class="h3" style="margin-top:2rem">Also see</h2>
    <ul class="checks">{rel}{guide}</ul>
  </div>
  <div>{fig}{''.join(parts)}{series_block}
    {service_faq(s)}
    <p class="fine" style="margin-top:2rem">{NAME}, {ADDR_LINE}. Convenient to Glendale, Toluca Lake, North Hollywood, and Studio City.</p>
  </div>
</div></section>"""
        canon_to = CANON_PAGE.get(s["slug"]) or SEARCH_CANON.get(s["slug"])
        OUT[f"service-page/{s['slug']}.html"] = page(f"/service-page/{s['slug']}", s["title"], s["meta"], main,
            ld=[business_ld(), service_ld(s), breadcrumb_ld([("Home", "/"), ("Book online", "/book-online"), (s["name"], f"/service-page/{s['slug']}")])],
            canonical=(SITE + canon_to) if canon_to else None, book_slug=s["slug"] if canon_to else None)
        # old Wix booking-calendar addresses: forward to the service page, keep out of search
        OUT[f"booking-calendar/{s['slug']}.html"] = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(s['name'])} | {NAME}</title>
<meta name="robots" content="noindex"><link rel="canonical" href="{SITE}/service-page/{s['slug']}">
<meta http-equiv="refresh" content="0; url=/service-page/{s['slug']}"></head>
<body><p><a href="/service-page/{s['slug']}">Continue to {e(s['name'])}</a></p></body></html>
"""


# ------------------------------------------------------------------ rich guide pages (microneedling, nanoneedling)
STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>'
TEA_ALT = "The tea room at Full Lotus Health: tatami mats, a low tea table set for tea, floor cushions, lantern lamps and a Buddhist thangka on the wall"
PORTRAIT_ALT = "Roozbeh Ghobadpour, L.Ac., licensed acupuncturist at Full Lotus Health in Burbank"


def g_hero(tone, eyebrow, h1, lede, chips, art_svg, book_slug=None, book_label="Book a treatment", after_actions=""):
    cr = '<p class="crumbs">' + " / ".join(f'<a href="{h}">{e(n)}</a>' for n, h in [("Home", "/"), ("Natural beauty", "/treatments")]) + "</p>"
    ch = "".join(f"<li>{e(c)}</li>" for c in chips)
    return f"""<div class="hero-band tone-{tone} g-hero"><div class="wrap g-hero-grid{' g-hero-solo' if not art_svg else ''}">
<div class="g-hero-text">{cr}<div class="band short" aria-hidden="true"></div><p class="eyebrow">{e(eyebrow)}</p><h1>{e(h1)}</h1><p class="lede">{e(lede)}</p>
<p class="g-actions">{book_btn(book_label, slug=book_slug)}<a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a></p>{after_actions}
{('<ul class="chips">' + ch + '</ul>') if ch else ''}</div>
{('<div class="g-hero-art">' + art_svg + '</div>') if art_svg else ''}</div></div>"""


def g_head(eyebrow, h2, lead=None):
    lead_html = '<p class="g-lead">' + lead + "</p>" if lead else ""
    return f'<header class="g-head"><p class="eyebrow">{e(eyebrow)}</p><h2>{e(h2)}</h2>{lead_html}</header>'


def g_cards(items):
    out = []
    for ic, title, text in items:
        body = "<p>" + text + "</p>" if text else ""
        out.append(f'<li class="g-card">{art.icon(ic)}<h3>{e(title)}</h3>{body}</li>')
    return '<ul class="g-cards">' + "".join(out) + "</ul>"


def g_steps(items):
    out = "".join(f'<li>{art.icon(ic, 44)}<div><h3>{e(t)}</h3><p>{tx}</p></div></li>' for ic, t, tx in items)
    return f'<ol class="g-how">{out}</ol>'


def g_timeline(items):
    out = "".join(f'<li>{art.icon(ic, 44)}<h3>{e(t)}</h3><p>{tx}</p></li>' for ic, t, tx in items)
    return f'<ol class="g-time">{out}</ol>'


def g_quotes(slug, extra_quote_slugs=()):
    qs = []
    for s in (slug,) + tuple(extra_quote_slugs):
        qs += [(it[1], it[2]) for it in BY_SLUG[s]["body"] if it[0] == "q"]
    rating = f'<p class="pb-rating g-rating"><span class="stars" role="img" aria-label="Rated 5.0 out of 5">{STAR * 5}</span><a href="{GOOGLE_REVIEWS}" rel="noopener">5.0 on Google &middot; 40+ reviews</a></p>'
    return quotes(qs) + rating + ''


def g_compare(current):
    def card(kind, title, line, href, label):
        here = " is-here" if kind == current else ""
        tag = '<span class="g-here">You are here</span>' if kind == current else ""
        return (f'<div class="g-cmp{here}"><div class="g-cmp-art">{art.depth(kind)}</div><h3>{e(title)}{tag}</h3><p>{line}</p>'
                f'<p><a href="{href}">{e(label)}</a></p></div>')
    return ('<div class="g-compare">'
            + card("nano", "Nanoneedling", "A gentle surface treatment for glow and hydration, with no downtime. Sessions are 60 minutes.", "/nanoneedling-burbank", "Nanoneedling in Burbank")
            + card("micro", "Microneedling", "Works deeper, for scarring, lines, and thinning hair. Sessions are 90 minutes, with redness that usually settles in a day or two.", "/microneedling-burbank", "Microneedling in Burbank")
            + '</div>')


PEELS = ("Chemical peels", "",
    "A fresher surface.",
    "Burning, peeling and sun sensitivity. Can darken skin.")
LASER = ("Laser resurfacing", "",
    "Resurfaces skin with heat.",
    "Heat damage, downtime, and a risk of burns and discoloration.")
INJECT = ("Botox and fillers", "",
    "Smooths lines for a few months.",
    "Wears off, needs repeating, and does nothing for the skin itself.")


def g_table(title, lead, us, others):
    """Side-by-side table: first column is ours. Each entry is (name, how, benefits, risks)."""
    cols = [us] + list(others)
    head = "".join(
        f'<th scope="col"{" class=\"is-us\"" if i == 0 else ""}>{e(c[0])}'
        f'{"<span class=\"g-here\">Ours</span>" if i == 0 else ""}{"<span class=\"g-t-sub\">" + e(c[1]) + "</span>" if c[1] else ""}</th>'
        for i, c in enumerate(cols))
    def row(label, idx):
        tds = "".join(f'<td data-label="{e(c[0])}"{" class=\"is-us\"" if i == 0 else ""}>{e(c[idx])}</td>' for i, c in enumerate(cols))
        return f'<tr><th scope="row">{label}</th>{tds}</tr>'
    return (f'{g_head("Side by side", title, lead)}'
            f'<div class="g-table-wrap"><table class="g-table"><caption class="sr-only">{e(title)}</caption>'
            f'<thead><tr><td></td>{head}</tr></thead><tbody>{row("What you get", 2)}{row("The catch", 3)}</tbody></table></div>'
            )


MICRO_TABLE = ("Microneedling", "",
    "Reaches deep to stimulate collagen, softening wrinkles and fine lines. Nourishing serums absorb profoundly. Natural anti-aging, from within.",
    "A day or two of redness.")
NANO_TABLE = ("Nanoneedling", "",
    "Nourishing serums that absorb beautifully and support collagen. A natural glow, with no downtime.",
    "Nothing to recover from. Results build gently with each visit.")


def g_why(deep, points, treat_photo=""):
    pts = "".join(f'<li>{art.icon(ic, 40)}<div><h3>{e(t)}</h3><p>{tx}</p></div></li>' for ic, t, tx in points)
    return f"""<section class="{deep}"><div class="wrap g-why">
<div class="g-why-photo">{photo("roozbeh", PORTRAIT_ALT)}</div>
<div class="g-why-text"><p class="eyebrow">Why Full Lotus Health</p><h2>A licensed acupuncturist, treating your skin as part of you</h2>
<ul class="g-points">{pts}</ul>
<p class="g-sign">Roozbeh Ghobadpour, L.Ac. &middot; California license 17220 &middot; over 10 years of clinical experience</p></div>
</div></section>"""


def g_session(wash, head, steps, after_html, slug_photo, photo_alt):
    treat = photo(slug_photo, photo_alt)
    return f"""<section class="{wash}"><div class="wrap">
{head}
{g_timeline(steps)}
<div class="g-after"><div>{after_html}</div><div class="g-after-photos">{treat}{photo("hero", TEA_ALT)}<p class="fine g-cap">Visits are unhurried and often end with tea.</p></div></div>
</div></section>"""


def g_related(svc, links):
    lis = "".join(f'<li><a href="{h}">{e(t)}</a></li>' for h, t in links)
    return f"""<section><div class="wrap g-related"><div><h2 class="h3">Fees and booking</h2>
<p>Fees, session length and booking are on the <a href="/service-page/{svc['slug']}">{e(svc['name'])}</a> page. Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>. New patients, please fill out the <a href="{INTAKE_HREF}">intake form</a> before your first visit.</p></div>
<div><h2 class="h3">Also see</h2><ul class="checks">{lis}<li><a href="/treatments">All natural beauty treatments</a></li></ul></div></div></section>"""


def offer_email():
    """Optional email box in the offer pop-up. Same email-only signup as the homepage, tagged "offer"."""
    if LAUNCH and not SIGNUP:
        return ""
    demo = "" if SIGNUP else " data-demo"
    action = e(SIGNUP) if SIGNUP else "#"
    return f"""<form class="signup g-offer-mail" method="post" action="{action}"{demo} data-thanks="Thank you. The offer is on its way to your inbox.">
<p class="g-offer-mail-lead">Not ready yet? Get the offer by email.</p>
<div class="grow"><label for="offer-email" class="sr">Email address</label>
<input id="offer-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required maxlength="254">
<button class="btn ghost" type="submit">Send</button></div>
<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<input type="hidden" name="source" value="offer">
<p class="gmsg" role="status" aria-live="polite"></p>
</form>"""


def g_offer(name, line, book_slug=None):
    """First-visit offer, shown as a pop-up by /assets/offer-pop.js (no data collected)."""
    return f"""<dialog class="g-offer-pop" id="offer-pop" aria-labelledby="offer-pop-title">
<button class="g-offer-x" type="button" data-close aria-label="Close">&times;</button>
<div class="g-offer-badge" aria-hidden="true"><span>20%</span>off</div>
<p class="eyebrow">New patients</p><h2 class="h3" id="offer-pop-title" tabindex="-1" autofocus>20% off your first {e(name)}</h2><p>{line}</p>
<div class="g-offer-cta">{book_btn("Book your first visit", slug=book_slug)}</div>
{offer_email()}
<p class="g-offer-later"><button type="button" data-close>Maybe later</button></p>
</dialog><script src="/assets/offer-pop.js" defer></script><script src="/assets/signup.js" defer></script>"""


def g_band(items):
    figs = "".join(photo(n, alt, lazy=False) for n, alt in items)
    return f'<div class="g-band">{figs}</div>' if figs else ""


def g_series_promo(tone="sand", slug=None):
    offer = (f"{SERIES} series: {_series_bit(slug, True)}") if slug else series_offers()
    return f"""<section class="{tone}"><div class="wrap ty-note" style="text-align:center">
<p class="eyebrow">The series</p><h2>{e(SERIES)}</h2>
<p>A journey through the five elements: five sessions, each led by one element, with a signature serum for each. {e(offer)}.</p>
<p><a class="btn" href="/five-element-rejuvenation">Learn more about {e(SERIES)}</a></p>
</div></section>"""


# The three reviews on /microneedling-burbank, word for word. The ads page reuses this list.
MICRO_PAGE_REVIEWS = [
    ("The improvement seen in my crows feet as well as the overall tone and brightness of my skin is amazing! … The numbing cream is great and the whole procedure was completely painless.", "Stephany"),
    ("I have also started microneedling for hair loss. After about 3 treatments, I have new tiny hairs growing around my hairline.", "Rosa"),
    ("The whole experience is calm and comfortable, and I genuinely look forward to my appointments. … It's just consistently good care from someone who clearly knows what he's doing.", "Chris"),
]
# Public listings that cite this clinic's Google reviews, checked 2026-11-22
# (localusa.net, Birdeye, HelloRevelle): 5.0 from 41 reviews.
# The organic pages still say "42" or "40+" and were left as they are.
ADS_GOOGLE_RATING = "5.0"
ADS_GOOGLE_REVIEW_COUNT = 41
# Ads-page prices only. Struck amounts must match the listed service prices.
# Sale amounts and sash labels live here, not on the organic pages.
ADS_OFFERS = {
    "single": dict(was=500, now=400, off=20, sash="20% OFF",
                   note="First-time visitors. 90 minutes, includes herbal serums and red light."),
    "series": dict(was=2000, now=1800, off=10, sash="10% OFF",
                   note="5 sessions, 90 minutes each."),
}
ADS_BOOK_FIRST = "microneedling-offer-first"
ADS_BOOK_SERIES = "microneedling-offer-series"
# False until Booking.gs is deployed as a new version of the existing Apps Script web app.
# While false, ads Book buttons stay on /book/medical-microneedling-session (which charges $500).
ADS_OFFER_BOOKING_LIVE = False
ADS_MICRO_PATH = "/microneedling-burbank-offer"
if BOOKAPI:
    _expected_offer = {
        ADS_BOOK_FIRST: (ADS_OFFERS["single"]["now"], 90),
        ADS_BOOK_SERIES: (ADS_OFFERS["series"]["now"], 90),
    }
    if set(_OFFER_APPT) != set(_expected_offer):
        sys.exit("Booking.gs services that are not in SERVICES must be exactly the ads offer slugs: " + ", ".join(sorted(_OFFER_APPT)))
    for _slug, (_price, _minutes) in _expected_offer.items():
        _a = _OFFER_APPT[_slug]
        if _a["price"] != _price or _a["minutes"] != _minutes:
            sys.exit(f"Booking.gs {_slug} is ${_a['price']} / {_a['minutes']} min; the ads offer is ${_price} / {_minutes} min")
# Cosmetic wording for chat-facts.json and llms.txt, which the ads page chat can repeat.
# Organic page copy is left unchanged.
ADS_SAFE_SHORT = {
    "medical-microneedling-session": (
        "Collagen induction for the look of fine lines, texture, and the hairline, "
        "with custom plant-based Chinese herbal skincare serums and red light therapy."
    ),
}


def without_rx_sentence(text):
    """Drop only a sentence that names a prescription drug. The rest stays word for word."""
    parts = _re.split(r"(?<=[.!?])\s+", text.strip())
    kept = [p for p in parts if p and not _re.search(r"\b(minoxidil|botox|lidocaine)\b", p, _re.I)]
    return " ".join(kept).strip()


def micro_page(where):
    """Microneedling page built to turn a "microneedling burbank" search into a booking: price, reviews and a Book button
    up top, then what a session includes, who it suits, what to expect, fees, and a short FAQ (with FAQ markup).
    Every Book button here books microneedling itself. Wording rules: no medical or cure claims, "skin renewal session"
    (never "facial"), and nothing about how the serums are made."""
    mn = "medical-microneedling-session"
    mi, pk = BY_SLUG[mn], PACKAGES[mn]
    price, series = mi["price"], pk["price"]
    rating = (f'<p class="pb-rating g-hero-rating"><span class="stars" role="img" aria-label="Rated 5.0 out of 5">{STAR * 5}</span>'
              f'<a href="{GOOGLE_REVIEWS}" rel="noopener">5.0 on Google &middot; 42 reviews</a></p>')
    hero_html = g_hero("c", "Microneedling · Burbank", "Microneedling in Burbank, CA",
        f"A 90-minute skin renewal session from a licensed acupuncturist, with our own Full Lotus Skin serums and red light therapy. ${price} a session.",
        ["90 minutes", "Numbing cream first", "A day or two of redness", "In Burbank since 2016"], None,
        book_slug=mn, book_label=f"Book microneedling, ${price}", after_actions=rating)
    tcm = f"""<section class="wash-c g-tcm"><div class="wrap">
{g_head("What makes it different", "Chinese medicine, brought to your skin", "Most microneedling stops at the needles. Here a licensed acupuncturist brings Chinese medicine to your skin, with our own serums and red light therapy in every session.")}
{g_steps([("leaf", "A licensed acupuncturist", "Roozbeh is trained in Chinese medicine and looks at your skin as part of your whole health, so each session is planned around you."),
          ("bottle", "Full Lotus Skin serums", "Our serums work with the ancient Five Element system and modern botanical extract technology to influence collagen production and deeply nourish the skin. They go on as the needles open fresh channels, so they penetrate deeply."),
          ("light", "Red light in every session", "Red light therapy helps build collagen, and most people enjoy resting under it while the serums penetrate.")])}
<p class="g-cta-row">{book_btn(f"Book microneedling, ${price}", slug=mn)}</p></div></section>"""
    what = f"""<section><div class="wrap g-tcm-top">
<div>{g_head("What is microneedling?", "Tiny channels that prompt new collagen")}
<p>Microneedling uses a pen with fine, sterile needles to make thousands of tiny channels in the skin. Your skin responds by making new collagen, and results build gently over the following weeks. The channels close within hours.</p>
<p>The diagram shows the needles passing through the epidermis, the skin's outer layer, into the dermis, where collagen is made. While the channels are open, serums pass through far more easily: lab studies on human skin found microneedles let up to 1,000 to 10,000 times more through the skin's outer barrier. That is why Full Lotus Skin serums go on during the treatment: together with the microneedling itself, they make each session a powerful skin rejuvenation.</p></div>
<div class="g-hero-art g-tcm-art">{art.skin_layers()}</div></div></section>"""
    us_col = ("Full Lotus microneedling", "With a licensed acupuncturist",
        "Microneedling, Full Lotus Skin serums applied as the channels open, and red light therapy, all in one 90-minute session planned around your whole health.",
        "A day or two of redness.")
    spa_col = ("A typical med spa session", "",
        "Microneedling, usually with a standard serum. Red light and other add-ons are often priced separately.",
        "Usually no Chinese medicine assessment, and the same day or two of redness.")
    table = f'<section><div class="wrap">{g_table("What Full Lotus adds to microneedling", "The same core treatment, with Chinese medicine, our own serums and red light therapy built in. Here is how it compares.", us_col, [spa_col, PEELS, LASER, INJECT])}</div></section>'
    say = f"""<section><div class="wrap">{g_head("Patients", "What patients say")}
{quotes(MICRO_PAGE_REVIEWS)}
</div></section>"""
    included = g_session("sand", g_head("What's included", f"Everything in one ${price} session", "Sessions are 90 minutes. Your first visit includes an intake and a treatment plan."),
        [("jar", "Numbing cream", "A numbing cream goes on first, and most people find the treatment comfortable."),
         ("needle", "Microneedling", "Fine, sterile, medical-grade needles make tiny channels that prompt your skin to make new collagen."),
         ("bottle", "Full Lotus Skin serums", "Chosen for your skin and applied as the needles open fresh channels, so they penetrate deeply."),
         ("light", "Red light therapy", "Included in every session. Most people enjoy resting under it while the serums penetrate.")],
        f"<h3>Unhurried, one on one</h3><p>Every session is with Roozbeh himself, in a quiet private room. Visits often end with tea.</p><p>{book_btn('Book microneedling', slug=mn)}</p>",
        "treatment-microneedling", "Microneedling treatment at Full Lotus Health in Burbank")
    suits = f"""<section><div class="wrap">{g_head("Who it suits", "Microneedling is a good fit if you want to soften")}
{g_cards([("lines", "Fine lines and wrinkles", "Including crow's feet."), ("scar", "The look of acne scars", None), ("texture", "Uneven texture and tone", None),
          ("pores", "Enlarged pores", None), ("hair", "Thinning along the hairline", "With scalp microneedling."),
          ("chat", "Not sure it fits?", f'<a href="sms:{PHONE_TEL}">Text a question</a> first, or book a session and we will decide together.')])}
</div></section>"""
    expect = f"""<section class="sand"><div class="wrap">{g_head("What to expect", "Before, during and after")}
{g_timeline([("intake", "Before", "Fill out the new patient form. Your first visit starts with an intake and a plan for your skin."),
             ("needle", "During", "Numbing cream, then microneedling with Full Lotus Skin serums, then red light therapy. About 90 minutes in all."),
             ("glow", "That day", "Redness, similar to a mild sunburn."),
             ("repeat", "The weeks after", "Redness usually settles within a day or two, and results build over the following weeks. Most people do a series spaced several weeks apart.")])}
</div></section>"""
    fees = f"""<section class="wash-c" id="fees"><div class="wrap">{g_head("Fees", "Simple pricing", "Serums and red light therapy are always included.")}
<div class="cf-opts two">
<div class="cf-opt"><p class="cf-name">Single session</p><p class="cf-price">${price}</p><p class="cf-sub">90 minutes</p><p>{book_btn("Choose a time", slug=mn)}</p></div>
<div class="cf-opt"><p class="cf-name">{e(SERIES)} series</p><p class="cf-price">${series:,}</p><p class="cf-sub">{e(_series_bit(mn, False))}. A first single session counts toward it.</p><p><a class="btn ghost" href="sms:{PHONE_TEL}">Text to book the series</a></p><p><a href="/five-element-rejuvenation">About the series</a></p></div>
</div>
<p class="fine">Payment is taken when you book your time. Cancelling is free up to 24 hours ahead; less than 24 hours' notice is charged ${LATE_FEE}.</p>
</div></section>"""
    why = g_why("deep-m", [("shield", "A licensed acupuncturist, not a med spa", "California acupuncture license 17220. Roozbeh does every session himself."),
                           ("bottle", "Full Lotus Skin serums", "Our own Five Element serums, chosen for your skin at each session."),
                           ("heart", "Your whole health", "Trained in Chinese medicine, he looks at your skin as part of your whole health, not in isolation.")])
    compare = f'<section><div class="wrap">{g_head("Which treatment", "Microneedling or nanoneedling?")}{g_compare("micro")}</div></section>'
    faqs = [
        ("How much does microneedling cost in Burbank?", f"${price} for a 90-minute session, with Full Lotus Skin serums and red light therapy included. {e(series_offer(mn))}. A first single session counts toward it."),
        ("Does microneedling hurt?", "A numbing cream is applied first, and most people find the treatment comfortable."),
        ("How much downtime is there?", "Expect redness similar to a mild sunburn. It usually settles within a day or two."),
        ("How many sessions will I need?", "Results build over time, and most people do a series of sessions spaced several weeks apart. Your first visit includes a treatment plan."),
        ("Do you offer microneedling for thinning hair?", "Yes. Scalp microneedling along the hairline is offered."),
        ("Is this a med spa?", "No. Full Lotus Health is a licensed acupuncturist's clinic. Roozbeh Ghobadpour, L.Ac., does every session himself and brings Chinese medicine to your skin, with our own Full Lotus Skin serums and red light therapy in every session. He has practiced in Burbank since 2016."),
        ("Microneedling or nanoneedling?", "Microneedling works deeper, for lines, the look of scars, and thinning hair. <a href=\"/nanoneedling-burbank\">Nanoneedling</a> is a gentler surface treatment for glow and hydration, with no downtime."),
        ("How do I book?", f"Use any Book button on this page to pick a time, or text <a href=\"sms:{PHONE_TEL}\">{PHONE_DISPLAY}</a>. New patients, please fill out the <a href=\"{INTAKE_HREF}\">intake form</a> before your first visit."),
        ("Where is the clinic?", where),
    ]
    faq = f'<section class="sand"><div class="wrap g-faq">{faq_block(faqs)}</div></section>'
    offer = g_offer("microneedling session", "Deep rejuvenation, Full Lotus Skin serums and red light therapy, at a welcome price for your first visit.", book_slug=mn)
    related = f"""<section><div class="wrap g-related"><div><h2 class="h3">Questions?</h2>
<p><a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>. Please don't send health details by text or email.</p></div>
<div><h2 class="h3">Also see</h2><ul class="checks"><li><a href="/nanoneedling-burbank">Nanoneedling in Burbank</a></li><li><a href="/cosmetic-acupuncture-burbank">Cosmetic acupuncture in Burbank</a></li><li><a href="/treatments">All natural beauty treatments</a></li></ul></div></div></section>"""
    closing = cta("Ready for your first session?", f"Choose a time online, ${price} for 90 minutes, or text a question first.", "Book microneedling", slug=mn)
    return (hero_html + what + tcm + say + included + suits + expect + fees + table + why + compare + faq + offer, related, [faq_ld(faqs)], closing)


def ads_micro_page():
    """Google Ads landing page. No site nav, no nanoneedling link, cosmetic wording only."""
    mn = "medical-microneedling-session"
    first_book = ADS_BOOK_FIRST if ADS_OFFER_BOOKING_LIVE else mn
    mi, pk = BY_SLUG[mn], PACKAGES[mn]
    price, series = mi["price"], pk["price"]
    hero_fig, hero_preload = webp_figure(
        "hero", TEA_ALT, priority=True, sizes="(min-width: 52rem) 46vw, 100vw")
    serum_fig, _ = webp_figure(
        "serums", "Amber bottles and dried botanicals",
        sizes="(min-width: 52rem) 42vw, 100vw")
    reviews = [(without_rx_sentence(t), who) for t, who in MICRO_PAGE_REVIEWS]
    rating = (
        f'<ul class="ads-trust">'
        f'<li><span class="stars" role="img" aria-label="Rated {ADS_GOOGLE_RATING} out of 5">{STAR * 5}</span> '
        f'<a href="{GOOGLE_REVIEWS}" rel="noopener">{ADS_GOOGLE_RATING} on Google &middot; {ADS_GOOGLE_REVIEW_COUNT} reviews</a></li>'
        f'<li>Serving Burbank since 2016</li>'
        f'<li>Licensed Acupuncturist (L.Ac.)</li>'
        f'</ul>'
    )
    lotus = """<svg class="ads-lotus" viewBox="0 0 72 40" width="72" height="40" aria-hidden="true" focusable="false">
<path d="M36 34c-2-8-1-16 0-22 1 6 2 14 0 22z" fill="none" stroke="#e7cf9c" stroke-width="1.2"/>
<path d="M36 32c-8-2-16-8-18-16 6 2 12 6 18 16z" fill="none" stroke="#e7cf9c" stroke-width="1.15"/>
<path d="M36 32c8-2 16-8 18-16-6 2-12 6-18 16z" fill="none" stroke="#e7cf9c" stroke-width="1.15"/>
<path d="M36 30c-14 0-22-8-24-14 8 1 16 5 24 14z" fill="none" stroke="#f4ecdf" stroke-width="1.05" opacity=".85"/>
<path d="M36 30c14 0 22-8 24-14-8 1-16 5-24 14z" fill="none" stroke="#f4ecdf" stroke-width="1.05" opacity=".85"/>
<path d="M14 28c6 1 14 1 22 0M36 28c8 1 16 1 22 0" fill="none" stroke="#a8843e" stroke-width=".8" stroke-linecap="round"/>
</svg>"""
    vs_rows = [
        ("The visit", "90 minutes with one person", "Often a much shorter appointment"),
        ("Who", "Licensed acupuncturist, in Burbank since 2016", "Varies by clinic"),
        ("Serums", "Custom Chinese herbal skincare serums", "Often a standard serum"),
        ("Red light", "Included in the visit", "Often priced separately"),
    ]
    vs_body = "".join(
        f'<tr><th scope="row">{e(label)}</th><td>{e(ours)}</td><td>{e(theirs)}</td></tr>'
        for label, ours, theirs in vs_rows)
    hero = f"""<div class="hero-band tone-c g-hero"><div class="wrap g-hero-grid">
<div class="g-hero-text">{lotus}<div class="band short" aria-hidden="true"></div>
<h1>Ancient Healing Meets Modern Microneedling</h1>
<p class="lede">Not a med-spa assembly line: a 90-minute ritual by a licensed acupuncturist, pairing medical-grade microneedling with custom Chinese herbal serums and red light.</p>
<p class="g-actions">{book_btn("Book Your First Session", slug=first_book)}</p>
<p class="ads-ask"><a href="sms:{PHONE_TEL}">Questions? Text {PHONE_DISPLAY}</a></p>
{rating}</div>
<div class="g-hero-art">{hero_fig}</div>
</div></div>
<section class="ads-vs-wrap" aria-labelledby="ads-vs-h"><div class="wrap">
<h2 id="ads-vs-h" class="sr-only">Full Lotus and a typical med-spa visit</h2>
<div class="ads-vs"><table>
<caption class="sr-only">Full Lotus and a typical med-spa visit</caption>
<thead><tr><td></td><th scope="col">Full Lotus</th><th scope="col">A typical med-spa visit</th></tr></thead>
<tbody>{vs_body}</tbody>
</table></div>
</div></section>"""
    different = f"""<section><div class="wrap g-tcm-top">
<div>{g_head("The visit", "What Makes Full Lotus Microneedling Different", "A med spa appointment is often short. This one is 90 minutes, with one licensed acupuncturist, from topical numbing through red light.")}
{g_steps([
    ("needle", "Medical-grade microneedling", "Fine, sterile needles make tiny channels. Over the following weeks the look of fine lines and texture can soften."),
    ("bottle", "Custom Full Lotus Skin serums", "Plant-based Chinese herbal skincare serums, chosen for your skin and applied while the channels are open."),
    ("light", "Post-treatment red light therapy", "Included in every session. Most people rest under the light after the botanical topicals go on."),
])}</div>
<div>{serum_fig}</div>
</div></section>"""
    say = f"""<section class="wash-g"><div class="wrap">{g_head("Patients", "Testimonials")}
{quotes(reviews)}
</div></section>"""
    faqs = [
        ("Does it hurt?", "A gentle topical numbing goes on first. Most people find the visit comfortable. You may feel a light scratching sensation."),
        ("What is the downtime?", "Skin can look flushed, similar to a mild sunburn. Botanical topicals and red light help calm that post-treatment redness. The flush usually settles within a day or two."),
        ("What if I want zero needles or zero downtime?", "Needle-free nanoneedling is available on request at your visit. It stays at the surface, for glow and hydration, and has no downtime. Ask when you come in."),
    ]
    expect = f"""<section class="sand"><div class="wrap">{g_head("Your visit", "What to expect", "The visit is 90 minutes: gentle topical numbing, botanical serum application, then red light.")}
{g_timeline([
    ("jar", "Topical numbing", "A gentle topical numbing goes on first, so the microneedling stays comfortable."),
    ("bottle", "Botanical serums", "Plant-based Chinese herbal skincare serums are applied during the microneedling."),
    ("light", "Red light", "Red light therapy follows. It is included, not added on."),
])}
{faq_block(faqs)}
</div></section>"""
    def ads_card(key, name, action):
        o = ADS_OFFERS[key]
        if o["was"] * (100 - o["off"]) != o["now"] * 100:
            sys.exit(f"ads {key} price does not match its {o['off']}% sash")
        if not o["sash"].startswith(f"{o['off']}%"):
            sys.exit(f"ads {key} sash does not match its percent")
        return f"""<div class="cf-opt ads-price">
<p class="ads-sash">{e(o["sash"])}</p>
<p class="cf-name">{name}</p>
<p class="ads-was"><s><span class="sr">Was </span>${o["was"]:,}</s></p>
<p class="cf-price"><span class="sr">Now </span>${o["now"]:,}</p>
<p class="cf-sub">{e(o["note"])}</p>
<p>{action}</p>
</div>"""
    if ADS_OFFERS["single"]["was"] != price or ADS_OFFERS["series"]["was"] != series:
        sys.exit("ads strike prices must match the listed microneedling prices")
    single_card = ads_card("single", "First session", book_btn("Book Your First Session", slug=first_book))
    series_action = (book_btn("Book the series", slug=ADS_BOOK_SERIES) if ADS_OFFER_BOOKING_LIVE
                     else f'<a class="btn ghost" href="sms:{PHONE_TEL}">Text about the series</a>')
    series_card = ads_card("series", e(SERIES) + " series", series_action)
    fees = f"""<section id="pricing"><div class="wrap">{g_head("Fees", "Pricing")}
<div class="cf-opts two">
{single_card}
{series_card}
</div>
</div></section>"""
    closing = f"""<section class="cta"><div class="wrap">
<h2>Ready when you are</h2>
<p>Choose a time, or send a short question before you book.</p>
<p class="g-actions">{book_btn("Book Your First Session", slug=first_book)}<a class="btn ghost" href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY} for a quick question before booking</a></p>
</div></section>"""
    main = hero + different + say + expect + fees + closing
    plain = _re.sub(r"<blockquote>.*?</blockquote>", "", main, flags=_re.S)
    plain = _re.sub(r"<!--.*?-->", "", plain, flags=_re.S)
    banned = [p for p in (
        r"\bminoxidil\b", r"\bbotox\b", r"\blidocaine\b", r"\brosacea\b", r"\bmelasma\b",
        r"\bacne\b", r"(?<!-)\bfree\b", r"herbal medicine injection", r"medicinal infusion",
        r"/nanoneedling",
    ) if _re.search(p, plain, _re.I)]
    if banned:
        sys.exit("ads landing page failed the wording check: " + ", ".join(banned))
    if "offer-pop" in main or "$500 less" in main:
        sys.exit("ads page must not include the percent popup or the old series-savings line")
    svc = dict(mi, price=ADS_OFFERS["single"]["now"])
    desc = "A 90-minute microneedling visit in Burbank with a licensed acupuncturist, custom Chinese herbal serums, and red light."
    ld_service = service_ld(svc, url=SITE + ADS_MICRO_PATH, desc=desc, priced=False)
    ld_service["offers"] = [
        {"@type": "Offer", "name": "First microneedling session", "price": money(ADS_OFFERS["single"]["now"]),
         "priceCurrency": "USD", "url": SITE + ADS_MICRO_PATH},
        {"@type": "Offer", "name": SERIES + " series: Microneedling (5 sessions)", "price": money(ADS_OFFERS["series"]["now"]),
         "priceCurrency": "USD", "url": SITE + ADS_MICRO_PATH},
    ]
    # A short business record so the service provider id resolves. No condition list.
    biz = {
        "@context": "https://schema.org",
        "@type": "HealthAndBeautyBusiness",
        "@id": f"{SITE}/#business",
        "name": NAME,
        "url": SITE + "/",
        "telephone": PHONE_TEL,
        "image": f"{SITE}/assets/logo-seal.png",
        "address": {"@type": "PostalAddress", "streetAddress": ADDR["street"], "addressLocality": ADDR["city"],
                    "addressRegion": ADDR["region"], "postalCode": ADDR["zip"], "addressCountry": "US"},
    }
    return main, hero_preload, [biz, faq_ld(faqs), ld_service]


def offer_book_pages():
    """Ads checkout pages. noindex, not in the menu or the sitemap. The server charges APPT_SERVICES, not the page."""
    if not BOOKAPI:
        return
    pages = [
        dict(slug=ADS_BOOK_FIRST, name="Microneedling, first visit", price=ADS_OFFERS["single"]["now"],
             lede="First-time visitor price. 90 minutes, with herbal serums and red light.",
             extra="This visit is 90 minutes. The time you pick is the visit itself."),
        dict(slug=ADS_BOOK_SERIES, name="Microneedling, Five Element series", price=ADS_OFFERS["series"]["now"],
             lede="Five sessions, 90 minutes each. This payment covers the series.",
             extra="The time you pick is the first session. The other four are scheduled with you after this visit."),
    ]
    for spec in pages:
        slug = spec["slug"]
        if slug in BY_SLUG:
            sys.exit(f"{slug} must not be an organic service")
        gl = f' data-skin-intake="{e(SKIN_INTAKE)}"' if SKIN_INTAKE else ""
        main = f'''<section class="cf"><div class="wrap cf-wrap sch-wrap">
<p class="crumbs"><a href="{ADS_MICRO_PATH}">Microneedling offer</a> / {e(spec["name"])}</p>
<h1>{e(spec["name"])}</h1>
<p class="lede">{e(spec["lede"])}</p>
<p><strong>90 minutes &middot; ${spec["price"]:,}</strong> &middot; {e(ADDR_LINE)}</p>
<p>{e(spec["extra"])}</p>
<div id="sched" class="sch" data-endpoint="{e(BOOKAPI)}" data-service="{e(slug)}"{gl}>
  <p class="sch-status notice" role="status" aria-live="polite" hidden></p>
  <div class="sch-cal" aria-busy="true"><p class="sch-finding" role="status">Finding open times…</p><div class="sch-grid" aria-hidden="true">{"".join(f'<span class="sch-dow">{d}</span>' for d in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"))}{"".join('<span class="sch-day sk"></span>' for _ in range(35))}</div></div>
  <div class="sch-times"></div>
  <div class="sch-details"></div>
  <noscript><p class="notice">To book, text <a href="sms:{PHONE_TEL}">{PHONE_DISPLAY}</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></noscript>
</div>
<ul class="cf-facts"><li><strong>Where:</strong> {e(ADDR_LINE)}</li><li><strong>Payment:</strong> taken when you book your time. Nothing is booked until payment goes through.</li><li><strong>Cancelling:</strong> up to 24 hours ahead, the visit is released. Less than 24 hours' notice is charged ${LATE_FEE}.</li></ul>
<p class="fine"><a href="{ADS_MICRO_PATH}">Back to the offer</a>. Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a>.</p>
</div></section><script src="/assets/booking.js" defer></script>'''
        built = page(f"/book/{slug}", f"Book {spec['name']} | {NAME}", f"Book {spec['name']} at Full Lotus Health in Burbank.",
                     main, noindex=True, focus=True, head_extra=booking_head(slug))
        if "offer-pop" in built or re_free(built):
            sys.exit(f"/book/{slug} failed the ads wording check")
        OUT[f"book/{slug}.html"] = built


def re_free(html):
    return _re.search(r"(?<!-)\bfree\b", html, _re.I)


def offer_landing():
    """Dedicated Google Ads page. noindex, not in the sitemap, not in the menu."""
    for href, label in NAV:
        targets = [h for h, _ in label] if isinstance(label, list) else [href]
        if ADS_MICRO_PATH in targets:
            sys.exit(f"{ADS_MICRO_PATH} must stay out of the site nav")
    main, preload, ld = ads_micro_page()
    built = page(
        ADS_MICRO_PATH,
        "Ancient Healing Meets Modern Microneedling | Full Lotus Health",
        "A 90-minute microneedling visit in Burbank with a licensed acupuncturist, custom Chinese herbal serums, and red light.",
        main,
        ld=ld,
        noindex=True,
        book_slug=ADS_BOOK_FIRST if ADS_OFFER_BOOKING_LIVE else "medical-microneedling-session",
        footer_map=False,
        head_extra=preload,
        chrome="ads",
    )
    if "offer-pop" in built:
        sys.exit("ads page must not include the site percent popup")
    live_first = f'href="/book/{ADS_BOOK_FIRST}"' in built
    live_series = f'href="/book/{ADS_BOOK_SERIES}"' in built
    if ADS_OFFER_BOOKING_LIVE:
        if not live_first or not live_series:
            sys.exit("ads Book buttons must use the offer booking pages while ADS_OFFER_BOOKING_LIVE is true")
    elif live_first or live_series:
        sys.exit("ads Book buttons must stay on the regular links until ADS_OFFER_BOOKING_LIVE is true")
    OUT["microneedling-burbank-offer.html"] = built


def nano_page(where):
    na = BY_SLUG["facial-nano-needling"]
    hero_html = g_hero("l", "Nanoneedling · Burbank", "Nanoneedling in Burbank, CA",
        "A gentle facial with custom serums and red light therapy. No downtime.",
        ["60-minute sessions", "No downtime", "Custom serums", "Red light therapy included"], art.nano_layers())
    how = f"""<section><div class="wrap">
{g_head("How it works", "Gentle at the surface, absorbed where you need it")}
{g_steps([("needle", "Surface channels", "Ultra-fine nano-tips open microscopic channels in the very surface of the skin, without going deeper."),
          ("drop", "Better absorption", "The channels let hyaluronic acid, vitamins, and custom serums absorb better, where your skin needs them. The herbs help increase collagen."),
          ("glow", "A brighter look", "Skin often looks brighter right away and keeps improving over the following days.")])}
</div></section>"""
    help_ = f"""<section class="wash-l"><div class="wrap">{g_head("Who it suits", "Nanoneedling is a good fit for")}
{g_cards([("drop", "Dull, dehydrated, or tired-looking skin", None), ("lines", "Fine lines and uneven texture", None),
          ("leaf", "Sensitive skin", "Skin that doesn't do well with stronger treatments."), ("spark", "A glow before an event", None),
          ("repeat", "Maintenance", "Between microneedling sessions."),
          ("chat", "Not sure it fits?", f'<a href="sms:{PHONE_TEL}">Text a question</a> or book a session and we will decide together.')])}
<p class="g-cta-row">{book_btn("Book a treatment")}</p></div></section>"""
    why = g_why("deep-l", [("bottle", "Custom serums", "Chosen for your skin."),
                           ("light", "Red light therapy included", "Part of every session."),
                           ("heart", "Your whole health", "Trained in Chinese medicine, he looks at your skin as part of your whole health, not in isolation.")])
    table = f'<section><div class="wrap">{g_table("A natural path to glowing skin", "Nourish your skin naturally, instead of stripping, heating or injecting it.", NANO_TABLE, [PEELS, LASER, INJECT])}</div></section>'
    compare = f'<section class="wash-l"><div class="wrap">{g_head("Which treatment", "Nanoneedling or microneedling?")}{g_compare("nano")}</div></section>'
    session = g_session("sand", g_head("Your visit", "What happens at Full Lotus Health", "Sessions are 60 minutes."),
        [("bottle", "Serums chosen", "Roozbeh chooses the herbal serums for your skin."),
         ("needle", "Nano-tips", "A gentle treatment at the surface of the skin."),
         ("light", "Red light therapy", "Included with every session."),
         ("tea", "Back to your day", "There is no downtime, so you can go straight back to your day.")],
        "<h3>It works on its own or as a series</h3><p>Nanoneedling suits a one-off glow and also works as a regular series. Your first visit starts the conversation about what fits your skin.</p>",
        "treatment-nanoneedling", "Nanoneedling treatment at Full Lotus Health in Burbank")
    say = f'<section><div class="wrap">{g_head("Patients", "What patients say")}{g_quotes("facial-nano-needling")}</div></section>'
    faq = f"""<section class="wash-l"><div class="wrap g-faq">{faq_block([
  ("Is there downtime after nanoneedling?", "No. You can go straight back to your day."),
  ("How long is a session?", "Sixty minutes."),
  ("Who does the treatment?", "Roozbeh Ghobadpour, L.Ac., a licensed acupuncturist with over 10 years of clinical experience."),
  ("Nanoneedling or microneedling?", "Nanoneedling is a surface-level treatment for glow and hydration. <a href=\"/microneedling-burbank\">Microneedling</a> works deeper, for scarring, lines, and thinning hair. If you're not sure which fits, book a session and we'll decide together, or text a question."),
  ("Can I do nanoneedling as a series?", "Yes. It works well on its own or as a regular series."),
  ("Where is the clinic?", where),
])}</div></section>"""
    offer = g_offer("nanoneedling facial", "Nourishing serums, a natural glow and red light therapy, with no downtime, at a welcome price for your first visit.")
    return (hero_html + how + help_ + g_series_promo("wash-l", "facial-nano-needling") + why + table + compare + session + say + faq + offer,
            g_related(na, [("/microneedling-burbank", "Microneedling in Burbank"), ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture in Burbank")]))



def landing_pages():
    """Guide pages for the three searches that matter most. No prices here (fees stay on the service pages).
    Microneedling and nanoneedling use the rich layout (micro_page, nano_page); cosmetic acupuncture uses the plain one."""
    mi, na, li = BY_SLUG["medical-microneedling-session"], BY_SLUG["facial-nano-needling"], BY_SLUG["full-lotus-lift"]
    def link(slug, label=None):
        return f'<a href="/service-page/{slug}">{e(label or BY_SLUG[slug]["name"])}</a>'
    where = f"Full Lotus Health is at {ADDR_LINE}, convenient to Glendale, Toluca Lake, North Hollywood, and Studio City."
    pages = [
      dict(path="/microneedling-burbank", file="microneedling-burbank.html", svc=mi, tone="c",
           title="Microneedling in Burbank, CA from $500 | Full Lotus Health",
           meta="Microneedling in Burbank from a licensed acupuncturist: Chinese medicine for your skin, with Full Lotus Skin serums and red light therapy. 90 minutes, $500.",
           h1="Microneedling in Burbank, CA", rich=lambda: micro_page(where), book="medical-microneedling-session", priced=True,
           more=[("/nanoneedling-burbank", "Nanoneedling in Burbank"), ("/cosmetic-acupuncture-burbank", "Cosmetic acupuncture in Burbank")]),
      dict(path="/nanoneedling-burbank", file="nanoneedling-burbank.html", svc=na, tone="l",
           title="Nanoneedling Burbank: Gentle Glow Facial | Full Lotus Health",
           meta="Nanoneedling facial in Burbank: a gentle, no-downtime surface treatment with herbal serums and red light therapy for glowing, hydrated skin.",
           h1="Nanoneedling in Burbank, CA", rich=lambda: nano_page(where),
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
    global BOOK_HERE
    for pg in pages:
        svc = pg["svc"]
        BOOK_HERE = svc["slug"]
        if "rich" in pg:
            rich = pg["rich"]()
            book = pg.get("book")
            closing = rich[3] if len(rich) > 3 else cta("Ready to book?", "Choose a time that works for you.", "Book a treatment", slug=book)
            main = rich[0] + rich[1] + closing
            extra_ld = rich[2] if len(rich) > 2 else []
            OUT[pg["file"]] = page(pg["path"], pg["title"], pg["meta"], main,
                ld=[business_ld(), service_ld(svc, url=SITE + pg["path"], desc=pg["meta"], priced=pg.get("priced", False)),
                    breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments"), (pg["h1"], pg["path"])])] + extra_ld,
                book_slug=book)
            continue
        more = "".join(f'<li><a href="{h}">{e(t)}</a></li>' for h, t in pg["more"])
        main = hero(e(pg["h1"]), e(pg["lede"]), crumbs=[("Home", "/"), ("Natural beauty", "/treatments")], tone=pg["tone"]) + pg.get('extra', '') + f"""
<section><div class="wrap split">
  <div>
    <p>{book_btn("Book a treatment")}</p>
    <p class="fine">Fees and booking are on the <a href="/service-page/{svc['slug']}">{e(svc['name'])}</a> page. Questions? <a href="sms:{PHONE_TEL}">Text {PHONE_DISPLAY}</a> or <a href="mailto:{EMAIL}">email</a>.</p>
    <h2 class="h3" style="margin-top:2rem">Also see</h2>
    <ul class="checks">{more}<li><a href="/treatments">All natural beauty treatments</a></li></ul>
  </div>
  <div>{pg['body']}</div>
</div></section>""" + cta("Ready to book?", "Choose a time that works for you.", "Book a treatment")
        OUT[pg["file"]] = page(pg["path"], pg["title"], pg["meta"], main,
            ld=[business_ld(), service_ld(svc, url=SITE + pg["path"], desc=pg["meta"], priced=False),
                breadcrumb_ld([("Home", "/"), ("Natural beauty", "/treatments"), (pg["h1"], pg["path"])])])
    BOOK_HERE = None


def condition_pages():
    """Skin conditions. No prices (fees stay on the service pages); visits book as acupuncture or an online consultation."""
    where = f"Full Lotus Health is at {ADDR_LINE}, convenient to Glendale, Toluca Lake, North Hollywood, and Studio City."
    acu, onl = "acupuncture-initial-treatment", "initial-consultation-online"
    pages = [
      dict(path="/skin-conditions-burbank", file="skin-conditions-burbank.html", tone="c",
           name="Chinese medicine for skin conditions",
           crumbs=[("Home", "/"), ("Natural beauty", "/treatments")],
           title="Chinese Medicine for Skin Conditions | Full Lotus Health",
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

{faq_block([
  ("How long until I see a change?", "Skin conditions change gradually. Many people need a few months of treatment, with regular follow-ups to adjust the formula."),
  ("Can I do this online?", f"Yes. Herbal treatment works well by <a href=\"/service-page/{onl}\">online consultation</a>, though seeing your skin in person at the first visit helps."),
  ("Is this the same as microneedling?", "No. <a href=\"/microneedling-burbank\">Microneedling</a> and <a href=\"/nanoneedling-burbank\">nanoneedling</a> are cosmetic treatments for lines, scars, and texture. Needling isn't done on skin that is actively inflamed, so conditions like eczema or active breakouts are treated from the inside first."),
  ("Where is the clinic?", where),
])}
""", more=[("/acupuncture#herbal-medicine", "Chinese herbal medicine"), ("/microneedling-burbank", "Microneedling in Burbank"), ("/treatments", "All natural beauty treatments")]),
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


def llms_txt():
    """Plain-language summary for AI assistants, served at /llms.txt. Prices come from SERVICES so they never drift."""
    def svc_lines(group):
        out = []
        for s in SERVICES:
            if s["group"] != group:
                continue
            mins = f", {s['minutes']} min" if s.get("minutes") else ""
            blurb = ADS_SAFE_SHORT.get(s["slug"], s["short"])
            out.append(f"- [{s['name']}]({SITE}/service-page/{s['slug']}): ${s['price']}{mins}. {blurb}")
        return "\n".join(out)
    series_line = series_offers()
    intake_link = INTAKE or f"{SITE}/new-patients"
    return f"""# {NAME}

> Acupuncture and Chinese medicine clinic in Burbank, CA, run by one licensed acupuncturist and focused on skin: microneedling, nanoneedling, and cosmetic acupuncture. Practitioner: Roozbeh Ghobadpour, L.Ac. (California acupuncture license #17220, NCCAOM Board-Certified Diplomate), in practice since 2016. "The calmest hour of your week."

## Quick facts
- Address: {ADDR_LINE}
- Parking: {PARKING} (N Glenoaks Blvd.)
- Hours: {HOURS}
- Phone or text: {PHONE_DISPLAY} · Email: {EMAIL}
- Serves Burbank, Glendale, Toluca Lake, North Hollywood, and Studio City
- Self-pay clinic. Payment is taken when you book. Nothing is booked until payment goes through. Book online: {SITE}/book-online
- Cancellation: free up to {NOTICE_HOURS} hours ahead. Less than {NOTICE_HOURS} hours' notice, or a no-show, is charged ${LATE_FEE}. Call or text to cancel.
- New patients complete the intake form before the first visit: {intake_link}
- {SERIES}: five sessions through Wood, Fire, Earth, Metal, and Water, with red light therapy included. {series_line}. {SITE}/five-element-rejuvenation
- {acu_pack_line()}. {ACU_PACK_HOW}
- Tea ceremonies are booked by text at {PHONE_DISPLAY}. Weekly tea sits: {SITE}/tea-sits
- Google reviews: {GOOGLE_REVIEWS}
- In California, microneedling may be performed by physicians and licensed acupuncturists.

## Skin and beauty treatments
{svc_lines("beauty")}

## Acupuncture and herbal medicine
{svc_lines("acu")}
- Also offered: Chinese herbal medicine (including for skin conditions), cupping, moxibustion, therapeutic massage.

## Online consultations
{svc_lines("consult")}

## Tea ceremonies
{svc_lines("tea")}

## About the practitioner
Roozbeh Ghobadpour, L.Ac., holds an M.A. in Traditional Chinese Medicine from Yo San University (2015) and a B.A. from UCLA. He has over 10 years of clinical experience, is continuing advanced study in Chinese medicine dermatology, and is the Head Chinese Medicine Writer for Global Tea Hut magazine.

## Key pages
- [Skin and beauty treatments]({SITE}/treatments)
- [Microneedling in Burbank]({SITE}/microneedling-burbank)
- [Nanoneedling in Burbank]({SITE}/nanoneedling-burbank)
- [Cosmetic acupuncture in Burbank]({SITE}/cosmetic-acupuncture-burbank)
- [Skin conditions]({SITE}/skin-conditions-burbank)
- [Acupuncture and herbs]({SITE}/acupuncture)
- [Tea ceremonies]({SITE}/tea-ceremonies)
- [New patients]({SITE}/new-patients)
- [Book online]({SITE}/book-online)

## Blog
{chr(10).join(f"- [{p['title']}]({SITE}/post/{p['slug']}): {p['desc']}" for p in POSTS)}
"""


def chat_facts():
    """Facts for the chat bubble. Prices and fees come from SERVICES, PACKAGES, and the constants above."""
    services = []
    for s in SERVICES:
        href, label = service_book(s)
        services.append({
            "slug": s["slug"],
            "name": s["name"],
            "price": s["price"],
            "minutes": s["minutes"],
            "group": s["group"],
            "short": ADS_SAFE_SHORT.get(s["slug"], s["short"]),
            "book": href,
            "bookLabel": label,
            "page": CANON_PAGE.get(s["slug"], "/service-page/" + s["slug"]),
        })
    return {
        "clinic": NAME,
        "practitioner": "Roozbeh Ghobadpour, L.Ac.",
        "credentials": (
            "California acupuncture license #17220. NCCAOM Board-Certified Diplomate. "
            "M.A. in Traditional Chinese Medicine from Yo San University (2015), and a B.A. from UCLA. "
            "In practice since 2016, and the only practitioner at the clinic. "
            "Head Chinese Medicine Writer for Global Tea Hut magazine."
        ),
        "phone": PHONE_DISPLAY,
        "phoneTel": PHONE_TEL,
        "email": EMAIL,
        "address": ADDR_LINE,
        "parking": PARKING,
        "hours": HOURS,
        "payment": "Payment is taken when you book your time. Nothing is booked until payment goes through.",
        "lateFee": LATE_FEE,
        "noticeHours": NOTICE_HOURS,
        "selfPay": "This is a self-pay clinic.",
        "also": "Chinese herbal medicine, cupping, moxibustion, and therapeutic massage are also offered. A fee for those is not listed on the site. Text the clinic and ask.",
        "intakeHref": INTAKE or "/new-patients",
        "bookOnline": "/book-online",
        "teaSitsHref": "/tea-sits",
        "teaSitsBlurb": "Weekly tea sits are an hour of tea, mostly in silence, with five seats: Tuesday, Wednesday and Thursday at 8:30 AM and Friday at 3 PM. Dates are on the tea sits page, or text to find another time.",
        "mapsGoogle": MAPS,
        "mapsApple": MAPS_APPLE,
        "series": {
            "name": SERIES,
            "href": "/five-element-rejuvenation",
            "summary": (
                f"{SERIES} is a five-session journey through Wood, Fire, Earth, Metal, and Water, "
                "with red light therapy included. You can take it as cosmetic acupuncture, nanoneedling, or microneedling."
            ),
            "packages": [
                {"slug": slug, "name": BY_SLUG[slug]["name"], "price": p["price"], "sessions": 5}
                for slug, p in PACKAGES.items()
            ],
        },
        "acupuncturePackage": {"name": ACU_PACK["name"], "slug": ACU_PACK_SLUG, "price": ACU_PACK["price"],
                               "visits": ACU_PACK["visits"], "summary": acu_pack_line() + ". " + ACU_PACK_HOW},
        "services": services,
        "posts": [chat_post(p) for p in POSTS],
    }


# Words that show up in almost every title, so they would not tell one post from another.
_CHAT_STOP = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "from", "your", "you",
    "it", "is", "how", "what", "which", "vs", "with", "by", "be", "are", "this", "that", "its",
    "as", "into", "about", "right", "burbank", "full", "lotus", "health",
}


def chat_post_keywords(title, tags):
    """Keywords the chat uses to notice a post. Built from the title and any tags, so a new post needs no hand list."""
    tokens = _re.findall(r"[a-z0-9]+", (title or "").lower())
    content = [t for t in tokens if t not in _CHAT_STOP and len(t) >= 3]
    keys = []
    for t in content:
        if t not in keys:
            keys.append(t)
    for a, b in zip(content, content[1:]):
        phrase = f"{a} {b}"
        if phrase not in keys:
            keys.append(phrase)
    for tag in tags or []:
        t = tag.strip().lower()
        if t and t not in keys:
            keys.append(t)
    return keys


def chat_post(p):
    sentences = _re.split(r"(?<=[.!?])\s+", (p["desc"] or "").strip())
    return {
        "title": p["title"],
        "href": f"/post/{p['slug']}",
        "summary": " ".join(s for s in sentences[:2] if s),
        "keywords": chat_post_keywords(p["title"], p.get("tags")),
    }


def seo_files():
    urls = ["/", "/treatments", "/acupuncture", "/tea-ceremonies", "/tea-sits", "/new-patients", "/book-online", "/five-element-rejuvenation", "/microneedling-burbank", "/nanoneedling-burbank", "/cosmetic-acupuncture-burbank", "/skin-conditions-burbank"] + (["/blog"] + [f"/post/{p['slug']}" for p in POSTS] if POSTS else []) + [f"/service-page/{s['slug']}" for s in SERVICES if s["slug"] not in CANON_PAGE and s["slug"] not in SEARCH_CANON]
    if ADS_MICRO_PATH in urls or any(ADS_BOOK_FIRST in u or ADS_BOOK_SERIES in u for u in urls):
        sys.exit("the ads landing page and its booking pages must stay out of the sitemap")
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        post = next((q for q in POSTS if u == f"/post/{q['slug']}"), None)
        pri = "0.6" if post else "1.0" if u == "/" else ("0.9" if u == "/treatments" or "burbank" in u or "needling" in u or "lift" in u else "0.7")
        sm.append(f"<url><loc>{SITE}{u if u != '/' else '/'}</loc><lastmod>{post['date'] if post else TODAY}</lastmod><priority>{pri}</priority></url>")
    sm.append("</urlset>")
    OUT["sitemap.xml"] = "\n".join(sm) + "\n"
    OUT["robots.txt"] = (
        "User-agent: *\nAllow: /\n\n"
        f"# {ADS_MICRO_PATH} is a Google Ads landing page. It carries a noindex meta tag\n"
        "# and is omitted from the sitemap so it does not compete with /microneedling-burbank.\n"
        "# It is not disallowed: crawlers need to fetch the page to see the noindex tag.\n\n"
        f"Sitemap: {SITE}/sitemap.xml\n"
    )
    OUT["llms.txt"] = llms_txt()
    OUT["assets/chat-facts.json"] = json.dumps(chat_facts(), ensure_ascii=False, indent=2) + "\n"
    OUT["CNAME"] = "www.fulllotushealth.com\n"
    OUT[".nojekyll"] = ""


for fn in (home, treatments, acupuncture, consult, tea, tea_sits, book_online, confirm_pages, offer_book_pages, five_element, ten_years, blog, new_patients, service_pages, landing_pages, offer_landing, condition_pages, blog_posts, feed, notfound, seo_files):
    fn()

for rel, content in OUT.items():
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
print(f"Built {len(OUT)} files.")
