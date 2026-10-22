/**
 * Reusable two-column connection chart.
 *
 * Data file:
 *   {
 *     credit?: { translation?: string },
 *     books?: { source?: string[], target?: string[], left?: string[], right?: string[] },
 *     passages?: { [reference: string]: { n: number, text: string }[] },
 *     Wrap a phrase in __double underscores__ to underline it in popups.
 *     items: {
 *       id, summary, note?, infoUrl?,
 *       sources: { book, reference, verses?, plot? }[],
 *       targets: { book, reference, verses?, plot? }[]
 *     }[]
 *   }
 *
 * Each axis row is one scripture reference. A link is drawn for every source
 * reference paired with a target reference on the same item. A reference may
 * include url; a click on that label opens it.
 *
 * Config (all optional) supplies title, column labels, colors, book order,
 * callouts, legend, and UI strings. Domain language stays in the config.
 */
(function (global) {
  var PALETTE = ["#6C4AB6", "#6E8B3D", "#0E7C86", "#D1493D", "#B08958", "#2C5282", "#C47B12", "#7C3AED", "#1F7A4D", "#A15C38", "#3F6473"];

  // SBL Handbook of Style abbreviations (Protestant canon). Short names
  // already 4 letters or fewer stay as-is (Mark, Luke, John, Acts, Job).
  var BOOK_ABBREV = {
    Genesis: "Gen.", Exodus: "Exod.", Leviticus: "Lev.", Numbers: "Num.",
    Deuteronomy: "Deut.", Joshua: "Josh.", Judges: "Judg.", Ruth: "Ruth",
    "1 Samuel": "1 Sam.", "2 Samuel": "2 Sam.", "1 Kings": "1 Kgs.", "2 Kings": "2 Kgs.",
    "1 Chronicles": "1 Chr.", "2 Chronicles": "2 Chr.", Ezra: "Ezra", Nehemiah: "Neh.",
    Esther: "Esth.", Job: "Job", Psalms: "Ps.", Psalm: "Ps.", Proverbs: "Prov.",
    Ecclesiastes: "Eccl.", "Song of Solomon": "Song", "Song of Songs": "Song",
    Isaiah: "Isa.", Jeremiah: "Jer.", Lamentations: "Lam.", Ezekiel: "Ezek.",
    Daniel: "Dan.", Hosea: "Hos.", Joel: "Joel", Amos: "Amos", Obadiah: "Obad.",
    Jonah: "Jonah", Micah: "Mic.", Nahum: "Nah.", Habakkuk: "Hab.",
    Zephaniah: "Zeph.", Haggai: "Hag.", Zechariah: "Zech.", Malachi: "Mal.",
    Matthew: "Matt.", Mark: "Mark", Luke: "Luke", John: "John", Acts: "Acts",
    Romans: "Rom.", "1 Corinthians": "1 Cor.", "2 Corinthians": "2 Cor.",
    Galatians: "Gal.", Ephesians: "Eph.", Philippians: "Phil.", Colossians: "Col.",
    "1 Thessalonians": "1 Thess.", "2 Thessalonians": "2 Thess.",
    "1 Timothy": "1 Tim.", "2 Timothy": "2 Tim.", Titus: "Titus", Philemon: "Phlm.",
    Hebrews: "Heb.", James: "Jas.", "1 Peter": "1 Pet.", "2 Peter": "2 Pet.",
    "1 John": "1 John", "2 John": "2 John", "3 John": "3 John", Jude: "Jude",
    Revelation: "Rev."
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function versesOf(data, ref) {
    if (ref && ref.verses && ref.verses.length) return ref.verses;
    var table = (data && data.passages) || {};
    return (ref && table[ref.reference]) || [];
  }

  function formatVerseText(text) {
    return esc(text).replace(/__([\s\S]+?)__/g, '<span class="pfd-mark">$1</span>');
  }

  function passageHtml(verses) {
    if (!verses.length) return "";
    return verses.map(function (verse) {
      return '<span class="vn">' + esc(verse.n) + "</span>" + formatVerseText(verse.text) + " ";
    }).join("");
  }

  function uniqueBooks(refs) {
    var seen = [];
    refs.forEach(function (ref) {
      if (seen.indexOf(ref.book) === -1) seen.push(ref.book);
    });
    return seen;
  }

  function documentHeight() {
    var body = document.body;
    var html = document.documentElement;
    var app = document.getElementById("app");
    var values = [
      app ? app.scrollHeight : 0,
      app ? app.offsetHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0
    ];
    var height = 0;
    for (var i = 0; i < values.length; i++) {
      if (values[i] > height) height = values[i];
    }
    return Math.ceil(height);
  }

  function watchHeight(options) {
    var source = (options && options.source) || "prophecy-charts";
    var type = (options && options.type) || "resize";
    var getId = (options && options.getId) || function () { return (options && options.id) || ""; };
    var last = -1;
    var timer = 0;

    function send(force) {
      var height = documentHeight();
      if (!force && height === last) return;
      last = height;
      if (global.parent && global.parent !== global) {
        // "*" lets both gatheredin.one and www.gatheredin.one receive the
        // message; the parent must check event.origin itself.
        global.parent.postMessage({
          source: source,
          type: type,
          height: height,
          id: getId() || ""
        }, "*");
      }
    }

    function report() {
      global.clearTimeout(timer);
      timer = global.setTimeout(function () { send(false); }, 40);
    }

    function onParentMessage(event) {
      var data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== source) return;
      if (data.type !== "request-height") return;
      send(true);
    }

    if (typeof ResizeObserver === "function") {
      var observer = new ResizeObserver(report);
      if (document.documentElement) observer.observe(document.documentElement);
      if (document.body) observer.observe(document.body);
      var appNow = document.getElementById("app");
      if (appNow) observer.observe(appNow);
    }
    global.addEventListener("load", report);
    global.addEventListener("resize", report);
    global.addEventListener("message", onParentMessage);
    report();
    return report;
  }

  function render(container, data, config) {
    var cfg = config || {};
    var strings = cfg.strings || {};
    var items = (data && data.items) || [];
    var changeHandlers = [];
    var disposed = false;
    var panelSelection = null;
    var hoverRef = null;
    var tipPinned = false;
    var tipOver = false;
    var hideTimer = 0;
    var filterBook = null;
    var lastWidth = -1;
    var lastCompact = null;
    var drawTimer = 0;
    var lastTouchPin = 0;
    var pointerDownAt = null;
    var finePointer = global.matchMedia("(hover: hover) and (pointer: fine)");
    var compactNames = global.matchMedia("(max-width: 759px)");
    var reader = null;
    var chartLayout = { left: null, right: null };

    function allowHoverPreview(event) {
      if (reader && reader.isOpen()) return false;
      var type = event && event.pointerType;
      if (type === "touch") return false;
      return finePointer.matches || type === "mouse" || type === "pen" || type == null || type === "";
    }

    function isTouchLike(event) {
      var type = event && event.pointerType;
      if (type === "touch") return true;
      if (type === "mouse" || type === "pen") return false;
      return !finePointer.matches;
    }

    function preferPin(event) {
      return isTouchLike(event) || !finePointer.matches || compactNames.matches;
    }

    function wasTap(event) {
      if (!pointerDownAt || pointerDownAt.id !== event.pointerId) return true;
      var dx = event.clientX - pointerDownAt.x;
      var dy = event.clientY - pointerDownAt.y;
      return (dx * dx + dy * dy) <= 100;
    }

    function markPointerDown(event) {
      pointerDownAt = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }

    function bookAbbrev(book) {
      if (cfg.shortLabels && cfg.shortLabels[book]) return cfg.shortLabels[book];
      return BOOK_ABBREV[book] || book;
    }

    function shortReference(ref) {
      var book = ref.book;
      var shortBook = bookAbbrev(book);
      var text = String(ref.reference || "");
      if (book && text.indexOf(book) === 0) {
        return (shortBook + text.slice(book.length)).trim();
      }
      var versePart = text.replace(/^[1-3]?\s?[A-Za-z]+\.?\s+/, "");
      return (shortBook + " " + versePart).trim();
    }

    function isEmbedded() {
      try {
        return global.self !== global.top;
      } catch (err) {
        return true;
      }
    }

    container.replaceChildren();
    var root = document.createElement("div");
    var embedded = isEmbedded();
    root.className = embedded ? "pfd is-embedded" : "pfd";
    container.appendChild(root);

    function notify() {
      changeHandlers.forEach(function (fn) { fn(); });
    }

    function orderFrom(list, fallback) {
      var base = (list || []).slice();
      fallback.forEach(function (book) {
        if (base.indexOf(book) === -1) base.push(book);
      });
      return base;
    }

    var sourceFallback = [];
    var targetFallback = [];
    items.forEach(function (item) {
      (item.sources || []).forEach(function (ref) {
        if (sourceFallback.indexOf(ref.book) === -1) sourceFallback.push(ref.book);
      });
      (item.targets || []).forEach(function (ref) {
        if (targetFallback.indexOf(ref.book) === -1) targetFallback.push(ref.book);
      });
    });
    var books = (data && data.books) || {};
    var leftOrder = orderFrom(
      (cfg.bookOrder && cfg.bookOrder.left) || books.left || books.source,
      sourceFallback
    );
    var rightOrder = orderFrom(
      (cfg.bookOrder && cfg.bookOrder.right) || books.right || books.target,
      targetFallback
    );

    var linkMap = new Map();
    items.forEach(function (item) {
      var sources = item.sources || [];
      var targets = item.targets || [];
      sources.forEach(function (source) {
        targets.forEach(function (target) {
          var id = source.reference + "→" + target.reference;
          var existing = linkMap.get(id);
          if (!existing) {
            existing = {
              id: id,
              itemId: String(item.id),
              sourceBook: source.book,
              targetBook: target.book,
              sourceRef: source.reference,
              targetRef: target.reference,
              source: source,
              target: target,
              items: [],
              item: item
            };
            linkMap.set(id, existing);
          }
          existing.items.push(item);
        });
      });
    });
    var links = Array.from(linkMap.values());

    function colorForBook(book) {
      if (cfg.colors && cfg.colors[book]) return cfg.colors[book];
      var order = cfg.colorBy === "source" ? leftOrder : rightOrder;
      var index = Math.max(0, order.indexOf(book));
      return PALETTE[index % PALETTE.length];
    }

    function linkColor(link) {
      var book = cfg.colorBy === "source" ? link.sourceBook : link.targetBook;
      return colorForBook(book);
    }

    function itemById(id) {
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === String(id)) return items[i];
      }
      return null;
    }

    function header() {
      var html = '<header class="pfd-header">';
      if (cfg.kicker) html += '<p class="pfd-kicker">' + esc(cfg.kicker) + "</p>";
      if (!embedded && cfg.title) {
        html += "<h1 class=\"pfd-title\">" + esc(cfg.title) + "</h1>";
      }
      if (cfg.subtitle) html += '<p class="pfd-subtitle">' + esc(cfg.subtitle) + "</p>";
      if (cfg.hint) html += '<p class="pfd-hint">' + esc(cfg.hint) + "</p>";
      html += "</header>";
      return html;
    }

    function creditHtml() {
      if (!cfg.credit || !cfg.credit.href) return "";
      return esc(cfg.credit.before || "") +
        '<a href="' + esc(cfg.credit.href) + '" target="_blank" rel="noopener noreferrer">' +
        esc(cfg.credit.linkText || cfg.credit.href) + "</a>" +
        esc(cfg.credit.after || "");
    }

    root.innerHTML = header() +
      '<div class="pfd-columns"></div>' +
      '<div class="pfd-stage"><svg class="pfd-svg" role="group"></svg><div class="pfd-tooltip" hidden></div></div>' +
      '<div class="pfd-legend"></div>' +
      '<p class="pfd-note"></p>' +
      '<p class="pfd-footnote"></p>' +
      '<p class="pfd-credit"></p>' +
      '<section class="pfd-detail" hidden></section>';

    var columnsEl = root.querySelector(".pfd-columns");
    var stage = root.querySelector(".pfd-stage");
    var svg = d3.select(root.querySelector(".pfd-svg"));
    var svgNode = root.querySelector(".pfd-svg");
    var tip = root.querySelector(".pfd-tooltip");
    var legendEl = root.querySelector(".pfd-legend");
    var noteEl = root.querySelector(".pfd-note");
    var footEl = root.querySelector(".pfd-footnote");
    var creditEl = root.querySelector(".pfd-credit");
    var detailEl = root.querySelector(".pfd-detail");

    if (cfg.chartLabel || cfg.title) svgNode.setAttribute("aria-label", cfg.chartLabel || cfg.title);
    noteEl.textContent = cfg.dotsNote || "";
    footEl.textContent = cfg.footnote || "";
    if (!cfg.footnote) footEl.hidden = true;
    creditEl.innerHTML = creditHtml();
    if (!creditEl.innerHTML) creditEl.hidden = true;

    function columnHeads() {
      var left = cfg.leftColumn || {};
      var right = cfg.rightColumn || {};
      columnsEl.innerHTML =
        '<div class="pfd-colhead left"><strong>' + esc(left.label || "Source") + "</strong><span>" + esc(left.sublabel || "") + "</span></div>" +
        "<div></div>" +
        '<div class="pfd-colhead right"><strong>' + esc(right.label || "Target") + "</strong><span>" + esc(right.sublabel || "") + "</span></div>";
    }
    columnHeads();

    function renderLegend() {
      legendEl.replaceChildren();
      var caption = document.createElement("p");
      caption.className = "pfd-legend-label";
      caption.textContent = cfg.legendLabel || "";
      legendEl.appendChild(caption);
      var order = cfg.colorBy === "source" ? leftOrder : rightOrder;
      order.forEach(function (book) {
        var present = links.some(function (link) {
          return (cfg.colorBy === "source" ? link.sourceBook : link.targetBook) === book;
        });
        if (!present) return;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "pfd-key";
        button.style.setProperty("--swatch", colorForBook(book));
        button.setAttribute("aria-pressed", filterBook === book ? "true" : "false");
        var swatch = document.createElement("span");
        swatch.className = "pfd-swatch";
        var label = document.createElement("span");
        label.textContent = book;
        button.appendChild(swatch);
        button.appendChild(label);
        button.addEventListener("click", function () {
          filterBook = filterBook === book ? null : book;
          panelSelection = null;
          hideTip();
          renderPanel();
          renderLegend();
          draw(true);
          notify();
        });
        legendEl.appendChild(button);
      });
    }

    function passesFilter(link) {
      if (!filterBook) return true;
      var book = cfg.colorBy === "source" ? link.sourceBook : link.targetBook;
      return book === filterBook;
    }

    function itemsFor(selection) {
      if (!selection) return [];
      if (selection.type === "link") {
        var match = null;
        for (var i = 0; i < links.length; i++) {
          if (links[i].id === selection.linkId) match = links[i];
        }
        if (match && match.items && match.items.length) return match.items;
      }
      if (selection.type === "item" || selection.type === "link") {
        var one = itemById(selection.itemId);
        return one ? [one] : [];
      }
      return items.filter(function (item) {
        var refs = selection.side === "source" ? (item.sources || []) : (item.targets || []);
        var hit = refs.some(function (ref) {
          if (ref.book !== selection.book) return false;
          if (selection.side === "target" && ref.plot === false) return false;
          return true;
        });
        if (!hit) return false;
        if (!filterBook) return true;
        return (item.targets || []).some(function (ref) {
          return ref.plot !== false && ref.book === filterBook;
        }) || (item.sources || []).some(function (ref) { return ref.book === filterBook; });
      });
    }

    function headingFor(selection, list) {
      if (!selection) return "";
      if (selection.type === "link" && selection.sourceRef && selection.targetRef) {
        return selection.sourceRef + "  →  " + selection.targetRef;
      }
      if (selection.type === "book") return selection.book;
      if (list.length === 1) {
        var sources = uniqueBooks(list[0].sources || []).join(", ");
        var targets = uniqueBooks((list[0].targets || []).filter(function (ref) { return ref.plot !== false; })).join(", ");
        if (sources && targets) return sources + "  →  " + targets;
        return list[0].summary;
      }
      return "";
    }

    function renderPanel() {
      var list = itemsFor(panelSelection);
      if (!panelSelection || !list.length) {
        detailEl.hidden = true;
        detailEl.replaceChildren();
        return;
      }
      detailEl.hidden = false;
      var countLabel = list.length === 1 ? (strings.entry || "entry") : (strings.entries || "entries");
      var translation = data.credit && data.credit.translation ? data.credit.translation : "";
      var html = '<div class="pfd-detail-bar"><div><h2>' + esc(headingFor(panelSelection, list)) + "</h2>" +
        '<p class="pfd-detail-meta">' + list.length + " " + esc(countLabel) +
        (translation ? " · " + esc(translation) : "") + "</p></div>" +
        '<button type="button" class="pfd-clear">' + esc(strings.clear || "Clear") + "</button></div>";
      list.forEach(function (item) {
        var accent = "#1c1917";
        var plotted = (item.targets || []).filter(function (ref) { return ref.plot !== false; });
        if (plotted.length) accent = colorForBook(plotted[0].book);
        html += '<article class="pfd-entry" style="border-top:3px solid ' + esc(accent) + '">';
        html += "<h3>" + esc(item.summary || "") + "</h3>";
        if (item.note) html += '<p class="pfd-entry-note">' + esc(item.note) + "</p>";
        html += refBlock(cfg.sourceHeading || "Source", item.sources || [], false);
        html += refBlock(cfg.targetHeading || "Target", item.targets || [], true);
        if (item.infoUrl) {
          html += '<a class="pfd-info" href="' + esc(item.infoUrl) + '" target="_blank" rel="noopener noreferrer">' +
            esc(cfg.infoLinkLabel || "More") + "</a>";
        }
        html += "</article>";
      });
      detailEl.innerHTML = html;
      detailEl.querySelector(".pfd-clear").addEventListener("click", function () {
        clearSelection();
      });
    }

    function refBlock(heading, refs, allowUnplotted) {
      if (!refs.length) return "";
      var html = '<div class="pfd-refblock"><h4>' + esc(heading) + "</h4>";
      refs.forEach(function (ref) {
          var color = allowUnplotted ? colorForBook(ref.book) : "#1c1917";
          var label = esc(ref.reference);
          if (ref.url) {
            label = '<a href="' + esc(ref.url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
          }
          html += '<p class="pfd-refname" style="color:' + esc(color) + '">' + label + "</p>";
          var verses = versesOf(data, ref);
          if (verses.length) {
            html += '<p class="pfd-passage">' + passageHtml(verses) + "</p>";
          }
        });
      html += "</div>";
      return html;
    }

    function passageBlock(ref, withOpen) {
      var verses = versesOf(data, ref);
      var html = '<p class="pfd-tip-ref" style="color:' + esc(colorForBook(ref.book)) + '">' + esc(ref.reference) + "</p>";
      if (verses.length) html += '<p class="pfd-tip-passage">' + passageHtml(verses) + "</p>";
      if (withOpen) html += openLinkHtml(ref);
      return { html: html, truncated: false, used: verses.length };
    }

    function openLinkHtml(ref) {
      if (!ref || !ref.url) return "";
      return '<p class="pfd-tip-more"><a class="pfd-open" href="' + esc(ref.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(strings.openScripture || "Open on lds.org") + "</a></p>";
    }

    function appendUnique(list, seen, key, value) {
      if (!value || seen[key]) return;
      seen[key] = true;
      list.push(value);
    }

    function pairTipHtml(sources, targets, items, withOpen) {
      var summaries = [];
      var seenSummary = {};
      (items || []).forEach(function (item) {
        appendUnique(summaries, seenSummary, item.summary, item.summary);
      });
      var html = '<p class="pfd-tip-summary">' + esc(summaries[0] || "") + "</p>";
      if (summaries.length > 1) {
        html += '<p class="pfd-tip-more">' + summaries.length + " " + esc(strings.entries || "entries") + "</p>";
      }
      html += '<p class="pfd-tip-kicker">' + esc(cfg.sourceHeading || "Source") + "</p>";
      sources.forEach(function (source) { html += passageBlock(source, withOpen).html; });
      html += '<p class="pfd-tip-kicker">' + esc(cfg.targetHeading || "Target") + "</p>";
      targets.forEach(function (target) { html += passageBlock(target, withOpen).html; });
      return html;
    }

    function linkTipHtml(link, withOpen) {
      return pairTipHtml([link.source], [link.target], link.items || [link.item], withOpen);
    }

    function linksForRef(ref, side) {
      return links.filter(function (link) {
        return side === "source" ? link.sourceRef === ref.reference : link.targetRef === ref.reference;
      });
    }

    function refPairTipHtml(ref, side, withOpen) {
      var connected = linksForRef(ref, side);
      if (!connected.length) {
        var sources = side === "source" ? [ref] : [];
        var targets = side === "target" ? [ref] : [];
        return pairTipHtml(sources, targets, [], withOpen);
      }
      var sources = [];
      var targets = [];
      var items = [];
      var seenSource = {};
      var seenTarget = {};
      var seenItem = {};
      connected.forEach(function (link) {
        appendUnique(sources, seenSource, link.sourceRef, link.source);
        appendUnique(targets, seenTarget, link.targetRef, link.target);
        (link.items || [link.item]).forEach(function (item) {
          if (!item) return;
          appendUnique(items, seenItem, String(item.id), item);
        });
      });
      return pairTipHtml(sources, targets, items, withOpen);
    }

    function cancelHide() {
      global.clearTimeout(hideTimer);
      hideTimer = 0;
    }

    function scheduleHide() {
      if (tipPinned || (reader && reader.isOpen())) return;
      cancelHide();
      hideTimer = global.setTimeout(function () {
        hideTimer = 0;
        if (tipPinned || tipOver) return;
        hoverRef = null;
        restyle();
        hideTip();
      }, 320);
    }

    function closeTip() {
      hideTip(true);
      hoverRef = null;
      restyle();
    }

    function fillTip(html, event, pin) {
      cancelHide();
      tipPinned = !!pin;
      tip.classList.toggle("is-pinned", tipPinned);
      tip.innerHTML = '<button type="button" class="pfd-tip-close" aria-label="Close">×</button>' + html;
      tip.hidden = false;
      if (event) placeTip(event);
    }

    function showRefTip(ref, side, event, pin) {
      if (!ref) return;
      fillTip(refPairTipHtml(ref, side, pin), event, pin);
    }

    function showTip(link, event, pin) {
      if (!link) return;
      if (!pin && (tipPinned || !allowHoverPreview(event))) return;
      fillTip(linkTipHtml(link, pin), event, pin);
    }

    function viewportSize() {
      var view = global.visualViewport;
      return {
        width: (view && view.width) || global.innerWidth || document.documentElement.clientWidth,
        height: (view && view.height) || global.innerHeight || document.documentElement.clientHeight
      };
    }

    function placeTip(event) {
      var pad = 8;
      var view = viewportSize();
      tip.style.maxHeight = Math.max(160, view.height - pad * 2) + "px";
      tip.style.left = "0px";
      tip.style.top = "0px";
      var width = tip.offsetWidth;
      var height = tip.offsetHeight;
      var x = event.clientX + 14;
      var y = event.clientY + 16;
      if (x + width > view.width - pad) x = Math.max(pad, event.clientX - width - 16);
      if (x < pad) x = pad;
      if (y + height > view.height - pad) y = Math.max(pad, view.height - height - pad);
      if (y < pad) y = pad;
      tip.style.left = Math.round(x) + "px";
      tip.style.top = Math.round(y) + "px";
    }

    function hideTip(force) {
      if (tipPinned && !force) return;
      cancelHide();
      tipPinned = false;
      tipOver = false;
      tip.classList.remove("is-pinned");
      tip.hidden = true;
    }

    tip.addEventListener("pointerenter", function () {
      tipOver = true;
      cancelHide();
    });
    tip.addEventListener("pointerleave", function () {
      tipOver = false;
      scheduleHide();
    });
    tip.addEventListener("wheel", function (event) {
      event.stopPropagation();
    }, { passive: true });
    tip.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
      if (event.target && event.target.closest && event.target.closest(".pfd-tip-close")) {
        event.preventDefault();
        closeTip();
      }
    });
    tip.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest(".pfd-tip-close")) {
        event.preventDefault();
        event.stopPropagation();
        closeTip();
        return;
      }
      var btn = event.target && event.target.closest && event.target.closest(".pfd-tip-expando-btn");
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      var box = btn.closest(".pfd-tip-expando");
      var panel = box && box.querySelector(".pfd-tip-expando-panel");
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      if (box) box.classList.toggle("is-open", !open);
      if (panel) panel.hidden = open;
    });
    tip.addEventListener("touchstart", function (event) {
      event.stopPropagation();
    }, { passive: true });

    function onDocPointerDown(event) {
      if (!tipPinned || tip.hidden) return;
      if (tip.contains(event.target)) return;
      var el = event.target;
      if (el && el.closest && el.closest(".pfd-reader")) return;
      if (el && el.closest && el.closest(".pfd-ref, .pfd-link, .pfd-callout-hit")) return;
      hideTip(true);
      hoverRef = null;
      restyle();
    }

    function clearSelection() {
      panelSelection = null;
      hoverRef = null;
      hideTip(true);
      renderPanel();
      draw(true);
      notify();
    }

    function selectItem(id, scroll) {
      var item = itemById(id);
      if (!item) return;
      panelSelection = { type: "item", itemId: String(id) };
      hideTip();
      renderPanel();
      draw(true);
      notify();
      if (scroll && detailEl && !detailEl.hidden) {
        global.setTimeout(function () {
          detailEl.scrollIntoView({ behavior: finePointer.matches ? "auto" : "smooth", block: "nearest" });
        }, 30);
      }
    }

    function selectBook(side, book, scroll) {
      panelSelection = { type: "book", side: side, book: book };
      hideTip();
      renderPanel();
      draw(true);
      notify();
      if (scroll) {
        global.setTimeout(function () {
          detailEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 30);
      }
    }

    function selectLink(link, scroll) {
      panelSelection = {
        type: "link",
        itemId: link.itemId,
        linkId: link.id,
        sourceRef: link.sourceRef,
        targetRef: link.targetRef
      };
      hideTip();
      renderPanel();
      draw(true);
      notify();
      if (scroll) {
        global.setTimeout(function () {
          detailEl.scrollIntoView({ behavior: finePointer.matches ? "auto" : "smooth", block: "nearest" });
        }, 30);
      }
    }

    function linkState(link) {
      if (!passesFilter(link)) return "dim";
      if (hoverRef) {
        var hit = hoverRef.side === "source"
          ? link.sourceRef === hoverRef.reference
          : link.targetRef === hoverRef.reference;
        return hit ? "hot" : "dim";
      }
      if (!panelSelection) return "idle";
      if (panelSelection.type === "link") {
        if (link.id === panelSelection.linkId) return "hot";
        if (link.itemId === panelSelection.itemId) return "warm";
        return "dim";
      }
      if (panelSelection.type === "item") {
        return link.itemId === panelSelection.itemId ? "hot" : "dim";
      }
      if (panelSelection.type === "book") {
        if (panelSelection.side === "source" && link.sourceBook === panelSelection.book) return "hot";
        if (panelSelection.side === "target" && link.targetBook === panelSelection.book) return "hot";
        return "dim";
      }
      return "idle";
    }

    function refSortValue(ref, bookOrder) {
      var bookIndex = bookOrder.indexOf(ref.book);
      if (bookIndex < 0) bookIndex = 800;
      var chapter = ref.chapter || 0;
      var verse = ref.verseStart || 0;
      if (!chapter) {
        var match = String(ref.reference).match(/(\d+)(?::(\d+))?/);
        if (match) {
          chapter = Number(match[1]) || 0;
          verse = Number(match[2]) || verse;
        }
      }
      return bookIndex * 1000000 + chapter * 1000 + verse;
    }

    function parseRefChapter(reference, book) {
      var rest = String(reference || "");
      if (book && rest.indexOf(book) === 0) rest = rest.slice(book.length).trim();
      var match = rest.match(/^(\d+)/);
      return match ? Number(match[1]) || 0 : 0;
    }

    function firstItemForTarget(reference) {
      for (var i = 0; i < items.length; i++) {
        var targets = items[i].targets || [];
        for (var j = 0; j < targets.length; j++) {
          if (targets[j].reference === reference) return items[i];
        }
      }
      return null;
    }

    function readerEntries() {
      var refs = uniqueRefs(items.reduce(function (all, item) {
        return all.concat(item.targets || []);
      }, []), rightOrder);
      var groups = [];
      var current = null;
      refs.forEach(function (ref) {
        var chapter = parseRefChapter(ref.reference, ref.book);
        var key = ref.book + ":" + chapter;
        if (!current || current.key !== key) {
          current = {
            key: key,
            book: ref.book,
            chapter: chapter,
            heading: chapter ? ref.book + " " + chapter : ref.book,
            verses: [],
            seen: {}
          };
          groups.push(current);
        }
        var item = firstItemForTarget(ref.reference);
        var verses = versesOf(data, ref);
        verses.forEach(function (verse) {
          var n = String(verse.n);
          if (current.seen[n]) return;
          current.seen[n] = true;
          var bookLabel = ref.book === "Doctrine and Covenants" ? "D&C" : ref.book;
          current.verses.push({
            n: verse.n,
            text: String(verse.text || "").replace(/__/g, ""),
            ref: ref.reference,
            book: ref.book,
            chapter: chapter,
            verse: verse.n,
            anchorId: item ? String(item.id) : "",
            label: bookLabel + (chapter ? " " + chapter + ":" + verse.n : ""),
            href: ref.url || ""
          });
        });
      });
      groups.forEach(function (group) {
        group.verses.sort(function (a, b) {
          return (Number(a.n) || 0) - (Number(b.n) || 0);
        });
      });
      return groups.filter(function (group) { return group.verses.length; });
    }

    function anchorYForItem(itemId) {
      var item = itemById(itemId);
      if (!item || !chartLayout.left) return null;
      var sources = item.sources || [];
      for (var i = 0; i < sources.length; i++) {
        var y = chartLayout.left.index.get(sources[i].reference);
        if (y != null) return y;
      }
      return null;
    }

    function focusReaderVerse(verse, alignOnly) {
      if (!verse || !verse.ref) {
        if (!alignOnly) {
          hoverRef = null;
          restyle();
        }
        return;
      }
      hoverRef = { reference: verse.ref, side: "target" };
      hideTip(true);
      restyle();
      var y = verse.anchorId ? anchorYForItem(verse.anchorId) : null;
      if (y == null && chartLayout.right) y = chartLayout.right.index.get(verse.ref);
      if (y != null && global.ScriptureReader) {
        global.ScriptureReader.alignSvgY(svgNode, y, verse.centerY);
      }
    }

    function uniqueRefs(list, bookOrder) {
      var map = new Map();
      list.forEach(function (ref) {
        if (!map.has(ref.reference)) map.set(ref.reference, ref);
      });
      return Array.from(map.values()).sort(function (a, b) {
        return refSortValue(a, bookOrder) - refSortValue(b, bookOrder);
      });
    }

    function layoutRefs(refs, rowH, headH, bookGap) {
      var y = 4;
      var sections = [];
      var index = new Map();
      var section = null;
      refs.forEach(function (ref) {
        if (!section || section.book !== ref.book) {
          if (section) y += bookGap;
          section = { book: ref.book, y: y, rows: [] };
          sections.push(section);
          y += headH;
        }
        var rowY = y + rowH / 2;
        section.rows.push({ ref: ref, y: rowY });
        index.set(ref.reference, rowY);
        y += rowH;
      });
      return { sections: sections, height: y, index: index };
    }

    function spreadLayout(layout, target) {
      var extra = target - layout.height;
      if (extra <= 1 || layout.sections.length < 2) {
        layout.height = Math.max(layout.height, target);
        return;
      }
      var add = extra / (layout.sections.length - 1);
      var shift = 0;
      layout.sections.forEach(function (section, i) {
        section.y += shift;
        section.rows.forEach(function (row) { row.y += shift; });
        if (i < layout.sections.length - 1) shift += add;
      });
      layout.index = new Map();
      layout.sections.forEach(function (section) {
        section.rows.forEach(function (row) { layout.index.set(row.ref.reference, row.y); });
      });
      layout.height = target;
    }

    function textWidth(text, size, spacing) {
      var node = svg.append("text")
        .attr("font-size", size)
        .attr("font-family", "Inter, Segoe UI, sans-serif")
        .attr("letter-spacing", spacing || 0)
        .text(text);
      var width = node.node().getComputedTextLength();
      node.remove();
      return width;
    }

    function referenceLabel(ref, maxText, size, useShort) {
      if (useShort) return shortReference(ref);
      if (textWidth(ref.reference, size, 0) <= maxText) return ref.reference;
      return shortReference(ref);
    }

    function bookHeading(book, maxText, size, useShort) {
      var label = useShort ? bookAbbrev(book) : book;
      var upper = String(label).toUpperCase();
      if (useShort || textWidth(upper, size, "0.06em") <= maxText) return upper;
      return String(bookAbbrev(book)).toUpperCase();
    }

    function draw(force) {
      if (disposed || !global.d3) return;
      var width = Math.floor(stage.clientWidth);
      if (width < 40) return;
      var useShort = compactNames.matches;
      if (!force && width === lastWidth && useShort === lastCompact) return;
      lastWidth = width;
      lastCompact = useShort;
      var narrow = width < 760;
      var fontSize = narrow ? 13.5 : 13;
      var headSize = narrow ? 11 : 11;
      var rowH = narrow ? 26 : 22;
      var headH = narrow ? 18 : 16;
      var bookGap = narrow ? 12 : 14;
      var cap = narrow ? 142 : 230;
      var maxText = cap - 18;

      var leftRefs = uniqueRefs(items.reduce(function (all, item) {
        return all.concat(item.sources || []);
      }, []), leftOrder);
      var rightRefs = uniqueRefs(items.reduce(function (all, item) {
        return all.concat(item.targets || []);
      }, []), rightOrder);

      var widest = 72;
      leftRefs.concat(rightRefs).forEach(function (ref) {
        widest = Math.max(widest, textWidth(referenceLabel(ref, maxText, fontSize, useShort), fontSize, 0));
      });
      leftOrder.concat(rightOrder).forEach(function (book) {
        widest = Math.max(widest, textWidth(bookHeading(book, maxText, headSize, useShort), headSize, "0.06em"));
      });
      var labelW = Math.min(cap, Math.max(narrow ? 108 : 150, Math.ceil(widest + 20)));
      if (!filterBook && (cfg.callouts || []).length) {
        var minGap = narrow ? 96 : 220;
        var maxLabel = Math.floor((width - minGap) / 2);
        if (maxLabel < labelW) labelW = Math.max(narrow ? 72 : 110, maxLabel);
      }
      root.style.setProperty("--label", labelW + "px");

      var left = layoutRefs(leftRefs, rowH, headH, bookGap);
      var right = layoutRefs(rightRefs, rowH, headH, bookGap);
      var natural = Math.max(left.height, right.height, 40);
      spreadLayout(left, natural);
      spreadLayout(right, natural);
      var height = Math.ceil(natural + 8);
      var x1 = labelW - 2;
      var x2 = width - labelW + 2;

      var ranked = links.map(function (link) {
        return {
          link: link,
          state: linkState(link),
          d: curve(x1, left.index.get(link.sourceRef), x2, right.index.get(link.targetRef))
        };
      }).filter(function (row) { return row.d; });
      var order = { dim: 0, idle: 1, warm: 2, hot: 3 };
      ranked.sort(function (a, b) { return order[a.state] - order[b.state]; });

      svg.attr("viewBox", "0 0 " + width + " " + height)
        .attr("width", width)
        .attr("height", height);
      svg.selectAll("*").remove();

      svg.append("rect")
        .attr("class", "pfd-bg")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#fff")
        .on("click", function () { clearSelection(); });

      var linkLayer = svg.append("g").attr("class", "pfd-links");
      ranked.forEach(function (row) {
        var group = linkLayer.append("g")
          .datum(row.link)
          .attr("class", "pfd-link is-" + row.state)
          .style("cursor", "pointer");
        var widthByState = row.state === "hot" ? 2.6 : row.state === "warm" ? 2.1 : 1.45;
        var opacity = row.state === "dim" ? 0.06 : row.state === "hot" ? 1 : row.state === "warm" ? 0.9 : (filterBook ? 0.8 : 0.48);
        group.append("path")
          .attr("class", "halo")
          .attr("d", row.d)
          .attr("stroke-width", row.state === "hot" || row.state === "warm" ? 5 : 0)
          .attr("opacity", row.state === "dim" ? 0 : 0.95);
        group.append("path")
          .attr("class", "line")
          .attr("d", row.d)
          .attr("stroke", linkColor(row.link))
          .attr("stroke-width", widthByState)
          .attr("opacity", opacity);
        var hit = group.append("path")
          .attr("class", "hit")
          .attr("d", row.d)
          .attr("stroke-width", narrow ? 16 : 10);
        hit.on("pointerenter", function (event) {
          if (!allowHoverPreview(event) || tipPinned) return;
          hoverRef = null;
          restyle();
          showTip(row.link, event);
        });
        hit.on("pointerleave", function () { scheduleHide(); });
        hit.on("pointerdown", markPointerDown);
        hit.on("pointerup", function (event) {
          if (!isTouchLike(event) || !wasTap(event)) return;
          event.stopPropagation();
          hoverRef = null;
          restyle();
          showTip(row.link, event, true);
          lastTouchPin = Date.now();
        });
        hit.on("click", function (event) {
          event.stopPropagation();
          if (Date.now() - lastTouchPin < 500) {
            if (event.cancelable) event.preventDefault();
            return;
          }
          if (preferPin(event)) {
            if (event.cancelable) event.preventDefault();
            if (!wasTap(event)) return;
            hoverRef = null;
            restyle();
            showTip(row.link, event, true);
            lastTouchPin = Date.now();
            return;
          }
          selectLink(row.link, false);
        });
      });

      chartLayout.left = left;
      chartLayout.right = right;
      drawReferences(left.sections, "source", x1, labelW, fontSize, headSize, maxText, true, useShort);
      drawReferences(right.sections, "target", x2, labelW, fontSize, headSize, maxText, false, useShort);
      restyle();

      if (!filterBook) drawCallouts(x1, x2, left.index, right.index);
      if (reader) reader.refresh();
    }

    function restyle() {
      svg.selectAll(".pfd-link").each(function (link) {
        var state = linkState(link);
        var node = d3.select(this);
        node.attr("class", "pfd-link is-" + state);
        var widthByState = state === "hot" ? 2.6 : state === "warm" ? 2.1 : 1.45;
        var opacity = state === "dim" ? 0.06 : state === "hot" ? 1 : state === "warm" ? 0.9 : (filterBook ? 0.8 : 0.48);
        node.select(".line").attr("stroke-width", widthByState).attr("opacity", opacity);
        node.select(".halo")
          .attr("stroke-width", state === "hot" || state === "warm" ? 5 : 0)
          .attr("opacity", state === "dim" ? 0 : 0.95);
      });
      svg.selectAll(".pfd-ref").each(function (row) {
        var hot = hoverRef && hoverRef.side === row.side && hoverRef.reference === row.ref.reference;
        var connected = links.some(function (link) {
          var touch = row.side === "source" ? link.sourceRef === row.ref.reference : link.targetRef === row.ref.reference;
          return touch && linkState(link) !== "dim";
        });
        var dim = (hoverRef || panelSelection || filterBook) && !connected;
        d3.select(this).select("text")
          .attr("opacity", dim ? 0.28 : 1)
          .attr("font-weight", hot ? 750 : 600);
      });
    }

    function drawReferences(sections, side, dotX, labelW, fontSize, headSize, maxText, isLeft, useShort) {
      var layer = svg.append("g").attr("class", "pfd-books");
      sections.forEach(function (section) {
        layer.append("text")
          .attr("class", "pfd-book-label")
          .attr("x", isLeft ? dotX - 12 : dotX + 12)
          .attr("y", section.y + 11)
          .attr("text-anchor", isLeft ? "end" : "start")
          .attr("font-size", headSize)
          .attr("font-weight", 700)
          .attr("letter-spacing", "0.08em")
          .attr("fill", "#a8a29e")
          .text(bookHeading(section.book, maxText, headSize, useShort));
        section.rows.forEach(function (row) {
          var ref = row.ref;
          var group = layer.append("g")
            .datum({ ref: ref, side: side, reference: ref.reference })
            .attr("class", "pfd-ref");
          var anchor = ref.url
            ? group.append("a").attr("href", ref.url).attr("target", "_blank").attr("rel", "noopener noreferrer")
            : group.append("g");
          anchor.append("text")
            .attr("x", isLeft ? dotX - 12 : dotX + 12)
            .attr("y", row.y)
            .attr("text-anchor", isLeft ? "end" : "start")
            .attr("dominant-baseline", "middle")
            .attr("font-size", fontSize)
            .attr("font-weight", 600)
            .attr("fill", side === "target" ? colorForBook(ref.book) : "#1c1917")
            .text(referenceLabel(ref, maxText, fontSize, useShort));
          anchor.append("circle")
            .attr("cx", dotX)
            .attr("cy", row.y)
            .attr("r", 2.6)
            .attr("fill", side === "target" ? colorForBook(ref.book) : "#1c1917")
            .style("pointer-events", "none");
          function focus(event, pin) {
            hoverRef = { reference: ref.reference, side: side };
            restyle();
            showRefTip(ref, side, event, pin);
          }
          anchor.on("pointerenter", function (event) {
            if (!allowHoverPreview(event)) return;
            focus(event, false);
          });
          anchor.on("pointerleave", function () {
            if (tipPinned) return;
            scheduleHide();
          });
          anchor.on("pointerdown", markPointerDown);
          anchor.on("pointerup", function (event) {
            if (!isTouchLike(event) || !wasTap(event)) return;
            if (event.cancelable) event.preventDefault();
            event.stopPropagation();
            focus(event, true);
            lastTouchPin = Date.now();
          });
          anchor.on("click", function (event) {
            event.stopPropagation();
            if (Date.now() - lastTouchPin < 500 || preferPin(event)) {
              if (event.cancelable) event.preventDefault();
              if (Date.now() - lastTouchPin < 500) return;
              if (!wasTap(event)) return;
              focus(event, true);
              lastTouchPin = Date.now();
            }
          });
        });
      });
    }


    function curve(x1, y1, x2, y2) {
      if (y1 == null || y2 == null) return null;
      var dx = (x2 - x1) * 0.52;
      return "M" + x1 + "," + y1 + "C" + (x1 + dx) + "," + y1 + " " + (x2 - dx) + "," + y2 + " " + x2 + "," + y2;
    }

    function pointOnCurve(t, x1, y1, x2, y2) {
      var c1x = x1 + (x2 - x1) * 0.52;
      var c2x = x2 - (x2 - x1) * 0.52;
      var u = 1 - t;
      return {
        x: u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2,
        y: u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2
      };
    }

    function drawCallouts(x1, x2, leftIndex, rightIndex) {
      var placed = [];
      var span = Math.max(0, x2 - x1);
      var scale = Math.max(0.72, Math.min(1, span / 220));
      var pad = Math.max(3, Math.round(8 * scale));
      var available = Math.max(88, span - pad * 2);
      (cfg.callouts || []).forEach(function (callout) {
        var match = null;
        for (var i = 0; i < links.length; i++) {
          if (links[i].items.some(function (item) { return String(item.id) === String(callout.itemId); })) {
            match = links[i];
            break;
          }
        }
        if (!match) return;
        var y1 = leftIndex.get(match.sourceRef);
        var y2 = rightIndex.get(match.targetRef);
        if (y1 == null || y2 == null) return;
        var at = pointOnCurve(0.36, x1, y1, x2, y2);
        var fontPx = Math.max(9, 12.5 * scale);
        var labelLen = (callout.label || "").length;
        var idealW = Math.min(220, Math.max(148, labelLen * 6.4));
        var boxW = Math.min(available, Math.max(104, idealW * Math.max(scale, 0.82)));
        var innerW = Math.max(24, boxW - fontPx * 1.6);
        var charsPerLine = Math.max(6, Math.floor(innerW / (fontPx * 0.52)));
        var labelLines = Math.max(1, Math.ceil(labelLen / charsPerLine));
        var boxH = Math.ceil(fontPx * (1.2 + labelLines * 1.25 + 1.2));
        var x = at.x - boxW / 2;
        var y = at.y - boxH - Math.max(5, 10 * scale);
        if (x < x1 + pad) x = x1 + pad;
        if (x + boxW > x2 - pad) x = x2 - boxW - pad;
        for (var guard = 0; guard < 8; guard++) {
          var collision = placed.some(function (box) {
            return !(x + boxW < box.x || box.x + box.w < x || y + boxH < box.y || box.y + box.h < y);
          });
          if (!collision) break;
          y -= boxH + 6;
        }
        if (y < 4) y = at.y + 12;
        var citeColor = linkColor(match);
        var fo = svg.append("foreignObject")
          .attr("class", "pfd-callout")
          .attr("x", x)
          .attr("y", y)
          .attr("width", boxW)
          .attr("height", boxH + 24)
          .style("pointer-events", "none");
        var bubble = fo.append("xhtml:div")
          .attr("xmlns", "http://www.w3.org/1999/xhtml")
          .attr("class", "pfd-bubble")
          .style("font-size", fontPx + "px")
          .html('<div class="pfd-bubble-label">' + esc(callout.label || "") + '</div><div class="pfd-bubble-cite" style="color:' + esc(citeColor) + '">' + esc(callout.citation || "") + "</div>");
        var measured = bubble.node() && bubble.node().offsetHeight;
        if (measured && measured > boxH) {
          y -= measured - boxH;
          if (y < 4) y = at.y + 12;
          boxH = measured;
          fo.attr("y", y).attr("height", boxH + 4);
        } else {
          fo.attr("height", boxH + 4);
        }
        placed.push({ x: x, y: y, w: boxW, h: boxH });
        svg.append("rect")
          .attr("class", "pfd-callout-hit")
          .attr("x", x)
          .attr("y", y)
          .attr("width", boxW)
          .attr("height", boxH)
          .attr("rx", 12)
          .attr("fill", "transparent")
          .style("cursor", "pointer")
          .on("pointerenter", function (event) {
            if (!allowHoverPreview(event)) return;
            showTip(match, event);
          })
          .on("pointerleave", function () { scheduleHide(); })
          .on("pointerdown", markPointerDown)
          .on("pointerup", function (event) {
            if (!isTouchLike(event) || !wasTap(event)) return;
            event.stopPropagation();
            showTip(match, event, true);
            lastTouchPin = Date.now();
          })
          .on("click", function (event) {
            event.stopPropagation();
            if (Date.now() - lastTouchPin < 500) return;
            if (preferPin(event)) {
              if (!wasTap(event)) return;
              showTip(match, event, true);
              lastTouchPin = Date.now();
              return;
            }
            selectItem(callout.itemId, true);
          });
      });
    }

    function onKey(event) {
      if (event.key === "Escape") clearSelection();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDocPointerDown);

    var resizeObserver = null;
    function scheduleDraw() {
      global.clearTimeout(drawTimer);
      drawTimer = global.setTimeout(function () { draw(false); notify(); }, 60);
    }
    function onCompactChange() {
      scheduleDraw();
    }
    if (compactNames.addEventListener) compactNames.addEventListener("change", onCompactChange);
    else if (compactNames.addListener) compactNames.addListener(onCompactChange);
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(function () { scheduleDraw(); });
      resizeObserver.observe(stage);
    }
    global.addEventListener("resize", scheduleDraw);

    renderLegend();
    if (global.ScriptureReader) {
      reader = global.ScriptureReader.create({
        mount: document.body,
        strings: strings,
        showLive: true,
        getEntries: readerEntries,
        onFocus: focusReaderVerse,
        onClose: function () {
          hoverRef = null;
          restyle();
        }
      });
    }
    draw(true);
    renderPanel();

    return {
      onChange: function (fn) { changeHandlers.push(fn); },
      selectItem: function (id) { selectItem(id, false); },
      clear: clearSelection,
      destroy: function () {
        disposed = true;
        if (reader) reader.destroy();
        cancelHide();
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("pointerdown", onDocPointerDown);
        global.removeEventListener("resize", scheduleDraw);
        if (compactNames.removeEventListener) compactNames.removeEventListener("change", onCompactChange);
        else if (compactNames.removeListener) compactNames.removeListener(onCompactChange);
        if (resizeObserver) resizeObserver.disconnect();
      }
    };
  }

  global.ConnectionChart = { render: render, watchHeight: watchHeight };
})(window);
