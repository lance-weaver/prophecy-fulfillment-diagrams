/**
 * Docked scripture reader. Host supplies chapter-grouped verses and
 * handles chart highlight + autoscroll when the focused verse changes.
 */
(function (global) {
  var EXT_ICON = '<svg class="pfd-ext-icon" viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M7 .75h4.25V5H10V2.56L5.28 7.28l-.56-.56L9.44 2H7V.75zM1.75 2.5h3.5V3.5h-3.5v6.25h6.25v-3.5h1v3.5A1.75 1.75 0 018.25 11.5h-6.5A1.75 1.75 0 010 9.75v-6.5A1.75 1.75 0 011.75 1.5h3.5V2.5h-3.5z"/></svg>';

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
            ? '<div class="pfd-reader-livewrap" hidden>' +
                '<button type="button" class="pfd-reader-livebtn" aria-haspopup="listbox" aria-expanded="false">' +
                  '<span class="pfd-reader-livelabel"></span>' +
                  '<span class="pfd-reader-chevron" aria-hidden="true"></span>' +
                "</button>" +
                '<div class="pfd-reader-livelist" hidden role="listbox"></div>' +
                '<a class="pfd-reader-ext" hidden target="_blank" rel="noopener noreferrer" aria-label="Open on lds.org">' +
                  EXT_ICON +
                "</a>" +
              "</div>"
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
    var liveWrap = wrap.querySelector(".pfd-reader-livewrap");
    var liveBtn = wrap.querySelector(".pfd-reader-livebtn");
    var liveLabel = wrap.querySelector(".pfd-reader-livelabel");
    var liveList = wrap.querySelector(".pfd-reader-livelist");
    var liveExt = wrap.querySelector(".pfd-reader-ext");
    var open = false;
    var listOpen = false;
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
      setListOpen(false);
      if (open) {
        render();
        body.scrollTop = 0;
        lastKey = "";
        global.requestAnimationFrame(function () { syncFromScroll(); });
        global.setTimeout(function () { if (open) syncFromScroll(); }, 50);
      } else {
        lastKey = "";
        updateLive(null);
        if (options.onClose) options.onClose();
      }
    }

    function setListOpen(next) {
      listOpen = !!(next && open && liveList);
      if (liveBtn) liveBtn.setAttribute("aria-expanded", listOpen ? "true" : "false");
      if (liveList) liveList.hidden = !listOpen;
      if (listOpen) markActiveOption();
    }

    function jumpTarget(jump) {
      if (!jump) return null;
      var book = jump.book || "";
      var chapter = jump.chapter != null && jump.chapter !== "" ? String(jump.chapter) : "";
      var verse = jump.verse != null && jump.verse !== "" ? String(jump.verse) : "";
      var nodes = body.querySelectorAll(".pfd-reader-verse, .pfd-reader-section");
      var fallback = null;
      var chapterHit = null;
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
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
        buildLiveList();
        return;
      }
      var html = jumpsHtml();
      var prevN = 0;
      groups.forEach(function (group) {
        if (group.showHeading !== false) {
          html += '<p class="pfd-reader-section"' +
            ' data-book="' + esc(group.book || "") + '"' +
            ' data-chapter="' + esc(group.chapter || "") + '">' +
            '<span class="pfd-reader-section-label">' + esc(group.heading || "") + "</span>" +
            '<a class="pfd-reader-top" href="#top">(top)</a>' +
            "</p>";
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
      buildLiveList();
    }

    function buildLiveList() {
      if (!liveList) return;
      var seen = {};
      var html = "";
      body.querySelectorAll(".pfd-reader-verse").forEach(function (el) {
        var label = el.getAttribute("data-label") || "";
        if (!label || seen[label]) return;
        seen[label] = true;
        html += '<button type="button" class="pfd-reader-liveopt" role="option" data-label="' +
          esc(label) + '">' + esc(label) + "</button>";
      });
      liveList.innerHTML = html;
    }

    function markActiveOption() {
      if (!liveList || !liveLabel) return;
      var current = liveLabel.textContent || "";
      liveList.querySelectorAll(".pfd-reader-liveopt").forEach(function (opt) {
        var on = opt.getAttribute("data-label") === current;
        opt.classList.toggle("is-active", on);
        if (on && listOpen) {
          var box = liveList.getBoundingClientRect();
          var row = opt.getBoundingClientRect();
          if (row.top < box.top || row.bottom > box.bottom) {
            opt.scrollIntoView({ block: "nearest" });
          }
        }
      });
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
      if (!liveWrap) return;
      if (!verse || !verse.label) {
        liveWrap.hidden = true;
        if (liveLabel) liveLabel.textContent = "";
        if (liveExt) {
          liveExt.hidden = true;
          liveExt.removeAttribute("href");
        }
        return;
      }
      liveWrap.hidden = false;
      if (liveLabel) liveLabel.textContent = verse.label;
      if (liveExt) {
        if (verse.href) {
          liveExt.hidden = false;
          liveExt.href = verse.href;
        } else {
          liveExt.hidden = true;
          liveExt.removeAttribute("href");
        }
      }
      markActiveOption();
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
      if (event.key !== "Escape") return;
      if (listOpen) {
        event.preventDefault();
        setListOpen(false);
        return;
      }
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }

    function onDocPointerDown(event) {
      if (!listOpen) return;
      if (liveWrap && liveWrap.contains(event.target)) return;
      setListOpen(false);
    }

    tab.addEventListener("click", function () { setOpen(!open); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    if (liveBtn) {
      liveBtn.addEventListener("click", function (event) {
        event.preventDefault();
        setListOpen(!listOpen);
      });
    }
    if (liveList) {
      liveList.addEventListener("click", function (event) {
        var opt = event.target && event.target.closest && event.target.closest(".pfd-reader-liveopt");
        if (!opt) return;
        event.preventDefault();
        var label = opt.getAttribute("data-label") || "";
        var target = null;
        body.querySelectorAll(".pfd-reader-verse").forEach(function (el) {
          if (!target && el.getAttribute("data-label") === label) target = el;
        });
        setListOpen(false);
        scrollToNode(target);
      });
    }
    body.addEventListener("scroll", onScroll, { passive: true });
    body.addEventListener("click", function (event) {
      var top = event.target && event.target.closest && event.target.closest(".pfd-reader-top");
      if (top) {
        event.preventDefault();
        body.scrollTop = 0;
        lastKey = "";
        syncFromScroll();
        return;
      }
      var link = event.target && event.target.closest && event.target.closest(".pfd-reader-jumps a");
      if (!link) return;
      event.preventDefault();
      var jumps = options.jumps || [];
      var jump = jumps[Number(link.getAttribute("data-jump"))];
      scrollToNode(jumpTarget(jump));
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDocPointerDown);

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
        document.removeEventListener("pointerdown", onDocPointerDown);
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
