# Online appointment booking

The page at `/book/<service>` lets patients pick a day, pick a time, give their details and pay with Stripe. The booking lands on the **info@fulllotushealth.com** Google Calendar as an event (with the patient invited), and you get an email. It runs in the **same Apps Script project as the tea sits**, so it uses the same Stripe key, Google Sheet, 10-minute check and web app URL. No new accounts or keys.

## Make the calendar load fast (do this once)

Google Apps Script is slow no matter what the website does: every visit waits a second or more while it wakes up and reads the calendar. This setup takes it out of the visit. Every 5 minutes Apps Script saves the open times as a small file on GitHub, and the booking page reads that file first (about a tenth of a second). It asks Apps Script only if the file is missing or more than 90 minutes old, so the page keeps working if anything below stops.

Nothing about booking itself changes. The payment step always checks the live calendar again, so a slightly old list can never double-book a time. The worst a visitor can see is a time that was taken in the last ten minutes or so, and they get the usual "that time was just taken" message.

You are updating the script you already have. Do **not** create a new deployment. A new deployment would change the web address and the website would stop talking to it.

**Part A: a GitHub token (2 minutes)**
1. On GitHub, open Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > **Generate new token**.
2. Name it `open times`. Expiration: 1 year (put a reminder in your calendar; when it expires the page just goes back to the slower calendar).
3. Repository access: **Only select repositories**, then choose `fulllotushealth`.
4. Permissions > Repository permissions > **Contents: Read and write**. Leave everything else off.
5. Generate, and copy the token. It starts with `github_pat_`. You will not see it again.

**Part B: Apps Script (5 minutes)**
1. Open [script.google.com](https://script.google.com) and open the Full Lotus project that already runs tea sits and booking (the one whose web app address matches `teasits_url` in `_src/config.json`).
2. On the left, click **Booking**. Select everything in the code (Ctrl+A or Cmd+A), delete it, then paste in all of `_src/booking/Booking.gs` from this project (on GitHub, open the file, click **Raw**, select all, copy). Save (floppy disk icon). You do not need to change `Code.gs`.
3. On the left, click the gear (**Project Settings**). Under **Script properties**, click **Add script property**. Name: `GITHUB_TOKEN`. Value: the token. Save.
4. Back in the editor, pick **apptInstallCache** in the function menu and click **Run**. Google will ask for permission, because it now needs to connect to GitHub. Click **Allow**. Wait for "Execution completed".
5. **Deploy** > **Manage deployments** > the pencil on the live deployment > Version: **New version** > **Deploy**. Do not click New deployment.

**Part C: check it worked**
1. In the editor, open **Executions** (left side). The most recent `apptWarm` run should say Completed. If you see a red error mentioning `github`, the token or its permissions are wrong; redo Part A.
2. Open `https://raw.githubusercontent.com/roozbehtea/fulllotushealth/slots/slots/slots.json` in a browser. You should see your open times. (GitHub may take a minute to show a new file.)
3. Open a booking page. The calendar should appear almost at once.

The file lives on its own `slots` branch, so it never touches the website's `main` branch or your Pages build. Every 5 minutes it is checked; it is only rewritten when the open times change, plus about once an hour so the page can tell it is still being refreshed.

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
`node _src/booking/test_publish.js` checks the saved copy: Booking.gs writing it to GitHub, and the page using it or falling back (run `python3 _src/build.py` first).

## Not built yet
Patients cancel or reschedule by text, as before. When you do, edit or delete the calendar event and mark the row in the Appointments tab as `cancelled`; refund in Stripe if you choose to.

## Prepaid packages

Patients with a prepaid package are booked online without Stripe. Packages live in the `Packages` tab of the clinic EHR spreadsheet ("Full Lotus Clinic"; override the file with the `PACKAGES_SHEET_ID` script property).

- On a booking request, `apptBook_` looks for an **Active** package with visits left that covers the booked service and matches the email (any case) or the last 10 digits of the phone. Oldest purchase first.
- Match: the booking is written as paid ("Stripe session" column holds `pkg|PKG-0001|visits left|total|appt id`), one visit is counted off (`VisitsUsed`, `UsageLog`, `Status` becomes `Used up` at zero), a line goes to the EHR `AuditLog`, and the usual calendar event and emails follow, with the package line added. All inside the same lock as a paid booking, so a double click uses one visit.
- No match, wrong service, or the Packages tab cannot be read: the normal Stripe flow, unchanged.
- `PKG_COVERS` in `Booking.gs` says which booking services a package label pays for. The 5-visit "Acupuncture" package covers repeat treatments only.
- Cancelling a package booking is manual for now: lower `VisitsUsed` in the Packages tab.
- The script must be allowed to open the EHR spreadsheet (Google asks for a one-time re-authorization when the new code first runs).
