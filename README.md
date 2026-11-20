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

A chat bubble on every page answers from the same prices and clinic facts as the build (`assets/chat-facts.json`). It needs no API key. Typed questions it does not recognize can optionally go through `_src/chat` (see that folder's README). The clinic map is on the homepage Visit section, the new-patients page, and the footer of other pages. Parking and hours live next to the address constants at the top of `_src/build.py`.
Logos in `assets/`: `logo-horizontal.svg` (header), `logo-badge.svg` (home hero), `logo-ring.svg` (spare), `logo-seal.svg` / `logo-seal.png` (footer, social image, structured data), `favicon-64.png`, `apple-touch-icon.png`.
The SVGs are auto-traced from the design-system files. Have a designer redraw them before any trademark filing.

## Clinic tools (unlisted)

`/clinic-tools/` holds Formula Maker and Point Finder, private working tools for the clinic. They are not linked from any page, not in the sitemap, and every page carries `noindex, nofollow`. Anyone with the address can still open them, and the source is public in this repo. Saved formulas and plans stay in the visitor's browser only.

Sources are in `_src/clinic-tools/`. Rebuild with `python3 _src/clinic-tools/build.py` (separate from the main site build).

`_src/clinic-tools/cli/rx.js` runs the same data and checks from the command line (`node _src/clinic-tools/cli/rx.js` for help). Claude uses it to work a case from notes and produce rows for the clinic EHR Sheet. It holds no patient data.
