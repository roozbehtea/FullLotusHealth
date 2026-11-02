/**
 * Full Lotus Health: builds the patient intake forms in your Google account.
 *
 * How to run (once):
 *   1. Signed in as info@fulllotushealth.com, open https://script.google.com and click "New project".
 *   2. Delete the sample code, paste this whole file, and click Save.
 *   3. Choose "createIntakeForms" in the function menu at the top and click Run. Approve the permissions.
 *   4. Open "Execution log": it lists each form's edit link, the link to give patients, and its response sheet.
 *
 * Creates:
 *   - New Patient Intake (everyone, before the first visit)
 *   - Skin Treatment Intake & Consent (microneedling, nanoneedling, cosmetic acupuncture)
 * Responses go to a Google Sheet in your Drive for each form. Patients do not need a Google account.
 * Keep the forms and sheets inside this Workspace account, which is covered by your Google BAA.
 *
 * Review the wording of every consent and policy section before using it with patients.
 */

var CLINIC = 'Full Lotus Health';
var ADDRESS = '2116 N Glenoaks Blvd, Ste 3, Burbank, CA 91504';
var PHONE = '(818) 253-9307';
var PRACTITIONER = 'Roozbeh Ghobadpour, L.Ac.';

function createIntakeForms() {
  var a = newPatientIntake_();
  var b = skinIntake_();
  [a, b].forEach(function (f) {
    console.log('\n' + f.getTitle() +
      '\n  Link for patients: ' + f.getPublishedUrl() +
      '\n  Edit the form:     ' + f.getEditUrl() +
      '\n  Responses sheet:   ' + SpreadsheetApp.openById(f.getDestinationId()).getUrl());
  });
}

// ------------------------------------------------------------------ helpers
function base_(title, description) {
  var form = FormApp.create(title);
  form.setDescription(description)
      .setRequireLogin(false)                 // patients don't need a Workspace account
      .setCollectEmail(true)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false)
      .setProgressBar(true)
      .setConfirmationMessage('Thank you. Your form has been received and will be reviewed before your visit. ' +
                              'Questions? Text or call ' + PHONE + '.');
  form.setAcceptingResponses(true);
  if (typeof form.setPublished === 'function') form.setPublished(true);   // newer forms start unpublished
  var ss = SpreadsheetApp.create(title + ' (responses)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  return form;
}
function text_(f, title, required, help) { var i = f.addTextItem().setTitle(title).setRequired(!!required); if (help) i.setHelpText(help); return i; }
function para_(f, title, required, help) { var i = f.addParagraphTextItem().setTitle(title).setRequired(!!required); if (help) i.setHelpText(help); return i; }
function choice_(f, title, options, required, help) { var i = f.addMultipleChoiceItem().setTitle(title).setChoiceValues(options).setRequired(!!required); if (help) i.setHelpText(help); return i; }
function checks_(f, title, options, required, help) { var i = f.addCheckboxItem().setTitle(title).setChoiceValues(options).setRequired(!!required); if (help) i.setHelpText(help); return i; }
function yesNo_(f, title, help) { return choice_(f, title, ['No', 'Yes'], true, help || 'If yes, please explain in the box at the end of this section.'); }
function section_(f, title, help) { var s = f.addPageBreakItem().setTitle(title); if (help) s.setHelpText(help); return s; }
function agree_(f, title, statement) { return checks_(f, title, [statement], true); }
function signature_(f) {
  section_(f, 'Signature', 'Typing your full name below serves as your electronic signature.');
  text_(f, 'Full name (signature)', true);
  f.addDateItem().setTitle("Today's date").setRequired(true);
  text_(f, 'If signing for a minor or another person: your name and relationship', false);
}
function phoneItem_(f, title, required) {
  var v = FormApp.createTextValidation().requireTextMatchesPattern('^[0-9()+\\-. ]{7,20}$').setHelpText('Please enter a phone number.').build();
  return text_(f, title, required).setValidation(v);
}

// ------------------------------------------------------------------ New Patient Intake
function newPatientIntake_() {
  var f = base_(CLINIC + ': New Patient Intake',
    'Please complete this before your first visit. It takes about 10 minutes. Your answers are confidential and are reviewed by ' +
    PRACTITIONER + ' before you arrive.\n\n' + CLINIC + ' · ' + ADDRESS + ' · ' + PHONE);

  section_(f, 'About you');
  text_(f, 'Full legal name', true);
  text_(f, 'Preferred name and pronouns', false);
  f.addDateItem().setTitle('Date of birth').setRequired(true);
  phoneItem_(f, 'Mobile phone', true);
  choice_(f, 'May we text you appointment reminders?', ['Yes', 'No'], true);
  para_(f, 'Home address', true);
  text_(f, 'Occupation', false);
  text_(f, 'Emergency contact: name and relationship', true);
  phoneItem_(f, 'Emergency contact phone', true);
  choice_(f, 'How did you hear about us?', ['Google search', 'Google Maps / reviews', 'Friend or family', 'Instagram or social media',
    'Global Tea Hut / tea community', 'Another practitioner', 'Walked by'], false).showOtherOption(true);
  text_(f, 'Primary care physician (name and phone)', false);

  section_(f, 'Reason for your visit');
  checks_(f, 'What brings you in?', ['Skin or cosmetic concerns', 'Pain', 'Stress, anxiety or sleep', 'Digestion',
    "Women's health", 'Fatigue or low energy', 'General wellness'], true).showOtherOption(true);
  para_(f, 'Describe your main concern', true, 'When it started, what makes it better or worse, and what you have tried.');
  para_(f, 'What would you like to be different after treatment?', false);
  choice_(f, 'Have you had acupuncture before?', ['No', 'Yes'], true);

  section_(f, 'Health history', 'This helps make treatment safe for you. Check everything that applies, now or in the past.');
  checks_(f, 'Conditions', ['None of these', 'High or low blood pressure', 'Heart condition', 'Pacemaker or implanted electrical device',
    'Stroke', 'Diabetes', 'Bleeding or clotting disorder', 'Seizures or epilepsy', 'Cancer (current or past)', 'Hepatitis or HIV',
    'Autoimmune condition', 'Thyroid condition', 'Kidney or liver disease', 'Asthma or lung condition', 'Fainting', 'Fear of needles'],
    true).showOtherOption(true);
  yesNo_(f, 'Do you take blood thinners (for example warfarin, Eliquis, Xarelto, daily aspirin)?');
  choice_(f, 'Are you pregnant, possibly pregnant, or trying to conceive?', ['No', 'Yes', 'Not sure', 'Does not apply'], true);
  para_(f, 'Current medications, including dose', false, 'Prescription and over the counter.');
  para_(f, 'Supplements and herbs you take', false);
  para_(f, 'Allergies (medications, foods, latex, adhesives, metals, herbs)', true, 'Write "none known" if none.');
  para_(f, 'Surgeries, hospitalizations or major injuries, with dates', false);
  para_(f, 'Anything else we should know, including details for any "Yes" above', false);

  section_(f, 'Lifestyle');
  choice_(f, 'Sleep quality', ['Good', 'Fair', 'Poor'], false);
  choice_(f, 'Stress level', ['Low', 'Moderate', 'High'], false);
  text_(f, 'Exercise (type and how often)', false);
  text_(f, 'Alcohol, caffeine, tobacco or cannabis use', false);
  para_(f, 'Typical daily diet', false);

  section_(f, 'Consent and policies');
  agree_(f, 'Consent to treatment',
    'I consent to examination and treatment by ' + PRACTITIONER + ', a California licensed acupuncturist, which may include acupuncture, ' +
    'electroacupuncture, cupping, moxibustion, gua sha, therapeutic massage, and Chinese herbal medicine. I understand possible side effects ' +
    'include bruising, soreness, minor bleeding, lightheadedness or fainting, and rarely infection, burns from moxibustion, or a punctured organ. ' +
    'Herbs may rarely cause stomach upset or allergic reaction, and I will tell my practitioner if I am or become pregnant. No specific result ' +
    'is guaranteed. I may ask questions or stop treatment at any time.');
  agree_(f, 'Not a substitute for your doctor',
    'I understand acupuncture and herbal medicine are not a substitute for care from my physician, and I will keep my physician informed.');
  agree_(f, 'Cancellation and payment',
    'I agree to give at least 24 hours\' notice to cancel or reschedule, and understand payment is due at the time of service.');
  agree_(f, 'Privacy',
    'I acknowledge I have been offered the Notice of Privacy Practices, which explains how my health information is used and protected.');
  checks_(f, 'Communication (optional)', ['You may email me appointment information',
    'You may add me to the newsletter (tea sits, events, offers)'], false);

  signature_(f);
  return f;
}

// ------------------------------------------------------------------ Skin Treatment Intake & Consent
function skinIntake_() {
  var f = base_(CLINIC + ': Skin Treatment Intake & Consent',
    'For microneedling, nanoneedling and cosmetic acupuncture. Please complete this before your first skin treatment, in addition to the ' +
    'New Patient Intake.\n\n' + CLINIC + ' · ' + ADDRESS + ' · ' + PHONE);

  section_(f, 'About you');
  text_(f, 'Full legal name', true);
  f.addDateItem().setTitle('Date of birth').setRequired(true);
  phoneItem_(f, 'Mobile phone', true);
  checks_(f, 'Which treatment(s) are you booking?', ['Microneedling (face)', 'Microneedling (scalp / hair)', 'Nanoneedling',
    'Cosmetic acupuncture', 'Not sure yet'], true);

  section_(f, 'Your skin');
  checks_(f, 'What would you like to improve?', ['Fine lines and wrinkles', 'Acne scars', 'Active breakouts', 'Texture or pores',
    'Uneven tone or pigmentation', 'Dullness or dryness', 'Puffiness or under-eye bags', 'Firmness or sagging', 'Thinning hair',
    'Redness or sensitivity'], true).showOtherOption(true);
  choice_(f, 'How does your skin usually react to sun?', ['Always burns, never tans', 'Usually burns, tans a little',
    'Sometimes burns, tans gradually', 'Rarely burns, tans easily', 'Very rarely burns', 'Never burns'], true,
    'This helps choose safe settings for your skin.');
  choice_(f, 'Skin type', ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive'], true);
  para_(f, 'Current skin care routine', false, 'Cleanser, serums, creams, sunscreen, and anything prescription.');
  para_(f, 'Recent professional treatments, with dates', false,
    'For example chemical peels, laser, IPL, microdermabrasion, waxing, Botox, fillers, threads.');

  section_(f, 'Safety screening', 'Some of these mean a treatment should be postponed or adjusted. Answer for the past 6 months unless noted.');
  yesNo_(f, 'Isotretinoin (Accutane) in the past 6 months?');
  yesNo_(f, 'Retinoids (tretinoin, Retin-A, retinol, adapalene) in the past week?');
  yesNo_(f, 'Botox or fillers in the treatment area in the past 2 weeks?');
  yesNo_(f, 'Chemical peel, laser or IPL in the past 4 weeks?');
  yesNo_(f, 'Sunburn, open wounds, rash or active infection in the treatment area right now?');
  yesNo_(f, 'Active acne, rosacea flare, eczema or psoriasis in the treatment area right now?');
  yesNo_(f, 'History of cold sores (herpes simplex)?', 'Needling can trigger an outbreak. Your doctor may suggest preventive medication.');
  yesNo_(f, 'History of keloids or raised scarring?');
  yesNo_(f, 'Skin cancer, or a mole that has changed, in the treatment area?');
  yesNo_(f, 'Bleeding disorder, or taking blood thinners?');
  yesNo_(f, 'Diabetes, autoimmune condition, or anything that slows healing?');
  yesNo_(f, 'Currently on chemotherapy or radiation?');
  choice_(f, 'Are you pregnant or breastfeeding?', ['No', 'Yes', 'Not sure'], true);
  para_(f, 'Allergies (especially lidocaine or other numbing creams, latex, metals, skin care ingredients)', true,
    'Write "none known" if none.');
  para_(f, 'Details for any "Yes" above', false);

  section_(f, 'Consent');
  agree_(f, 'Microneedling and nanoneedling',
    'If I am having microneedling or nanoneedling, I understand it creates tiny channels in the skin and that redness, swelling, dryness, ' +
    'flaking, pinpoint bleeding and sensitivity are expected for a few days. Less commonly there may be bruising, breakouts, temporary ' +
    'darkening or lightening of the skin, cold sore outbreak, infection, or scarring. Results vary and usually take a series of sessions.');
  agree_(f, 'Cosmetic acupuncture',
    'If I am having cosmetic acupuncture, I understand it may cause small bruises, especially around the eyes, and that results are gradual.');
  agree_(f, 'Numbing cream and serums',
    'I understand topical numbing cream and herbal serums may be applied, and I have listed any allergies above.');
  agree_(f, 'Aftercare',
    'I agree to follow the aftercare instructions, including avoiding makeup, sun, sweating, swimming and active skin care for the period advised.');
  agree_(f, 'Accuracy',
    'The information I have given is accurate. I will tell my practitioner about any changes to my health or medications before future treatments.');
  choice_(f, 'Before-and-after photos', ['You may take photos for my chart only',
    'You may take photos for my chart, and use them without my face or name for education or marketing',
    'Please do not take photos'], true);

  signature_(f);
  return f;
}
