/* Email signups (homepage newsletter, Five Element quiz). Sends the email address and a
   source tag to the Apps Script web app in _src/config.json. Nothing else is collected. */
(function () {
  var forms = document.querySelectorAll("form.signup");
  Array.prototype.forEach.call(forms, function (form) {
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
      body.set("source", form.elements.source.value);
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
  });
})();
