/**
 * Keep outline order / uid tidy and refresh scriptures.json eventUid
 * after citations change in prophetic-events.json.
 *
 *   node scripts/link-scripture-events.js
 *     - Rename leftover `id` to `order`
 *     - Rewrite `order` from the tree (1, 1.1, 1.1.2, …)
 *     - Give any event missing a uid the next unused #NNN
 *     - Set each passage's eventUid to the first outline event that cites it
 *       (keeps a manual eventUid if that event still cites the passage)
 *     - Add empty passage stubs for cited refs that are not in scriptures.json
 *
 *   node scripts/link-scripture-events.js --mint-uids
 *     - Also remint every uid as #001, #002, … in outline order and remap
 *       scriptures.json + millenniumBanner.beforeUid
 *
 * Does not fill verse text. Does not run build_dataset.py.
 */
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var eventsPath = path.join(root, "data", "prophetic-events.json");
var scripturesPath = path.join(root, "data", "scriptures.json");
var configPath = path.join(root, "data", "prophetic-events.config.json");
var mintUids = process.argv.indexOf("--mint-uids") !== -1;

var eventsDoc = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
var scripturesDoc = JSON.parse(fs.readFileSync(scripturesPath, "utf8"));
var configDoc = JSON.parse(fs.readFileSync(configPath, "utf8"));
var bookOrder = scripturesDoc.bookOrder || [];

function walk(nodes, fn) {
  (nodes || []).forEach(function (node) {
    fn(node);
    if (node.children && node.children.length) walk(node.children, fn);
  });
}

function formatUid(n) {
  var s = String(n);
  while (s.length < 3) s = "0" + s;
  return "#" + s;
}

function parseUidNum(uid) {
  var match = String(uid || "").match(/^#(\d{1,3})$/);
  return match ? Number(match[1]) : 0;
}

function bookOf(reference) {
  var text = String(reference || "");
  if (/^D&C\b/.test(text)) return "Doctrine and Covenants";
  for (var i = 0; i < bookOrder.length; i++) {
    if (text.indexOf(bookOrder[i]) === 0) return bookOrder[i];
  }
  return "";
}

function usedUidNums() {
  var used = {};
  walk(eventsDoc.events, function (node) {
    var n = parseUidNum(node.uid);
    if (n) used[n] = true;
  });
  return used;
}

function nextUid() {
  var used = usedUidNums();
  for (var i = 1; i <= 999; i++) {
    if (!used[i]) return formatUid(i);
  }
  throw new Error("No unused uid left in #001–#999");
}

function reassignOrders(nodes, prefix) {
  (nodes || []).forEach(function (node, i) {
    node.order = prefix ? prefix + "." + (i + 1) : String(i + 1);
    if (node.id != null) delete node.id;
    reassignOrders(node.children || [], node.order);
  });
}

function shapedEvent(node) {
  return {
    order: node.order,
    uid: node.uid,
    title: node.title,
    time: node.time,
    summary: node.summary,
    scriptures: node.scriptures || [],
    children: (node.children || []).map(shapedEvent)
  };
}

var uidMap = {};
walk(eventsDoc.events, function (node) {
  if (node.order == null && node.id != null) node.order = String(node.id);
});

if (mintUids) {
  var n = 0;
  walk(eventsDoc.events, function (node) {
    n += 1;
    var next = formatUid(n);
    if (node.uid) uidMap[String(node.uid)] = next;
    node.uid = next;
  });
} else {
  walk(eventsDoc.events, function (node) {
    if (!node.uid) node.uid = nextUid();
  });
}

reassignOrders(eventsDoc.events, "");
eventsDoc.howToEdit = "This file is the outline, in Google Doc BODY order (ignore the table of contents at the top of that doc). Reorder objects in events[] (and nested children[]) to rearrange the chart. Keep each event's uid (#001–#999); order is rewritten when items move, but uid stays put so scriptures.json eventUid still points at the same event. After adding or changing scripture citations, run `node scripts/link-scripture-events.js` to refresh those links. Put scripture references on an event as strings; verse text is looked up from scriptures.json and is never stored here. time is the label drawn at the start of a 1st-order epoch. Leave children as [] when a heading has no nested events.";
eventsDoc.events = eventsDoc.events.map(shapedEvent);

var firstUid = {};
var citing = {};
walk(eventsDoc.events, function (node) {
  (node.scriptures || []).forEach(function (reference) {
    if (!firstUid[reference]) firstUid[reference] = node.uid;
    if (!citing[reference]) citing[reference] = {};
    citing[reference][node.uid] = true;
  });
});

function remapUid(uid) {
  if (!uid) return uid;
  return uidMap[String(uid)] || uid;
}

if (configDoc.millenniumBanner && configDoc.millenniumBanner.beforeUid) {
  configDoc.millenniumBanner.beforeUid = remapUid(configDoc.millenniumBanner.beforeUid);
}

var passages = scripturesDoc.passages || {};
var mapped = 0;
var stubs = 0;
Object.keys(passages).forEach(function (reference) {
  var entry = passages[reference];
  if (!entry || Array.isArray(entry)) return;
  var current = remapUid(entry.eventUid);
  var nextUidValue = firstUid[reference] || "";
  if (current && citing[reference] && citing[reference][current]) nextUidValue = current;
  var next = { book: entry.book };
  if (nextUidValue) {
    next.eventUid = nextUidValue;
    mapped += 1;
  }
  next.verses = entry.verses || [];
  passages[reference] = next;
});

Object.keys(firstUid).forEach(function (reference) {
  if (passages[reference]) return;
  passages[reference] = {
    book: bookOf(reference),
    eventUid: firstUid[reference],
    verses: []
  };
  stubs += 1;
});

scripturesDoc.howToEdit = "Verse text for the timeline chart. The outline (prophetic-events.json) only stores reference strings. eventUid is the outline event the scripture reader scrolls to; after adding or changing citations run `node scripts/link-scripture-events.js`. It stays valid when left-column items are rearranged because uids do not change. Bible verses are King James (public domain). Restoration verses are filled from lds-scriptures/json for cited passages only.";
scripturesDoc.passages = passages;

fs.writeFileSync(eventsPath, JSON.stringify(eventsDoc, null, 2) + "\n");
fs.writeFileSync(scripturesPath, JSON.stringify(scripturesDoc, null, 2) + "\n");
fs.writeFileSync(configPath, JSON.stringify(configDoc, null, 2) + "\n");

var eventCount = 0;
walk(eventsDoc.events, function () { eventCount += 1; });
console.log("events:", eventCount);
console.log("uids " + (mintUids ? "reminted" : "kept") + "; order rewritten");
console.log("scripture refs with eventUid:", mapped);
console.log("new passage stubs:", stubs);
if (configDoc.millenniumBanner) {
  console.log("millenniumBanner.beforeUid:", configDoc.millenniumBanner.beforeUid);
}
