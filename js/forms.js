/* Form handling: validation, seller wizard, submission to Google Apps Script */
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function isConfigured() {
    return /^https:\/\/script\.google\.com\/.+\/exec$/.test(cfg.GOOGLE_SCRIPT_URL || "");
  }
  window.FormsSetupMode = function () { return !isConfigured(); };

  function digits(s) { return (s || "").replace(/\D/g, ""); }

  function fieldError(el, msg) {
    var wrap = el.closest(".field");
    var out = wrap && wrap.querySelector(".err");
    if (out) out.textContent = msg || "";
    if (msg) { el.setAttribute("aria-invalid", "true"); } else { el.removeAttribute("aria-invalid"); }
  }

  function validateField(el) {
    var v = (el.type === "checkbox") ? el.checked : el.value.trim();
    var msg = "";
    if (el.required && !v) {
      msg = el.type === "checkbox" ? "Please confirm contact permission to continue."
          : el.tagName === "SELECT" ? "Please choose an option."
          : "This field is required.";
    } else if (el.name === "email" && v && !EMAIL_RE.test(v)) {
      msg = "Enter a valid email address, like name@example.com.";
    } else if (el.name === "phone" && v && digits(v).length < 10) {
      msg = "Enter a phone number with at least 10 digits.";
    } else if (el.name === "state" && v && !/^[A-Za-z]{2}$/.test(v)) {
      msg = "Use the 2-letter state code, like AZ.";
    } else if (el.name === "zip" && v && !/^\d{5}(-\d{4})?$/.test(v)) {
      msg = "Enter a 5-digit ZIP code.";
    }
    fieldError(el, msg);
    return !msg;
  }

  function validateScope(scope) {
    var ok = true, first = null;
    scope.querySelectorAll("input,select,textarea").forEach(function (el) {
      if (el.type === "radio") return;
      if (!validateField(el)) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }

  function liveValidate(form) {
    form.addEventListener("blur", function (e) {
      var el = e.target;
      if (el.matches && el.matches("input,select,textarea") && el.type !== "radio" && (el.value || el.hasAttribute("aria-invalid"))) validateField(el);
    }, true);
    form.addEventListener("input", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("aria-invalid")) validateField(e.target);
    });
  }

  function status(form, msg) {
    var s = form.querySelector("[data-status]");
    s.textContent = msg || "";
    s.className = "form-status" + (msg ? " error" : "");
  }

  function val(form, name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length && el[0] && el[0].type === "radio") {
      var c = form.querySelector('input[name="' + name + '"]:checked');
      return c ? c.value : "";
    }
    return el.type === "checkbox" ? (el.checked ? "Yes" : "No") : el.value.trim();
  }

  function buildPayload(form, type) {
    return {
      submittedAt: new Date().toISOString(),
      inquiryType: type,
      address: val(form, "address"), city: val(form, "city"), state: val(form, "state").toUpperCase(),
      zip: val(form, "zip"), propertyType: val(form, "propertyType"),
      bedrooms: val(form, "bedrooms"), bathrooms: val(form, "bathrooms"), squareFootage: val(form, "squareFootage"),
      condition: val(form, "condition"), improvements: val(form, "improvements"),
      timeline: val(form, "timeline"), reason: val(form, "reason"), notes: val(form, "notes"),
      fullName: val(form, "fullName"), email: val(form, "email"), phone: val(form, "phone"),
      contactMethod: val(form, "contactMethod"),
      consent: val(form, "consent") === "Yes" ? "Consent given" : "No consent",
      website: "" /* honeypot, must stay empty */
    };
  }

  function send(payload) {
    if (!isConfigured()) {
      return Promise.reject(new Error("SETUP"));
    }
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, cfg.REQUEST_TIMEOUT_MS || 20000);
    return fetch(cfg.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, /* avoids CORS preflight */
      body: JSON.stringify(payload),
      signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || j.ok !== true) throw new Error((j && j.error) || "Endpoint rejected the submission");
      return j;
    }).catch(function (e) { clearTimeout(t); throw e; });
  }

  function errorText(e) {
    if (e.message === "SETUP") return "This form is in setup mode and was not sent. The site owner needs to add the Google Apps Script URL in js/config.js. In the meantime, please call 413.218.9066 or email kristen.robertson@exprealty.com.";
    if (e.name === "AbortError") return "The request timed out and your information was not confirmed as sent. Please try again, or call 413.218.9066.";
    return "We could not confirm your submission, so nothing was marked as sent. Please try again, or call 413.218.9066 or email kristen.robertson@exprealty.com.";
  }

  function showThanks(form, thanks) {
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus();
  }

  /* Simple forms (valuation, contact) */
  function simpleForm(id, type) {
    var form = document.getElementById(id);
    if (!form) return;
    var thanks = form.parentNode.querySelector("[data-thanks]");
    var btn = form.querySelector('button[type="submit"]');
    var busy = false, label = btn.textContent;
    liveValidate(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      status(form, "");
      if (!validateScope(form)) { status(form, "Please fix the highlighted fields and try again."); return; }
      busy = true; btn.disabled = true; btn.textContent = "SENDING...";
      send(buildPayload(form, type)).then(function () {
        showThanks(form, thanks);
      }).catch(function (err) {
        status(form, errorText(err));
      }).then(function () { busy = false; btn.disabled = false; btn.textContent = label; });
    });
  }

  /* Seller wizard */
  function sellerWizard() {
    var form = document.getElementById("sellerForm");
    if (!form) return;
    var thanks = document.getElementById("sellerThanks");
    var steps = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-step]"));
    var back = document.getElementById("backBtn"), next = document.getElementById("nextBtn"), submit = document.getElementById("submitBtn");
    var cur = 1, busy = false, done = false;
    liveValidate(form);

    function show(n) {
      cur = n;
      steps.forEach(function (f) { f.hidden = Number(f.dataset.step) !== n; });
      document.getElementById("stepLabel").textContent = "Step " + n + " of " + steps.length;
      document.getElementById("stepName").textContent = steps[n - 1].dataset.name;
      document.getElementById("barFill").style.width = (n / steps.length * 100) + "%";
      back.hidden = n === 1; next.hidden = n === steps.length; submit.hidden = n !== steps.length;
      if (n === steps.length) review();
      status(form, "");
      var lg = steps[n - 1].querySelector("legend"); if (lg) { lg.setAttribute("tabindex", "-1"); lg.focus({ preventScroll: true }); }
      form.closest(".modal").scrollTop = 0;
    }

    function row(k, v) { return "<dt>" + k + "</dt><dd>" + (v ? esc(v) : "Not provided") + "</dd>"; }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function block(title, n, rows) { return "<section><h3>" + title + '<button type="button" data-edit="' + n + '">Edit</button></h3><dl>' + rows + "</dl></section>"; }

    function review() {
      var v = function (n) { return val(form, n); };
      var loc = [v("city"), v("state").toUpperCase(), v("zip")].filter(Boolean).join(", ");
      document.getElementById("reviewBox").innerHTML =
        block("Property", 1, row("Address", v("address")) + row("City, state, ZIP", loc) + row("Property type", v("propertyType"))) +
        block("Home details", 2, row("Bedrooms", v("bedrooms")) + row("Bathrooms", v("bathrooms")) + row("Square footage", v("squareFootage")) + row("Condition", v("condition")) + row("Improvements", v("improvements"))) +
        block("Selling plans", 3, row("Timeline", v("timeline")) + row("Motivation", v("reason")) + row("Other notes", v("notes"))) +
        block("Contact", 4, row("Name", v("fullName")) + row("Email", v("email")) + row("Phone", v("phone")) + row("Preferred method", v("contactMethod")) + row("Contact permission", v("consent") === "Yes" ? "Given" : "Not given"));
    }

    next.addEventListener("click", function () {
      if (validateScope(steps[cur - 1])) show(cur + 1);
    });
    back.addEventListener("click", function () { show(cur - 1); });
    form.addEventListener("click", function (e) {
      var b = e.target.closest("[data-edit]");
      if (b) show(Number(b.dataset.edit));
    });
    /* Enter key advances instead of submitting early */
    form.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && cur < steps.length) { e.preventDefault(); next.click(); }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy || done || cur !== steps.length) return;
      for (var i = 0; i < steps.length - 1; i++) {
        if (!validateScope(steps[i])) { show(i + 1); validateScope(steps[i]); status(form, "Please complete the required fields before submitting."); return; }
      }
      busy = true; submit.disabled = true; back.disabled = true; submit.textContent = "SENDING...";
      send(buildPayload(form, "Seller Questionnaire")).then(function () {
        done = true; showThanks(form, thanks);
      }).catch(function (err) {
        status(form, errorText(err));
      }).then(function () { busy = false; submit.disabled = false; back.disabled = false; submit.textContent = "SUBMIT MY PROPERTY INQUIRY"; });
    });

    window.resetSeller = function () { if (!done) show(cur); };
    show(1);
  }

  simpleForm("valuationForm", "Home Valuation");
  simpleForm("contactForm", "Contact");
  sellerWizard();
})();
