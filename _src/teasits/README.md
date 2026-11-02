# Tea sit reservations

The page at /tea-sits lists upcoming tea sits with seats left. Guests reserve, pay with Stripe, and get a confirmation email. You get an email for each reservation, and every reservation is a row in a Google Sheet.

## How the schedule works
- Any event in the info@fulllotushealth.com Google Calendar with **"Tea sit"** in its title shows up on the page (up to 8 weeks ahead).
- Default: 6 seats, $25 a seat. To change one sit, put these lines in the event's description:
  ```
  Seats: 4
  Price: 45
  ```
  `Price: 0` makes it free (no payment step).
- Online booking closes 1 hour before the start. Cancel a sit by deleting the event (email anyone already booked).
- A weekly sit is just a repeating calendar event.

## One-time setup (about 15 minutes)
1. **Stripe:** In the Stripe dashboard, go to Developers > API keys and create a **restricted key** with *Checkout Sessions: Write* (everything else None). Copy it (starts with `rk_live_`).
2. **Sheet:** Signed in as info@fulllotushealth.com, create a Google Sheet named "Full Lotus Tea Sits".
3. **Script:** In the sheet: Extensions > Apps Script. Replace the code with `Code.gs` from this folder. Save.
4. **Settings:** Project Settings (gear) > Script properties > add `STRIPE_SECRET_KEY` = the key from step 1.
   Optional: `DEFAULT_PRICE` (25), `DEFAULT_SEATS` (6), `CUTOFF_MINUTES` (60), `NOTIFY_EMAIL` (info@fulllotushealth.com).
5. **Run setup:** In the editor, choose the `setup` function and click Run. Approve the permissions (calendar, sheet, email, outside requests to Stripe). It creates the Reservations tab and a 10-minute check that catches anyone who paid but closed the window early.
6. **Deploy:** Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone. Copy the Web app URL (ends in /exec).
7. Put that URL in `_src/config.json` as `teasits_url`, run `python3 _src/build.py`, commit and push.

After any change to Code.gs: Deploy > Manage deployments > Edit > Version: New version, so the URL stays the same.

## Day to day
- Reservations tab: Status is `paid`, `pending` (paying right now, seat held 35 min), `expired` or `cancelled`.
- Someone cancels: refund in Stripe if you choose to, then change their row's Status to `cancelled`. The seat reopens on the site.
- Taking a reservation by text: add a row yourself with the Sit ID copied from another row for that sit, Seats, and Status `paid`.

To test before going live, use a Stripe **test** key (`rk_test_`/`sk_test_`) and card 4242 4242 4242 4242, then swap in the live key.
