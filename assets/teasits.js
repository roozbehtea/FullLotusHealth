/* Tea sits: shows upcoming sits on a month calendar; picking a day lists its sits with seats left, takes a reservation, and hands off to Stripe to pay.
   Talks to the Apps Script web app in _src/teasits (URL set as teasits_url in _src/config.json).
   Collects name, email, optional phone and seat count. Nothing else. */
(function () {
  var root = document.getElementById("teasits");
  if (!root) return;
  var API = root.getAttribute("data-endpoint");
  var list = root.querySelector(".ts-list");
  var status = root.querySelector(".ts-status");
  var MAX = 3, KEY = "fl-teasit-session";

  function say(html, err) { status.innerHTML = html; status.className = "ts-status notice" + (err ? " err" : ""); status.hidden = false; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + (n % 1 ? n.toFixed(2) : n); }
  function store(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function stored(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  var FALLBACK = 'Please text <a href="sms:+18182539307">(818) 253-9307</a> or email <a href="mailto:info@fulllotushealth.com">info@fulllotushealth.com</a> to reserve.';

  function getJSON(qs) {
    return fetch(API + qs, { redirect: "follow" }).then(function (r) { return r.json(); });
  }

  // Coming back from Stripe
  var params = new URLSearchParams(location.search);
  var paid = params.get("paid"), cancelled = params.get("cancelled");
  if (paid || cancelled) history.replaceState(null, "", location.pathname);
  var before = Promise.resolve();
  if (paid) {
    say("Confirming your reservation&hellip;");
    before = getJSON("?action=confirm&session=" + encodeURIComponent(paid)).then(function (r) {
      store(KEY, null);
      if (r.ok) say("<strong>You're in.</strong> " + esc(r.seats == 1 ? "1 seat" : r.seats + " seats") + " for " + esc(r.sit) + ". A confirmation is on its way to your email.");
      else say("Your payment is still processing. You'll get a confirmation email within a few minutes. If not, " + FALLBACK.charAt(0).toLowerCase() + FALLBACK.slice(1), true);
    }).catch(function () { say("We couldn't confirm just now, but if you paid, your seat is held and a confirmation email will follow shortly.", true); });
  } else if (cancelled) {
    var s = stored(KEY);
    store(KEY, null);
    say("No payment was taken. Your seats have been released, so pick a sit below to try again.");
    if (s) before = getJSON("?action=release&session=" + encodeURIComponent(s)).catch(function () {});
  }

  function seatDots(left, seats) {
    var out = "";
    for (var i = 0; i < seats; i++) out += '<span class="' + (i < seats - left ? "taken" : "open") + '"></span>';
    return '<span class="ts-dots" aria-hidden="true">' + out + "</span>";
  }

  // ---- month calendar (same day grid as the booking page): pick a day, its sits show below
  var cal = root.querySelector(".ts-cal");
  if (!cal) { cal = document.createElement("div"); cal.className = "sch-cal ts-cal"; list.parentNode.insertBefore(cal, list); }
  var CACHE_KEY = "fl-teasits-v1", CACHE_TTL = 180000;
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var LA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });
  function dayKey(date) { return LA.format(date); }                       // YYYY-MM-DD in Burbank time
  function d(k) { return new Date(k + "T12:00:00Z"); }
  function plus(k, n) { return new Date(d(k).getTime() + n * 864e5).toISOString().slice(0, 10); }
  function dow(k) { return (d(k).getUTCDay() + 6) % 7; }                 // 0 = Monday
  var all = [], picked = null;
  (function paintSkeleton() {
    var cells = cal.querySelectorAll(".sch-day.sk");
    if (!cells.length) return;
    var today = dayKey(new Date()), start = plus(today, -dow(today));
    for (var i = 0; i < cells.length; i++) {
      var k = plus(start, i), dt = d(k), n = dt.getUTCDate();
      cells[i].innerHTML = (n === 1 ? '<span class="sch-mo">' + MON[dt.getUTCMonth()] + "</span>" : "") + n;
    }
  })();

  function renderCal() {
    var byDay = {};
    all.forEach(function (s) { var k = dayKey(new Date(s.start)); (byDay[k] = byDay[k] || []).push(s); });
    var today = dayKey(new Date()), lastSit = dayKey(new Date(all[all.length - 1].start));
    var from = plus(today, -dow(today)), last = plus(lastSit, 6 - dow(lastSit));
    var head = "";
    DAYS.forEach(function (n) { head += '<span class="sch-dow" aria-hidden="true">' + n + "</span>"; });
    var cells = "";
    for (var k = from; k <= last; k = plus(k, 1)) {
      var dt = d(k), n = dt.getUTCDate();
      var num = (n === 1 ? '<span class="sch-mo">' + MON[dt.getUTCMonth()] + "</span>" : "") + n;
      var label = DAYS[dow(k)] + " " + MON[dt.getUTCMonth()] + " " + n;
      var day = byDay[k];
      if (day) {
        var open = day.some(function (s) { return s.left > 0; });
        cells += '<button type="button" class="sch-day ' + (open ? "open" : "wait") + (k === picked ? " on" : "") + '" data-day="' + k + '" aria-pressed="' + (k === picked) + '" aria-label="' + label + (open ? ", tea sit" : ", tea sit full") + '">' + num + "</button>";
      } else {
        cells += '<span class="sch-day off' + (k < today ? " out" : "") + '" aria-hidden="true">' + num + "</span>";
      }
    }
    cal.innerHTML = '<div class="sch-grid" role="group" aria-label="Choose a day">' + head + cells + "</div>" +
      '<p class="fine sch-key"><span class="sch-sw open"></span> seats open <span class="sch-sw wait"></span> full</p>';
    Array.prototype.forEach.call(cal.querySelectorAll("button[data-day]"), function (b) {
      b.addEventListener("click", function () { picked = b.getAttribute("data-day"); renderCal(); showDay(); list.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
    });
  }

  function showDay() {
    render(all.filter(function (s) { return dayKey(new Date(s.start)) === picked; }));
  }

  function render(sits) {
    if (!sits.length) { list.innerHTML = '<p class="notice">No tea sits are open for booking right now. ' + FALLBACK.replace("to reserve", "to hear about the next one") + "</p>"; return; }
    list.innerHTML = sits.map(function (s) {
      var full = s.left < 1;
      // Show a count only when it helps: nothing while a sit is wide open, "Only N left" at 2 or fewer, "Full" when booked.
      var leftText = full ? "Full" : s.left <= 2 ? "Only " + s.left + (s.left == 1 ? " seat" : " seats") + " left" : "";
      var title = /^tea sit$/i.test(s.title) ? "" : '<span class="ts-title">' + esc(s.title) + "</span>";
      return '<li class="ts-sit' + (full ? " full" : "") + '" data-id="' + esc(s.id) + '">' +
        '<div class="ts-when"><span class="ts-date">' + esc(s.label) + "</span>" + title + "</div>" +
        '<div class="ts-seats">' + (leftText ? '<span class="ts-left">' + leftText + "</span>" : "") + "</div>" +
        '<div class="ts-price">' + (s.price > 0 ? money(s.price) : "Free") + "</div>" +
        (full ? '<span class="btn small ghost" aria-disabled="true">Full</span>'
              : '<button class="btn small" type="button" aria-expanded="false">Reserve</button>') +
        "</li>";
    }).join("");
    Array.prototype.forEach.call(list.querySelectorAll(".ts-sit button"), function (b) {
      b.addEventListener("click", function () { openForm(b.closest(".ts-sit"), sits); });
    });
  }

  function openForm(li, sits) {
    var open = list.querySelector(".ts-form");
    if (open) { var was = open.previousElementSibling; open.remove(); was.querySelector("button").setAttribute("aria-expanded", "false"); if (was === li) return; }
    var s = sits.filter(function (x) { return x.id === li.getAttribute("data-id"); })[0];
    var max = Math.min(MAX, s.left), opts = "";
    for (var i = 1; i <= max; i++) opts += '<option value="' + i + '">' + i + "</option>";
    var f = document.createElement("li");
    f.className = "ts-form";
    f.innerHTML =
      '<form novalidate><p class="ts-for">Reserving for <strong>' + esc(s.label) + "</strong></p>" +
      '<div class="ts-fields">' +
      '<label>Name<input name="name" autocomplete="name" required maxlength="80"></label>' +
      '<label>Email<input name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label>' +
      '<label><span>Phone <span class="fine">(optional)</span></span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>' +
      '<label>Seats<select name="seats">' + opts + "</select></label></div>" +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="ts-actions"><button class="btn" type="submit">' + (s.price > 0 ? "Continue to payment, " + money(s.price) : "Reserve") + '</button></p>' +
      '<p class="fine">' + (s.price > 0 ? "You'll pay securely with Stripe. Have a coupon code? Enter it on the payment page. Seats are held for 30 minutes while you pay." : "") + ' To cancel later, reply to your confirmation email.</p>' +
      '<p class="gmsg" role="status" aria-live="polite"></p></form>';
    li.after(f);
    li.querySelector("button").setAttribute("aria-expanded", "true");
    var form = f.querySelector("form"), msg = f.querySelector(".gmsg"), btn = f.querySelector("button[type=submit]");
    var sel = form.elements.seats;
    var label = function () { if (s.price > 0) btn.textContent = "Continue to payment, " + money(s.price * Number(sel.value)); };
    sel.addEventListener("change", label);
    form.elements.name.focus();
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.disabled = true; msg.className = "gmsg"; msg.textContent = s.price > 0 ? "Holding your seats..." : "Reserving...";
      fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
        body: JSON.stringify({ action: "reserve", sitId: s.id, name: form.elements.name.value, email: form.elements.email.value,
          phone: form.elements.phone.value, seats: Number(sel.value), website: form.elements.website.value }) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (r.ok && r.url) { store(KEY, r.session); location.href = r.url; return; }
          if (r.ok && r.free) { f.remove(); say("<strong>You're in.</strong> A confirmation is on its way to your email."); load(true); return; }
          btn.disabled = false; msg.className = "gmsg err";
          if (r.error === "full" && r.left) {
            while (sel.options.length > r.left) sel.remove(sel.options.length - 1);
            s.left = r.left; label();
            msg.textContent = "Only " + r.left + (r.left == 1 ? " seat is" : " seats are") + " left now. Please choose again.";
            return;
          }
          if (r.error === "full" || r.error === "closed") {
            say(r.error === "full" ? "Sorry, that sit just filled up." : "Online booking for that sit has closed. " + FALLBACK, true);
            load(true); return;
          }
          msg.innerHTML = r.error === "email" ? "Please check your email address." :
            r.error === "name" ? "Please add your name." : "That didn't go through. " + FALLBACK;
        })
        .catch(function () { btn.disabled = false; msg.className = "gmsg err"; msg.innerHTML = "That didn't go through. " + FALLBACK; });
    });
  }

  function sitsKey(x) { return x.map(function (s) { return s.id + ":" + s.left + ":" + s.price; }).join("|"); }
  function present(sits) {
    var same = all.length && sitsKey(all) === sitsKey(sits);
    all = sits;
    cal.removeAttribute("aria-busy");
    if (same) return;
    if (list.querySelector(".ts-form")) { renderCal(); return; }   // don't wipe a form someone is filling in
    if (!all.length) { cal.innerHTML = ""; render(all); return; }
    var keep = picked && all.some(function (s) { return dayKey(new Date(s.start)) === picked; });
    if (!keep) { var first = all.filter(function (s) { return s.left > 0; })[0] || all[0]; picked = dayKey(new Date(first.start)); }
    renderCal(); showDay();
  }
  function saveCache(sits) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), sits: sits })); } catch (e) {} }
  function readCache() {
    var early = window.__flTea && window.__flTea.cache;
    if (early) return early;
    try { var c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c && c.t && Date.now() - c.t < CACHE_TTL && c.sits && c.sits.length) return c.sits; } catch (e) {}
    return null;
  }
  function load(fresh) {
    var early = !fresh && window.__flTea && window.__flTea.pending;
    if (window.__flTea) window.__flTea.pending = null;
    var p = early ? early.catch(function () { return getJSON(""); }) : getJSON("");
    return p.then(function (r) {
      if (!r || !r.sits) throw new Error("bad");
      if (r.saved) {
        // Saved copy: drop sits whose online booking has closed (1 hour before start), show it now,
        // then quietly bring seat counts up to the minute from the live schedule.
        var soon = Date.now() + 36e5;
        present(r.sits.filter(function (s) { return new Date(s.start).getTime() > soon; }));
        return getJSON("").then(function (x) { if (x && x.sits) { saveCache(x.sits); present(x.sits); } }, function () {});
      }
      saveCache(r.sits);
      present(r.sits);
    }).catch(function () {
      if (all.length) return;   // a saved schedule is already showing; Reserve still checks seats live
      cal.innerHTML = ""; list.innerHTML = '<p class="notice">The schedule couldn\'t load just now. ' + FALLBACK + "</p>"; });
  }
  if (!paid && !cancelled) { var saved = readCache(); if (saved) present(saved); }
  before.then(function () { return load(paid || cancelled); });
})();
