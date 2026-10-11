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
 * Targets with plot: false are listed in the detail view and are not drawn.
 * A link is drawn for every source-book × plotted target-book pair on an item.
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
        if (ref.plot === false) return;
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

    var links = [];
    items.forEach(function (item) {
      var sources = uniqueBooks(item.sources || []);
      var targets = uniqueBooks((item.targets || []).filter(function (ref) { return ref.plot !== false; }));
      sources.forEach(function (sourceBook) {
        targets.forEach(function (targetBook) {
          links.push({
            id: item.id + "|" + sourceBook + "|" + targetBook,
            itemId: String(item.id),
            sourceBook: sourceBook,
            targetBook: targetBook,
            item: item
          });
        });
      });
    });

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
          html += '<p class="pfd-refname" style="color:' + esc(color) + '">' + esc(ref.reference) + "</p>";
          var verses = versesOf(data, ref);
          if (verses.length) {
            html += '<p class="pfd-passage">' + passageHtml(verses) + "</p>";
          }
        });
      html += "</div>";
      return html;
    }

    function showTip(link, event) {
      if (!finePointer.matches || !link) {
        tip.hidden = true;
        return;
      }
      var item = link.item;
      var budget = 20;
      var truncated = false;
      var html = '<p class="pfd-tip-summary">' + esc(item.summary || "") + "</p>";
      function section(title, refs) {
        if (!refs.length) return;
        html += '<p class="pfd-tip-kicker">' + esc(title) + "</p>";
        refs.forEach(function (ref) {
          var refColor = title === (cfg.targetHeading || "Target") ? colorForBook(ref.book) : "#1c1917";
          html += '<p class="pfd-tip-ref" style="color:' + esc(refColor) + '">' + esc(ref.reference) + "</p>";
          var verses = versesOf(data, ref);
          if (!verses.length) return;
          if (budget <= 0) {
            truncated = true;
            return;
          }
          var slice = verses;
          if (verses.length > budget) {
            slice = verses.slice(0, budget);
            truncated = true;
            budget = 0;
          } else {
            budget -= verses.length;
          }
          html += '<p class="pfd-tip-passage">' + passageHtml(slice) + "</p>";
        });
      }
      section(cfg.sourceHeading || "Source", item.sources || []);
      section(cfg.targetHeading || "Target", item.targets || []);
      if (truncated) html += '<p class="pfd-tip-more">' + esc(strings.openFull || "Open the full passage below the chart.") + "</p>";
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

    function hideTip() { tip.hidden = true; }

    function clearSelection() {
      panelSelection = null;
      hideTip();
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
      panelSelection = { type: "link", itemId: link.itemId, linkId: link.id };
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

    function layoutColumn(dotMap, order, pitch, bookGap, minSection) {
      var y = 0;
      var sections = [];
      order.forEach(function (book) {
        var dots = dotMap.get(book) || [];
        if (!dots.length) return;
        var inner = Math.max(minSection, (dots.length - 1) * pitch);
        var section = { book: book, y: y, h: inner, dots: [] };
        var start = y + (inner - (dots.length - 1) * pitch) / 2;
        dots.forEach(function (dot, index) {
          section.dots.push({
            itemId: dot.itemId,
            book: book,
            y: start + index * pitch
          });
        });
        sections.push(section);
        y += inner + bookGap;
      });
      return { sections: sections, height: Math.max(0, y - bookGap) };
    }

    function scaleLayout(layout, target) {
      if (!layout.sections.length || layout.height <= 0 || target <= layout.height + 0.5) return;
      var scale = target / layout.height;
      layout.sections.forEach(function (section) {
        section.y *= scale;
        section.h *= scale;
        section.dots.forEach(function (dot) { dot.y *= scale; });
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

    function displayLabel(book, maxText, size, upper) {
      var full = upper ? book.toUpperCase() : book;
      if (textWidth(full, size, upper ? "0.04em" : 0) <= maxText) return full;
      var short = (cfg.shortLabels && cfg.shortLabels[book]) || book;
      return upper ? String(short).toUpperCase() : short;
    }

    function draw(force) {
      if (disposed || !global.d3) return;
      var width = Math.floor(stage.clientWidth);
      if (width < 40) return;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      var narrow = width < 720;
      var fontSize = narrow ? 14 : 13;
      var pitch = narrow ? 16 : 12;
      var bookGap = narrow ? 20 : 16;
      var minSection = narrow ? 22 : 16;
      var upper = !narrow;
      var cap = narrow ? 108 : 176;
      var maxText = cap - 26;
      var leftLabels = {};
      var rightLabels = {};
      var widest = 48;
      leftOrder.forEach(function (book) {
        leftLabels[book] = displayLabel(book, maxText, fontSize, upper);
        widest = Math.max(widest, textWidth(leftLabels[book], fontSize, upper ? "0.04em" : 0));
      });
      rightOrder.forEach(function (book) {
        rightLabels[book] = displayLabel(book, maxText, fontSize, upper);
        widest = Math.max(widest, textWidth(rightLabels[book], fontSize, upper ? "0.04em" : 0));
      });
      var labelW = Math.min(cap, Math.max(narrow ? 78 : 112, Math.ceil(widest + 30)));
      root.style.setProperty("--label", labelW + "px");

      var leftDots = new Map(leftOrder.map(function (book) { return [book, []]; }));
      var rightDots = new Map(rightOrder.map(function (book) { return [book, []]; }));
      items.forEach(function (item) {
        uniqueBooks(item.sources || []).forEach(function (book) {
          if (leftDots.has(book)) leftDots.get(book).push({ itemId: String(item.id) });
        });
        uniqueBooks((item.targets || []).filter(function (ref) { return ref.plot !== false; })).forEach(function (book) {
          if (rightDots.has(book)) rightDots.get(book).push({ itemId: String(item.id) });
        });
      });

      var left = layoutColumn(leftDots, leftOrder, pitch, bookGap, minSection);
      var right = layoutColumn(rightDots, rightOrder, pitch, bookGap, minSection);
      var natural = Math.max(left.height, right.height, 40);
      scaleLayout(left, natural);
      scaleLayout(right, natural);
      var top = 8;
      [left, right].forEach(function (layout) {
        layout.sections.forEach(function (section) {
          section.y += top;
          section.dots.forEach(function (dot) { dot.y += top; });
        });
      });
      var height = Math.ceil(natural + top + 10);

      var leftIndex = new Map();
      var rightIndex = new Map();
      left.sections.forEach(function (section) {
        section.dots.forEach(function (dot) { leftIndex.set(dot.itemId + "|" + dot.book, dot.y); });
      });
      right.sections.forEach(function (section) {
        section.dots.forEach(function (dot) { rightIndex.set(dot.itemId + "|" + dot.book, dot.y); });
      });

      var x1 = labelW - 2;
      var x2 = width - labelW + 2;
      var ranked = links.map(function (link) {
        return {
          link: link,
          state: linkState(link),
          d: curve(x1, leftIndex.get(link.itemId + "|" + link.sourceBook), x2, rightIndex.get(link.itemId + "|" + link.targetBook))
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
          .attr("class", "pfd-link is-" + row.state)
          .style("cursor", "pointer");
        var widthByState = row.state === "hot" ? 2.6 : row.state === "warm" ? 2.1 : 1.45;
        var opacity = row.state === "dim" ? 0.06 : row.state === "hot" ? 1 : row.state === "warm" ? 0.9 : (filterBook ? 0.8 : 0.5);
        group.append("path")
          .attr("class", "halo")
          .attr("d", row.d)
          .attr("stroke-width", row.state === "hot" || row.state === "warm" ? 6 : 0)
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
          .attr("stroke-width", narrow ? 18 : 12);
        hit.append("title").text(row.link.item.summary || "");
        hit.on("pointerenter", function (event) {
          if (!finePointer.matches) return;
          showTip(row.link, event);
        });
        hit.on("pointermove", function (event) {
          if (!finePointer.matches || tip.hidden) return;
          placeTip(event);
        });
        hit.on("pointerleave", function () { hideTip(); });
        hit.on("click", function (event) {
          event.stopPropagation();
          selectLink(row.link, !finePointer.matches);
        });
      });

      drawBooks(svg, left.sections, "source", x1, labelW, fontSize, upper, leftLabels, true);
      drawBooks(svg, right.sections, "target", x2, labelW, fontSize, upper, rightLabels, false);

      if (!narrow && width >= 860 && !filterBook) drawCallouts(width, x1, x2, leftIndex, rightIndex);
      renderChips();
    }

    function bookIsDim(side, book) {
      var any = false;
      var visible = false;
      links.forEach(function (link) {
        var touch = side === "source" ? link.sourceBook === book : link.targetBook === book;
        if (!touch) return;
        any = true;
        if (linkState(link) !== "dim") visible = true;
      });
      return any && !visible;
    }

    function bookIsHot(side, book) {
      if (!panelSelection) return false;
      if (panelSelection.type === "book") return panelSelection.side === side && panelSelection.book === book;
      if (panelSelection.type === "link" || panelSelection.type === "item") {
        var item = itemById(panelSelection.itemId);
        if (!item) return false;
        var refs = side === "source" ? (item.sources || []) : (item.targets || []);
        return refs.some(function (ref) { return ref.book === book && (side === "source" || ref.plot !== false); });
      }
      return false;
    }

    function drawBooks(svgSel, sections, side, dotX, labelW, fontSize, upper, labels, isLeft) {
      var layer = svgSel.append("g").attr("class", "pfd-books");
      sections.forEach(function (section) {
        var hot = bookIsHot(side, section.book);
        var dim = bookIsDim(side, section.book);
        var group = layer.append("g")
          .attr("class", "pfd-book")
          .attr("role", "button")
          .attr("tabindex", 0)
          .attr("aria-label", section.book + ", " + section.dots.length)
          .attr("aria-pressed", hot ? "true" : "false");
        var hit = group.append("rect")
          .attr("x", isLeft ? 0 : dotX - 8)
          .attr("y", section.y - 4)
          .attr("width", isLeft ? dotX + 10 : labelW + 8)
          .attr("height", Math.max(28, section.h + 8))
          .attr("fill", "transparent");
        var fill = side === "target" ? colorForBook(section.book) : "#1c1917";
        if (dim) fill = "#d6d3d1";
        group.append("text")
          .attr("x", isLeft ? dotX - 12 : dotX + 12)
          .attr("y", section.y + section.h / 2)
          .attr("text-anchor", isLeft ? "end" : "start")
          .attr("dominant-baseline", "middle")
          .attr("font-size", fontSize)
          .attr("font-weight", hot ? 750 : 650)
          .attr("letter-spacing", upper ? "0.04em" : "0")
          .attr("fill", fill)
          .text(labels[section.book] || section.book);
        section.dots.forEach(function (dot) {
          var dotDim = false;
          if (panelSelection || filterBook) {
            var touched = links.some(function (link) {
              if (link.itemId !== dot.itemId) return false;
              if (side === "source" && link.sourceBook !== dot.book) return false;
              if (side === "target" && link.targetBook !== dot.book) return false;
              return true;
            });
            var bookSelected = panelSelection && panelSelection.type === "book" &&
              panelSelection.side === side && panelSelection.book === dot.book;
            if (!touched) {
              dotDim = !bookSelected;
            } else {
              dotDim = !links.some(function (link) {
                if (link.itemId !== dot.itemId) return false;
                if (side === "source" && link.sourceBook !== dot.book) return false;
                if (side === "target" && link.targetBook !== dot.book) return false;
                return linkState(link) !== "dim";
              });
            }
          }
          group.append("circle")
            .attr("cx", dotX)
            .attr("cy", dot.y)
            .attr("r", hot && !dotDim ? 3.4 : 2.5)
            .attr("fill", side === "target" ? colorForBook(section.book) : "#1c1917")
            .attr("opacity", dotDim ? 0.18 : 0.9)
            .style("pointer-events", "none");
        });
        function activate(event) {
          if (event) event.stopPropagation();
          selectBook(side, section.book, !finePointer.matches);
        }
        group.on("click", activate);
        group.on("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate(event);
          }
        });
        hit.on("pointerenter", function () { hideTip(); });
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

    function drawCallouts(width, x1, x2, leftIndex, rightIndex) {
      var placed = [];
      (cfg.callouts || []).forEach(function (callout) {
        var match = null;
        for (var i = 0; i < links.length; i++) {
          if (links[i].itemId === String(callout.itemId)) { match = links[i]; break; }
        }
        if (!match) return;
        var y1 = leftIndex.get(match.itemId + "|" + match.sourceBook);
        var y2 = rightIndex.get(match.itemId + "|" + match.targetBook);
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
