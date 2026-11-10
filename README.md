# Full Lotus Health website

Static HTML/CSS site for https://www.fulllotushealth.com, hosted on GitHub Pages.

- No forms and no patient data. Contact is phone, text and email links only.
- Booking buttons go to the Google Calendar booking page. The New patients page links to the Google Form intake.
- Page addresses match the old Wix site (`/treatments`, `/acupuncture`, `/consult-heal`, `/tea-ceremonies`, `/book-online`, `/blog`, `/service-page/<slug>`).

## Edit and publish

1. Put the two Google links in `_src/config.json` (`booking_url`, `intake_url`).
2. If you added or replaced a photo, run `python3 _src/make_images.py` first (makes the small WebP copies phones download).
3. `python3 _src/build.py --launch` (refuses to build while either link is empty).
4. Commit and push to `main`. GitHub Pages publishes within a minute.

Copy lives in `_src/build.py`; styling in `assets/style.css` (colours, type and spacing follow the Full Lotus Health design system).
Logos in `assets/`: `logo-horizontal.svg` (header), `logo-badge.svg` (home hero), `logo-ring.svg` (spare), `logo-seal.svg` / `logo-seal.png` (footer, social image, structured data), `favicon-64.png`, `apple-touch-icon.png`.
The SVGs are auto-traced from the design-system files. Have a designer redraw them before any trademark filing.
