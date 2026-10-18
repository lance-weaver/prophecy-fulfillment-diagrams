/**
 * Collapsible event-timeline to scripture connection chart.
 * Outline: data/prophetic-events.json
 * Verses:  data/scriptures.json
 */
(function (global) {
  var PALETTE = ["#6C4AB6", "#6E8B3D", "#0E7C86", "#D1493D", "#B08958", "#2C5282", "#C47B12", "#7C3AED", "#1F7A4D", "#A15C38", "#3F6473", "#BE185D", "#0F766E", "#A16207"];

  var BOOK_ABBREV = {
    Genesis: "Gen.", Exodus: "Exod.", Leviticus: "Lev.", Numbers: "Num.",
    Deuteronomy: "Deut.", Joshua: "Josh.", Judges: "Judg.", Ruth: "Ruth",
    "1 Samuel": "1 Sam.", "2 Samuel": "2 Sam.", "1 Kings": "1 Kgs.", "2 Kings": "2 Kgs.",
    "1 Chronicles": "1 Chr.", "2 Chronicles": "2 Chr.", Ezra: "Ezra", Nehemiah: "Neh.",
    Esther: "Esth.", Job: "Job", Psalms: "Ps.", Psalm: "Ps.", Proverbs: "Prov.",
    Ecclesiastes: "Eccl.", "Song of Solomon": "Song", Isaiah: "Isa.", Jeremiah: "Jer.",
    Lamentations: "Lam.", Ezekiel: "Ezek.", Daniel: "Dan.", Hosea: "Hos.", Joel: "Joel",
    Amos: "Amos", Obadiah: "Obad.", Jonah: "Jonah", Micah: "Mic.", Nahum: "Nah.",
    Habakkuk: "Hab.", Zephaniah: "Zeph.", Haggai: "Hag.", Zechariah: "Zech.", Malachi: "Mal.",
    Matthew: "Matt.", Mark: "Mark", Luke: "Luke", John: "John", Acts: "Acts",
    Romans: "Rom.", "1 Corinthians": "1 Cor.", "2 Corinthians": "2 Cor.",
    Galatians: "Gal.", Ephesians: "Eph.", Philippians: "Phil.", Colossians: "Col.",
    "1 Thessalonians": "1 Thess.", "2 Thessalonians": "2 Thess.",
    "1 Timothy": "1 Tim.", "2 Timothy": "2 Tim.", Titus: "Titus", Philemon: "Phlm.",
    Hebrews: "Heb.", James: "Jas.", "1 Peter": "1 Pet.", "2 Peter": "2 Pet.",
    "1 John": "1 Jn", "2 John": "2 Jn", "3 John": "3 Jn", Jude: "Jude", Revelation: "Rev.",
    "1 Nephi": "1 Ne.", "2 Nephi": "2 Ne.", Jacob: "Jacob", Mosiah: "Mosiah",
    Alma: "Alma", Helaman: "Hel.", "3 Nephi": "3 Ne.", "4 Nephi": "4 Ne.",
    Mormon: "Morm.", Ether: "Ether", Moroni: "Moro.",
    "Doctrine and Covenants": "D&C", "JS-Matthew": "JS-M", "JS-History": "JS-H",
    "Title Page of Book of Mormon": "Title Page"
  };

  var SLUGS = {
    Genesis: ["ot", "gen"], Exodus: ["ot", "ex"], Leviticus: ["ot", "lev"], Numbers: ["ot", "num"],
    Deuteronomy: ["ot", "deut"], Joshua: ["ot", "josh"], Judges: ["ot", "judg"], Ruth: ["ot", "ruth"],
    "1 Samuel": ["ot", "1-sam"], "2 Samuel": ["ot", "2-sam"], "1 Kings": ["ot", "1-kgs"], "2 Kings": ["ot", "2-kgs"],
    "1 Chronicles": ["ot", "1-chr"], "2 Chronicles": ["ot", "2-chr"], Ezra: ["ot", "ezra"], Nehemiah: ["ot", "neh"],
    Esther: ["ot", "esth"], Job: ["ot", "job"], Psalms: ["ot", "ps"], Proverbs: ["ot", "prov"],
    Ecclesiastes: ["ot", "eccl"], "Song of Solomon": ["ot", "song"], Isaiah: ["ot", "isa"],
    Jeremiah: ["ot", "jer"], Lamentations: ["ot", "lam"], Ezekiel: ["ot", "ezek"], Daniel: ["ot", "dan"],
    Hosea: ["ot", "hosea"], Joel: ["ot", "joel"], Amos: ["ot", "amos"], Obadiah: ["ot", "obad"],
    Jonah: ["ot", "jonah"], Micah: ["ot", "micah"], Nahum: ["ot", "nahum"], Habakkuk: ["ot", "hab"],
    Zephaniah: ["ot", "zeph"], Haggai: ["ot", "hag"], Zechariah: ["ot", "zech"], Malachi: ["ot", "mal"],
    Matthew: ["nt", "matt"], Mark: ["nt", "mark"], Luke: ["nt", "luke"], John: ["nt", "john"],
    Acts: ["nt", "acts"], Romans: ["nt", "rom"], "1 Corinthians": ["nt", "1-cor"],
    "2 Corinthians": ["nt", "2-cor"], Galatians: ["nt", "gal"], Ephesians: ["nt", "eph"],
    Philippians: ["nt", "philip"], Colossians: ["nt", "col"], "1 Thessalonians": ["nt", "1-thes"],
    "2 Thessalonians": ["nt", "2-thes"], "1 Timothy": ["nt", "1-tim"], "2 Timothy": ["nt", "2-tim"],
    Titus: ["nt", "titus"], Philemon: ["nt", "philem"], Hebrews: ["nt", "heb"], James: ["nt", "james"],
    "1 Peter": ["nt", "1-pet"], "2 Peter": ["nt", "2-pet"], "1 John": ["nt", "1-jn"],
    "2 John": ["nt", "2-jn"], "3 John": ["nt", "3-jn"], Jude: ["nt", "jude"], Revelation: ["nt", "rev"],
    "1 Nephi": ["bofm", "1-ne"], "2 Nephi": ["bofm", "2-ne"], Jacob: ["bofm", "jacob"],
    Mosiah: ["bofm", "mosiah"], Alma: ["bofm", "alma"], Helaman: ["bofm", "hel"],
    "3 Nephi": ["bofm", "3-ne"], "4 Nephi": ["bofm", "4-ne"], Mormon: ["bofm", "morm"],
    Ether: ["bofm", "ether"], Moroni: ["bofm", "moro"],
    "Doctrine and Covenants": ["dc-testament", "dc"],
    "JS-Matthew": ["pgp", "js-m"], "JS-History": ["pgp", "js-h"],
    "Title Page of Book of Mormon": ["bofm", "bofm-title"]
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function scriptureUrl(book, reference) {
    var slug = SLUGS[book];
    if (!slug) return null;
    var rest = String(reference || "").replace(book, "").trim();
    var match = rest.match(/(\d+)(?::(\d+)(?:-(\d+))?)?/);
    var chapter = match ? match[1] : "";
    if (!chapter) return "https://www.lds.org/scriptures/" + slug[0] + "/" + slug[1] + "?lang=eng";
    var url = "https://www.lds.org/scriptures/" + slug[0] + "/" + slug[1] + "/" + chapter;
    if (match[2]) url += "." + match[2] + (match[3] ? "-" + match[3] : "");
    return url + "?lang=eng";
  }

  function churchStudyUrl(book, chapter, verse) {
    var slug = SLUGS[book];
    if (!slug) return "";
    var url = "https://www.churchofjesuschrist.org/study/scriptures/" + slug[0] + "/" + slug[1];
    if (chapter) url += "/" + chapter;
    url += "?lang=eng";
    if (verse) url += "&id=p" + verse + "#p" + verse;
    return url;
  }

  function liveRefLabel(book, chapter, verse) {
    if (!book) return "";
    if (chapter && verse) return book + " " + chapter + ":" + verse;
    if (chapter) return book + " " + chapter;
    return String(book);
  }

  function walk(nodes, fn, level) {
    level = level || 1;
    (nodes || []).forEach(function (node) {
      fn(node, level);
      if (node.children && node.children.length) walk(node.children, fn, level + 1);
    });
  }

  function flattenTo(nodes, maxLevel) {
    var out = [];
    walk(nodes, function (node, level) {
      if (level <= maxLevel) out.push({ node: node, level: level });
    });
    return out;
  }

  function render(container, eventsDoc, scripturesDoc, config) {
    var cfg = config || {};
    var strings = cfg.strings || {};
    var eventsSource = JSON.parse(JSON.stringify((eventsDoc && eventsDoc.events) || []));
    var events = JSON.parse(JSON.stringify(eventsSource));
    var passages = (scripturesDoc && scripturesDoc.passages) || {};
    var bookOrder = (scripturesDoc && scripturesDoc.bookOrder) || [];
    var changeHandlers = [];
    var disposed = false;
    var depth = 3;
    var hoverEvent = null;
    var hoverRef = null;
    var tipPinned = false;
    var tipOver = false;
    var hideTimer = 0;
    var lastWidth = -1;
    var lastDepth = -1;
    var drawTimer = 0;
    var lastTouchPin = 0;
    var pointerDownAt = null;
    var finePointer = global.matchMedia("(hover: hover) and (pointer: fine)");
    var compactNames = global.matchMedia("(max-width: 759px)");
    var AUTH_KEY = "pfd-timeline-auth";
    var DRAFT_KEY = "pfd-timeline-draft";
    var passphrase = String(cfg.editorPassphrase || (cfg.editor && cfg.editor.passphrase) || "");
    var editing = false;
    var laidEvents = [];
    var layoutEventW = 280;
    var layoutRailX = 48;
    var dragState = null;
    var inlineForm = null;
    var reader = null;

    function notify() {
      changeHandlers.forEach(function (fn) { fn(); });
    }

    function allowHoverPreview(event) {
      if (editing || dragState) return false;
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
      return BOOK_ABBREV[book] || book;
    }

    function passageOf(reference) {
      var entry = passages[reference];
      if (!entry) return { book: reference, verses: [] };
      if (Array.isArray(entry)) return { book: "", verses: entry };
      return { book: entry.book || "", verses: entry.verses || [] };
    }

    function bookOf(reference) {
      var entry = passageOf(reference);
      if (entry.book) return entry.book;
      for (var i = 0; i < bookOrder.length; i++) {
        if (String(reference).indexOf(bookOrder[i]) === 0) return bookOrder[i];
      }
      return reference;
    }

    function shortReference(reference, book) {
      var text = String(reference || "");
      if (book && text.indexOf(book) === 0) return (bookAbbrev(book) + text.slice(book.length)).trim();
      return text;
    }

    function versesHtml(verses) {
      return (verses || []).map(function (verse) {
        return '<span class="vn">' + esc(verse.n) + "</span>" + esc(verse.text) + " ";
      }).join("");
    }

    function colorForBook(book) {
      var index = Math.max(0, bookOrder.indexOf(book));
      return PALETTE[index % PALETTE.length];
    }

    container.replaceChildren();
    var root = document.createElement("div");
    root.className = "pfd pfd-timeline-app";
    container.appendChild(root);

    var header = "";
    header += '<header class="pfd-header">';
    if (cfg.kicker) header += '<p class="pfd-kicker">' + esc(cfg.kicker) + "</p>";
    header += '<h1 class="pfd-title">' + esc(cfg.title || eventsDoc.title || "") + "</h1>";
    if (cfg.subtitle) header += '<p class="pfd-subtitle">' + esc(cfg.subtitle) + "</p>";
    if (cfg.credit && cfg.credit.href) {
      header += '<p class="pfd-credit">' + esc(cfg.credit.before || "") +
        '<a href="' + esc(cfg.credit.href) + '" target="_blank" rel="noopener noreferrer">' +
        esc(cfg.credit.linkText || cfg.credit.href) + "</a>" +
        esc(cfg.credit.after || "");
      if (cfg.credit.alsoHref) {
        header += '<a href="' + esc(cfg.credit.alsoHref) + '">' +
          esc(cfg.credit.alsoLinkText || cfg.credit.alsoHref) + "</a>" +
          esc(cfg.credit.alsoAfter || "");
      }
      header += "</p>";
    }
    if (cfg.hint) header += '<p class="pfd-hint">' + esc(cfg.hint) + "</p>";
    header += "</header>";
    header += '<div class="pfd-depth" role="toolbar" aria-label="Outline depth"></div>';
    header += '<div class="pfd-columns"></div>';
    header += '<div class="pfd-stage"><svg class="pfd-svg" role="group"></svg><div class="pfd-drop-line" hidden></div><div class="pfd-tooltip" hidden></div></div>';
    header += '<p class="pfd-note"></p><p class="pfd-footnote"></p>';
    header += '<p class="pfd-login"></p>';
    root.innerHTML = header;

    var depthEl = root.querySelector(".pfd-depth");
    var columnsEl = root.querySelector(".pfd-columns");
    var stage = root.querySelector(".pfd-stage");
    var svg = d3.select(root.querySelector(".pfd-svg"));
    var svgNode = root.querySelector(".pfd-svg");
    var dropLine = root.querySelector(".pfd-drop-line");
    var tip = root.querySelector(".pfd-tooltip");
    var loginEl = root.querySelector(".pfd-login");
    root.querySelector(".pfd-note").textContent = cfg.dotsNote || "";
    var footEl = root.querySelector(".pfd-footnote");
    footEl.textContent = cfg.footnote || "";
    if (!cfg.footnote) footEl.hidden = true;

    columnsEl.innerHTML =
      '<div class="pfd-colhead left"><strong>' + esc((cfg.leftColumn && cfg.leftColumn.label) || "Events") +
      "</strong><span>" + esc((cfg.leftColumn && cfg.leftColumn.sublabel) || "") + "</span></div>" +
      "<div></div>" +
      '<div class="pfd-colhead right"><strong>' + esc((cfg.rightColumn && cfg.rightColumn.label) || "Scripture") +
      "</strong><span>" + esc((cfg.rightColumn && cfg.rightColumn.sublabel) || "") + "</span></div>";

    function eventsPayload() {
      return {
        howToEdit: (eventsDoc && eventsDoc.howToEdit) || "",
        title: (eventsDoc && eventsDoc.title) || cfg.title || "",
        events: events
      };
    }

    function persistDraft() {
      try { global.localStorage.setItem(DRAFT_KEY, JSON.stringify(eventsPayload())); }
      catch (err) {}
    }

    function loadDraft() {
      try {
        var raw = global.localStorage.getItem(DRAFT_KEY);
        if (!raw) return false;
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events) && parsed.events.length) {
          events = parsed.events;
          return true;
        }
      } catch (err) {}
      return false;
    }

    function setEditing(on) {
      editing = !!on;
      root.classList.toggle("is-editing", editing);
      try {
        if (editing) global.localStorage.setItem(AUTH_KEY, "1");
        else global.localStorage.removeItem(AUTH_KEY);
      } catch (err) {}
      if (editing) {
        loadDraft();
        ensureUids();
      }
      renderLogin();
      hideTip(true);
      draw(true);
      notify();
    }

    function renderLogin() {
      var loginLabel = strings.login || "login";
      var html = "";
      if (editing) {
        html += '<span class="pfd-login-tools">';
        html += esc(strings.editing || "editing — drag to move, double-click to rename");
        html += ' · <button type="button" data-act="download">' + esc(strings.download || "download json") + "</button>";
        html += ' · <button type="button" data-act="revert">' + esc(strings.revert || "revert") + "</button>";
        html += ' · <button type="button" data-act="logout">' + esc(strings.logout || "logout") + "</button>";
        html += "</span>";
      } else {
        html += '<button type="button" data-act="login">' + esc(loginLabel) + "</button>";
        html += '<form class="pfd-login-form" hidden>';
        html += '<input type="password" name="pass" autocomplete="current-password" aria-label="Editor passphrase">';
        html += '<button type="submit">' + esc(strings.enter || "enter") + "</button>";
        html += "</form>";
      }
      loginEl.innerHTML = html;
    }

    loginEl.addEventListener("click", function (event) {
      var act = event.target && event.target.getAttribute && event.target.getAttribute("data-act");
      if (act === "login") {
        var form = loginEl.querySelector(".pfd-login-form");
        if (form) {
          form.hidden = false;
          var input = form.querySelector("input");
          if (input) input.focus();
        }
        event.target.hidden = true;
      } else if (act === "logout") {
        closeInlineEdit(false);
        setEditing(false);
      } else if (act === "download") {
        var blob = new Blob([JSON.stringify(eventsPayload(), null, 2) + "\n"], { type: "application/json" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "prophetic-events.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 500);
      } else if (act === "revert") {
        try { global.localStorage.removeItem(DRAFT_KEY); } catch (err) {}
        events = JSON.parse(JSON.stringify(eventsSource));
        draw(true);
        notify();
      }
    });
    loginEl.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = loginEl.querySelector("input[name=pass]");
      var value = input ? String(input.value || "") : "";
      if (passphrase && value === passphrase) {
        setEditing(true);
      } else {
        if (input) {
          input.value = "";
          input.placeholder = strings.wrongPass || "That passphrase did not match.";
          input.focus();
        }
      }
    });

    function findLoc(id, nodes, parent) {
      nodes = nodes || events;
      for (var i = 0; i < nodes.length; i++) {
        if (String(nodes[i].id) === String(id)) {
          return { list: nodes, index: i, node: nodes[i], parent: parent || null };
        }
        var kids = nodes[i].children;
        if (kids && kids.length) {
          var nested = findLoc(id, kids, nodes[i]);
          if (nested) return nested;
        }
      }
      return null;
    }

    function nodeContains(node, id) {
      if (!node || id == null) return false;
      if (String(node.id) === String(id)) return true;
      return (node.children || []).some(function (child) { return nodeContains(child, id); });
    }

    function newUid() {
      return "e-" + Math.random().toString(36).slice(2, 10);
    }

    function ensureUids(nodes) {
      (nodes || events).forEach(function (node) {
        if (!node.uid) node.uid = newUid();
        if (node.children && node.children.length) ensureUids(node.children);
      });
    }

    function findByUid(uid, nodes, parent) {
      if (!uid) return null;
      nodes = nodes || events;
      for (var i = 0; i < nodes.length; i++) {
        if (String(nodes[i].uid) === String(uid)) {
          return { list: nodes, index: i, node: nodes[i], parent: parent || null };
        }
        var kids = nodes[i].children;
        if (kids && kids.length) {
          var nested = findByUid(uid, kids, nodes[i]);
          if (nested) return nested;
        }
      }
      return null;
    }

    function reassignIds() {
      function walk(nodes, prefix) {
        (nodes || []).forEach(function (node, i) {
          if (!node.uid) node.uid = newUid();
          node.id = prefix ? prefix + "." + (i + 1) : String(i + 1);
          walk(node.children || [], node.id);
        });
      }
      walk(events, "");
    }

    function moveNode(id, parentId, index) {
      var hit = findLoc(id);
      if (!hit) return;
      if (parentId && nodeContains(hit.node, parentId)) return;
      var sameParent = ((hit.parent && hit.parent.id) || null) === (parentId || null);
      if (sameParent && (index === hit.index || index === hit.index + 1)) return;
      var node = hit.list.splice(hit.index, 1)[0];
      var list;
      if (parentId) {
        var parentHit = findLoc(parentId);
        if (!parentHit) return;
        list = parentHit.node.children || (parentHit.node.children = []);
      } else {
        list = events;
      }
      if (sameParent && hit.index < index) index -= 1;
      index = Math.max(0, Math.min(index, list.length));
      list.splice(index, 0, node);
      reassignIds();
    }

    function laidOf(id) {
      for (var i = 0; i < laidEvents.length; i++) {
        if (String(laidEvents[i].row.node.id) === String(id)) return laidEvents[i];
      }
      return null;
    }

    function lastVisible(node) {
      var kids = (node.children || []).filter(function (child) { return laidOf(child.id); });
      if (!kids.length) return node;
      return lastVisible(kids[kids.length - 1]);
    }

    function slotsFor(level, draggedId) {
      var dragged = findLoc(draggedId);
      var draggedNode = dragged && dragged.node;
      var slots = [];
      function add(y, parentId, index) {
        if (y == null || isNaN(y)) return;
        if (parentId && draggedNode && nodeContains(draggedNode, parentId)) return;
        slots.push({ y: y, parentId: parentId || null, index: index });
      }
      function addBlock(node, parentId, index) {
        var row = laidOf(node.id);
        if (row) add(row.y, parentId, index);
        var end = laidOf(lastVisible(node).id);
        if (end) add(end.y + end.h + 2, parentId, index + 1);
      }
      if (level === 1) {
        events.forEach(function (node, i) { addBlock(node, null, i); });
      } else if (level === 2) {
        events.forEach(function (epoch) {
          var kids = epoch.children || [];
          kids.forEach(function (child, i) { addBlock(child, epoch.id, i); });
          if (!kids.length) {
            var parentRow = laidOf(epoch.id);
            if (parentRow) add(parentRow.y + parentRow.h + 4, epoch.id, 0);
          }
        });
      } else {
        events.forEach(function (epoch) {
          (epoch.children || []).forEach(function (phase) {
            var kids = phase.children || [];
            kids.forEach(function (child, i) { addBlock(child, phase.id, i); });
            if (!kids.length) {
              var parentRow = laidOf(phase.id);
              if (parentRow) add(parentRow.y + parentRow.h + 4, phase.id, 0);
            }
          });
        });
      }
      return slots;
    }

    function nearestSlot(slots, y) {
      var best = null;
      var bestD = Infinity;
      (slots || []).forEach(function (slot) {
        var d = Math.abs(slot.y - y);
        if (d < bestD) { bestD = d; best = slot; }
      });
      return best;
    }

    function svgY(event) {
      var node = svg.node();
      if (!node) return 0;
      var ctm = node.getScreenCTM();
      if (ctm && ctm.d) return (event.clientY - ctm.f) / ctm.d;
      return event.clientY - node.getBoundingClientRect().top;
    }

    function showDrop(slot) {
      if (!slot) { dropLine.hidden = true; return; }
      dropLine.hidden = false;
      dropLine.style.top = Math.round(slot.y) + "px";
      dropLine.style.width = layoutEventW + "px";
    }

    function closeInlineEdit(commit) {
      if (!inlineForm) return;
      var form = inlineForm;
      inlineForm = null;
      var titleInput = form.querySelector("[name=title]");
      var timeInput = form.querySelector("[name=time]");
      var item = form._item;
      if (commit && item && titleInput) {
        var nextTitle = titleInput.value.trim();
        var changed = false;
        if (nextTitle && nextTitle !== item.row.node.title) {
          item.row.node.title = nextTitle;
          changed = true;
        }
        if (timeInput) {
          var nextTime = timeInput.value.trim();
          var prevTime = item.row.node.time || "";
          if (nextTime !== prevTime) {
            item.row.node.time = nextTime || null;
            changed = true;
          }
        }
        if (changed) {
          persistDraft();
          form.remove();
          draw(true);
          notify();
          return;
        }
      }
      form.remove();
    }

    function eventIndent(level) {
      return layoutRailX + 12 + Math.max(0, level - 1) * 12;
    }

    function parseYear(time) {
      var s = String(time || "").replace(/–/g, "-");
      if (!s) return null;
      if (/eternity/i.test(s)) return 4000;
      if (/end of the 1/i.test(s)) return 3100;
      if (/commencement of 1/i.test(s) || /1,000-Year Reign/i.test(s)) return 2100;
      if (/day of the lord/i.test(s)) return 2035;
      if (/culmination of gentile/i.test(s)) return 2033;
      var re = /(\d{1,4})\s*(BC|AD)?/ig;
      var m;
      while ((m = re.exec(s))) {
        var n = parseInt(m[1], 10);
        var era = (m[2] || "").toUpperCase();
        if (era === "BC") return -n;
        if (era === "AD") {
          var earlier = s.slice(0, m.index).match(/(\d{3,4})/);
          return earlier ? parseInt(earlier[1], 10) : n;
        }
        if (n >= 100) return n;
      }
      return null;
    }

    function tickLabel(year) {
      if (year < 0) return Math.abs(year) + " BC";
      if (year === 0) return "1 AD";
      return year + " AD";
    }

    function yearAlong(anchors, year) {
      if (!anchors.length) return null;
      if (year <= anchors[0].year) return anchors[0].y;
      if (year >= anchors[anchors.length - 1].year) return anchors[anchors.length - 1].y;
      for (var i = 0; i < anchors.length - 1; i++) {
        var a = anchors[i];
        var b = anchors[i + 1];
        if (a.year === year) return a.y;
        if (a.year === b.year) continue;
        var t = (year - a.year) / (b.year - a.year);
        if (t >= 0 && t <= 1) return a.y + t * (b.y - a.y);
      }
      return null;
    }

    function openInlineEdit(item) {
      closeInlineEdit(false);
      hideTip(true);
      var indent = eventIndent(item.row.level);
      var form = document.createElement("form");
      form.className = "pfd-inline-form";
      form._item = item;
      var width = Math.max(120, layoutEventW - indent - 8);
      form.style.left = indent + "px";
      form.style.top = Math.max(0, item.y) + "px";
      form.style.width = width + "px";
      if (item.row.level === 1) {
        form.innerHTML = '<input class="pfd-inline-edit time" name="time" aria-label="Timeframe">' +
          '<input class="pfd-inline-edit" name="title" aria-label="Event title">';
      } else {
        form.innerHTML = '<input class="pfd-inline-edit" name="title" aria-label="Event title">';
      }
      var titleInput = form.querySelector("[name=title]");
      var timeInput = form.querySelector("[name=time]");
      titleInput.value = item.row.node.title || "";
      if (timeInput) timeInput.value = item.row.node.time || "";
      stage.appendChild(form);
      inlineForm = form;
      titleInput.focus();
      titleInput.select();
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        closeInlineEdit(true);
      });
      form.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeInlineEdit(false);
        }
      });
      form.addEventListener("focusout", function () {
        setTimeout(function () {
          if (inlineForm === form && !form.contains(document.activeElement)) closeInlineEdit(true);
        }, 0);
      });
    }

    function beginPossibleDrag(event, item) {
      if (!editing || (event.button && event.button !== 0)) return;
      if (inlineForm) return;
      dragState = {
        item: item,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        drop: null
      };
    }

    function onWinPointerMove(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (!dragState.active) {
        if ((dx * dx + dy * dy) < 36) return;
        dragState.active = true;
        hideTip(true);
        root.classList.add("is-dragging");
      }
      var dragged = dragState.item.row.node;
      var slots = slotsFor(dragState.item.row.level, dragged.id);
      dragState.drop = nearestSlot(slots, svgY(event));
      showDrop(dragState.drop);
    }

    function onWinPointerUp(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      var drop = dragState.drop;
      var item = dragState.item;
      var wasDrag = dragState.active;
      dragState = null;
      root.classList.remove("is-dragging");
      showDrop(null);
      if (wasDrag && drop) {
        moveNode(item.row.node.id, drop.parentId, drop.index);
        persistDraft();
        draw(true);
        notify();
      }
    }

    function renderDepth() {
      depthEl.replaceChildren();
      [
        { n: 1, label: strings.depth1 || "1st Order Events Only" },
        { n: 2, label: strings.depth2 || "2nd Order Events" },
        { n: 3, label: strings.depth3 || "Expand All" }
      ].forEach(function (opt) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "pfd-key";
        button.textContent = opt.label;
        button.setAttribute("aria-pressed", depth === opt.n ? "true" : "false");
        button.addEventListener("click", function () {
          depth = opt.n;
          hideTip(true);
          hoverEvent = null;
          hoverRef = null;
          renderDepth();
          draw(true);
          notify();
        });
        depthEl.appendChild(button);
      });
    }

    function visibleRows() {
      return flattenTo(events, depth);
    }

    function visibleRefs() {
      var seen = {};
      var list = [];
      visibleRows().forEach(function (row) {
        (row.node.scriptures || []).forEach(function (reference) {
          if (seen[reference]) return;
          seen[reference] = true;
          list.push({
            reference: reference,
            book: bookOf(reference),
            url: scriptureUrl(bookOf(reference), reference)
          });
        });
      });
      list.sort(function (a, b) {
        var ia = bookOrder.indexOf(a.book);
        var ib = bookOrder.indexOf(b.book);
        if (ia < 0) ia = 800;
        if (ib < 0) ib = 800;
        if (ia !== ib) return ia - ib;
        return String(a.reference).localeCompare(String(b.reference), undefined, { numeric: true });
      });
      return list;
    }

    function citedRefs() {
      var seen = {};
      var list = [];
      walk(events, function (node) {
        (node.scriptures || []).forEach(function (reference) {
          if (seen[reference]) return;
          seen[reference] = true;
          list.push({
            reference: reference,
            book: bookOf(reference),
            url: scriptureUrl(bookOf(reference), reference)
          });
        });
      });
      list.sort(function (a, b) {
        var ia = bookOrder.indexOf(a.book);
        var ib = bookOrder.indexOf(b.book);
        if (ia < 0) ia = 800;
        if (ib < 0) ib = 800;
        if (ia !== ib) return ia - ib;
        return String(a.reference).localeCompare(String(b.reference), undefined, { numeric: true });
      });
      return list;
    }

    function parseRefChapter(reference, book) {
      var rest = String(reference || "");
      if (book && rest.indexOf(book) === 0) rest = rest.slice(book.length).trim();
      var match = rest.match(/^(\d+)/);
      return match ? Number(match[1]) || 0 : 0;
    }

    function verseCoords(n, fallbackChapter) {
      var raw = String(n == null ? "" : n).trim();
      var dotted = raw.match(/^(\d+)\s*:\s*(\d+)$/);
      if (dotted) {
        return { chapter: Number(dotted[1]) || 0, verse: Number(dotted[2]) || 0, displayN: dotted[2] };
      }
      return { chapter: fallbackChapter || 0, verse: Number(raw) || 0, displayN: raw || "" };
    }

    function eventUidFor(reference) {
      var entry = passages[reference];
      if (entry && !Array.isArray(entry) && entry.eventUid && findByUid(entry.eventUid)) {
        return entry.eventUid;
      }
      var found = null;
      walk(events, function (node) {
        if (found) return;
        if ((node.scriptures || []).indexOf(reference) !== -1) found = node.uid || "";
      });
      return found || "";
    }

    function layoutYForUid(uid) {
      var loc = findByUid(uid);
      if (!loc) return null;
      var node = loc.node;
      while (node) {
        var laid = laidOf(node.id);
        if (laid) return laid.connectY;
        loc = findLoc(node.id);
        node = loc && loc.parent;
      }
      return null;
    }

    function readerEntries() {
      var items = [];
      var seen = {};
      citedRefs().forEach(function (ref) {
        var info = passageOf(ref.reference);
        var anchor = eventUidFor(ref.reference);
        var fallbackCh = parseRefChapter(ref.reference, ref.book);
        (info.verses || []).forEach(function (verse) {
          var coords = verseCoords(verse.n, fallbackCh);
          var key = ref.book + ":" + coords.chapter + ":" + coords.verse;
          if (seen[key]) return;
          seen[key] = true;
          items.push({
            book: ref.book,
            chapter: coords.chapter,
            verse: coords.verse,
            n: coords.displayN,
            text: verse.text || "",
            ref: ref.reference,
            anchorId: anchor,
            label: liveRefLabel(ref.book, coords.chapter, coords.verse),
            href: churchStudyUrl(ref.book, coords.chapter, coords.verse)
          });
        });
      });
      items.sort(function (a, b) {
        var ia = bookOrder.indexOf(a.book);
        var ib = bookOrder.indexOf(b.book);
        if (ia < 0) ia = 800;
        if (ib < 0) ib = 800;
        if (ia !== ib) return ia - ib;
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.verse - b.verse;
      });
      var groups = [];
      var current = null;
      items.forEach(function (item) {
        var key = item.book + ":" + item.chapter;
        if (!current || current.key !== key) {
          var prevCount = current ? current.verses.length : 0;
          var bookChanged = !current || current.book !== item.book;
          current = {
            key: key,
            book: item.book,
            chapter: item.chapter,
            heading: item.chapter ? item.book + " " + item.chapter : item.book,
            showHeading: !groups.length || bookChanged || prevCount > 8,
            verses: []
          };
          groups.push(current);
        }
        current.verses.push(item);
      });
      return groups.filter(function (group) { return group.verses.length; });
    }

    function focusReaderVerse(verse, alignOnly) {
      if (!verse || !verse.ref) {
        if (!alignOnly) {
          hoverEvent = null;
          hoverRef = null;
          restyle();
        }
        return;
      }
      hoverRef = verse.ref;
      hoverEvent = null;
      hideTip(true);
      restyle();
      var y = layoutYForUid(verse.anchorId);
      if (y == null) {
        visibleRows().some(function (row) {
          if ((row.node.scriptures || []).indexOf(verse.ref) === -1) return false;
          var laid = laidOf(row.node.id);
          if (laid) y = laid.connectY;
          return !!laid;
        });
      }
      if (y != null && global.ScriptureReader) {
        global.ScriptureReader.alignSvgY(svgNode, y, verse.centerY);
      }
    }

    function linksFor(rows, refs) {
      var refY = {};
      refs.forEach(function (ref) { refY[ref.reference] = true; });
      var links = [];
      rows.forEach(function (row) {
        (row.node.scriptures || []).forEach(function (reference) {
          if (!refY[reference]) return;
          links.push({
            eventId: String(row.node.id),
            event: row.node,
            reference: reference,
            book: bookOf(reference)
          });
        });
      });
      return links;
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
        hoverEvent = null;
        hoverRef = null;
        restyle();
        hideTip();
      }, 320);
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
    function closeTip() {
      hideTip(true);
      hoverEvent = null;
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
    function hideTip(force) {
      if (tipPinned && !force) return;
      cancelHide();
      tipPinned = false;
      tipOver = false;
      tip.classList.remove("is-pinned");
      tip.hidden = true;
    }

    function eventTipHtml(node) {
      var html = '<p class="pfd-tip-summary">' + esc(node.title) + "</p>";
      if (node.time) html += '<p class="pfd-tip-more">' + esc(node.time) + "</p>";
      if (node.summary) html += '<p class="pfd-tip-passage">' + esc(node.summary) + "</p>";
      (node.scriptures || []).forEach(function (reference) {
        var info = passageOf(reference);
        var book = info.book || bookOf(reference);
        html += '<p class="pfd-tip-kicker">' + esc(reference) + "</p>";
        if (info.verses && info.verses.length) {
          html += '<p class="pfd-tip-passage">' + versesHtml(info.verses) + "</p>";
        }
        var url = scriptureUrl(book, reference);
        if (url) {
          html += '<p class="pfd-tip-more"><a class="pfd-open" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
            esc(info.verses && info.verses.length ? (strings.openScripture || "Open on lds.org") : (strings.readScripture || "Read on churchofjesuschrist.org")) + "</a></p>";
        } else if (!(info.verses && info.verses.length)) {
          html += '<p class="pfd-tip-more">' + esc(strings.noVerses || "Verse text has not been added for this reference yet.") + "</p>";
        }
      });
      return html;
    }

    function refTipHtml(reference) {
      var info = passageOf(reference);
      var book = info.book || bookOf(reference);
      var html = '<p class="pfd-tip-ref" style="color:' + esc(colorForBook(book)) + '">' + esc(reference) + "</p>";
      if (info.verses && info.verses.length) html += '<p class="pfd-tip-passage">' + versesHtml(info.verses) + "</p>";
      var url = scriptureUrl(book, reference);
      if (url) {
        html += '<p class="pfd-tip-more"><a class="pfd-open" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(info.verses && info.verses.length ? (strings.openScripture || "Open on lds.org") : (strings.readScripture || "Read on churchofjesuschrist.org")) + "</a></p>";
      } else if (!(info.verses && info.verses.length)) {
        html += '<p class="pfd-tip-more">' + esc(strings.noVerses || "Verse text has not been added for this reference yet.") + "</p>";
      }
      return html;
    }

    tip.addEventListener("pointerenter", function () { tipOver = true; cancelHide(); });
    tip.addEventListener("pointerleave", function () { tipOver = false; scheduleHide(); });
    tip.addEventListener("wheel", function (event) { event.stopPropagation(); }, { passive: true });
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
      }
    });

    function onDocPointerDown(event) {
      if (!tipPinned || tip.hidden) return;
      if (tip.contains(event.target)) return;
      var el = event.target;
      if (el && el.closest && el.closest(".pfd-reader")) return;
      if (el && el.closest && el.closest(".pfd-ref, .pfd-link, .pfd-event")) return;
      hideTip(true);
      hoverEvent = null;
      hoverRef = null;
      restyle();
    }
    document.addEventListener("pointerdown", onDocPointerDown);

    function linkState(link) {
      if (hoverEvent) return link.eventId === hoverEvent ? "hot" : "dim";
      if (hoverRef) return link.reference === hoverRef ? "hot" : "dim";
      return "idle";
    }

    function restyle() {
      svg.selectAll(".pfd-link").each(function (link) {
        var state = linkState(link);
        var node = d3.select(this);
        node.attr("class", "pfd-link is-" + state);
        var widthByState = state === "hot" ? 2.6 : 1.45;
        var opacity = state === "dim" ? 0.06 : state === "hot" ? 1 : 0.48;
        node.select(".line").attr("stroke-width", widthByState).attr("opacity", opacity);
        node.select(".halo")
          .attr("stroke-width", state === "hot" ? 5 : 0)
          .attr("opacity", state === "dim" ? 0 : 0.95);
      });
      svg.selectAll(".pfd-event").each(function (row) {
        var hot = hoverEvent && hoverEvent === String(row.node.id);
        var connected = !hoverRef && !hoverEvent ? true : (hoverEvent
          ? String(row.node.id) === hoverEvent
          : (row.node.scriptures || []).indexOf(hoverRef) !== -1);
        d3.select(this).select("text")
          .attr("opacity", connected ? 1 : 0.28)
          .attr("font-weight", hot || row.level === 1 ? 700 : 600);
      });
      svg.selectAll(".pfd-ref").each(function (row) {
        var hot = hoverRef && hoverRef === row.ref.reference;
        var connected = !hoverRef && !hoverEvent ? true : (hoverRef
          ? row.ref.reference === hoverRef
          : (hoverEvent && linksFor(visibleRows(), [row.ref]).some(function (link) {
            return link.eventId === hoverEvent && link.reference === row.ref.reference;
          })));
        if (hoverEvent) {
          connected = (function () {
            var match = false;
            visibleRows().forEach(function (ev) {
              if (String(ev.node.id) === hoverEvent && (ev.node.scriptures || []).indexOf(row.ref.reference) !== -1) match = true;
            });
            return match;
          })();
        }
        d3.select(this).select("text")
          .attr("opacity", connected ? 1 : 0.28)
          .attr("font-weight", hot ? 750 : 600);
      });
    }

    function wrapLines(text, maxWidth, fontSize) {
      var words = String(text || "").split(/\s+/);
      var lines = [];
      var current = "";
      words.forEach(function (word) {
        var trial = current ? current + " " + word : word;
        if (textWidth(trial, fontSize) <= maxWidth || !current) current = trial;
        else { lines.push(current); current = word; }
      });
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    }

    function textWidth(text, size) {
      var node = svg.append("text")
        .attr("font-size", size)
        .attr("font-family", "Inter, Segoe UI, sans-serif")
        .text(text);
      var width = node.node().getComputedTextLength();
      node.remove();
      return width;
    }

    function curve(x1, y1, x2, y2) {
      if (y1 == null || y2 == null) return null;
      var dx = (x2 - x1) * 0.52;
      return "M" + x1 + "," + y1 + "C" + (x1 + dx) + "," + y1 + " " + (x2 - dx) + "," + y2 + " " + x2 + "," + y2;
    }

    function draw(force) {
      if (disposed || !global.d3) return;
      var width = Math.floor(stage.clientWidth);
      if (width < 40) return;
      if (!force && width === lastWidth && depth === lastDepth) return;
      lastWidth = width;
      lastDepth = depth;
      var narrow = width < 760;
      var rows = visibleRows();
      var refs = visibleRefs();
      var railX = narrow ? 42 : 52;
      layoutRailX = railX;
      var eventW = Math.round(Math.min(narrow ? width * 0.48 : 400, Math.max(narrow ? 148 : 256, width * 0.36)));
      var refW = Math.round(Math.min(narrow ? 120 : 170, Math.max(narrow ? 88 : 120, width * 0.18)));
      var firstRight = narrow
        ? Math.round(Math.min(width * 0.64, width - refW - 28))
        : Math.min(400, width - refW - 36);
      if (firstRight < eventW) firstRight = eventW;
      root.style.setProperty("--event", eventW + "px");
      root.style.setProperty("--scripture", refW + "px");
      root.style.setProperty("--event-indent", eventIndent(1) + "px");
      columnsEl.style.gridTemplateColumns = eventW + "px 1fr " + refW + "px";
      layoutEventW = eventW;
      closeInlineEdit(false);

      var y = 32;
      var prevEpochYear = null;
      var eventIndex = new Map();
      laidEvents = [];
      var bannerCfg = cfg.millenniumBanner || {
        beforeUid: "e-22",
        title: "MILLENNIUM OCCURS HERE IN EARTH'S HIGHER DIMENSION.",
        body: "The Righteous are transfigured into it for a thousand years, while the wicked stay on a self-destructing earth as if no time has passed."
      };
      var laidBanners = [];
      rows.forEach(function (row) {
        if (bannerCfg && String(row.node.uid) === String(bannerCfg.beforeUid)) {
          var bannerIndent = eventIndent(1);
          var boxW = Math.max(96, eventW - bannerIndent - 4);
          var titleSize = narrow ? 12.5 : 12;
          var titleLines = wrapLines(bannerCfg.title || "", boxW - 24, titleSize);
          var bodyLines = wrapLines(bannerCfg.body || "", boxW - 24, 10);
          var bannerH = 16 + titleLines.length * (titleSize + 4) + 8 + bodyLines.length * 13 + 14;
          laidBanners.push({
            x: bannerIndent,
            y: y,
            w: boxW,
            h: bannerH,
            title: bannerCfg.title || "",
            body: bannerCfg.body || "",
            titleSize: titleSize
          });
          y += bannerH + 14;
        }
        if (row.level === 1) {
          var year = parseYear(row.node.time);
          if (prevEpochYear != null && year != null) {
            var jump = Math.abs(year - prevEpochYear);
            if (jump >= 900) y += 24;
            else if (jump >= 400) y += 14;
            else if (jump >= 180) y += 8;
          }
          if (year != null) prevEpochYear = year;
        }
        var size = row.level === 1 ? (narrow ? 12.5 : 12) : row.level === 2 ? 11.5 : 11;
        var wrapRight = row.level === 1 ? firstRight : eventW;
        var maxText = Math.max(48, wrapRight - eventIndent(row.level) - 10);
        var lines = wrapLines(row.node.title, maxText, size);
        var block = 8 + lines.length * (size + 3);
        if (row.level === 1 && row.node.time) block += 14;
        var mid = y + block / 2;
        var textY = y + (row.level === 1 && row.node.time ? 24 : 12);
        var connectY = row.level === 1 ? textY : mid;
        var connectX = row.level === 1 ? firstRight - 2 : eventW - 2;
        var cited = (row.node.scriptures || []).length > 0;
        eventIndex.set(String(row.node.id), { x: connectX, y: connectY, cited: cited });
        laidEvents.push({
          row: row, y: y, mid: mid, textY: textY, connectX: connectX, connectY: connectY,
          cited: cited, lines: lines, size: size, h: block
        });
        y += block + (row.level === 1 ? 10 : 4);
      });
      var leftHeight = y + 16;

      var ry = 8;
      var refIndex = new Map();
      var sections = [];
      var section = null;
      var refH = narrow ? 24 : 20;
      var headH = 16;
      refs.forEach(function (ref) {
        if (!section || section.book !== ref.book) {
          if (section) ry += 8;
          section = { book: ref.book, y: ry, rows: [] };
          sections.push(section);
          ry += headH;
        }
        var mid = ry + refH / 2;
        section.rows.push({ ref: ref, y: mid });
        refIndex.set(ref.reference, mid);
        ry += refH;
      });
      var rightHeight = ry + 8;
      var anchors = [];
      laidEvents.forEach(function (item) {
        if (item.row.level !== 1) return;
        var year = parseYear(item.row.node.time);
        if (year == null) return;
        if (anchors.length && year < anchors[anchors.length - 1].year) return;
        anchors.push({ year: year, y: item.mid });
      });
      var millennia = [-2000, -1000, 0, 1000, 2000, 3000].map(function (year) {
        var ty = null;
        if (!anchors.length) return null;
        if (year < anchors[0].year) ty = Math.max(12, anchors[0].y - 22);
        else ty = yearAlong(anchors, year);
        if (ty == null) return null;
        return { year: year, y: ty, label: tickLabel(year) };
      }).filter(Boolean);
      millennia.sort(function (a, b) { return a.y - b.y; });
      for (var t = 1; t < millennia.length; t++) {
        if (millennia[t].y - millennia[t - 1].y < 13) millennia[t].y = millennia[t - 1].y + 13;
      }
      var nowY = yearAlong(anchors, 2026);
      var railTop = laidEvents.length ? laidEvents[0].mid : 8;
      var railBot = laidEvents.length ? laidEvents[laidEvents.length - 1].mid : 8;
      millennia.forEach(function (tick) {
        railTop = Math.min(railTop, tick.y);
        railBot = Math.max(railBot, tick.y);
      });
      if (nowY != null) {
        railTop = Math.min(railTop, nowY);
        railBot = Math.max(railBot, nowY);
      }
      var height = Math.ceil(Math.max(leftHeight, rightHeight, railBot + 18, 80));
      var x1 = eventW - 2;
      var x2 = width - refW + 2;

      var links = linksFor(rows, refs).map(function (link) {
        var pos = eventIndex.get(link.eventId);
        return {
          link: link,
          d: pos ? curve(pos.x, pos.y, x2, refIndex.get(link.reference)) : null
        };
      }).filter(function (row) { return row.d; });

      svg.attr("viewBox", "0 0 " + width + " " + height)
        .attr("width", width)
        .attr("height", height);
      svg.selectAll("*").remove();
      svg.append("rect")
        .attr("class", "pfd-bg")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#fff")
        .on("click", function () {
          hideTip(true);
          hoverEvent = null;
          hoverRef = null;
          restyle();
        });

      var axis = svg.append("g").attr("class", "pfd-axis").style("pointer-events", "none");
      millennia.forEach(function (tick) {
        axis.append("line")
          .attr("x1", railX)
          .attr("x2", x1 - 8)
          .attr("y1", tick.y)
          .attr("y2", tick.y)
          .attr("stroke", "#e7e5e4")
          .attr("stroke-width", 1);
      });
      if (laidEvents.length) {
        axis.append("line")
          .attr("x1", railX).attr("x2", railX)
          .attr("y1", railTop - 6)
          .attr("y2", railBot + 10)
          .attr("stroke", "#a8a29e")
          .attr("stroke-width", 1.75);
        axis.append("line")
          .attr("x1", railX - 5).attr("x2", railX + 5)
          .attr("y1", railTop - 6)
          .attr("y2", railTop - 6)
          .attr("stroke", "#a8a29e")
          .attr("stroke-width", 1.25);
        axis.append("path")
          .attr("d", "M" + (railX - 4) + "," + (railBot + 4) + " L" + railX + "," + (railBot + 12) + " L" + (railX + 4) + "," + (railBot + 4) + " Z")
          .attr("fill", "#a8a29e");
      }
      millennia.forEach(function (tick) {
        axis.append("line")
          .attr("x1", railX - 9)
          .attr("x2", railX + 9)
          .attr("y1", tick.y)
          .attr("y2", tick.y)
          .attr("stroke", "#57534e")
          .attr("stroke-width", 1.35);
        axis.append("text")
          .attr("x", railX - 12)
          .attr("y", tick.y + 3)
          .attr("text-anchor", "end")
          .attr("font-size", 8)
          .attr("font-weight", 600)
          .attr("fill", "#78716c")
          .attr("letter-spacing", "0.02em")
          .text(tick.label);
      });
      if (nowY != null) {
        axis.append("line")
          .attr("x1", railX - 11)
          .attr("x2", railX + 7)
          .attr("y1", nowY)
          .attr("y2", nowY)
          .attr("stroke", "#c2410c")
          .attr("stroke-width", 1.5);
        axis.append("text")
          .attr("x", railX - 13)
          .attr("y", nowY + 3)
          .attr("text-anchor", "end")
          .attr("font-size", 8)
          .attr("font-weight", 700)
          .attr("fill", "#c2410c")
          .text("now");
      }

      var linkLayer = svg.append("g").attr("class", "pfd-links");
      links.forEach(function (row) {
        var group = linkLayer.append("g")
          .datum(row.link)
          .attr("class", "pfd-link is-idle")
          .style("cursor", "pointer");
        group.append("path").attr("class", "halo").attr("d", row.d).attr("stroke-width", 0);
        group.append("path")
          .attr("class", "line")
          .attr("d", row.d)
          .attr("stroke", colorForBook(row.link.book))
          .attr("stroke-width", 1.45)
          .attr("opacity", 0.48);
        var hit = group.append("path").attr("class", "hit").attr("d", row.d).attr("stroke-width", narrow ? 16 : 10);
        hit.on("pointerenter", function (event) {
          if (!allowHoverPreview(event)) return;
          hoverEvent = row.link.eventId;
          hoverRef = null;
          restyle();
          fillTip(eventTipHtml(row.link.event), event, false);
        });
        hit.on("pointerleave", function () { scheduleHide(); });
        hit.on("pointerdown", markPointerDown);
        hit.on("click", function (event) {
          event.stopPropagation();
          if (preferPin(event) || isTouchLike(event)) {
            fillTip(eventTipHtml(row.link.event), event, true);
            lastTouchPin = Date.now();
          }
        });
      });

      var eventLayer = svg.append("g").attr("class", "pfd-events");
      laidBanners.forEach(function (banner) {
        var fo = eventLayer.append("foreignObject")
          .attr("class", "pfd-millennium-fo")
          .attr("x", banner.x)
          .attr("y", banner.y)
          .attr("width", banner.w)
          .attr("height", banner.h)
          .style("pointer-events", "none");
        var box = fo.append("xhtml:div")
          .attr("class", "pfd-millennium")
          .style("font-size", banner.titleSize + "px");
        box.append("xhtml:strong").text(banner.title);
        box.append("xhtml:span").text(banner.body);
      });
      laidEvents.forEach(function (item) {
        var row = item.row;
        var group = eventLayer.append("g")
          .datum(row)
          .attr("class", "pfd-event");
        var indent = eventIndent(row.level);
        if (row.level === 1 && row.node.time) {
          group.append("text")
            .attr("x", indent)
            .attr("y", item.y + 10)
            .attr("font-size", 9)
            .attr("fill", "#a8a29e")
            .attr("letter-spacing", "0.04em")
            .text(row.node.time);
        }
        var textY = item.textY;
        var label = group.append("text")
          .attr("x", indent)
          .attr("y", textY)
          .attr("font-size", item.size)
          .attr("font-weight", row.level === 1 ? 700 : 600)
          .attr("fill", "#1c1917");
        item.lines.forEach(function (line, i) {
          label.append("tspan")
            .attr("x", indent)
            .attr("dy", i === 0 ? 0 : item.size + 3)
            .text(line);
        });
        if (item.cited) {
          group.append("circle")
            .attr("class", "pfd-connect-dot")
            .attr("cx", item.connectX)
            .attr("cy", item.connectY)
            .attr("r", row.level === 1 ? 2 : 2.5)
            .attr("fill", row.level === 1 ? "#c4bfb9" : "#78716c")
            .style("pointer-events", "none");
        }
        var mark = group.append("g").style("pointer-events", "none");
        if (row.level === 1) {
          mark.append("line")
            .attr("x1", railX - 7).attr("x2", railX + 7)
            .attr("y1", item.connectY).attr("y2", item.connectY)
            .attr("stroke", "#a8a29e")
            .attr("stroke-width", 1.1);
          mark.append("circle")
            .attr("cx", railX)
            .attr("cy", item.connectY)
            .attr("r", 2.2)
            .attr("fill", "#fff")
            .attr("stroke", "#a8a29e")
            .attr("stroke-width", 1.2);
        } else {
          var stub = row.level === 2 ? 8 : 5;
          mark.append("line")
            .attr("x1", railX).attr("x2", railX + stub)
            .attr("y1", item.mid).attr("y2", item.mid)
            .attr("stroke", row.level === 2 ? "#a8a29e" : "#d6d3d1")
            .attr("stroke-width", 1);
          mark.append("circle")
            .attr("cx", railX + stub)
            .attr("cy", item.mid)
            .attr("r", row.level === 2 ? 2 : 1.5)
            .attr("fill", row.level === 2 ? "#78716c" : "#a8a29e");
        }
        function focus(event, pin) {
          hoverEvent = String(row.node.id);
          hoverRef = null;
          restyle();
          fillTip(eventTipHtml(row.node), event, pin);
        }
        group.style("cursor", editing ? "grab" : "pointer");
        group.on("pointerenter", function (event) {
          if (!allowHoverPreview(event)) return;
          focus(event, false);
        });
        group.on("pointerleave", function () { scheduleHide(); });
        group.on("pointerdown", function (event) {
          markPointerDown(event);
          beginPossibleDrag(event, item);
        });
        group.on("dblclick", function (event) {
          if (!editing) return;
          event.preventDefault();
          event.stopPropagation();
          hideTip(true);
          openInlineEdit(item);
        });
        group.on("click", function (event) {
          event.stopPropagation();
          if (editing) return;
          if (preferPin(event) || isTouchLike(event)) {
            focus(event, true);
            lastTouchPin = Date.now();
          }
        });
      });

      var refLayer = svg.append("g").attr("class", "pfd-books");
      var maxRefText = refW - 18;
      sections.forEach(function (sec) {
        refLayer.append("text")
          .attr("x", x2 + 12)
          .attr("y", sec.y + 11)
          .attr("font-size", 10)
          .attr("font-weight", 700)
          .attr("letter-spacing", "0.08em")
          .attr("fill", "#a8a29e")
          .text(String(compactNames.matches ? bookAbbrev(sec.book) : sec.book).toUpperCase());
        sec.rows.forEach(function (r) {
          var group = refLayer.append("g")
            .datum({ ref: r.ref })
            .attr("class", "pfd-ref");
          var label = shortReference(r.ref.reference, r.ref.book);
          if (textWidth(label, 12) > maxRefText) label = shortReference(r.ref.reference, r.ref.book);
          var anchor = r.ref.url
            ? group.append("a").attr("href", r.ref.url).attr("target", "_blank").attr("rel", "noopener noreferrer")
            : group.append("g");
          anchor.append("text")
            .attr("x", x2 + 12)
            .attr("y", r.y)
            .attr("dominant-baseline", "middle")
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .attr("fill", colorForBook(r.ref.book))
            .text(label);
          anchor.append("circle")
            .attr("cx", x2)
            .attr("cy", r.y)
            .attr("r", 2.6)
            .attr("fill", colorForBook(r.ref.book))
            .style("pointer-events", "none");
          function focus(event, pin) {
            hoverRef = r.ref.reference;
            hoverEvent = null;
            restyle();
            fillTip(refTipHtml(r.ref.reference), event, pin);
          }
          anchor.on("pointerenter", function (event) {
            if (!allowHoverPreview(event)) return;
            focus(event, false);
          });
          anchor.on("pointerleave", function () { scheduleHide(); });
          anchor.on("pointerdown", markPointerDown);
          anchor.on("click", function (event) {
            event.stopPropagation();
            if (preferPin(event)) {
              if (event.cancelable) event.preventDefault();
              focus(event, true);
              lastTouchPin = Date.now();
            }
          });
        });
      });
      restyle();
      if (reader) reader.refresh();
    }

    function scheduleDraw() {
      global.clearTimeout(drawTimer);
      drawTimer = global.setTimeout(function () { draw(false); notify(); }, 60);
    }
    var resizeObserver = null;
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(function () { scheduleDraw(); });
      resizeObserver.observe(stage);
    }
    global.addEventListener("resize", scheduleDraw);
    global.addEventListener("pointermove", onWinPointerMove);
    global.addEventListener("pointerup", onWinPointerUp);
    global.addEventListener("pointercancel", onWinPointerUp);

    try { editing = global.localStorage.getItem(AUTH_KEY) === "1"; } catch (err) {}
    if (editing) loadDraft();
    ensureUids();
    root.classList.toggle("is-editing", editing);
    renderLogin();
    renderDepth();
    if (global.ScriptureReader) {
      reader = global.ScriptureReader.create({
        mount: document.body,
        strings: strings,
        showLive: true,
        jumps: cfg.readerJumps || [
          { label: "Isaiah", book: "Isaiah" },
          { label: "Daniel 7-11", book: "Daniel", chapter: 7 },
          { label: "Zechariah", book: "Zechariah" },
          { label: "Revelation", book: "Revelation" },
          { label: "2 Nephi 25–30 (Nephi’s Latter-Day Prophecies)", book: "2 Nephi", chapter: 25 },
          { label: "3 Nephi 11-28", book: "3 Nephi", chapter: 11 },
          { label: "D&C 29:8-27", book: "Doctrine and Covenants", chapter: 29, verse: 8 },
          { label: "D&C 43:17-26,31", book: "Doctrine and Covenants", chapter: 43, verse: 17 },
          { label: "D&C 45:15-71", book: "Doctrine and Covenants", chapter: 45, verse: 15 },
          { label: "D&C 88:25-114", book: "Doctrine and Covenants", chapter: 88, verse: 25 },
          { label: "JS-Matthew", book: "JS-Matthew" }
        ],
        getEntries: readerEntries,
        onFocus: focusReaderVerse,
        onClose: function () {
          hoverEvent = null;
          hoverRef = null;
          restyle();
        }
      });
    }
    draw(true);

    return {
      onChange: function (fn) { changeHandlers.push(fn); },
      destroy: function () {
        disposed = true;
        if (reader) reader.destroy();
        document.removeEventListener("pointerdown", onDocPointerDown);
        global.removeEventListener("resize", scheduleDraw);
        global.removeEventListener("pointermove", onWinPointerMove);
        global.removeEventListener("pointerup", onWinPointerUp);
        global.removeEventListener("pointercancel", onWinPointerUp);
        if (resizeObserver) resizeObserver.disconnect();
      }
    };
  }

  global.TimelineChart = { render: render };
})(window);
