// First-visit offer pop-up. Shows once per visit, after a short delay or some scrolling.
// Stores only a "seen" flag in the browser; nothing is sent anywhere.
(function () {
  var d = document.getElementById("offer-pop");
  if (!d || typeof d.showModal !== "function") return;
  var KEY = "flh-offer-seen";
  try { if (sessionStorage.getItem(KEY)) return; } catch (e) {}
  var shown = false;
  function show() {
    if (shown) return; shown = true;
    window.removeEventListener("scroll", onScroll);
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    d.showModal();
  }
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0 && window.scrollY / h > 0.3) show();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  setTimeout(show, 12000);
  d.addEventListener("click", function (ev) {
    if (ev.target === d || ev.target.hasAttribute("data-close")) d.close();
  });
})();
