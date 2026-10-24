# Full Lotus Health website

Static HTML/CSS site for https://www.fulllotushealth.com, hosted on GitHub Pages.

- No forms and no patient data. Contact is phone, text and email links only.
- Booking buttons go to the Google Calendar booking page. The New patients page links to the Google Form intake.
- Page addresses match the old Wix site (`/treatments`, `/acupuncture`, `/consult-heal`, `/tea-ceremonies`, `/book-online`, `/blog`, `/service-page/<slug>`).

## Edit and publish

1. Put the two Google links in `_src/config.json` (`booking_url`, `intake_url`).
2. `python3 _src/build.py --launch` (refuses to build while either link is empty).
3. Commit and push to `main`. GitHub Pages publishes within a minute.

Copy lives in `_src/build.py`; styling in `assets/style.css`; logo in `assets/logo.svg`.
The seal in `assets/logo.svg` is a stand-in. Replace it with the real logo file (keep the filename, or update the references).
