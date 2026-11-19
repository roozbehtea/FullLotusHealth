// Menu groups (Natural beauty, Tea). One open at a time; Escape or a click
// elsewhere closes them. On phones the menu opens with the current page's
// group already expanded. Everything still works without this file.
(function () {
  var groups = document.querySelectorAll(".nav-group details");
  if (!groups.length) return;
  var phone = window.matchMedia("(max-width: 70rem)");

  function closeAll(except) {
    groups.forEach(function (d) { if (d !== except) d.open = false; });
  }

  groups.forEach(function (d) {
    d.addEventListener("toggle", function () { if (d.open) closeAll(d); });
  });

  document.addEventListener("click", function (ev) {
    if (phone.matches) return;   // the phone menu is an accordion: groups stay as left
    if (!ev.target.closest(".nav-group")) closeAll();
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var open = document.querySelector(".nav-group details[open]");
    if (!open) return;
    open.open = false;
    open.querySelector("summary").focus();
  });

  // Desktop: leaving a drop-down with Tab closes it.
  document.addEventListener("focusin", function (ev) {
    if (phone.matches) return;
    var open = document.querySelector(".nav-group details[open]");
    if (open && !open.contains(ev.target)) open.open = false;
  });

  var check = document.getElementById("menu-check");
  if (check) check.addEventListener("change", function () {
    if (!check.checked || !phone.matches) return;
    var cur = document.querySelector(".nav-group summary.is-current");
    if (cur) cur.parentElement.open = true;
  });
})();
