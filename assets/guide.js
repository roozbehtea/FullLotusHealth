/* Homepage "find your starting point" guide.
   Runs only in the visitor's browser. It stores nothing and sends nothing.
   Without JavaScript the first-step choices are plain links to the same pages. */
(function () {
  var g = document.getElementById("guide");
  if (!g) return;
  var stage = g.querySelector(".gstage");
  var stack = ["start"];
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(id, moveFocus) {
    g.classList.toggle("at-result", id.indexOf("r-") === 0);
    var panels = stage.querySelectorAll(".gstep");
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.toggle("on", panels[i].id === "g-" + id);
    }
    if (!moveFocus) return;
    var q = stage.querySelector("#g-" + id + " .gq");
    if (q) q.focus({ preventScroll: true });
    var box = stage.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      stage.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
  }

  g.classList.add("js");

  g.addEventListener("click", function (ev) {
    var go = ev.target.closest("a[data-go]");
    if (go && g.contains(go)) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
      ev.preventDefault();
      var id = go.getAttribute("data-go");
      stack.push(id);
      show(id, true);
      return;
    }
    if (ev.target.closest("[data-back]")) {
      if (stack.length > 1) stack.pop();
      show(stack[stack.length - 1], true);
      return;
    }
    if (ev.target.closest("[data-restart]")) {
      stack = ["start"];
      show("start", true);
    }
  });

  // Email signup: email only. Nothing about the guide choices is sent.
  var form = document.getElementById("g-signup");
  if (form) {
    var msg = form.querySelector(".gmsg");
    var btn = form.querySelector("button[type=submit]");
    var thanks = function () {
      form.querySelector(".grow").hidden = true;
      msg.className = "gmsg";
      msg.textContent = "Thank you. You are on the list.";
    };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (form.elements.website.value) { thanks(); return; }          // trap field filled: likely a bot
      if (form.hasAttribute("data-demo")) { thanks(); return; }       // preview only: no address set up yet
      var body = new URLSearchParams();
      body.set("email", form.elements.email.value);
      body.set("source", "home-guide");
      body.set("website", "");
      btn.disabled = true;
      msg.className = "gmsg";
      msg.textContent = "Sending...";
      fetch(form.action, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
        .then(thanks)
        .catch(function () {
          btn.disabled = false;
          msg.className = "gmsg err";
          msg.textContent = "That did not go through. Please email info@fulllotushealth.com and we will add you.";
        });
    });
  }
})();
