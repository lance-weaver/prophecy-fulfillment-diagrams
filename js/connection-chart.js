/**
 * Reusable two-column connection chart.
 *
 * Data file:
 *   {
 *     credit?: { translation?: string },
 *     books?: { source?: string[], target?: string[], left?: string[], right?: string[] },
 *     passages?: { [reference: string]: { n: number, text: string }[] },
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

  function passageHtml(verses) {
    if (!verses.length) return "";
    return verses.map(function (verse) {
      return '<span class="vn">' + esc(verse.n) + "</span>" + esc(verse.text) + " ";
    }).join("");
  }

  function uniqueBooks(refs) {
    var seen = [];
    refs.forEach(function (ref) {
      if (seen.indexOf(ref.book) === -1) seen.push(ref.book);
    });
    return seen;
  }

  function watchHeight(options) {
    var type = (options && options.type) || "pfd:resize";
    var getId = (options && options.getId) || function () { return (options && options.id) || ""; };
    var last = -1;
    var timer = 0;

    function measure() {
      var app = document.getElementById("app");
      var height = app ? app.offsetHeight : document.body.offsetHeight;
      return Math.ceil(height) + 2;
    }

    function send() {
      var height = measure();
      if (height === last) return;
      last = height;
      if (global.parent && global.parent !== global) {
        global.parent.postMessage({ type: type, height: height, id: getId() || "" }, "*");
      }
    }

    function report() {
      global.clearTimeout(timer);
      timer = global.setTimeout(send, 40);
    }

    if (typeof ResizeObserver === "function") {
      var observer = new ResizeObserver(report);
      observer.observe(document.body);
      observer.observe(document.documentElement);
      var appNow = document.getElementById("app");
      if (appNow) observer.observe(appNow);
    }
    global.addEventListener("load", report);
    global.addEventListener("resize", report);
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
    var filterBook = null;
    var lastWidth = -1;
    var drawTimer = 0;
    var finePointer = global.matchMedia("(hover: hover) and (pointer: fine)");

    container.replaceChildren();
    var root = document.createElement("div");
    root.className = "pfd";
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
      html += "<h1 class=\"pfd-title\">" + esc(cfg.title || "") + "</h1>";
      if (cfg.subtitle) html += '<p class="pfd-subtitle">' + esc(cfg.subtitle) + "</p>";
      if (cfg.credit && cfg.credit.href) {
        html += '<p class="pfd-credit">' + esc(cfg.credit.before || "") +
          '<a href="' + esc(cfg.credit.href) + '" target="_blank" rel="noopener noreferrer">' +
          esc(cfg.credit.linkText || cfg.credit.href) + "</a>" +
          esc(cfg.credit.after || "") + "</p>";
      }
      if (cfg.hint) html += '<p class="pfd-hint">' + esc(cfg.hint) + "</p>";
      html += "</header>";
      return html;
    }

    root.innerHTML = header() +
      '<div class="pfd-columns"></div>' +
      '<div class="pfd-callouts"></div>' +
      '<div class="pfd-stage"><svg class="pfd-svg" role="group"></svg><div class="pfd-tooltip" hidden></div></div>' +
      '<div class="pfd-legend"></div>' +
      '<p class="pfd-note"></p>' +
      '<p class="pfd-footnote"></p>' +
      '<section class="pfd-detail" hidden></section>';

    var columnsEl = root.querySelector(".pfd-columns");
    var chipsEl = root.querySelector(".pfd-callouts");
    var stage = root.querySelector(".pfd-stage");
    var svg = d3.select(root.querySelector(".pfd-svg"));
    var svgNode = root.querySelector(".pfd-svg");
    var tip = root.querySelector(".pfd-tooltip");
    var legendEl = root.querySelector(".pfd-legend");
    var noteEl = root.querySelector(".pfd-note");
    var footEl = root.querySelector(".pfd-footnote");
    var detailEl = root.querySelector(".pfd-detail");

    if (cfg.chartLabel || cfg.title) svgNode.setAttribute("aria-label", cfg.chartLabel || cfg.title);
    noteEl.textContent = cfg.dotsNote || "";
    footEl.textContent = cfg.footnote || "";
    if (!cfg.footnote) footEl.hidden = true;

    function columnHeads() {
      var left = cfg.leftColumn || {};
      var right = cfg.rightColumn || {};
      columnsEl.innerHTML =
        '<div class="pfd-colhead left"><strong>' + esc(left.label || "Source") + "</strong><span>" + esc(left.sublabel || "") + "</span></div>" +
        "<div></div>" +
        '<div class="pfd-colhead right"><strong>' + esc(right.label || "Target") + "</strong><span>" + esc(right.sublabel || "") + "</span></div>";
    }
    columnHeads();

    function renderChips() {
      chipsEl.replaceChildren();
      (cfg.callouts || []).forEach(function (callout) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "pfd-chip";
        button.textContent = callout.label;
        button.setAttribute("aria-pressed", panelSelection && panelSelection.itemId === String(callout.itemId) ? "true" : "false");
        button.addEventListener("click", function () {
          selectItem(callout.itemId, true);
        });
        chipsEl.appendChild(button);
      });
    }

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
        renderChips();
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
      renderChips();
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

    function passageBlock(ref, budget) {
      var verses = versesOf(data, ref);
      var html = '<p class="pfd-tip-ref" style="color:' + esc(colorForBook(ref.book)) + '">' + esc(ref.reference) + "</p>";
      if (!verses.length) return { html: html, truncated: false, used: 0 };
      var slice = verses;
      var truncated = false;
      if (budget != null && verses.length > budget) {
        slice = verses.slice(0, budget);
        truncated = true;
      }
      html += '<p class="pfd-tip-passage">' + passageHtml(slice) + "</p>";
      if (truncated) {
        html += '<p class="pfd-tip-more">' + esc(strings.moreVerses || "Open the reference to read the full passage.") + "</p>";
      }
      return { html: html, truncated: truncated, used: slice.length };
    }

    function openLinkHtml(ref) {
      if (!ref || !ref.url) return "";
      return '<p class="pfd-tip-more"><a class="pfd-open" href="' + esc(ref.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(strings.openScripture || "Open on lds.org") + "</a></p>";
    }

    function showRefTip(ref, event, pin) {
      if (!ref) return;
      var block = passageBlock(ref, 12);
      var html = block.html + openLinkHtml(ref);
      tipPinned = !!pin;
      tip.classList.toggle("is-pinned", tipPinned);
      tip.innerHTML = html;
      tip.hidden = false;
      if (event) placeTip(event);
    }

    function showTip(link, event) {
      if (!finePointer.matches || !link || tipPinned) return;
      var summaries = (link.items || [link.item]).map(function (item) { return item.summary; }).filter(Boolean);
      var html = '<p class="pfd-tip-summary">' + esc(summaries[0] || "") + "</p>";
      if (summaries.length > 1) {
        html += '<p class="pfd-tip-more">' + summaries.length + " " + esc(strings.entries || "entries") + "</p>";
      }
      html += '<p class="pfd-tip-kicker">' + esc(cfg.sourceHeading || "Source") + "</p>";
      html += passageBlock(link.source, 8).html;
      html += '<p class="pfd-tip-kicker">' + esc(cfg.targetHeading || "Target") + "</p>";
      html += passageBlock(link.target, 8).html;
      tipPinned = false;
      tip.classList.remove("is-pinned");
      tip.innerHTML = html;
      tip.hidden = false;
      placeTip(event);
    }

    function placeTip(event) {
      var bounds = stage.getBoundingClientRect();
      var x = event.clientX - bounds.left + 14;
      var y = event.clientY - bounds.top + 16;
      tip.style.left = "0px";
      tip.style.top = "0px";
      var width = tip.offsetWidth;
      var height = tip.offsetHeight;
      if (x + width > bounds.width - 8) x = Math.max(8, event.clientX - bounds.left - width - 16);
      if (y + height > bounds.height - 8) y = Math.max(8, bounds.height - height - 8);
      tip.style.left = Math.round(x) + "px";
      tip.style.top = Math.round(y) + "px";
    }

    function hideTip(force) {
      if (tipPinned && !force) return;
      tipPinned = false;
      tip.classList.remove("is-pinned");
      tip.hidden = true;
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

    function referenceLabel(ref, maxText, size) {
      if (textWidth(ref.reference, size, 0) <= maxText) return ref.reference;
      var shortBook = (cfg.shortLabels && cfg.shortLabels[ref.book]) || ref.book;
      if (ref.book === "Psalms") shortBook = "Ps.";
      var versePart = String(ref.reference).replace(/^[1-3]?\s?[A-Za-z]+\.?\s+/, "");
      var compact = (shortBook + " " + versePart).trim();
      return textWidth(compact, size, 0) <= maxText ? compact : compact;
    }

    function bookHeading(book, maxText, size) {
      var upper = book.toUpperCase();
      if (textWidth(upper, size, "0.06em") <= maxText) return upper;
      var short = (cfg.shortLabels && cfg.shortLabels[book]) || book;
      return String(short).toUpperCase();
    }

    function draw(force) {
      if (disposed || !global.d3) return;
      var width = Math.floor(stage.clientWidth);
      if (width < 40) return;
      if (!force && width === lastWidth) return;
      lastWidth = width;
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
        widest = Math.max(widest, textWidth(referenceLabel(ref, maxText, fontSize), fontSize, 0));
      });
      leftOrder.concat(rightOrder).forEach(function (book) {
        widest = Math.max(widest, textWidth(bookHeading(book, maxText, headSize), headSize, "0.06em"));
      });
      var labelW = Math.min(cap, Math.max(narrow ? 108 : 150, Math.ceil(widest + 20)));
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
        hit.append("title").text((row.link.items && row.link.items[0] && row.link.items[0].summary) || "");
        hit.on("pointerenter", function (event) {
          if (!finePointer.matches || tipPinned) return;
          hoverRef = null;
          restyle();
          showTip(row.link, event);
        });
        hit.on("pointermove", function (event) {
          if (!finePointer.matches || tip.hidden || tipPinned) return;
          placeTip(event);
        });
        hit.on("pointerleave", function () { hideTip(); });
        hit.on("click", function (event) {
          event.stopPropagation();
          selectLink(row.link, !finePointer.matches);
        });
      });

      drawReferences(left.sections, "source", x1, labelW, fontSize, headSize, maxText, true);
      drawReferences(right.sections, "target", x2, labelW, fontSize, headSize, maxText, false);
      restyle();

      if (!narrow && width >= 980 && !filterBook) drawCallouts(x1, x2, left.index, right.index);
      renderChips();
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

    function drawReferences(sections, side, dotX, labelW, fontSize, headSize, maxText, isLeft) {
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
          .text(bookHeading(section.book, maxText, headSize));
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
            .text(referenceLabel(ref, maxText, fontSize));
          anchor.append("circle")
            .attr("cx", dotX)
            .attr("cy", row.y)
            .attr("r", 2.6)
            .attr("fill", side === "target" ? colorForBook(ref.book) : "#1c1917")
            .style("pointer-events", "none");
          function focus(event, pin) {
            hoverRef = { reference: ref.reference, side: side };
            restyle();
            showRefTip(ref, event, pin);
          }
          anchor.on("pointerenter", function (event) {
            if (!finePointer.matches) return;
            focus(event, false);
          });
          anchor.on("pointermove", function (event) {
            if (!finePointer.matches || tip.hidden || tipPinned) return;
            placeTip(event);
          });
          anchor.on("pointerleave", function () {
            if (tipPinned) return;
            hoverRef = null;
            restyle();
            hideTip();
          });
          anchor.on("click", function (event) {
            event.stopPropagation();
            if (!finePointer.matches) {
              event.preventDefault();
              focus(event, true);
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
        var boxW = Math.min(220, Math.max(168, (callout.label || "").length * 6.6));
        var boxH = (callout.label || "").length > 26 ? 64 : 50;
        var x = at.x - boxW / 2;
        var y = at.y - boxH - 10;
        if (x < x1 + 8) x = x1 + 8;
        if (x + boxW > x2 - 8) x = x2 - boxW - 8;
        for (var guard = 0; guard < 8; guard++) {
          var collision = placed.some(function (box) {
            return !(x + boxW < box.x || box.x + box.w < x || y + boxH < box.y || box.y + box.h < y);
          });
          if (!collision) break;
          y -= boxH + 6;
        }
        if (y < 4) y = at.y + 12;
        placed.push({ x: x, y: y, w: boxW, h: boxH });
        var citeColor = linkColor(match);
        var fo = svg.append("foreignObject")
          .attr("class", "pfd-callout")
          .attr("x", x)
          .attr("y", y)
          .attr("width", boxW)
          .attr("height", boxH + 8)
          .style("pointer-events", "none");
        fo.append("xhtml:div")
          .attr("xmlns", "http://www.w3.org/1999/xhtml")
          .attr("class", "pfd-bubble")
          .html('<div class="pfd-bubble-label">' + esc(callout.label || "") + '</div><div class="pfd-bubble-cite" style="color:' + esc(citeColor) + '">' + esc(callout.citation || "") + "</div>");
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
            if (!finePointer.matches) return;
            showTip(match, event);
          })
          .on("pointerleave", function () { hideTip(); })
          .on("click", function (event) {
            event.stopPropagation();
            selectItem(callout.itemId, true);
          });
      });
    }

    function onKey(event) {
      if (event.key === "Escape") clearSelection();
    }
    document.addEventListener("keydown", onKey);

    var resizeObserver = null;
    function scheduleDraw() {
      global.clearTimeout(drawTimer);
      drawTimer = global.setTimeout(function () { draw(false); notify(); }, 60);
    }
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(function () { scheduleDraw(); });
      resizeObserver.observe(stage);
    }
    global.addEventListener("resize", scheduleDraw);

    renderLegend();
    renderChips();
    draw(true);
    renderPanel();

    return {
      onChange: function (fn) { changeHandlers.push(fn); },
      selectItem: function (id) { selectItem(id, false); },
      clear: clearSelection,
      destroy: function () {
        disposed = true;
        document.removeEventListener("keydown", onKey);
        global.removeEventListener("resize", scheduleDraw);
        if (resizeObserver) resizeObserver.disconnect();
      }
    };
  }

  global.ConnectionChart = { render: render, watchHeight: watchHeight };
})(window);
