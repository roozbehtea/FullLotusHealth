/* Five Element quiz: five questions, one at a time, then the visitor's leading element.
   Runs in the browser only. The answers are not saved or sent; the optional newsletter
   form below the result tags the signup with the element (e.g. "five-element-wood"). */
(function () {
  var quiz = document.getElementById("fe-quiz");
  if (!quiz) return;
  var NAMES = ["wood", "fire", "earth", "metal", "water"];
  var steps = quiz.querySelectorAll(".feq-q");
  var dots = quiz.querySelectorAll(".feq-dots li");
  var resultsBox = quiz.querySelector(".feq-results");
  var results = quiz.querySelectorAll(".feq-r");
  var back = quiz.querySelector("[data-feq-back]");
  var again = quiz.querySelector("[data-feq-restart]");
  var see = quiz.querySelector("[data-feq-see]");
  var source = quiz.querySelector("input[name=source]");
  var rows = document.querySelectorAll(".elements .element");
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var answers = [];
  var current = 0;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function keepInView(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    var box = quiz.getBoundingClientRect();
    if (box.top < 0 || box.top > window.innerHeight * 0.6) quiz.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  }

  function showStep(i, move) {
    current = i;
    each(steps, function (s, k) { s.hidden = k !== i; });
    resultsBox.hidden = true;
    each(dots, function (d, k) { d.className = k < i ? "done" : (k === i ? "on" : ""); });
    each(steps[i].querySelectorAll(".feq-opt"), function (b) {
      b.setAttribute("aria-pressed", String(answers[i] === Number(b.getAttribute("data-el"))));
    });
    back.hidden = i === 0;
    again.hidden = true;
    each(rows, function (r) { r.classList.remove("is-you"); });
    if (move) keepInView(steps[i].querySelector(".feq-qt"));
  }

  function finish() {
    var counts = [0, 0, 0, 0, 0];
    answers.forEach(function (a) { counts[a] += 1; });
    var top = Math.max.apply(null, counts);
    var tied = [];
    counts.forEach(function (c, k) { if (c === top) tied.push(k); });
    var winner = tied.indexOf(answers[0]) !== -1 ? answers[0] : tied[0];

    each(steps, function (s) { s.hidden = true; });
    each(dots, function (d) { d.className = "done"; });
    each(results, function (r) { r.hidden = Number(r.getAttribute("data-el")) !== winner; });
    resultsBox.hidden = false;
    back.hidden = false;
    again.hidden = false;
    if (source) source.value = "five-element-" + NAMES[winner];
    if (see) see.setAttribute("href", "#fe-s" + (winner + 1));
    each(rows, function (r, k) { r.classList.toggle("is-you", k === winner); });
    keepInView(resultsBox.querySelector(".feq-r:not([hidden]) .feq-rn"));
  }

  quiz.hidden = false;

  quiz.addEventListener("click", function (ev) {
    var opt = ev.target.closest(".feq-opt");
    if (opt) {
      answers[current] = Number(opt.getAttribute("data-el"));
      answers.length = current + 1;
      if (current < steps.length - 1) showStep(current + 1, true);
      else finish();
      return;
    }
    if (ev.target.closest("[data-feq-back]")) {
      showStep(resultsBox.hidden ? Math.max(0, current - 1) : steps.length - 1, true);
      return;
    }
    if (ev.target.closest("[data-feq-restart]")) {
      answers = [];
      showStep(0, true);
    }
  });
})();
