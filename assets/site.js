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

  /* ---- Home page: the record timeline ---- */
  (function () {
    var wrap = document.querySelector("[data-timeline]");
    var src = document.getElementById("record-data");
    if (!wrap || !src) return;
    var html = JSON.parse(src.textContent);
    var tl = wrap.querySelector(".tl");
    var detail = wrap.querySelector("[data-tl-detail]");
    var rows = wrap.querySelectorAll(".tl-row");
    var def = Number(detail.getAttribute("data-default"));
    var pinned = null, shown = def;
    function show(i) {
      if (shown !== i) { detail.innerHTML = html[i]; shown = i; }
      for (var k = 0; k < rows.length; k++) rows[k].setAttribute("aria-pressed", pinned === k ? "true" : "false");
    }
    function restore() { show(pinned === null ? def : pinned); }
    Array.prototype.forEach.call(rows, function (r) {
      var i = Number(r.getAttribute("data-call"));
      r.addEventListener("mouseenter", function () { show(i); });
      r.addEventListener("mouseleave", restore);
      r.addEventListener("focus", function () { show(i); });
      r.addEventListener("blur", restore);
      r.addEventListener("click", function () { pinned = pinned === i ? null : i; restore(); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pinned !== null) { pinned = null; restore(); } });
    if (!reduce && canObserve) {
      tl.classList.add("pre");
      onceVisible(tl, 0.25, function () {
        requestAnimationFrame(function () {
          tl.classList.remove("pre"); tl.classList.add("reveal");
          setTimeout(function () { tl.classList.remove("reveal"); }, 2600);
        });
      });
    }
  })();

  /* ---- Home page: the steps draw themselves once; the numbers count up once ---- */
  (function () {
    var steps = document.querySelector("[data-steps]");
    if (steps && !reduce && canObserve) {
      steps.classList.add("pre");
      onceVisible(steps, 0.3, function () {
        requestAnimationFrame(function () {
          steps.classList.remove("pre"); steps.classList.add("reveal");
          setTimeout(function () { steps.classList.remove("reveal"); }, 2200);
        });
      });
    }
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length || reduce || !canObserve) return;
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
    // Printed, or saved as PDF, every number shows its value whether or not it was scrolled to.
    window.addEventListener("beforeprint", function () {
      Array.prototype.forEach.call(nums, function (el) { if (el.getAttribute("aria-label")) el.textContent = el.getAttribute("aria-label"); });
    });
    Array.prototype.forEach.call(nums, function (el) {
      var target = Number(el.getAttribute("data-count")), suffix = el.getAttribute("data-suffix") || "";
      var final = el.textContent;
      el.setAttribute("aria-label", final);
      el.textContent = "0" + suffix;
      onceVisible(el, 0.6, function () {
        var start = null, dur = 1100;
        var step = function (ts) {
          if (start === null) start = ts;
          var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(Math.round(target * e)) + suffix;
          if (p < 1) requestAnimationFrame(step); else el.textContent = final;
        };
        requestAnimationFrame(step);
      });
    });
  })();

  /* ---- Home page: how closely we see each country ---- */
  var root = document.querySelector("[data-coverage]");
  var source = document.getElementById("coverage-data");
  if (!root || !source) return;
  var data = JSON.parse(source.textContent);
  var mapBox = root.querySelector(".cov-map");
  var svg = root.querySelector("svg");
  var outline = svg.querySelector(".c-outline");
  var panel = root.querySelector("[data-panel]");
  var defaultPanel = panel.innerHTML;
  var hits = svg.querySelectorAll(".ct");
  var layers = svg.querySelectorAll("[data-country]:not(.ct)");
  var buttons = root.querySelectorAll("[data-company]");
  var pinned = null; // {kind: "country"|"company"|"key", key}
  var showing = "default"; // what the panel holds now; it is rewritten only when that changes

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shape(code) { var el = svg.querySelector("#c-" + code); return el ? el.getAttribute("d") : ""; }
  function names(list) { return list.map(function (i) { return esc(data.companies[i].name); }); }

  function clear() {
    svg.classList.remove("has-sel");
    outline.setAttribute("d", "");
    for (var i = 0; i < layers.length; i++) layers[i].classList.remove("is-on");
    for (var j = 0; j < hits.length; j++) hits[j].setAttribute("aria-pressed", "false");
    for (var k = 0; k < buttons.length; k++) buttons[k].setAttribute("aria-pressed", "false");
  }
  function light(codes) {
    svg.classList.add("has-sel");
    for (var i = 0; i < layers.length; i++) {
      if (codes.indexOf(layers[i].getAttribute("data-country")) !== -1) layers[i].classList.add("is-on");
    }
  }

  function showCountry(code, pin) {
    clear();
    var c = data.countries[code], cls = data.classes[c.k];
    outline.setAttribute("d", shape(code));
    if (pin) svg.querySelector('.ct[data-country="' + code + '"]').setAttribute("aria-pressed", "true");
    var who = names(c.companies);
    showing = "country";
    panel.innerHTML =
      "<h3>" + esc(c.name) + "</h3>" +
      '<p class="cp-sub">Read ' + esc(c.how || cls.short) + "</p>" +
      "<dl>" +
      "<dt>What we read</dt><dd>" + esc(c.read || "The country’s output by production type, every day, from its grid operators.") + "</dd>" +
      "<dt>What it feeds</dt><dd>" + esc(c.feeds || "The estimates of the companies with plants here.") + "</dd>" +
      "<dt>" + who.length + (who.length === 1 ? " company" : " companies") + " here</dt><dd>" + who.join(", ") + "</dd>" +
      "</dl>";
  }

  function showCompany(i, pin) {
    clear();
    var c = data.companies[i];
    light(c.countries);
    if (pin) buttons[i].setAttribute("aria-pressed", "true");
    var plant = c.plant.map(function (p) { return "<li><b>" + esc(data.countries[p[0]].name) + ":</b> " + esc(p[1]) + "</li>"; }).join("");
    var plantCodes = c.plant.map(function (p) { return p[0]; });
    var rest = c.countries.filter(function (code) { return plantCodes.indexOf(code) === -1; })
      .map(function (code) { return esc(data.countries[code].name); });
    showing = "company";
    panel.innerHTML =
      "<h3>" + esc(c.name) + "</h3>" +
      '<p class="cp-sub">' + esc(c.ticker) + ", " + esc(c.mw) + " MW declared, in " + c.countries.length +
      (c.countries.length === 1 ? " country" : " countries") + "</p>" +
      "<dl>" +
      (plant ? '<dt>Read plant by plant</dt><dd><ul class="cp-plain">' + plant + "</ul></dd>" : "") +
      (rest.length ? "<dt>Read from the country’s output</dt><dd>" + rest.join(", ") + "</dd>" : "") +
      "</dl>" +
      (c.countries.indexOf("DE") !== -1 ? '<p class="cp-note">Its German plants are checked against the national register.</p>' : "") +
      (c.note ? '<p class="cp-note">' + esc(c.note) + "</p>" : "");
  }

  function showKey(k, pin) {
    clear();
    var codes = Object.keys(data.countries).filter(function (code) { return String(data.countries[code].k) === String(k); });
    light(codes);
    defaults();
    var keys = panel.querySelectorAll(".lg [data-k]");
    for (var i = 0; i < keys.length; i++) keys[i].setAttribute("aria-pressed", pin && keys[i].getAttribute("data-k") === String(k) ? "true" : "false");
  }

  // Rewriting the panel while the pointer is on one of its key rows would swallow the click, so the
  // default panel is put back only when something else is showing.
  function defaults() {
    if (showing !== "default") { panel.innerHTML = defaultPanel; showing = "default"; }
  }
  function restore() {
    if (!pinned) {
      clear(); defaults();
      var keys = panel.querySelectorAll(".lg [data-k]");
      for (var i = 0; i < keys.length; i++) keys[i].setAttribute("aria-pressed", "false");
      return;
    }
    if (pinned.kind === "country") showCountry(pinned.key, true);
    else if (pinned.kind === "company") showCompany(pinned.key, true);
    else showKey(pinned.key, true);
  }
  function toggle(kind, key) {
    if (pinned && pinned.kind === kind && pinned.key === key) pinned = null;
    else pinned = { kind: kind, key: key };
    restore();
  }

  Array.prototype.forEach.call(hits, function (el) {
    var code = el.getAttribute("data-country");
    el.addEventListener("mouseenter", function () { showCountry(code, false); });
    el.addEventListener("mouseleave", restore);
    el.addEventListener("focus", function () { showCountry(code, false); });
    el.addEventListener("blur", restore);
    el.addEventListener("click", function () { toggle("country", code); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("country", code); }
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
  // The key rows live inside the panel, which is rewritten: listen on the panel.
  panel.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".lg [data-k]") : null;
    if (b) toggle("key", b.getAttribute("data-k"));
  });
  panel.addEventListener("mouseover", function (e) {
    var b = e.target.closest ? e.target.closest(".lg [data-k]") : null;
    if (b && !pinned) {
      var codes = Object.keys(data.countries).filter(function (code) { return String(data.countries[code].k) === b.getAttribute("data-k"); });
      clear(); light(codes);
    }
  });
  panel.addEventListener("mouseleave", function () { if (!pinned) clear(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pinned) { pinned = null; restore(); } });

  /* The one reveal on the home page: the countries come into focus, the finest last. */
  if (!reduce && canObserve) {
    mapBox.classList.add("pre");
    onceVisible(mapBox, 0.35, function () {
      requestAnimationFrame(function () {
        mapBox.classList.remove("pre");
        mapBox.classList.add("reveal");
        // Drop the staggered delays once it has played, so choosing answers at once.
        setTimeout(function () { mapBox.classList.remove("reveal"); }, 2200);
      });
    });
  }
})();
