/* Benefits check on /insurance.

   APPS_SCRIPT_URL
   The "Website insurance check" web app on the Full Lotus Clinic Apps Script
   project. This is the only place that URL belongs. Do not put a Stedi key
   in this file or anywhere else on the website. The key stays in Script Properties.
*/
var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCx302RNfDjs3vSfebNTw8w90MyFkoxuHFkWXNc9fBAgFDpyCs0B6A8c6mgzhIWjrI/exec";

(function () {
  var form = document.getElementById("ins-check");
  if (!form) return;
  var result = document.getElementById("ins-result");
  var resultText = document.getElementById("ins-result-text");
  var button = form.querySelector('button[type="submit"]');
  function show(which) {
    var email = form.getAttribute("data-email") || "";
    var phone = form.getAttribute("data-phone") || "";
    var tel = form.getAttribute("data-phone-tel") || "";
    resultText.textContent = "";
    if (which === "active") {
      resultText.textContent = "Active coverage found.";
    } else if (which === "followup") {
      resultText.textContent = "We couldn't confirm coverage. We'll follow up by email.";
    } else {
      var note = document.createElement("span");
      note.textContent = "We couldn't send this from the page. Email us and we'll follow up. ";
      resultText.appendChild(note);
      if (email) {
        var mail = document.createElement("a");
        mail.href = "mailto:" + email + "?subject=PPO%20benefits%20check";
        mail.textContent = email;
        resultText.appendChild(mail);
      }
      if (phone && tel) {
        resultText.appendChild(document.createTextNode(" Or call "));
        var call = document.createElement("a");
        call.href = "tel:" + tel;
        call.textContent = phone;
        resultText.appendChild(call);
        resultText.appendChild(document.createTextNode("."));
      }
    }
    result.hidden = false;
    result.scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    var data = new FormData(form);
    var payload = {
      action: "insurance_check",
      firstName: String(data.get("firstName") || "").trim(),
      lastName: String(data.get("lastName") || "").trim(),
      dob: String(data.get("dob") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      carrier: String(data.get("carrier") || "").trim(),
      memberId: String(data.get("memberId") || "").trim(),
      consent: data.get("consent") === "on",
      website: String(data.get("website") || "").trim()
    };
    if (!APPS_SCRIPT_URL) {
      show("fallback");
      return;
    }
    if (button) button.disabled = true;
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (body) {
      var status = body && body.status;
      if (status !== "active" && status !== "inactive" && status !== "unknown") throw new Error("bad");
      show(status === "active" ? "active" : "followup");
    }).catch(function () {
      show("fallback");
    }).then(function () {
      if (button) button.disabled = false;
    });
  });
})();
