/* Full Lotus Health virtual assistant.
   Guided answers come from /assets/chat-facts.json, which _src/build.py writes from the
   same service list, prices, and clinic facts as the rest of the site.
   Quick replies and keyword matching need no server and no API key.
   If the page sets data-endpoint (chat_url in _src/config.json), a question this
   file does not recognize is sent to the Apps Script in _src/chat. Health questions
   are never sent. If that call is missing, fails, or has no key, the guided reply is used. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.mount();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var ALIASES = {
    "medical-microneedling-session": ["microneedling", "micro needling", "collagen induction"],
    "facial-nano-needling": ["nanoneedling", "nano needling", "nano-needling"],
    "full-lotus-lift": ["cosmetic acupuncture", "full lotus lift", "facial acupuncture"],
    "acupuncture-initial-treatment": ["initial acupuncture", "first acupuncture", "acupuncture initial"],
    "acupuncture-repeat-treatment": ["repeat acupuncture", "follow-up acupuncture", "follow up acupuncture"],
    "initial-consultation-online": ["initial consultation", "online consultation", "video consultation"],
    "repeat-consultation-online": ["repeat consultation", "follow-up consultation", "follow up consultation"],
    "gong-fu-tea-ceremony": ["gong fu", "gongfu"],
    "private-gong-fu-tea-ceremony": ["private gong fu", "private tea", "private ceremony"],
    "bowl-tea-ceremony": ["bowl tea", "bowl ceremony"]
  };
  var JOURNEY = {
    "medical-microneedling-session": 1,
    "facial-nano-needling": 1,
    "full-lotus-lift": 1
  };
  var GROUPS = [
    ["beauty", "Skin and facial"],
    ["acu", "Acupuncture"],
    ["consult", "Online consultations"],
    ["tea", "Tea ceremonies"]
  ];
  var TOPICS = [
    ["where", /\b(where|address|location|directions|direction|parking|park|glenoaks|glen oaks|suite|find you|find the clinic)\b/],
    ["hours", /\b(hours|hour|open|opening|closed|close|when are you|what time)\b/],
    ["cancel", /\b(cancel|cancellation|reschedul|no-show|no show|missed visit|late fee|24 hours|24 hour)\b/],
    ["pay", /\b(pay|payment|card|stripe|deposit|checkout)\b/],
    ["intake", /\b(intake|new patient|paperwork|forms|form)\b/],
    ["series", /\b(five element|5 element|rejuvenation|the series|fifth session|all five)\b/],
    ["tea", /\b(tea sit|tea sits|weekly tea|tea ceremony|tea ceremonies|ceremony)\b/],
    ["contact", /\b(phone|call you|text you|email|contact|reach you|number)\b/],
    ["who", /\b(who is|roozbeh|credential|license|licensed|practitioner|about him|about rooz)\b/],
    ["also", /\b(herbal|herbs|cupping|moxa|moxibustion|massage)\b/],
    ["insurance", /\b(insurance|self-pay|self pay|hsa|fsa)\b/],
    ["offer", /\b(free consult|free consultation|discount|coupon|promo code|special offer|groupon|deal)\b/],
    ["scope", /\b(what do you treat|what can you treat|do you treat|conditions you|for pain|for stress|for sleep|for digestion)\b/],
    ["book", /\b(book|booking|appointment|schedule|reserve|availability|openings)\b/],
    ["price", /\b(price|prices|cost|costs|fee|fees|how much|charge)\b/],
    ["services", /\b(services|treatments|what do you offer|menu of|options)\b/]
  ];
  var MEDICAL = /\b(diagnos\w*|cure|cures|guarantee|prognosis|prescription|medication|medications|pregnant|pregnancy|side effect|is it safe|safe for me|will (it|this|that|they|acupuncture|microneedling|nanoneedling|needling|herbs) help|can (it|this|that|they|you|acupuncture) (help|treat|cure|fix)|should i|i have|i've got|i feel|i'm having|i am having|my (pain|ache|skin|acne|eczema|psoriasis|rosacea|rash|scar|back|neck|shoulder|knee|head|migraine|anxiety|sleep|insomnia|digestion)|help with my|treat my|fix my|good for my|work for my|right for me)\b/;
  var CONDITION = /\b(eczema|psoriasis|rosacea|acne|cancer|tumor|depression|anxiety|insomnia|migraine|arthritis|fertility|pregnant|pregnancy)\b/;

  function money(n) {
    return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function normalize(s) {
    return String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9+$'\s-]/g, " ").replace(/\s+/g, " ").trim();
  }
  function bySlug(facts, slug) {
    for (var i = 0; i < facts.services.length; i++) if (facts.services[i].slug === slug) return facts.services[i];
    return null;
  }
  function linkFor(facts, slug, label, primary) {
    var s = bySlug(facts, slug);
    if (!s) return null;
    return { href: s.book, label: label || s.bookLabel, primary: !!primary };
  }
  function bookLink(s, primary) {
    return { href: s.book, label: s.bookLabel, primary: !!primary };
  }
  function minutes(s) {
    return s.minutes ? ", " + s.minutes + " min" : "";
  }
  function placeLine(facts, s) {
    if (s.group === "consult") return "This visit is online, by video.";
    return "In person at " + facts.address + ". " + facts.parking;
  }
  function pkgFor(facts, slug) {
    var list = (facts.series && facts.series.packages) || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  function serviceAnswer(facts, s, cautious) {
    var bits = [s.name + " is " + money(s.price) + minutes(s) + "."];
    if (!cautious && s.short) bits.push(s.short);
    bits.push(placeLine(facts, s));
    var pkg = pkgFor(facts, s.slug);
    if (pkg) bits.push("As a " + facts.series.name + " series of " + pkg.sessions + ", it is " + money(pkg.price) + ". Book all five and the fifth is free.");
    else if (JOURNEY[s.slug] && facts.series) bits.push("It can be part of " + facts.series.name + ". Book all five and the fifth is free. A separate series price is not listed for this visit.");
    if (s.group === "tea") bits.push("Tea ceremonies are booked by text, not online.");
    if (cautious) bits.push("I can't say whether it is the right visit for you. Roozbeh can discuss that with you. Please don't share health details here.");
    bits.push(facts.payment);
    var links = [bookLink(s, true)];
    if (s.page) links.push({ href: s.page, label: "About " + s.name });
    if (pkg || JOURNEY[s.slug]) links.push({ href: facts.series.href, label: "Five Element series" });
    return { id: "service", text: bits.join(" "), links: links };
  }

  function prices(facts) {
    var lines = [];
    GROUPS.forEach(function (g) {
      var rows = facts.services.filter(function (s) { return s.group === g[0]; });
      if (!rows.length) return;
      lines.push(g[1]);
      rows.forEach(function (s) { lines.push(s.name + ": " + money(s.price) + minutes(s) + "."); });
    });
    if (facts.series && facts.series.packages && facts.series.packages.length) {
      lines.push(facts.series.name + ": book all five and the fifth is free.");
      facts.series.packages.forEach(function (p) {
        lines.push(p.name + " series of " + p.sessions + ": " + money(p.price) + ".");
      });
    }
    lines.push("Tea ceremonies are booked by text. " + facts.payment);
    var links = facts.services.filter(function (s) { return s.group !== "tea"; }).map(function (s) { return bookLink(s, false); });
    links.push({ href: "sms:" + facts.phoneTel, label: "Text to book tea" });
    links.push({ href: facts.teaSitsHref, label: "Weekly tea sits" });
    return { id: "prices", text: lines.join("\n"), links: links };
  }

  function where(facts) {
    return {
      id: "where",
      text: facts.clinic + " is at " + facts.address + ". " + facts.parking + " " + facts.hours,
      links: [
        { href: facts.mapsGoogle, label: "Open in Google Maps" },
        { href: facts.mapsApple, label: "Open in Apple Maps" },
        { href: facts.bookOnline, label: "Book a visit", primary: true }
      ]
    };
  }
  function hours(facts) {
    return {
      id: "hours",
      text: facts.hours,
      links: [{ href: facts.bookOnline, label: "See open times", primary: true }]
    };
  }
  function cancel(facts) {
    return {
      id: "cancel",
      text: "You can cancel free of charge up to " + facts.noticeHours + " hours ahead. Call or text " + facts.phone + ". A cancellation or a no-show with less than " + facts.noticeHours + " hours' notice is charged " + money(facts.lateFee) + ".",
      links: [{ href: "sms:" + facts.phoneTel, label: "Text " + facts.phone, primary: true }]
    };
  }
  function pay(facts) {
    return { id: "pay", text: facts.payment, links: [{ href: facts.bookOnline, label: "Book a visit", primary: true }] };
  }
  function intake(facts) {
    return {
      id: "intake",
      text: "New patients complete the intake form before the first visit, so Roozbeh can review it ahead of time. Please keep health details on that form, not in this chat, and not by text or email.",
      links: [
        { href: facts.intakeHref, label: "New patient form", primary: true },
        { href: facts.bookOnline, label: "Book a visit" }
      ]
    };
  }
  function series(facts) {
    var s = facts.series;
    var lines = [s.summary];
    (s.packages || []).forEach(function (p) {
      lines.push(p.name + ", " + p.sessions + " sessions: " + money(p.price) + ".");
    });
    var links = [
      { href: s.href, label: "About the series", primary: true },
      linkFor(facts, "medical-microneedling-session", "Book microneedling"),
      linkFor(facts, "facial-nano-needling", "Book nanoneedling"),
      linkFor(facts, "full-lotus-lift", "Book cosmetic acupuncture")
    ].filter(Boolean);
    return { id: "series", text: lines.join(" "), links: links };
  }
  function tea(facts) {
    var rows = facts.services.filter(function (s) { return s.group === "tea"; });
    var lines = rows.map(function (s) { return s.name + ": " + money(s.price) + minutes(s) + "."; });
    lines.push("Tea ceremonies are booked by text at " + facts.phone + ". " + facts.teaSitsBlurb);
    lines.push(placeLine(facts, rows[0] || { group: "tea" }));
    return {
      id: "tea",
      text: lines.join(" "),
      links: [
        { href: "sms:" + facts.phoneTel, label: "Text to book tea", primary: true },
        { href: facts.teaSitsHref, label: "Weekly tea sits" },
        { href: "/tea-ceremonies", label: "Tea ceremonies" }
      ]
    };
  }
  function contact(facts) {
    return {
      id: "contact",
      text: "Call or text " + facts.phone + ", or email " + facts.email + ". Please don't send health details by text or email. Use the intake form, or talk with Roozbeh at a visit.",
      links: [
        { href: "tel:" + facts.phoneTel, label: "Call " + facts.phone },
        { href: "sms:" + facts.phoneTel, label: "Text " + facts.phone, primary: true },
        { href: "mailto:" + facts.email, label: facts.email },
        { href: facts.intakeHref, label: "New patient form" }
      ]
    };
  }
  function who(facts) {
    return {
      id: "who",
      text: facts.practitioner + ". " + facts.credentials,
      links: [{ href: "/acupuncture", label: "Acupuncture and herbs" }, { href: facts.bookOnline, label: "Book a visit", primary: true }]
    };
  }
  function also(facts) {
    return {
      id: "also",
      text: facts.also,
      links: [{ href: "sms:" + facts.phoneTel, label: "Text the clinic", primary: true }, { href: "/acupuncture", label: "Acupuncture and herbs" }]
    };
  }
  function insurance(facts) {
    return {
      id: "insurance",
      text: facts.selfPay + " " + facts.payment,
      links: [{ href: facts.bookOnline, label: "Book a visit", primary: true }]
    };
  }
  function offer(facts) {
    return {
      id: "offer",
      text: "There isn't a free consultation, and there isn't a discount to enter when you book. " + facts.series.summary,
      links: [
        { href: facts.series.href, label: "Five Element series" },
        { href: facts.bookOnline, label: "Book a visit", primary: true }
      ]
    };
  }
  function scope(facts) {
    return {
      id: "scope",
      text: "The site describes acupuncture visits for concerns such as pain, stress, sleep, and digestion, and herbal medicine is also part of the practice. I can't say whether a visit is right for you, or that a treatment will help a condition. Roozbeh can discuss that with you at a visit. Please don't share health details here.",
      links: [
        linkFor(facts, "acupuncture-initial-treatment", "Book acupuncture", true),
        linkFor(facts, "initial-consultation-online", "Book an online consultation")
      ].filter(Boolean)
    };
  }
  function medical(facts) {
    return {
      id: "medical",
      text: "I can't give medical advice, diagnose, or say whether a treatment will help. Roozbeh can discuss that with you at a visit. Please don't share health details in this chat.",
      links: [
        linkFor(facts, "acupuncture-initial-treatment", "Book acupuncture", true),
        linkFor(facts, "initial-consultation-online", "Book an online consultation")
      ].filter(Boolean)
    };
  }
  function book(facts) {
    return {
      id: "book",
      text: "Pick a service and a time, then pay when you book. Nothing is held until payment goes through. Tea ceremonies are booked by text. Weekly tea sits are listed on their own page. New patients fill out the intake form before the first visit.",
      links: [
        { href: facts.bookOnline, label: "Book online", primary: true },
        { href: "sms:" + facts.phoneTel, label: "Text to book tea" },
        { href: facts.teaSitsHref, label: "Weekly tea sits" },
        { href: facts.intakeHref, label: "New patient form" }
      ]
    };
  }
  function hello() {
    return {
      id: "hello",
      text: "Hello. I can help with fees, booking, parking, hours, cancellation, and tea. When you are ready, I will point you to the right page.",
      links: []
    };
  }

  var BY_ID = {
    hello: hello, prices: prices, services: prices, book: book, where: where, hours: hours,
    cancel: cancel, pay: pay, intake: intake, series: series, tea: tea, contact: contact,
    who: who, also: also, insurance: insurance, offer: offer, scope: scope, medical: medical
  };

  function topicsIn(text) {
    var found = {};
    TOPICS.forEach(function (pair) { if (pair[1].test(text)) found[pair[0]] = 1; });
    return found;
  }
  function matchServices(facts, text) {
    var hits = [];
    facts.services.forEach(function (s) {
      var names = [s.name.toLowerCase()].concat(ALIASES[s.slug] || []);
      var best = 0;
      names.forEach(function (n) { if (n && text.indexOf(n) >= 0 && n.length > best) best = n.length; });
      if (best) hits.push({ s: s, n: best });
    });
    return hits.filter(function (h) {
      return !hits.some(function (o) {
        if (o === h || o.n <= h.n) return false;
        var longer = [o.s.name.toLowerCase()].concat(ALIASES[o.s.slug] || []);
        var shorter = [h.s.name.toLowerCase()].concat(ALIASES[h.s.slug] || []);
        return longer.some(function (L) {
          return text.indexOf(L) >= 0 && shorter.some(function (S) { return S && L.indexOf(S) >= 0 && L !== S; });
        });
      });
    }).map(function (h) { return h.s; });
  }

  function replyById(facts, id) {
    var fn = BY_ID[id];
    return fn ? fn(facts) : null;
  }

  function hasKeyword(text, keyword) {
    var esc = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + esc + "\\b").test(text);
  }
  function bestPost(facts, text) {
    var posts = facts.posts || [];
    var best = null;
    var bestScore = 1;
    posts.forEach(function (p) {
      var score = 0;
      (p.keywords || []).forEach(function (k) {
        if (!hasKeyword(text, k)) return;
        score += k.indexOf(" ") >= 0 ? 3 : (k.length >= 8 ? 2 : 1);
      });
      if (score > bestScore) { best = p; bestScore = score; }
    });
    return best;
  }
  function readMore(post) {
    return { href: post.href, label: "Read more: " + post.title };
  }
  function withPost(ans, post) {
    if (!ans || !post) return ans;
    var links = ans.links || [];
    for (var i = 0; i < links.length; i++) if (links[i].href === post.href) return ans;
    ans.links = links.concat([readMore(post)]);
    return ans;
  }
  function postAnswer(facts, post) {
    return {
      id: "post",
      text: post.summary,
      links: [readMore(post), { href: facts.bookOnline, label: "Book a visit", primary: true }]
    };
  }

  function reply(facts, raw) {
    var text = normalize(raw);
    if (!text || /^(hi|hello|hey|hiya|help|good morning|good afternoon|good evening)$/.test(text)) return hello();
    var askingMoney = /\b(price|prices|cost|costs|fee|fees|how much|charge|book|booking)\b/.test(text);
    var post = bestPost(facts, text);
    if (MEDICAL.test(text) || (CONDITION.test(text) && !askingMoney)) return withPost(medical(facts), post);
    var services = matchServices(facts, text);
    var topics = topicsIn(text);
    if (topics.offer && !topics.series) return offer(facts);
    var reading = /\b(expect|what happens|how does|how do|what is|what's|tell me about|blog|article|difference|versus|vs|which is|compare|comparison|how it works)\b/.test(text);
    var practical = askingMoney || topics.where || topics.hours || topics.cancel || topics.pay || topics.intake || topics.contact || topics.book || topics.insurance || topics.who;
    if (post && reading && !practical) {
      var readingAnswer = postAnswer(facts, post);
      if (services.length === 1) readingAnswer.links.push(bookLink(services[0], false));
      return readingAnswer;
    }
    if (/\bacupuncture\b/.test(text) && !services.length) {
      services = facts.services.filter(function (s) { return s.group === "acu"; });
    }
    if (/\bconsult/.test(text) && !services.some(function (s) { return s.group === "consult"; })) {
      services = services.concat(facts.services.filter(function (s) { return s.group === "consult"; }));
    }
    var cautious = CONDITION.test(text);
    if (services.length === 1) return withPost(serviceAnswer(facts, services[0], cautious), post);
    if (services.length > 1 && (askingMoney || topics.book || topics.price || (!topics.where && !topics.hours && !topics.cancel))) {
      var lines = services.map(function (s) { return s.name + ": " + money(s.price) + minutes(s) + "."; });
      if (cautious) lines.push("I can't say whether a visit is right for you. Roozbeh can discuss that with you.");
      return withPost({ id: "service", text: lines.join("\n"), links: services.map(function (s, i) { return bookLink(s, i === 0); }) }, post);
    }
    var order = ["series", "where", "cancel", "pay", "intake", "hours", "tea", "contact", "who", "also", "insurance", "scope", "offer", "book", "price", "services"];
    for (var i = 0; i < order.length; i++) if (topics[order[i]]) return withPost(BY_ID[order[i]](facts), topics.offer ? null : post);
    if (post) return postAnswer(facts, post);
    return null;
  }

  function safeHref(facts, href) {
    if (!href || typeof href !== "string") return "";
    if (href.charAt(0) === "/" && href.indexOf("//") !== 0 && href.indexOf(" ") < 0 && href.indexOf("\\") < 0) return href;
    if (href.indexOf("sms:") === 0 || href.indexOf("tel:") === 0 || href.indexOf("mailto:") === 0) return href;
    if (href === facts.mapsGoogle || href === facts.mapsApple || href === facts.intakeHref) return href;
    return "";
  }

  function mount() {
    var rootEl = document.getElementById("flh-chat");
    if (!rootEl) return;
    var launch = rootEl.querySelector(".flh-chat-launch");
    var panel = rootEl.querySelector(".flh-chat-panel");
    var log = rootEl.querySelector(".flh-chat-log");
    var form = rootEl.querySelector(".flh-chat-form");
    var input = rootEl.querySelector(".flh-chat-input");
    var endpoint = rootEl.getAttribute("data-endpoint") || "";
    var facts = null;
    var factsP = null;
    var greeted = false;
    var aiLeft = 6;
    var busy = false;

    function loadFacts() {
      if (!factsP) {
        factsP = fetch("/assets/chat-facts.json", { credentials: "same-origin" }).then(function (r) {
          if (!r.ok) throw new Error("facts");
          return r.json();
        }).then(function (data) { facts = data; return data; });
      }
      return factsP;
    }
    function showFail() {
      var fail = rootEl.querySelector(".flh-chat-fail");
      if (fail) fail.hidden = false;
    }
    function addMsg(role, text, links) {
      var item = document.createElement("div");
      item.className = "flh-msg " + (role === "user" ? "user" : "bot");
      var p = document.createElement("p");
      p.textContent = text;
      item.appendChild(p);
      (links || []).forEach(function (l) {
        if (!facts) return;
        var href = safeHref(facts, l.href);
        if (!href) return;
        var a = document.createElement("a");
        a.href = href;
        a.textContent = l.label;
        if (l.primary) a.className = "btn small";
        if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
        item.appendChild(a);
      });
      var start = log.scrollHeight;
      log.appendChild(item);
      log.scrollTop = start;
      return item;
    }
    function localFallback() {
      addMsg("bot", "I don't have that in what I can answer. I can help with fees, booking, the address and parking, hours, cancellation, new patients, the Five Element series, or tea.", [
        { href: "/book-online", label: "Book a visit", primary: true },
        { href: "sms:" + (facts ? facts.phoneTel : ""), label: "Text the clinic" }
      ]);
    }
    function showAnswer(ans) {
      if (!ans) { localFallback(); return; }
      addMsg("bot", ans.text, ans.links);
    }
    function askAI(text) {
      aiLeft -= 1;
      busy = true;
      var pending = addMsg("bot", "One moment…", []);
      var url = endpoint + (endpoint.indexOf("?") >= 0 ? "&" : "?") + "action=chat&q=" + encodeURIComponent(text);
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
      fetch(url, { redirect: "follow", signal: ctrl ? ctrl.signal : undefined }).then(function (r) { return r.json(); }).then(function (data) {
        clearTimeout(timer);
        if (pending && pending.parentNode) pending.parentNode.removeChild(pending);
        busy = false;
        if (!data || data.fallback || !data.answer) { localFallback(); return; }
        var answer = String(data.answer).replace(/\s+/g, " ").trim().slice(0, 700);
        if (!answer || /\b(this will help|yes, it will help|guaranteed to|cure your)\b/i.test(answer)) {
          showAnswer(medical(facts));
          return;
        }
        addMsg("bot", answer, [{ href: "/book-online", label: "Book a visit", primary: true }]);
      }).catch(function () {
        clearTimeout(timer);
        if (pending && pending.parentNode) pending.parentNode.removeChild(pending);
        busy = false;
        localFallback();
      });
    }
    function onQuestion(text, chipId) {
      var trimmed = String(text || "").replace(/\s+/g, " ").trim();
      if (!trimmed || busy) return;
      addMsg("user", trimmed, []);
      if (!chipId) input.value = "";
      loadFacts().then(function () {
        var ans = chipId ? replyById(facts, chipId) : reply(facts, trimmed);
        if (ans) { showAnswer(ans); return; }
        var words = trimmed.split(" ").length;
        if (endpoint && aiLeft > 0 && trimmed.length >= 12 && trimmed.length <= 400 && words >= 2) askAI(trimmed);
        else localFallback();
      }).catch(function () { showFail(); });
    }
    function open() {
      panel.hidden = false;
      launch.setAttribute("aria-expanded", "true");
      loadFacts().then(function () {
        if (!greeted) { greeted = true; showAnswer(hello()); }
      }).catch(function () { showFail(); });
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() {
      panel.hidden = true;
      launch.setAttribute("aria-expanded", "false");
      launch.focus();
    }
    launch.addEventListener("click", function () {
      if (panel.hidden) open(); else close();
    });
    rootEl.querySelector(".flh-chat-close").addEventListener("click", close);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !panel.hidden) { ev.preventDefault(); close(); }
    });
    Array.prototype.forEach.call(rootEl.querySelectorAll(".flh-chip"), function (btn) {
      btn.addEventListener("click", function () { onQuestion(btn.textContent, btn.getAttribute("data-id")); });
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      onQuestion(input.value, null);
    });
    if (window.visualViewport) {
      var lift = function () {
        var vv = window.visualViewport;
        var overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        rootEl.style.transform = overlap ? "translateY(" + (-overlap) + "px)" : "";
      };
      window.visualViewport.addEventListener("resize", lift);
      window.visualViewport.addEventListener("scroll", lift);
    }
    if (window.requestIdleCallback) requestIdleCallback(function () { loadFacts().catch(function () {}); });
  }

  return { reply: reply, replyById: replyById, safeHref: safeHref, mount: mount, money: money };
});
