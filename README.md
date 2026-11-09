# Kristen Robertson | Cactus Ridge | eXp Realty

Static site (HTML/CSS/JS, no build step). Black x champagne gold x white.

## Folder structure
```
index.html
netlify.toml
README.md
assets/
  kristen.png          <- ADD THIS (Kristen's portrait)
  images/hero.jpg      <- OPTIONAL hero photo
css/style.css
js/config.js           <- paste Google Apps Script URL here
js/forms.js            <- validation, 5-step seller wizard, submission
js/main.js             <- menu, dialogs, smooth scroll
apps-script/Code.gs    <- paste into Google Apps Script
```

## 1. Add Kristen's portrait
Save her photo as `assets/kristen.png` (exactly that name, lowercase). It is shown with `object-fit: contain`
in a framed 4:5 box, so it is never stretched or cropped. Until the file exists, a black "KR" panel shows (no broken icon).

## 2. Hero photograph (optional)
Add a photo you have rights to as `assets/images/hero.jpg` (landscape, 2000px+ wide). If missing, the hero shows
a dark gold-tinted gradient. No stock images are bundled or hot-linked, so nothing can break or carry a watermark.

## 3. Google Sheets integration
1. Create a Google Sheet (e.g. "Kristen Website Inquiries").
2. Extensions > Apps Script. Delete the sample code, paste in `apps-script/Code.gs`, save.
3. Deploy > New deployment > type **Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and authorize.
4. Copy the Web App URL (ends in `/exec`) into `js/config.js` as `GOOGLE_SCRIPT_URL`.
5. Re-deploy the site. Submit a test inquiry; a row appears in the "Inquiries" tab (headers are created automatically).
6. If you edit the script later: Deploy > Manage deployments > Edit > New version.

No API keys or secrets are in the frontend. Until the URL is set, every form shows a "setup mode" notice and
**refuses to show a success message**. Server errors, timeouts and bad responses also show an error, never fake success.

Sheet columns (A to U): Submitted At (server) | Submitted At (browser, UTC) | Inquiry Type | Property Address | City | State | ZIP |
Property Type | Bedrooms | Bathrooms | Square Footage | Property Condition | Improvements | Selling Timeline |
Reason for Selling | Additional Notes | Full Name | Email | Phone | Preferred Contact Method | Consent Status.
Inquiry Type is "Seller Questionnaire", "Home Valuation" or "Contact".

## 4. Deploy on Netlify
- Drag-and-drop: zip the folder contents (index.html at the top level) and drop it on app.netlify.com/drop, or
- Git: push to GitHub, Netlify > Add new site > Import, build command empty, publish directory `.`.
Optionally set a custom domain under Domain settings.

## Notes
- Listing link used everywhere: https://kristenrobertson.exprealty.com/index.php?showagent=1&rtype=map (new tab, `rel="noopener noreferrer"`).
- No listings, prices, awards, testimonials or service areas are invented.
- Test after deploying: submit each form once, check the Sheet row, and open the site on your phone.
