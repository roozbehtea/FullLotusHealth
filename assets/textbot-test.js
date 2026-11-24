/* Test page for the book-by-text assistant (_src/booking/TextBot.gs). Talks to the same Apps Script web app as booking,
   with action "bot_test", which never takes payment, holds a time, writes a sheet row or sends an email. */
(function () {
  var box = document.getElementById("tb");
  if (!box) return;
  var API = box.getAttribute("data-endpoint");
  var log = document.getElementById("tb-log"), form = document.getElementById("tb-form"), input = document.getElementById("tb-q");
  var fail = document.getElementById("tb-fail"), busy = false;

  function newId() {
    var a = "abcdefghijklmnopqrstuvwxyz0123456789", s = "";
    var r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(20)) : null;
    for (var i = 0; i < 20; i++) s += a.charAt((r ? r[i] : Math.floor(Math.random() * 256)) % a.length);
    return s;
  }
  var id = newId();

  function add(kind, text) {
    var d = document.createElement("div");
    d.className = "flh-msg " + kind;
    var p = document.createElement("p");
    // Plain text only; links become tappable but nothing from the server is treated as HTML.
    String(text).split(/(https?:\/\/[^\s]+)/).forEach(function (part, i) {
      if (i % 2) { var a = document.createElement("a"); a.href = part; a.rel = "noopener"; a.target = "_blank"; a.textContent = part; p.appendChild(a); }
      else p.appendChild(document.createTextNode(part));
    });
    d.appendChild(p);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function send(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    busy = true;
    add("user", text);
    var dots = add("bot tb-typing", "…");
    fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow",
      body: JSON.stringify({ action: "bot_test", id: id, text: text }) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        dots.remove();
        if (!res || !res.replies) throw new Error((res && res.error) || "no reply");
        fail.hidden = true;
        if (!res.replies.length) add("bot tb-quiet", "(no reply: the assistant stays quiet here)");
        res.replies.forEach(function (m) { add("bot", m); });
      })
      .catch(function () { dots.remove(); fail.hidden = false; })
      .then(function () { busy = false; });
  }

  form.addEventListener("submit", function (ev) { ev.preventDefault(); var t = input.value; input.value = ""; send(t); input.focus(); });
  Array.prototype.forEach.call(document.querySelectorAll(".tb-chip"), function (b) {
    b.addEventListener("click", function () { send(b.textContent); });
  });
  document.getElementById("tb-reset").addEventListener("click", function () {
    id = newId();
    log.textContent = "";
    fail.hidden = true;
    input.focus();
  });
})();
