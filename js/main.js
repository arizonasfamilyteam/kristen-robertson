/* Menu, dialogs, smooth scrolling */
(function () {
  "use strict";
  var menuBtn = document.getElementById("menuBtn");
  var menu = document.getElementById("menuPanel");
  var dialogs = { seller: "sellerDialog", valuation: "valuationDialog", contact: "contactDialog" };

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
  }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener("click", function (e) {
    if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });

  function openDialog(key) {
    var d = document.getElementById(dialogs[key]);
    if (!d) return;
    d.querySelectorAll("[data-setup]").forEach(function (n) { n.hidden = !(window.FormsSetupMode && window.FormsSetupMode()); });
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); }
    else { d.setAttribute("open", ""); }
  }

  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]");
    if (o) { e.preventDefault(); setMenu(false); openDialog(o.dataset.open); return; }
    if (e.target.closest("[data-close]")) { var dlg = e.target.closest("dialog"); if (dlg) dlg.close(); return; }
    /* click on backdrop closes dialog */
    if (e.target.tagName === "DIALOG") e.target.close();
  });

  /* Menu and footer navigation */
  document.querySelectorAll("[data-nav]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var nav = a.dataset.nav;
      if (nav === "explore") { setMenu(false); return; } /* normal external link, new tab */
      e.preventDefault(); setMenu(false);
      if (nav === "valuation" || nav === "seller") { openDialog(nav); return; }
      var target = nav === "home" ? document.body : document.getElementById(nav);
      if (nav === "home") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* Portrait graceful fallback */
  var img = document.getElementById("portraitImg");
  if (img) {
    var fb = img.parentNode.querySelector(".portrait-fallback");
    var fail = function () { img.hidden = true; if (fb) fb.hidden = false; };
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0) fail();
  }

  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
})();
