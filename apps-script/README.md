# Insurance benefits check (Google Apps Script)

The form on `/insurance` posts to the web app already deployed for this. The Stedi key is not in the website. It stays in Script Properties on the Apps Script project.

The page reads one constant, `var APPS_SCRIPT_URL`, at the top of `assets/insurance-check.js`. It is set to the **Website insurance check** deployment:

`https://script.google.com/macros/s/AKfycbxCx302RNfDjs3vSfebNTw8w90MyFkoxuHFkWXNc9fBAgFDpyCs0B6A8c6mgzhIWjrI/exec`

## Where it runs

The script is `apps-script/WebInsurance.gs` in the Apps Script project named **Full Lotus Clinic**. That file is the copy of what is deployed. It is a **separate web app deployment** named **Website insurance check**. The **Unsubscribe** page deployment on the same project is separate. Do not edit it, and do not deploy a new version of it, when you change the insurance check.

`WebInsurance.gs` reuses these from `Code.gs` in that project:

- `STEDI_API_KEY`
- `STEDI_ELIGIBILITY_URL`, the 2026-06-01 eligibility-check endpoint
- `stediList_`, `stediSummary_`, `settingStr_`, and `stediPayerId_`

The form sends whatever the person typed as the insurance provider. `stediPayerId_` turns that name into a payer id when it can. If it cannot, the row is saved and Stedi is not called. The check uses service type `30` (Health Benefit Plan Coverage). The browser only receives `{status:"active"}`, `{status:"inactive"}`, or `{status:"unknown"}`.

Leads are appended to a tab named **Insurance Leads** in the clinic spreadsheet (`SPREADSHEET_ID`), unless `LEADS_SHEET_ID` is set. A notice goes to `NOTIFY_EMAIL` when that property is set, and otherwise to the script owner's email. The email does not include the member ID or date of birth.

## Redeploy after an edit

The URL must stay the same. Do not create a new deployment.

1. Open [script.google.com](https://script.google.com) and open the project **Full Lotus Clinic**.
2. Edit the `WebInsurance` file so it matches `apps-script/WebInsurance.gs`. Save.
3. Deploy → Manage deployments.
4. Find the deployment named **Website insurance check**. Leave the **Unsubscribe** deployment alone.
5. Click the pencil on **Website insurance check**. Set Version to **New version**. Deploy.

Execute as stays **Me**. Who has access stays **Anyone**. The `/exec` URL does not change, so `APPS_SCRIPT_URL` does not need a new value.
