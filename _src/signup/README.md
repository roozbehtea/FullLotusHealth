# Email signup (Google Sheet)

1. Create a Google Sheet in the info@fulllotushealth.com account named "Full Lotus Signups".
2. In the sheet: Extensions > Apps Script. Replace the code with `Code.gs` from this folder. Save.
3. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone. Deploy and approve the permissions.
4. Copy the Web app URL (ends in /exec) into `_src/config.json` as `signup_url`, then rebuild and push.

After any change to Code.gs, use Deploy > Manage deployments > Edit > New version, so the URL stays the same.
Anyone who emails to unsubscribe: delete their row. If you send mailings, include the clinic address and a way to unsubscribe.
