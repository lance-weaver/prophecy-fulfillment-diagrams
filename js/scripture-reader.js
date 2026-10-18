/**
 * Docked scripture reader. Host supplies chapter-grouped verses and
 * handles chart highlight + autoscroll when the focused verse changes.
 */
(function (global) {
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function create(options) {
    options = options || {};
    var strings = options.strings || {};
    var host = options.mount || document.body;
    var wrap = document.createElement("div");
    wrap.className = "pfd-reader";
    wrap.innerHTML =
      '<button type="button" class="pfd-reader-tab" aria-expanded="false" aria-controls="pfd-reader-panel">' +
        esc(strings.openScriptures || "Open Scriptures") +
      "</button>" +
      '<aside class="pfd-reader-panel" id="pfd-reader-panel" aria-hidden="true">' +
        '<div class="pfd-reader-head">' +
          "<h2>" + esc(strings.scriptureReader || "Scriptures") + "</h2>" +
          (options.showLive
            ? '<a class="pfd-reader-live" hidden target="_blank" rel="noopener noreferrer"></a>'
            : "") +
          '<button type="button" class="pfd-reader-close" aria-label="Close">×</button>' +
        "</div>" +
        '<div class="pfd-reader-body"></div>' +
      "</aside>";
    host.appendChild(wrap);

    var tab = wrap.querySelector(".pfd-reader-tab");
    var panel = wrap.querySelector(".pfd-reader-panel");
    var closeBtn = wrap.querySelector(".pfd-reader-close");
    var body = wrap.querySelector(".pfd-reader-body");
    var live = wrap.querySelector(".pfd-reader-live");
    var open = false;
    var lastKey = "";
    var frame = 0;

    function setOpen(next) {
      open = !!next;
      wrap.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      tab.setAttribute("aria-expanded", open ? "true" : "false");
      tab.textContent = open
        ? (strings.closeScriptures || "Close Scriptures")
        : (strings.openScriptures || "Open Scriptures");
      document.documentElement.classList.toggle("pfd-reader-open", open);
      if (open) {
        render();
        body.scrollTop = 0;
        lastKey = "";
        global.requestAnimationFrame(function () { syncFromScroll(); });
      } else {
        lastKey = "";
        updateLive(null);
        if (options.onClose) options.onClose();
      }
    }

    function jumpTarget(jump) {
      if (!jump) return null;
      var book = jump.book || "";
      var chapter = jump.chapter != null && jump.chapter !== "" ? String(jump.chapter) : "";
      var verse = jump.verse != null && jump.verse !== "" ? String(jump.verse) : "";
      var nodes = body.querySelectorAll(".pfd-reader-verse, .pfd-reader-section");
      var i;
      var node;
      var fallback = null;
      var chapterHit = null;
      for (i = 0; i < nodes.length; i++) {
        node = nodes[i];
        if ((node.getAttribute("data-book") || "") !== book) continue;
        if (!fallback) fallback = node;
        if (chapter && (node.getAttribute("data-chapter") || "") !== chapter) continue;
        if (!chapterHit) chapterHit = node;
        if (verse && (node.getAttribute("data-verse") || "") !== verse) continue;
        if (verse) return node;
      }
      return chapterHit || fallback;
    }

    function scrollToNode(el) {
      if (!el) return;
      var bodyBox = body.getBoundingClientRect();
      var elBox = el.getBoundingClientRect();
      body.scrollTop += elBox.top - bodyBox.top - 10;
      lastKey = "";
      syncFromScroll();
    }

    function jumpsHtml() {
      var jumps = options.jumps || [];
      if (!jumps.length) return "";
      var html = '<nav class="pfd-reader-jumps" aria-label="Jump to section">';
      jumps.forEach(function (jump, i) {
        html += '<a href="#pfd-jump-' + i + '" data-jump="' + i + '">' + esc(jump.label || "") + "</a>";
      });
      html += "</nav>";
      return html;
    }

    function render() {
      var groups = (options.getEntries && options.getEntries()) || [];
      if (!groups.length) {
        body.innerHTML = jumpsHtml() + '<p class="pfd-reader-empty">' +
          esc(strings.noReaderVerses || "No scripture text is stored for the items on this chart yet.") +
          "</p>";
        return;
      }
      var html = jumpsHtml();
      var prevN = 0;
      groups.forEach(function (group) {
        if (group.showHeading !== false) {
          html += '<p class="pfd-reader-section"' +
            ' data-book="' + esc(group.book || "") + '"' +
            ' data-chapter="' + esc(group.chapter || "") + '">' +
            esc(group.heading || "") + "</p>";
        }
        prevN = 0;
        (group.verses || []).forEach(function (verse) {
          var n = Number(verse.verse || verse.n) || 0;
          var gap = prevN && n > prevN + 1 ? " is-gap" : "";
          prevN = n || prevN;
          html += '<p class="pfd-reader-verse' + gap + '"' +
            ' data-ref="' + esc(verse.ref || "") + '"' +
            ' data-anchor="' + esc(verse.anchorId || "") + '"' +
            ' data-book="' + esc(verse.book || group.book || "") + '"' +
            ' data-chapter="' + esc(verse.chapter || group.chapter || "") + '"' +
            ' data-verse="' + esc(verse.verse || verse.n) + '"' +
            ' data-n="' + esc(verse.n) + '"' +
            ' data-label="' + esc(verse.label || "") + '"' +
            ' data-href="' + esc(verse.href || "") + '">' +
            '<span class="vn">' + esc(verse.n) + "</span>" + esc(verse.text) +
            "</p>";
        });
      });
      body.innerHTML = html;
    }

    function verseAtCenter() {
      var verses = body.querySelectorAll(".pfd-reader-verse");
      if (!verses.length) return null;
      var box = body.getBoundingClientRect();
      var mid = box.top + box.height * 0.45;
      var best = verses[0];
      var bestDist = Infinity;
      for (var i = 0; i < verses.length; i++) {
        var rect = verses[i].getBoundingClientRect();
        if (rect.bottom < box.top || rect.top > box.bottom) continue;
        var cy = rect.top + rect.height / 2;
        var dist = Math.abs(cy - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = verses[i];
        }
      }
      return best;
    }

    function payloadFrom(el) {
      if (!el) return null;
      return {
        ref: el.getAttribute("data-ref") || "",
        anchorId: el.getAttribute("data-anchor") || "",
        n: el.getAttribute("data-n") || "",
        book: el.getAttribute("data-book") || "",
        chapter: el.getAttribute("data-chapter") || "",
        verse: el.getAttribute("data-verse") || "",
        label: el.getAttribute("data-label") || "",
        href: el.getAttribute("data-href") || "",
        centerY: (function () {
          var box = body.getBoundingClientRect();
          return box.top + box.height * 0.45;
        })()
      };
    }

    function updateLive(verse) {
      if (!live) return;
      if (!verse || !verse.label) {
        live.hidden = true;
        live.textContent = "";
        live.removeAttribute("href");
        return;
      }
      live.textContent = verse.label;
      live.hidden = false;
      if (verse.href) live.href = verse.href;
      else live.removeAttribute("href");
    }

    function syncFromScroll() {
      if (!open) return;
      var el = verseAtCenter();
      var next = payloadFrom(el);
      var key = next ? next.ref + "|" + next.anchorId + "|" + next.n : "";
      body.querySelectorAll(".pfd-reader-verse.is-hot").forEach(function (node) {
        node.classList.remove("is-hot");
      });
      if (el) el.classList.add("is-hot");
      updateLive(next);
      if (key === lastKey) {
        if (next && options.onFocus) options.onFocus(next, true);
        return;
      }
      lastKey = key;
      if (options.onFocus) options.onFocus(next, false);
    }

    function onScroll() {
      if (frame) return;
      frame = global.requestAnimationFrame(function () {
        frame = 0;
        syncFromScroll();
      });
    }

    function onKey(event) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    }

    tab.addEventListener("click", function () { setOpen(!open); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    body.addEventListener("scroll", onScroll, { passive: true });
    body.addEventListener("click", function (event) {
      var link = event.target && event.target.closest && event.target.closest(".pfd-reader-jumps a");
      if (!link) return;
      event.preventDefault();
      var jumps = options.jumps || [];
      var jump = jumps[Number(link.getAttribute("data-jump"))];
      scrollToNode(jumpTarget(jump));
    });
    document.addEventListener("keydown", onKey);

    return {
      isOpen: function () { return open; },
      close: function () { setOpen(false); },
      refresh: function () {
        if (!open) return;
        var top = body.scrollTop;
        render();
        body.scrollTop = top;
        lastKey = "";
        syncFromScroll();
      },
      destroy: function () {
        document.removeEventListener("keydown", onKey);
        document.documentElement.classList.remove("pfd-reader-open");
        wrap.remove();
      }
    };
  }

  function svgYToClient(svg, y) {
    if (!svg || y == null || isNaN(y)) return null;
    var box = svg.getBoundingClientRect();
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var height = (vb && vb.height) || svg.height.baseVal.value || box.height;
    if (!height) return null;
    return box.top + (y / height) * box.height;
  }

  function alignSvgY(svg, y, centerY) {
    var clientY = svgYToClient(svg, y);
    if (clientY == null || centerY == null) return;
    var next = (global.scrollY || global.pageYOffset || 0) + (clientY - centerY);
    var max = Math.max(0, (document.documentElement.scrollHeight || 0) - (global.innerHeight || 0));
    if (next < 0) next = 0;
    if (next > max) next = max;
    global.scrollTo(0, next);
  }

  global.ScriptureReader = { create: create, alignSvgY: alignSvgY };
})(window);
