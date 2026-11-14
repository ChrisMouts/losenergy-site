/* LosEnergy site script, shared by both pages. Nothing here is needed to read the
   content: without it the map is still shaded and the receipts still show. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;

  function onceVisible(el, threshold, fn) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); fn(); return; }
      }
    }, { threshold: threshold });
    io.observe(el);
  }

  /* ---- Data page: a receipt's fingerprints settle once, when they come into view ---- */
  var seals = document.querySelectorAll("[data-seal]");
  if (seals.length && !reduce && canObserve) {
    var HEX = "0123456789abcdef";
    var noise = function (n) { var s = ""; for (var i = 0; i < n; i++) s += HEX.charAt((Math.random() * 16) | 0); return s; };
    var settle = function (el, delay) {
      var target = el.getAttribute("data-seal"), n = target.length, duration = 1100, start = null;
      var set = document.createElement("span"), unset = document.createElement("span");
      unset.className = "unset";
      el.textContent = "";
      el.appendChild(set); el.appendChild(unset);
      unset.textContent = noise(n);
      var frame = function (t) {
        if (start === null) start = t + delay;
        var p = Math.max(0, Math.min(1, (t - start) / duration));
        var k = Math.floor(n * (1 - Math.pow(1 - p, 2)));
        set.textContent = target.slice(0, k);
        unset.textContent = noise(n - k);
        if (p < 1) requestAnimationFrame(frame); else el.textContent = target;
      };
      requestAnimationFrame(frame);
    };
    onceVisible(seals[0].closest("figure") || seals[0], 0.6, function () {
      for (var i = 0; i < seals.length; i++) settle(seals[i], i * 180);
    });
  }

  /* ---- Home page: the coverage map ---- */
  var root = document.querySelector("[data-coverage]");
  var source = document.getElementById("coverage-data");
  if (!root || !source) return;
  var data = JSON.parse(source.textContent);
  var mapBox = root.querySelector(".cov-map");
  var svg = root.querySelector("svg");
  var outline = svg.querySelector(".z-outline");
  var panel = root.querySelector("[data-panel]");
  var defaultPanel = panel.innerHTML;
  var zoneEls = svg.querySelectorAll(".z");
  var labelEls = svg.querySelectorAll(".zl");
  var buttons = root.querySelectorAll("[data-company]");
  var pinned = null; // {kind: "zone"|"company", key}

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function zoneEl(code) { return svg.querySelector('.z[data-zone="' + code + '"]'); }
  function labelEl(code) { return svg.querySelector('.zl[data-zone="' + code + '"]'); }

  function clear() {
    svg.classList.remove("has-company");
    outline.setAttribute("d", "");
    for (var i = 0; i < zoneEls.length; i++) { zoneEls[i].classList.remove("is-on"); zoneEls[i].setAttribute("aria-pressed", "false"); }
    for (var j = 0; j < labelEls.length; j++) labelEls[j].classList.remove("is-on");
    for (var k = 0; k < buttons.length; k++) buttons[k].setAttribute("aria-pressed", "false");
  }

  function showZone(code, pin) {
    clear();
    var z = data.zones[code], el = zoneEl(code);
    outline.setAttribute("d", el.getAttribute("d"));
    if (pin) el.setAttribute("aria-pressed", "true");
    var names = z.companies.map(function (i) { return "<li>" + esc(data.companies[i].name) + "</li>"; }).join("");
    var n = z.companies.length;
    panel.innerHTML =
      "<h3>" + esc(z.name) + "</h3>" +
      '<p class="cp-sub">' + esc(z.label) + ", " + n + (n === 1 ? " company" : " companies") + "</p>" +
      "<ul>" + names + "</ul>" +
      (code === "GB" ? '<p class="cp-note">Four of them are read from the farms’ own meters.</p>' : "");
  }

  function showCompany(i, pin) {
    clear();
    var c = data.companies[i];
    svg.classList.add("has-company");
    c.zones.forEach(function (code) {
      zoneEl(code).classList.add("is-on");
      var l = labelEl(code); if (l) l.classList.add("is-on");
    });
    if (pin) buttons[i].setAttribute("aria-pressed", "true");
    var labels = c.zones.map(function (code) { return data.zones[code].label; }).join(", ");
    panel.innerHTML =
      "<h3>" + esc(c.name) + "</h3>" +
      '<p class="cp-sub">' + esc(c.ticker) + ", " + esc(c.mw) + " MW declared</p>" +
      "<p>" + c.zones.length + (c.zones.length === 1 ? " zone: " : " zones: ") + esc(labels) + "</p>" +
      (c.note ? '<p class="cp-note">' + esc(c.note) + "</p>" : "") +
      (c.metered ? '<p class="cp-note">Great Britain is read from the farms’ own meters.</p>' : "");
  }

  function restore() {
    if (!pinned) { clear(); panel.innerHTML = defaultPanel; return; }
    if (pinned.kind === "zone") showZone(pinned.key, true); else showCompany(pinned.key, true);
  }
  function toggle(kind, key) {
    if (pinned && pinned.kind === kind && pinned.key === key) pinned = null;
    else pinned = { kind: kind, key: key };
    restore();
  }

  Array.prototype.forEach.call(zoneEls, function (el) {
    var code = el.getAttribute("data-zone");
    el.addEventListener("mouseenter", function () { showZone(code, false); });
    el.addEventListener("mouseleave", restore);
    el.addEventListener("focus", function () { showZone(code, false); });
    el.addEventListener("blur", restore);
    el.addEventListener("click", function () { toggle("zone", code); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("zone", code); }
      if (e.key === "Escape") { pinned = null; restore(); }
    });
  });
  Array.prototype.forEach.call(buttons, function (b) {
    var i = Number(b.getAttribute("data-company"));
    b.addEventListener("mouseenter", function () { showCompany(i, false); });
    b.addEventListener("mouseleave", restore);
    b.addEventListener("focus", function () { showCompany(i, false); });
    b.addEventListener("blur", restore);
    b.addEventListener("click", function () { toggle("company", i); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pinned) { pinned = null; restore(); } });

  /* The one reveal on the home page: zones light up, most companies first. */
  if (!reduce && canObserve) {
    mapBox.classList.add("pre");
    onceVisible(mapBox, 0.35, function () {
      requestAnimationFrame(function () {
        mapBox.classList.remove("pre");
        mapBox.classList.add("reveal");
        // Drop the staggered delays once it has played, so hovering answers at once.
        setTimeout(function () { mapBox.classList.remove("reveal"); }, 2600);
      });
    });
  }
})();
