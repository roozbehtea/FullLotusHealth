/* Online booking: pick a day, pick a time, give your details, pay with Stripe. Nothing is booked until payment succeeds.
   Talks to the Apps Script web app in _src/teasits + _src/booking (URL set as teasits_url in _src/config.json).
   Collects name, email, phone and an optional short note. No health details. */
(function () {
  var root = document.getElementById("sched");
  if (!root) return;
  var API = root.getAttribute("data-endpoint");
  var SLUG = root.getAttribute("data-service");
  var GOOGLE = root.getAttribute("data-fallback") || "";
  var cal = root.querySelector(".sch-cal"), times = root.querySelector(".sch-times"), details = root.querySelector(".sch-details");
  var status = root.querySelector(".sch-status");
  var KEY = "fl-appt-session";
  var data = null, pickedDay = null, pickedSlot = null;

  function say(html, err) { status.innerHTML = html; status.className = "sch-status notice" + (err ? " err" : ""); status.hidden = false; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + (n % 1 ? n.toFixed(2) : n); }
  function store(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function stored(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  var FALLBACK = 'Please text <a href="sms:+18182539307">(818) 253-9307</a> or email <a href="mailto:info@fulllotushealth.com">info@fulllotushealth.com</a> and we will find you a time.' +
    (GOOGLE ? ' You can also <a href="' + esc(GOOGLE) + '" rel="noopener">book on our Google calendar page</a>.' : "");

  // dates are plain yyyy-mm-dd strings from the server; noon UTC keeps day arithmetic clear of time zones
  function d(key) { return new Date(key + "T12:00:00Z"); }
  function key(dt) { return dt.toISOString().slice(0, 10); }
  function plus(k, n) { return key(new Date(d(k).getTime() + n * 864e5)); }
  function dow(k) { return (d(k).getUTCDay() + 6) % 7; }                 // 0 = Monday
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function getJSON(qs) { return fetch(API + qs, { redirect: "follow" }).then(function (r) { return r.json(); }); }
  function post(body) {
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow", body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  // ---- coming back from Stripe
  var params = new URLSearchParams(location.search);
  var paid = params.get("paid"), cancelled = params.get("cancelled");
  if (paid || cancelled) history.replaceState(null, "", location.pathname);
  var before = Promise.resolve(false);
  if (paid) {
    say("Confirming your appointment&hellip;");
    before = getJSON("?action=appt_confirm&session=" + encodeURIComponent(paid)).then(function (r) {
      store(KEY, null);
      if (r.ok) { done(r); return true; }
      say("Your payment is still processing. You will get a confirmation email within a few minutes. If not, " + FALLBACK.charAt(0).toLowerCase() + FALLBACK.slice(1), true);
      return true;
    }).catch(function () {
      say("We could not confirm just now, but if you paid, your time is held and a confirmation email will follow shortly. " + FALLBACK, true);
      return true;
    });
  } else if (cancelled) {
    var s = stored(KEY);
    store(KEY, null);
    say("No payment was taken and nothing is booked. Pick a time below to try again.");
    if (s) before = getJSON("?action=appt_release&session=" + encodeURIComponent(s)).then(function () { return false; }, function () { return false; });
  }

  function done(r) {
    cal.innerHTML = ""; times.innerHTML = ""; details.innerHTML = "";
    say("<strong>You are booked.</strong> " + esc(r.service) + ", " + esc(r.when) + ". A confirmation is on its way to your email" +
      (r.online ? ", and Roozbeh will send your video link before the visit" : "") + "." +
      (r.intake ? ' Before you come, please <a href="' + esc(r.intakeUrl) + '" rel="noopener">fill in the new patient form</a>.' : "") +
      (r.series ? " If you would like a series of treatments, we will plan the rest together after this first session." : ""));
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- day picker
  function renderCal() {
    var days = {};
    data.days.forEach(function (x) { days[x.date] = x; });
    var from = plus(data.today, -dow(data.today)), to = plus(data.today, data.windowDays);
    var last = plus(to, 6 - dow(to));
    var head = "";
    DAYS.forEach(function (n) { head += '<span class="sch-dow" aria-hidden="true">' + n + "</span>"; });
    var cells = "";
    for (var k = from; k <= last; k = plus(k, 1)) {
      var dt = d(k), n = dt.getUTCDate();
      var num = (n === 1 ? '<span class="sch-mo">' + MON[dt.getUTCMonth()] + "</span>" : "") + n;
      var label = DAYS[dow(k)] + " " + MON[dt.getUTCMonth()] + " " + n;
      var day = days[k], inWindow = k >= data.today && k <= to;
      if (day && day.slots.length) {
        cells += '<button type="button" class="sch-day open' + (k === pickedDay ? " on" : "") + '" data-day="' + k + '" aria-pressed="' + (k === pickedDay) + '" aria-label="' + label + ', ' + day.slots.length + ' times">' + num + "</button>";
      } else if (day) {
        cells += '<button type="button" class="sch-day wait' + (k === pickedDay ? " on" : "") + '" data-day="' + k + '" aria-pressed="' + (k === pickedDay) + '" aria-label="' + label + ', no times, join the waitlist">' + num + "</button>";
      } else {
        cells += '<span class="sch-day off' + (inWindow ? "" : " out") + '" aria-hidden="true">' + num + "</span>";
      }
    }
    cal.innerHTML = '<div class="sch-grid" role="group" aria-label="Choose a day">' + head + cells + "</div>" +
      '<p class="fine sch-key"><span class="sch-sw open"></span> times available <span class="sch-sw wait"></span> join the waitlist</p>' +
      '<p class="fine">Need a date further out? <button type="button" class="linkish" data-request>Request a date</button>.</p>';
    Array.prototype.forEach.call(cal.querySelectorAll("button[data-day]"), function (b) {
      b.addEventListener("click", function () { pickDay(b.getAttribute("data-day")); });
    });
    cal.querySelector("[data-request]").addEventListener("click", function () { pickedDay = null; pickedSlot = null; renderCal(); renderRequest(); });
  }

  function pickDay(k) {
    pickedDay = k; pickedSlot = null;
    renderCal();
    details.innerHTML = "";
    var day = data.days.filter(function (x) { return x.date === k; })[0];
    if (day.slots.length) renderTimes(day); else renderWait(day);
    times.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---- time picker
  function renderTimes(day) {
    times.innerHTML = '<h2 class="h3">' + esc(day.label) + "</h2>" +
      '<div class="sch-slots" role="group" aria-label="Choose a time">' +
      day.slots.map(function (s) { return '<button type="button" class="sch-slot" data-start="' + esc(s.start) + '" aria-pressed="false">' + esc(s.label) + "</button>"; }).join("") +
      "</div>" +
      '<p class="fine">Do not see a time that suits you? <a href="sms:+18182539307">Text (818) 253-9307</a> and we will find one.</p>';
    Array.prototype.forEach.call(times.querySelectorAll(".sch-slot"), function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(times.querySelectorAll(".sch-slot"), function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        pickedSlot = { start: b.getAttribute("data-start"), label: b.textContent, day: day };
        renderDetails();
      });
    });
  }

  // ---- details and payment
  function field(name, label, attrs) { return '<label>' + label + '<input name="' + name + '" ' + attrs + "></label>"; }
  function renderDetails() {
    var sv = data.service, s = pickedSlot;
    details.innerHTML =
      '<form novalidate class="sch-form"><h2 class="h3">Your details</h2>' +
      '<p class="sch-sum"><strong>' + esc(sv.name) + "</strong><br>" + esc(s.day.label) + " at " + esc(s.label) + " &middot; " + sv.minutes + " min &middot; " + money(sv.price) + "</p>" +
      '<div class="sch-fields">' +
      field("name", "Name", 'autocomplete="name" required maxlength="80"') +
      field("email", "Email", 'type="email" inputmode="email" autocomplete="email" required maxlength="254"') +
      field("phone", "Phone", 'type="tel" inputmode="tel" autocomplete="tel" required maxlength="30"') +
      '<label class="sch-wide"><span>Anything we should know? <span class="fine">(optional, please no health details here)</span></span><textarea name="note" rows="2" maxlength="300"></textarea></label></div>' +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="ts-actions"><button class="btn" type="submit">Continue to payment, ' + money(sv.price) + "</button></p>" +
      '<p class="fine">You will pay securely with Stripe, and your time is held for 30 minutes while you do. Nothing is booked until payment goes through. Cancelling is free up to 24 hours ahead; less than 24 hours\' notice is charged $95.</p>' +
      '<p class="gmsg" role="status" aria-live="polite"></p></form>';
    var form = details.querySelector("form"), msg = form.querySelector(".gmsg"), btn = form.querySelector("button[type=submit]");
    form.elements.name.focus({ preventScroll: true });
    details.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.disabled = true; msg.className = "gmsg"; msg.textContent = "Holding your time...";
      post({ action: "appt_book", service: SLUG, start: s.start, name: form.elements.name.value, email: form.elements.email.value,
        phone: form.elements.phone.value, note: form.elements.note.value, website: form.elements.website.value })
        .then(function (r) {
          if (r.ok && r.url) { store(KEY, r.session); location.href = r.url; return; }
          btn.disabled = false; msg.className = "gmsg err";
          if (r.error === "taken" || r.error === "closed") {
            details.innerHTML = ""; pickedSlot = null;
            say("Sorry, that time was just taken. Here are the times that are open now.", true);
            load(); return;
          }
          msg.innerHTML = r.error === "email" ? "Please check your email address." :
            r.error === "name" ? "Please add your name." :
            r.error === "phone" ? "Please add a phone number so we can reach you about your visit." : "That did not go through. " + FALLBACK;
        })
        .catch(function () { btn.disabled = false; msg.className = "gmsg err"; msg.innerHTML = "That did not go through. " + FALLBACK; });
    });
  }

  // ---- waitlist (a day with no openings) and request a date (beyond the booking window)
  function renderWait(day) {
    times.innerHTML = '<h2 class="h3">' + esc(day.label) + "</h2>" +
      "<p>There are no online openings that day. Join the waitlist and we will let you know if a time opens, or text <a href=\"sms:+18182539307\">(818) 253-9307</a>.</p>";
    contactForm(times, "waitlist", day.label, "Join the waitlist");
  }
  function renderRequest() {
    details.innerHTML = "";
    times.innerHTML = '<h2 class="h3">Request a date</h2><p>Tell us when you would like to come and we will get back to you with a time.</p>';
    contactForm(times, "request", "", "Send request");
    times.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function contactForm(host, kind, wish, cta) {
    var f = document.createElement("form");
    f.className = "sch-form"; f.noValidate = true;
    f.innerHTML = '<div class="sch-fields">' +
      (kind === "request" ? '<label class="sch-wide">Day or week you would like<input name="wish" required maxlength="120" placeholder="For example, the week of January 12"></label>' : '<input type="hidden" name="wish" value="' + esc(wish) + '">') +
      field("name", "Name", 'autocomplete="name" required maxlength="80"') +
      field("email", "Email", 'type="email" inputmode="email" autocomplete="email" required maxlength="254"') +
      field("phone", "Phone <span class=\"fine\">(optional)</span>", 'type="tel" inputmode="tel" autocomplete="tel" maxlength="30"') + "</div>" +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="ts-actions"><button class="btn" type="submit">' + cta + '</button></p><p class="gmsg" role="status" aria-live="polite"></p>';
    host.appendChild(f);
    var msg = f.querySelector(".gmsg"), btn = f.querySelector("button");
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      btn.disabled = true; msg.className = "gmsg"; msg.textContent = "Sending...";
      post({ action: "appt_waitlist", kind: kind, service: SLUG, wish: f.elements.wish.value, name: f.elements.name.value,
        email: f.elements.email.value, phone: f.elements.phone.value, website: f.elements.website.value })
        .then(function (r) {
          if (r.ok) { f.remove(); host.insertAdjacentHTML("beforeend", '<p class="notice">Thank you. We have your ' + (kind === "request" ? "request" : "spot on the waitlist") + " and will be in touch by email or text.</p>"); return; }
          btn.disabled = false; msg.className = "gmsg err";
          msg.innerHTML = r.error === "email" ? "Please check your email address." : r.error === "name" ? "Please add your name." : "That did not go through. " + FALLBACK;
        })
        .catch(function () { btn.disabled = false; msg.className = "gmsg err"; msg.innerHTML = "That did not go through. " + FALLBACK; });
    });
  }

  function load() {
    return getJSON("?action=appt_slots&service=" + encodeURIComponent(SLUG)).then(function (r) {
      if (!r.days) throw new Error("bad");
      data = r; pickedDay = null; pickedSlot = null;
      times.innerHTML = ""; details.innerHTML = "";
      renderCal();
    }).catch(function () {
      cal.innerHTML = '<p class="notice">The calendar could not load just now. ' + FALLBACK + "</p>";
    });
  }
  before.then(function (finished) { if (!finished) load(); });
})();
