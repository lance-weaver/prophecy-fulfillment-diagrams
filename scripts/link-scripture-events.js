/**
 * Assigns a stable uid to every outline event and stamps scriptures.json
 * passages with eventUid = the first event (outline order) that cites them.
 *
 * Usage: node scripts/link-scripture-events.js
 */
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var eventsPath = path.join(root, "data", "prophetic-events.json");
var scripturesPath = path.join(root, "data", "scriptures.json");

var eventsDoc = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
var scripturesDoc = JSON.parse(fs.readFileSync(scripturesPath, "utf8"));

function walk(nodes, fn) {
  (nodes || []).forEach(function (node) {
    fn(node);
    if (node.children && node.children.length) walk(node.children, fn);
  });
}

walk(eventsDoc.events, function (node) {
  if (!node.uid) node.uid = "e-" + String(node.id || "").replace(/\./g, "-");
});

function withUidBesideId(node) {
  return {
    id: node.id,
    uid: node.uid,
    title: node.title,
    time: node.time,
    summary: node.summary,
    scriptures: node.scriptures || [],
    children: (node.children || []).map(withUidBesideId)
  };
}
eventsDoc.events = eventsDoc.events.map(withUidBesideId);

var firstUid = {};
walk(eventsDoc.events, function (node) {
  (node.scriptures || []).forEach(function (reference) {
    if (!firstUid[reference]) firstUid[reference] = node.uid;
  });
});

var passages = scripturesDoc.passages || {};
Object.keys(passages).forEach(function (reference) {
  var entry = passages[reference];
  if (!entry || Array.isArray(entry)) return;
  var next = { book: entry.book };
  if (firstUid[reference]) next.eventUid = firstUid[reference];
  next.verses = entry.verses || [];
  passages[reference] = next;
});

fs.writeFileSync(eventsPath, JSON.stringify(eventsDoc, null, 2) + "\n");
fs.writeFileSync(scripturesPath, JSON.stringify(scripturesDoc, null, 2) + "\n");

var eventCount = 0;
walk(eventsDoc.events, function () { eventCount += 1; });
var mapped = Object.keys(firstUid).length;
console.log("events with uid:", eventCount);
console.log("scripture refs mapped:", mapped);
