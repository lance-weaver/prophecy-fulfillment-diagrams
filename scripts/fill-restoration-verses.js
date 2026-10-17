/**
 * Fill empty Restoration passages in data/scriptures.json from lds-scriptures/json.
 * Usage: node scripts/fill-restoration-verses.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const scripturesPath = path.join(root, "data", "scriptures.json");
const ldsPath = path.join(root, "lds-scriptures", "json", "lds-scriptures-json.txt");

const BOOK_MAP = {
  "1 Nephi": "1 Nephi",
  "2 Nephi": "2 Nephi",
  Jacob: "Jacob",
  Mosiah: "Mosiah",
  Alma: "Alma",
  Helaman: "Helaman",
  "3 Nephi": "3 Nephi",
  "4 Nephi": "4 Nephi",
  Mormon: "Mormon",
  Ether: "Ether",
  Moroni: "Moroni",
  "Doctrine and Covenants": "Doctrine and Covenants",
  "JS-Matthew": "Joseph Smith--Matthew",
  "JS-History": "Joseph Smith--History"
};

function verseKey(book, chapter, verse) {
  return book + "|" + chapter + "|" + verse;
}

function parseSpecs(rest) {
  rest = String(rest || "").trim();
  if (!rest) return { kind: "empty" };
  if (rest.indexOf(":") >= 0) {
    var parts = rest.split(":");
    var chapter = parseInt(parts[0], 10);
    var specs = parts.slice(1).join(":").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    return { kind: "verses", chapter: chapter, specs: specs };
  }
  if (rest.indexOf("-") >= 0) {
    var range = rest.split("-").map(function (s) { return parseInt(s.trim(), 10); });
    return { kind: "chapters", start: range[0], end: range[1] };
  }
  return { kind: "chapter", chapter: parseInt(rest, 10) };
}

function expandSpec(spec) {
  var m = spec.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    var a = parseInt(m[1], 10);
    var b = parseInt(m[2], 10);
    var out = [];
    for (var n = a; n <= b; n++) out.push(n);
    return out;
  }
  var one = parseInt(spec, 10);
  return isNaN(one) ? [] : [one];
}

function lookup(index, sourceBook, chapter, verse) {
  return index.get(verseKey(sourceBook, chapter, verse)) || null;
}

function chapterVerses(byChapter, sourceBook, chapter) {
  var list = byChapter.get(sourceBook + "|" + chapter) || [];
  return list.slice().sort(function (a, b) { return a.verse_number - b.verse_number; });
}

function fillReference(index, byChapter, book, reference) {
  var sourceBook = BOOK_MAP[book];
  if (!sourceBook) return { verses: [], reason: "no-source-book" };
  var rest = String(reference).slice(book.length).trim();
  var parsed = parseSpecs(rest);
  var verses = [];
  var missing = [];

  function add(chapter, verse, multi) {
    var row = lookup(index, sourceBook, chapter, verse);
    if (!row) {
      missing.push(chapter + ":" + verse);
      return;
    }
    verses.push({
      n: multi ? String(chapter) + ":" + String(verse) : String(verse),
      text: row.scripture_text
    });
  }

  if (parsed.kind === "verses") {
    parsed.specs.forEach(function (spec) {
      expandSpec(spec).forEach(function (verse) {
        add(parsed.chapter, verse, false);
      });
    });
  } else if (parsed.kind === "chapter") {
    chapterVerses(byChapter, sourceBook, parsed.chapter).forEach(function (row) {
      add(row.chapter_number, row.verse_number, false);
    });
    if (!verses.length) missing.push(String(parsed.chapter));
  } else if (parsed.kind === "chapters") {
    for (var ch = parsed.start; ch <= parsed.end; ch++) {
      var rows = chapterVerses(byChapter, sourceBook, ch);
      if (!rows.length) missing.push(String(ch));
      rows.forEach(function (row) {
        add(row.chapter_number, row.verse_number, true);
      });
    }
  } else {
    return { verses: [], reason: "empty-ref" };
  }
  return { verses: verses, missing: missing };
}

var scriptures = JSON.parse(fs.readFileSync(scripturesPath, "utf8"));
var lds = JSON.parse(fs.readFileSync(ldsPath, "utf8"));
var index = new Map();
var byChapter = new Map();
lds.forEach(function (row) {
  index.set(verseKey(row.book_title, row.chapter_number, row.verse_number), row);
  var ck = row.book_title + "|" + row.chapter_number;
  if (!byChapter.has(ck)) byChapter.set(ck, []);
  byChapter.get(ck).push(row);
});

var filled = 0;
var skipped = [];
var incomplete = [];
Object.keys(scriptures.passages).forEach(function (reference) {
  var entry = scriptures.passages[reference];
  if (entry.verses && entry.verses.length) return;
  var result = fillReference(index, byChapter, entry.book, reference);
  if (result.verses && result.verses.length) {
    entry.verses = result.verses;
    filled++;
    if (result.missing && result.missing.length) {
      incomplete.push(reference + " missing " + result.missing.join(", "));
    }
  } else {
    skipped.push(reference + " (" + (result.reason || "not-found") + ")");
  }
});

scriptures.howToEdit = "Verse text for the timeline chart. The outline (prophetic-events.json) only stores reference strings. Bible verses are King James (public domain). Restoration verses are filled from lds-scriptures/json for cited passages only.";
scriptures.translation = "King James Version; Restoration text from lds-scriptures";

fs.writeFileSync(scripturesPath, JSON.stringify(scriptures, null, 2) + "\n");
console.log("filled", filled);
console.log("skipped", skipped.length ? skipped.join("\n") : "none");
if (incomplete.length) console.log("incomplete\n" + incomplete.join("\n"));
