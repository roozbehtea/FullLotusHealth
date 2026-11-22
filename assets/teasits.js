/* Tea sits: shows upcoming sits on a month calendar with seats left, takes a reservation, and hands off to Stripe to pay.
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

  var TZ = "America/Los_Angeles";
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function dayKey(d) { // YYYY-MM-DD in clinic time
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day;
  }
  function timeParts(iso) {
    var t = new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).split(/[\s\u202f]+/);
    return { time: t[0], ampm: (t[1] || "").toLowerCase() };
  }
  function leftNote(s) { return s.left < 1 ? "Full" : s.left <= 2 ? s.left + " left" : ""; }

  // A month calendar per month that has sits. Each sit is a time button on its day.
  function render(sits) {
    if (!sits.length) { list.innerHTML = '<p class="notice">No tea sits are open for booking right now. ' + FALLBACK.replace("to reserve", "to hear about the next one") + "</p>"; return; }
    var byDay = {}, months = [], prices = {};
    sits.forEach(function (s) {
      var k = dayKey(new Date(s.start)), m = k.slice(0, 7);
      (byDay[k] = byDay[k] || []).push(s);
      if (months.indexOf(m) < 0) months.push(m);
      prices[s.price] = 1;
    });
    var one = Object.keys(prices).length == 1 ? Number(Object.keys(prices)[0]) : null;
    var today = dayKey(new Date());
    var head = DOW.map(function (d) { return '<div class="ts-dow" aria-hidden="true"><span class="l">' + d.slice(0, 3) + '</span><span class="s">' + d.charAt(0) + "</span></div>"; }).join("");
    list.innerHTML = months.map(function (m) {
      var y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7));
      var first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay(), days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      var cells = "";
      for (var i = 0; i < first; i++) cells += '<div class="ts-day out" aria-hidden="true"></div>';
      for (var d = 1; d <= days; d++) {
        var k = m + "-" + (d < 10 ? "0" : "") + d, here = byDay[k] || [];
        cells += '<div class="ts-day' + (here.length ? " has" : "") + (k < today ? " past" : "") + '"><span class="ts-num" aria-hidden="true">' + d + "</span>" +
          here.map(function (s) {
            var t = timeParts(s.start), note = leftNote(s), full = s.left < 1;
            var price = one === null ? '<span class="ts-note">' + (s.price > 0 ? money(s.price) : "Free") + "</span>" : "";
            var inner = '<span class="ts-time">' + esc(t.time) + ' <span class="ts-ampm">' + esc(t.ampm) + "</span></span>" + price + (note ? '<span class="ts-note">' + note + "</span>" : "");
            var aria = esc(s.label) + ", " + (s.price > 0 ? money(s.price) : "free") + (note ? ", " + (full ? "full" : "only " + note) : "");
            return full ? '<span class="ts-slot full" role="img" aria-label="' + aria + '">' + inner + "</span>"
                        : '<button class="ts-slot" type="button" data-id="' + esc(s.id) + '" aria-expanded="false" aria-label="Reserve ' + aria + '">' + inner + "</button>";
          }).join("") + "</div>";
      }
      var tail = (first + days) % 7;
      if (tail) for (var j = tail; j < 7; j++) cells += '<div class="ts-day out" aria-hidden="true"></div>';
      return '<section class="ts-month" aria-label="' + MONTHS[mo - 1] + " " + y + '"><div class="ts-mhead"><h3 class="ts-mname">' + MONTHS[mo - 1] + " " + y + "</h3>" +
        (one !== null ? '<p class="ts-mnote">' + (one > 0 ? money(one) + " a seat" : "Free") + ". Tap a time to reserve.</p>" : '<p class="ts-mnote">Tap a time to reserve.</p>') +
        '</div><div class="ts-grid">' + head + cells + "</div></section>";
    }).join("");
    Array.prototype.forEach.call(list.querySelectorAll("button.ts-slot"), function (b) {
      b.addEventListener("click", function () { openForm(b, sits); });
    });
  }

  function openForm(b, sits) {
    var open = list.querySelector(".ts-form"), was = list.querySelector(".ts-slot.on");
    if (open) open.remove();
    if (was) { was.classList.remove("on"); was.setAttribute("aria-expanded", "false"); if (was === b) { b.focus(); return; } }
    var s = sits.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
    var max = Math.min(MAX, s.left), opts = "";
    for (var i = 1; i <= max; i++) opts += '<option value="' + i + '">' + i + "</option>";
    var f = document.createElement("div");
    f.className = "ts-form";
    f.innerHTML =
      '<form novalidate><p class="ts-for">Reserving for <strong>' + esc(s.label) + "</strong>" +
      ' <button class="ts-close" type="button">Pick another time</button></p>' +
      '<div class="ts-fields">' +
      '<label>Name<input name="name" autocomplete="name" required maxlength="80"></label>' +
      '<label>Email<input name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label>' +
      '<label><span>Phone <span class="fine">(optional)</span></span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>' +
      '<label>Seats<select name="seats">' + opts + "</select></label></div>" +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="ts-actions"><button class="btn" type="submit">' + (s.price > 0 ? "Continue to payment, " + money(s.price) : "Reserve") + '</button></p>' +
      '<p class="fine">' + (s.price > 0 ? "You'll pay securely with Stripe. Have a coupon code? Enter it on the payment page. Seats are held for 30 minutes while you pay." : "") + ' To cancel later, reply to your confirmation email.</p>' +
      '<p class="gmsg" role="status" aria-live="polite"></p></form>';
    b.closest(".ts-month").appendChild(f);
    b.classList.add("on"); b.setAttribute("aria-expanded", "true");
    f.querySelector(".ts-close").addEventListener("click", function () { f.remove(); b.classList.remove("on"); b.setAttribute("aria-expanded", "false"); b.focus(); });
    var form = f.querySelector("form"), msg = f.querySelector(".gmsg"), btn = f.querySelector("button[type=submit]");
    var sel = form.elements.seats;
    var label = function () { if (s.price > 0) btn.textContent = "Continue to payment, " + money(s.price * Number(sel.value)); };
    sel.addEventListener("change", label);
    f.scrollIntoView({ block: "nearest", behavior: "smooth" });
    form.elements.name.focus({ preventScroll: true });
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
          if (r.ok && r.free) { f.remove(); say("<strong>You're in.</strong> A confirmation is on its way to your email."); load(); return; }
          btn.disabled = false; msg.className = "gmsg err";
          if (r.error === "full" && r.left) {
            while (sel.options.length > r.left) sel.remove(sel.options.length - 1);
            s.left = r.left; label();
            msg.textContent = "Only " + r.left + (r.left == 1 ? " seat is" : " seats are") + " left now. Please choose again.";
            return;
          }
          if (r.error === "full" || r.error === "closed") {
            say(r.error === "full" ? "Sorry, that sit just filled up." : "Online booking for that sit has closed. " + FALLBACK, true);
            load(); return;
          }
          msg.innerHTML = r.error === "email" ? "Please check your email address." :
            r.error === "name" ? "Please add your name." : "That didn't go through. " + FALLBACK;
        })
        .catch(function () { btn.disabled = false; msg.className = "gmsg err"; msg.innerHTML = "That didn't go through. " + FALLBACK; });
    });
  }

  function load() {
    return getJSON("").then(function (r) {
      if (!r.sits) throw new Error("bad");
      render(r.sits);
    }).catch(function () { list.innerHTML = '<p class="notice">The schedule couldn\'t load just now. ' + FALLBACK + "</p>"; });
  }
  before.then(load);
})();
