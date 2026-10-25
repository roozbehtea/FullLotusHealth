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
})();
