# Online appointment booking

The page at `/book/<service>` lets patients pick a day, pick a time, give their details and pay with Stripe. The booking lands on the **info@fulllotushealth.com** Google Calendar as an event (with the patient invited), and you get an email. It runs in the **same Apps Script project as the tea sits**, so it uses the same Stripe key, Google Sheet, 10-minute check and web app URL. No new accounts or keys.

## Make the calendar answer faster (do this once)

The website already shows the calendar straight away and remembers open times for a few minutes. Google itself still does the slow part until you paste the new script. Nothing else about booking changes: the same web address, the same Stripe payments, and the same Google calendar page if the custom calendar cannot load.

You are updating the script you already have. Do **not** create a new deployment. A new deployment would change the web address and the website would stop talking to it.

1. Open [script.google.com](https://script.google.com) and open the Full Lotus project that already runs tea sits and booking (the one whose web app address matches `teasits_url` in `_src/config.json`).
2. On the left, click **Booking**.
3. Click in the code, select everything (Ctrl+A, or Cmd+A on a Mac), and delete it.
4. Open `_src/booking/Booking.gs` from this project (on GitHub, open the file and click **Raw**). Select all of it, copy, and paste it into the empty Booking file.
5. Click the save icon (the floppy disk). You do not need to change `Code.gs`.
6. At the top, open the function menu (it usually says `setup`). Choose **apptInstallCache**. Click **Run**.
7. If Google asks for permission, click **Allow**. This uses the same calendar access the script already has, and adds a timer that refreshes open times every 5 minutes.
8. Wait until the bottom says the run finished. If it says "Execution completed", it worked.
9. Click **Deploy**, then **Manage deployments**.
10. On the deployment that is already live, click the pencil.
11. Under **Version**, choose **New version**. Leave the web app address as it is. Click **Deploy**.

Do not click **New deployment**. The address must keep ending in the same `/exec`.

After this, the first person to open a booking page in a five-minute stretch gets the saved open times instead of waiting on a fresh calendar read. When someone actually books, that saved copy is thrown away, and the payment step always checks the live calendar again so two people cannot take the same time. If Google cannot answer, the page still offers your Google Appointment Schedule.

## How it works
- **The calendar is the source of truth.** Anything on it that is not marked "free" takes up a treatment room. Two visits can overlap (two rooms), but no two start at the same moment.
- **Hold:** put the word `hold` in an event's title to block that time without saying why. An all-day event blocks the whole day. Tea sits block their time.
- **Nothing is booked until it is paid.** The calendar event is created only after Stripe confirms payment. A cancelled or abandoned checkout never touches the calendar; it only shows as `cancelled` or `expired` in the sheet.
- **What patients see:** Monday, Wednesday and Friday only; at most 3 times a day, preferring times beside an existing visit, leaving out the first and last hour on a day that already has visits, and varying which free times show from day to day. A Tuesday or Thursday opens for a week only when that week's Monday/Wednesday/Friday have no times left. At least 24 hours' notice, up to 21 days ahead. A day with no times offers a waitlist; "Request a date" covers anything further out. Both arrive as an email and a row in the **Waitlist** tab.
- **Honest by design:** the page limits what it shows, but it always says "text us" and never claims you are fully booked.

## Settings (Apps Script > Project Settings > Script properties; all optional)
| Property | Default | What it does |
|---|---|---|
| `APPT_CORE_DAYS` | `1,3,5` | Days offered first (1 = Mon ... 7 = Sun) |
| `APPT_EXTRA_DAYS` | `2,4` | Opened for a week once its core days are full |
| `APPT_OPEN_EXTRA` | `true` | `false` keeps the extra days closed |
| `APPT_START` / `APPT_END` | `10:00` / `17:00` | Earliest start, latest finish |
| `APPT_MAX_VISIBLE` | `3` | Times shown per day |
| `APPT_ROTATE` | `true` | Vary which free times show |
| `APPT_NOTICE_HOURS` | `24` | Minimum notice |
| `APPT_WINDOW_DAYS` | `21` | How far ahead to show |
| `APPT_CAPACITY` | `2` | Treatment rooms |

## Setup (about 5 minutes, in the existing tea sits Apps Script project)
1. Add a new script file named `Booking` and paste `Booking.gs` into it.
2. Replace `Code.gs` with `_src/teasits/Code.gs` (it now hands `appt_` requests to Booking.gs).
3. Run `setup` once and approve the new permissions (it creates the Appointments and Waitlist tabs).
4. Deploy > Manage deployments > Edit > Version: **New version**, so the URL stays the same.
5. Rebuild and push the site (`python3 _src/build.py`). `booking_api_url` in `_src/config.json` defaults to `teasits_url`.

Service prices and lengths live in `Booking.gs` (`APPT_SERVICES`) and in `SERVICES` in `build.py`. The build refuses to run if they differ.

## Tests
`node _src/booking/test_engine.js` checks the slot rules (days, notice, two rooms, holds, rotation, daylight saving) against made-up calendars.

## Not built yet
Patients cancel or reschedule by text, as before. When you do, edit or delete the calendar event and mark the row in the Appointments tab as `cancelled`; refund in Stripe if you choose to.
