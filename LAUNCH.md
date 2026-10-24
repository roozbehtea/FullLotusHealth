# Launch checklist

## Before DNS
1. Put the Google Calendar booking link and the intake Google Form link in `_src/config.json`.
2. Logo is already in place (`assets/logo-*.svg`, favicons). Add real photos of the clinic and treatment room if you have them. Then rebuild: `python3 _src/build.py --launch`.
3. Confirm prices ($500 / $350 / $250) and the 60-minute length of cosmetic acupuncture.
4. Push to `main`. In the repo: Settings > Pages > Source: Deploy from a branch, `main`, `/ (root)`. Custom domain: `www.fulllotushealth.com` (the `CNAME` file already says this).
5. Check the site at `https://roozbehtea.github.io/<repo-name>/` (links to /treatments etc. need the custom domain, so check the pages by their file names there).

## DNS change at Wix (website records only)
Wix: Domains > fulllotushealth.com > Manage DNS records.

| Action | Type | Host | Value |
|---|---|---|---|
| Replace the existing website A record(s) | A | @ | 185.199.108.153 |
| Add | A | @ | 185.199.109.153 |
| Add | A | @ | 185.199.110.153 |
| Add | A | @ | 185.199.111.153 |
| Replace the existing www record | CNAME | www | roozbehtea.github.io |

Do not touch any MX record or any TXT record. They run Google Workspace email (and SPF/DKIM/verification).
Take a screenshot of the full DNS list before and after. After saving, only the A and www CNAME rows should differ.

## After DNS (usually minutes, up to a few hours)
1. GitHub > Settings > Pages: wait for "DNS check successful", then tick **Enforce HTTPS**.
2. Visit https://www.fulllotushealth.com and https://fulllotushealth.com (the bare domain redirects to www).
3. Send and receive one test email to info@fulllotushealth.com.
4. Search Console: submit `https://www.fulllotushealth.com/sitemap.xml`. Update the Google Business Profile website link only if it changed (it should not).
5. Wix: turn off auto-renew for the Business plan before Jan 2, 2027. Keep the **domain** registration renewal on (it is billed separately from the site plan).
