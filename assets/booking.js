/* Online booking: pick a day, pick a time, give your details, pay with Stripe. Nothing is booked until payment succeeds.
   Talks to the Apps Script web app in _src/teasits + _src/booking (URL set as teasits_url in _src/config.json).
   The page asks for open times from a tiny script in the head (the saved file on GitHub first, which Booking.gs
   refreshes every 5 minutes; Apps Script only if that file is missing or old), shows a saved answer from the last few minutes
   immediately, then refreshes it. Stripe is not loaded here: payment is a redirect, and only after the server
   has checked the chosen time against the live calendar. A saved answer is never trusted for payment.
   Collects name, email and phone, plus an "I've already completed the forms" box. The server also recognizes returning patients and leaves out forms they already did. No health details. */
(function () {
  var root = document.getElementById("sched");
  if (!root) return;
  var API = root.getAttribute("data-endpoint");
  var SLUG = root.getAttribute("data-service");
  var GOOGLE = root.getAttribute("data-fallback") || "";
  var SKIN = root.getAttribute("data-skin-intake") || "";                 // skin services also need the Skin Treatment Intake & Consent
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
  var CACHE_KEY = "fl-appt-slots-v1:" + SLUG, CACHE_TTL = 180000, wave = 0;

  function cacheOk(c) {
    return !!(c && c.days && c.days.length && c.service && c.service.slug === SLUG && !c.partial && c.today && c.windowDays &&
      c.days.every(function (d) { return d && d.date && d.slots; }));
  }
  function readCache() {
    var early = window.__flAppt && window.__flAppt.cache;
    if (cacheOk(early)) return early;
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (p && p.t && (Date.now() - p.t) < CACHE_TTL && cacheOk(p.data)) return p.data;
    } catch (e) {}
    return null;
  }
  function saveCache(r) {
    if (!r || r.partial || !cacheOk(r)) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: { service: r.service, today: r.today, windowDays: r.windowDays, days: r.days } }));
    } catch (e) {}
  }
  function daysKey(r) {
    if (!r || !r.days) return "";
    return (r.partial ? "p:" : "f:") + (r.today || "") + ":" + r.days.map(function (d) {
      return d.date + "=" + (d.slots || []).map(function (s) { return s.start; }).join(",");
    }).join("|");
  }
  function findDay(k) { return data && data.days.filter(function (x) { return x.date === k; })[0]; }
  function mergeDays(base, extra, through) {
    var map = {};
    (base || []).forEach(function (d) { if (!(through && d.date <= through)) map[d.date] = d; });
    (extra || []).forEach(function (d) { map[d.date] = d; });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }
  function paintSkeleton() {
    var cells = cal.querySelectorAll(".sch-day.sk");
    if (!cells.length) return;
    var parts = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var today = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
    var start = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * 864e5);
    for (var i = 0; i < cells.length; i++) {
      var dt = new Date(start.getTime() + i * 864e5), n = dt.getUTCDate();
      cells[i].innerHTML = (n === 1 ? '<span class="sch-mo">' + MON[dt.getUTCMonth()] + "</span>" : "") + n;
    }
  }
  function stamp(state) {
    cal.setAttribute("data-ready", state);
    cal.setAttribute("aria-busy", state === "partial" ? "true" : "false");
  }
  // Show days without wiping a form the patient is already filling in. A saved answer is replaced quietly.
  function present(r, state) {
    var same = data && daysKey(data) === daysKey(r);
    var slot = pickedSlot, dayKeyPicked = pickedDay;
    var form = details.querySelector("form") || times.querySelector("form");
    data = r;
    stamp(state);
    if (same) return;
    if (slot) {
      var day = findDay(slot.day.date);
      var still = day && day.slots.some(function (s) { return s.start === slot.start; });
      if (!still) {
        pickedDay = null; pickedSlot = null;
        times.innerHTML = ""; details.innerHTML = "";
        renderCal();
        say("Sorry, that time was just taken. Here are the times that are open now.", true);
        root.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      pickedSlot.day = day;
      renderCal();
      return;
    }
    if (form && dayKeyPicked && findDay(dayKeyPicked)) { renderCal(); return; }
    var keep = dayKeyPicked && findDay(dayKeyPicked);
    pickedDay = keep ? dayKeyPicked : null;
    pickedSlot = null;
    times.innerHTML = ""; details.innerHTML = "";
    renderCal();
    if (keep) { if (keep.slots.length) renderTimes(keep); else renderWait(keep); }
  }
  function apply(r, base, merge) {
    if (!r || !r.days) throw new Error("bad");
    var covered = base && !base.partial && base.today === r.today;
    var days = r.partial ? mergeDays(base && base.days, r.days, r.through) : (merge ? mergeDays(base && base.days, r.days) : r.days.slice());
    var partial = !!r.partial && !covered;
    if (merge && !r.partial) partial = false;
    var view = {
      service: r.service || (base && base.service),
      today: r.today || (base && base.today),
      windowDays: r.windowDays || (base && base.windowDays) || 21,
      days: days,
      partial: partial,
      through: r.through || (base && base.through) || ""
    };
    present(view, partial ? "partial" : "live");
    if (!partial) saveCache(view);
    return view;
  }

  function getJSON(qs) { return fetch(API + qs, { redirect: "follow", cache: "no-store" }).then(function (r) { return r.json(); }); }
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

  function formsLine(r) {                                                // only the forms this patient still needs
    var skin = r.skin !== undefined ? r.skin : (r.intake && !!SKIN), links = [];
    if (r.intake) links.push('<a href="' + esc(r.intakeUrl) + '" rel="noopener">new patient form</a>');
    if (skin && (r.skinUrl || SKIN)) links.push('<a href="' + esc(r.skinUrl || SKIN) + '" rel="noopener">skin treatment form</a>');
    return links.length ? " Before you come, please fill in the " + links.join(" and the ") + "." : "";
  }
  function done(r) {
    cal.innerHTML = ""; times.innerHTML = ""; details.innerHTML = "";
    say("<strong>You are booked.</strong> " + esc(r.service) + ", " + esc(r.when) + ". A confirmation is on its way to your email" +
      (r.online ? ", and Roozbeh will send your video link before the visit" : "") + "." +
      formsLine(r) +
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
      } else if (data.partial && inWindow && data.through && k > data.through) {
        cells += '<span class="sch-day pend" aria-hidden="true">' + num + "</span>";
      } else {
        cells += '<span class="sch-day off' + (inWindow ? "" : " out") + '" aria-hidden="true">' + num + "</span>";
      }
    }
    cal.innerHTML = '<div class="sch-grid" role="group" aria-label="Choose a day">' + head + cells + "</div>" +
      '<p class="fine sch-key"><span class="sch-sw open"></span> times available <span class="sch-sw wait"></span> join the waitlist</p>' +
      (data.partial ? '<p class="sch-finding" role="status">Finding more open times…</p>' : "") +
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
      (sv.intake ? '<label class="sch-wide sch-check"><input type="checkbox" name="returning" value="yes"> I\'ve already completed the forms</label>' : "") + "</div>" +
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
      btn.disabled = true; msg.className = "gmsg"; msg.textContent = "Checking that time is still open…";
      post({ action: "appt_book", service: SLUG, start: s.start, name: form.elements.name.value, email: form.elements.email.value,
        phone: form.elements.phone.value, returning: !!(form.elements.returning && form.elements.returning.checked), website: form.elements.website.value })
        .then(function (r) {
          if (r.ok && r.url) { store(KEY, r.session); location.href = r.url; return; }
          btn.disabled = false; msg.className = "gmsg err";
          if (r.error === "taken" || r.error === "closed") {
            details.innerHTML = ""; times.innerHTML = ""; pickedSlot = null; pickedDay = null;
            say("Sorry, that time was just taken. Here are the times that are open now.", true);
            reload(); return;
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

  function fetchSoon() {
    var early = window.__flAppt && window.__flAppt.pending;
    if (window.__flAppt) window.__flAppt.pending = null;
    function plain() { return getJSON("?action=appt_slots&service=" + encodeURIComponent(SLUG) + "&span=soon"); }
    var p = early && early.then ? early.catch(plain) : plain();
    return p.then(function (r) { return r && r.days ? r : plain(); });
  }
  function load() {
    var mine = ++wave;
    var base = data;
    return fetchSoon().then(function (r) {
      if (mine !== wave) return;
      base = apply(r, base, false);
      if (!r.partial) return;
      return getJSON("?action=appt_slots&service=" + encodeURIComponent(SLUG) + "&span=rest&after=" + encodeURIComponent(r.through || "")).then(function (rest) {
        if (mine !== wave || !rest || !rest.days) return;
        apply(rest, base, true);
      }).catch(function () {
        if (mine !== wave) return;
        if (data && data.partial) say("More days could not load just now. The days already shown are ready to book, or refresh the page for the rest.", true);
      });
    }).catch(function () {
      if (mine !== wave) return;
      if (data && data.days && data.days.length) {
        say("Showing times from a few minutes ago. We check the time again before any payment is taken.");
        return;
      }
      cal.removeAttribute("data-ready");
      cal.setAttribute("aria-busy", "false");
      cal.innerHTML = '<p class="notice">The calendar could not load just now. ' + FALLBACK + "</p>";
    });
  }
  function reload() {
    var mine = ++wave;
    return getJSON("?action=appt_slots&service=" + encodeURIComponent(SLUG)).then(function (r) {
      if (mine !== wave) return;
      apply(r, null, false);
    }).catch(function () {
      if (mine !== wave || (data && data.days)) return;
      cal.innerHTML = '<p class="notice">The calendar could not load just now. ' + FALLBACK + "</p>";
    });
  }
  if (!paid && !cancelled) {
    var cached = readCache();
    if (cached) present(cached, "cache");
    else paintSkeleton();
  }
  before.then(function (finished) { if (!finished) load(); });
})();
