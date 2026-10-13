#!/usr/bin/env python3
"""Build data/messianic-prophecies.json from the about-jesus.org chart.

The source page lists a short summary and scripture references. It does not
include the verse text. This script attaches the public-domain King James
Version, downloaded once at build time from the structured KJV JSON at
https://github.com/thiagobodruk/bible (file json/en_kjv.json). The packaged
text is the classic King James Version; book names in that file are
Portuguese labels and are ignored in favor of canonical order.

Do not run this script: data/messianic-prophecies.json is hand-edited
(dropped rows, __underline__ markup, shortened verses). Regenerating
overwrites those edits. If you are sure, pass --force:

    python3 scripts/build_dataset.py --force

The chart page itself is not fetched automatically. Pass --html if you have a
fresh copy, or the script will download it.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "messianic-prophecies.json"
HTML_URL = "https://www.about-jesus.org/complete-chart-prophecies-jesus.htm"
KJV_URL = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json"
SOURCE_URL = HTML_URL

# Canonical 66-book order. Index matches en_kjv.json.
CANON = [
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
]
OT_COUNT = 39
CANON_INDEX = {name: i for i, name in enumerate(CANON)}

# Longest aliases first so "1 Corinthians" wins over a shorter fragment.
ALIASES = [
    ("song of solomon", "Song of Solomon"),
    ("song of songs", "Song of Solomon"),
    ("1 corinthians", "1 Corinthians"),
    ("2 corinthians", "2 Corinthians"),
    ("1 thessalonians", "1 Thessalonians"),
    ("2 thessalonians", "2 Thessalonians"),
    ("1 timothy", "1 Timothy"),
    ("2 timothy", "2 Timothy"),
    ("1 samuel", "1 Samuel"),
    ("2 samuel", "2 Samuel"),
    ("1 kings", "1 Kings"),
    ("2 kings", "2 Kings"),
    ("1 chronicles", "1 Chronicles"),
    ("2 chronicles", "2 Chronicles"),
    ("1 peter", "1 Peter"),
    ("2 peter", "2 Peter"),
    ("1 john", "1 John"),
    ("2 john", "2 John"),
    ("3 john", "3 John"),
    ("psalms", "Psalms"),
    ("psalm", "Psalms"),
    ("revelation", "Revelation"),
    ("deuteronomy", "Deuteronomy"),
    ("ecclesiastes", "Ecclesiastes"),
    ("lamentations", "Lamentations"),
    ("philippians", "Philippians"),
    ("colossians", "Colossians"),
    ("thessalonians", "1 Thessalonians"),
    ("corinthians", "1 Corinthians"),
    ("chronicles", "1 Chronicles"),
    ("zechariah", "Zechariah"),
    ("genesis", "Genesis"),
    ("exodus", "Exodus"),
    ("leviticus", "Leviticus"),
    ("numbers", "Numbers"),
    ("joshua", "Joshua"),
    ("judges", "Judges"),
    ("ruth", "Ruth"),
    ("samuel", "1 Samuel"),
    ("kings", "1 Kings"),
    ("ezra", "Ezra"),
    ("nehemiah", "Nehemiah"),
    ("esther", "Esther"),
    ("job", "Job"),
    ("proverbs", "Proverbs"),
    ("isaiah", "Isaiah"),
    ("jeremiah", "Jeremiah"),
    ("ezekiel", "Ezekiel"),
    ("daniel", "Daniel"),
    ("hosea", "Hosea"),
    ("joel", "Joel"),
    ("amos", "Amos"),
    ("obadiah", "Obadiah"),
    ("jonah", "Jonah"),
    ("micah", "Micah"),
    ("nahum", "Nahum"),
    ("habakkuk", "Habakkuk"),
    ("zephaniah", "Zephaniah"),
    ("haggai", "Haggai"),
    ("malachi", "Malachi"),
    ("matthew", "Matthew"),
    ("mark", "Mark"),
    ("luke", "Luke"),
    ("john", "John"),
    ("acts", "Acts"),
    ("romans", "Romans"),
    ("galatians", "Galatians"),
    ("ephesians", "Ephesians"),
    ("titus", "Titus"),
    ("philemon", "Philemon"),
    ("hebrews", "Hebrews"),
    ("james", "James"),
    ("jude", "Jude"),
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "prophecy-fulfillment-diagrams/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&rsquo;", "'")
        .replace("&ldquo;", '"')
        .replace("&rdquo;", '"')
        .replace("&mdash;", "—")
        .replace("&ndash;", "–")
    )
    return re.sub(r"\s+", " ", text).strip()


def parse_rows(html: str) -> list[dict]:
    parts = html.split('<div class="row">')[1:]
    rows = []
    for part in parts:
        cells = re.findall(r'<div class="cell">(.*?)</div>', part, flags=re.S)
        if len(cells) < 4:
            continue
        number, source_html, summary_html, target_html = cells[:4]
        summary = strip_tags(summary_html)
        info = re.search(r'href="(https://www\.aboutbibleprophecy\.com/[^"]+)"', summary_html)
        rows.append(
            {
                "id": strip_tags(number),
                "source_raw": strip_tags(source_html),
                "summary": summary,
                "target_raw": strip_tags(target_html),
                "infoUrl": info.group(1) if info else None,
            }
        )
    return rows


def split_note(raw: str) -> tuple[str, str | None]:
    """Split 'Luke 3:1-23. History: ...' into the citation and the note."""
    match = re.search(r"\.\s+(?=[A-Za-z])", raw)
    if not match:
        return raw.strip().rstrip("."), None
    return raw[: match.start()].strip().rstrip("."), raw[match.start() + 1 :].strip()


def match_book(fragment: str) -> tuple[str | None, str]:
    lowered = fragment.lower()
    for alias, canonical in ALIASES:
        if lowered.startswith(alias):
            rest = fragment[len(alias) :].strip()
            return canonical, rest
        # Allow a trailing period that already was stripped.
    return None, fragment


# lds.org scripture paths. They redirect to the Church scripture study pages.
SCRIPTURE_SLUGS = {
    "Genesis": ("ot", "gen"),
    "Exodus": ("ot", "ex"),
    "Leviticus": ("ot", "lev"),
    "Numbers": ("ot", "num"),
    "Deuteronomy": ("ot", "deut"),
    "Joshua": ("ot", "josh"),
    "Judges": ("ot", "judg"),
    "Ruth": ("ot", "ruth"),
    "1 Samuel": ("ot", "1-sam"),
    "2 Samuel": ("ot", "2-sam"),
    "1 Kings": ("ot", "1-kgs"),
    "2 Kings": ("ot", "2-kgs"),
    "1 Chronicles": ("ot", "1-chr"),
    "2 Chronicles": ("ot", "2-chr"),
    "Ezra": ("ot", "ezra"),
    "Nehemiah": ("ot", "neh"),
    "Esther": ("ot", "esth"),
    "Job": ("ot", "job"),
    "Psalms": ("ot", "ps"),
    "Proverbs": ("ot", "prov"),
    "Ecclesiastes": ("ot", "eccl"),
    "Song of Solomon": ("ot", "song"),
    "Isaiah": ("ot", "isa"),
    "Jeremiah": ("ot", "jer"),
    "Lamentations": ("ot", "lam"),
    "Ezekiel": ("ot", "ezek"),
    "Daniel": ("ot", "dan"),
    "Hosea": ("ot", "hosea"),
    "Joel": ("ot", "joel"),
    "Amos": ("ot", "amos"),
    "Obadiah": ("ot", "obad"),
    "Jonah": ("ot", "jonah"),
    "Micah": ("ot", "micah"),
    "Nahum": ("ot", "nahum"),
    "Habakkuk": ("ot", "hab"),
    "Zephaniah": ("ot", "zeph"),
    "Haggai": ("ot", "hag"),
    "Zechariah": ("ot", "zech"),
    "Malachi": ("ot", "mal"),
    "Matthew": ("nt", "matt"),
    "Mark": ("nt", "mark"),
    "Luke": ("nt", "luke"),
    "John": ("nt", "john"),
    "Acts": ("nt", "acts"),
    "Romans": ("nt", "rom"),
    "1 Corinthians": ("nt", "1-cor"),
    "2 Corinthians": ("nt", "2-cor"),
    "Galatians": ("nt", "gal"),
    "Ephesians": ("nt", "eph"),
    "Philippians": ("nt", "philip"),
    "Colossians": ("nt", "col"),
    "1 Thessalonians": ("nt", "1-thes"),
    "2 Thessalonians": ("nt", "2-thes"),
    "1 Timothy": ("nt", "1-tim"),
    "2 Timothy": ("nt", "2-tim"),
    "Titus": ("nt", "titus"),
    "Philemon": ("nt", "philem"),
    "Hebrews": ("nt", "heb"),
    "James": ("nt", "james"),
    "1 Peter": ("nt", "1-pet"),
    "2 Peter": ("nt", "2-pet"),
    "1 John": ("nt", "1-jn"),
    "2 John": ("nt", "2-jn"),
    "3 John": ("nt", "3-jn"),
    "Jude": ("nt", "jude"),
    "Revelation": ("nt", "rev"),
}


def scripture_url(book: str, chapter: int, start: int | None, end: int | None) -> str:
    collection, slug = SCRIPTURE_SLUGS[book]
    base = f"https://www.lds.org/scriptures/{collection}/{slug}/{chapter}"
    if start is None:
        return f"{base}?lang=eng"
    if end is None or end == start:
        return f"{base}.{start}?lang=eng"
    return f"{base}.{start}-{end}?lang=eng"


def citation_book(book: str) -> str:
    # English citations use "Psalm 23" even though the book name is Psalms.
    if book == "Psalms":
        return "Psalm"
    return book


def format_reference(book: str, chapter: int, start: int | None, end: int | None) -> str:
    label = citation_book(book)
    if start is None:
        return f"{label} {chapter}"
    if end is None or end == start:
        return f"{label} {chapter}:{start}"
    return f"{label} {chapter}:{start}-{end}"


def parse_references(raw: str) -> list[dict]:
    body, _note = split_note(raw)
    body = body.strip().rstrip(".")
    if not body:
        raise ValueError(f"empty reference string: {raw!r}")
    parts = [part.strip() for part in re.split(r"[,;]", body) if part.strip()]
    current_book = None
    current_chapter = None
    refs = []
    for part in parts:
        book, rest = match_book(part)
        if book:
            current_book = book
            part = rest.strip()
        if not current_book:
            raise ValueError(f"no book in {part!r} (from {raw!r})")
        if not part:
            raise ValueError(f"book without chapter in {raw!r}")
        ranged = re.fullmatch(r"(\d+):(\d+)(?:\s*[-–]\s*(\d+))?", part)
        if ranged:
            chapter = int(ranged.group(1))
            start = int(ranged.group(2))
            end = int(ranged.group(3) or ranged.group(2))
            current_chapter = chapter
            refs.append((current_book, chapter, start, end))
            continue
        verse_span = re.fullmatch(r"(\d+)\s*[-–]\s*(\d+)", part)
        if verse_span:
            if current_chapter is None:
                raise ValueError(f"verse span without a chapter in {raw!r}: {part}")
            refs.append(
                (current_book, current_chapter, int(verse_span.group(1)), int(verse_span.group(2)))
            )
            continue
        chapter_only = re.fullmatch(r"(\d+)", part)
        if chapter_only:
            chapter = int(chapter_only.group(1))
            current_chapter = chapter
            refs.append((current_book, chapter, None, None))
            continue
        raise ValueError(f"could not parse {part!r} in {raw!r}")

    parsed = []
    for book, chapter, start, end in refs:
        parsed.append(
            {
                "book": book,
                "reference": format_reference(book, chapter, start, end),
                "chapter": chapter,
                "verseStart": start,
                "verseEnd": end if end is not None else start,
            }
        )
    return parsed


def load_kjv(path: Path | None) -> dict[str, list[list[str]]]:
    if path:
        payload = json.loads(path.read_text(encoding="utf-8"))
    else:
        payload = json.loads(fetch(KJV_URL).decode("utf-8"))
    if len(payload) != 66:
        raise SystemExit(f"expected 66 KJV books, found {len(payload)}")
    books = {}
    for index, name in enumerate(CANON):
        chapters = payload[index]["chapters"]
        books[name] = chapters
    # Sanity checks against well-known KJV wording.
    gen = books["Genesis"][0][0]
    if not gen.startswith("In the beginning God created the heaven"):
        raise SystemExit("KJV text does not look like the classic King James Version")
    pierced = books["Psalms"][21][15]
    if "pierced my hands and my feet" not in pierced:
        raise SystemExit("Psalm 22:16 is not the classic KJV reading")
    return books


def clean_verse(text: str) -> str:
    """Drop crawler artifacts: Hebrew-margin notes and a space before punctuation."""
    text = re.sub(r"\s*…:\s*Heb\..*$", "", text)
    text = re.sub(r"\s+([,;:.!?])", r"\1", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def verse_list(books, book: str, chapter: int, start: int | None, end: int | None) -> list[dict]:
    chapters = books[book]
    if chapter < 1 or chapter > len(chapters):
        raise ValueError(f"{book} has no chapter {chapter}")
    verses = chapters[chapter - 1]
    if start is None:
        start, end = 1, len(verses)
    if end is None:
        end = start
    if start < 1 or end > len(verses) or end < start:
        raise ValueError(
            f"{book} {chapter}:{start}-{end} is outside the chapter ({len(verses)} verses)"
        )
    return [{"n": number, "text": clean_verse(verses[number - 1])} for number in range(start, end + 1)]


def attach_verses(ref: dict, books, passages: dict) -> dict:
    key = ref["reference"]
    if key not in passages:
        passages[key] = verse_list(books, ref["book"], ref["chapter"], ref["verseStart"], ref["verseEnd"])
    out = {
        "book": ref["book"],
        "reference": key,
        "chapter": ref["chapter"],
        "verseStart": ref["verseStart"],
        "verseEnd": ref["verseEnd"],
        "url": scripture_url(ref["book"], ref["chapter"], ref["verseStart"], ref["verseEnd"]),
    }
    if CANON_INDEX[ref["book"]] >= OT_COUNT:
        out["testament"] = "NT"
    else:
        out["testament"] = "OT"
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, help="local copy of the source chart")
    parser.add_argument("--kjv", type=Path, help="local en_kjv.json")
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite data/messianic-prophecies.json (destroys hand edits)",
    )
    args = parser.parse_args()
    if not args.force:
        raise SystemExit(
            "Refusing to overwrite data/messianic-prophecies.json. "
            "That file is hand-edited (underlines, shortened verses, dropped rows). "
            "Pass --force only if you mean to replace it."
        )

    html = args.html.read_text(encoding="utf-8", errors="replace") if args.html else fetch(HTML_URL).decode("utf-8", "replace")
    rows = parse_rows(html)
    books = load_kjv(args.kjv)

    passages: dict[str, list[dict]] = {}
    items = []
    unparsed = []
    unplotted = []

    for row in rows:
        try:
            sources = parse_references(row["source_raw"])
            target_body, note = split_note(row["target_raw"])
            targets = parse_references(target_body)
        except ValueError as exc:
            unparsed.append({"id": row["id"], "reason": str(exc), "source": row["source_raw"], "target": row["target_raw"]})
            continue
        source_refs = []
        target_refs = []
        try:
            for ref in sources:
                source_refs.append(attach_verses(ref, books, passages))
            for ref in targets:
                attached = attach_verses(ref, books, passages)
                # The chart's two columns are Old Testament sources and New
                # Testament fulfillments. A fulfillment citation that is itself
                # an Old Testament passage is kept for the detail view and is
                # not drawn as a link.
                if attached["testament"] != "NT":
                    attached["plot"] = False
                target_refs.append(attached)
        except ValueError as exc:
            unparsed.append({"id": row["id"], "reason": str(exc), "source": row["source_raw"], "target": row["target_raw"]})
            continue

        item = {
            "id": row["id"],
            "summary": row["summary"],
            "note": note,
            "infoUrl": row["infoUrl"],
            "sources": source_refs,
            "targets": target_refs,
        }
        if any(ref.get("plot") is False for ref in target_refs):
            unplotted.append(
                {
                    "id": row["id"],
                    "summary": row["summary"],
                    "reason": "Fulfillment citation is not a New Testament book, so no curve is drawn. The passage still appears when its Old Testament book is selected.",
                    "targets": [ref["reference"] for ref in target_refs],
                }
            )
        items.append(item)

    def book_sort(names: set[str]) -> list[str]:
        return sorted(names, key=lambda name: CANON_INDEX[name])

    source_books = book_sort({ref["book"] for item in items for ref in item["sources"]})
    target_books = book_sort(
        {ref["book"] for item in items for ref in item["targets"] if ref.get("plot") is not False}
    )

    document = {
        "credit": {
            "title": "Chart of Old Testament prophecies fulfilled by Jesus",
            "author": "Ray Konig",
            "url": SOURCE_URL,
            "retrieved": "2026-10-11",
            "note": "Summaries and prophecy/fulfillment pairings are from Ray Konig's chart. The source page does not include verse text.",
            "translation": "King James Version",
            "translationNote": "Verse text is the classic King James Version (public domain), bundled when this file was built. It is not fetched at runtime.",
            "translationSource": KJV_URL,
        },
        "books": {"source": source_books, "target": target_books},
        "build": {
            "itemCount": len(items),
            "passageCount": len(passages),
            "unparsed": unparsed,
            "unplotted": unplotted,
        },
        "passages": passages,
        "items": items,
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"wrote {DATA_PATH} ({DATA_PATH.stat().st_size} bytes)")
    print(f"items {len(items)} passages {len(passages)}")
    print("source books:", ", ".join(source_books))
    print("target books:", ", ".join(target_books))
    print("unparsed:", json.dumps(unparsed, indent=2))
    print("unplotted:", json.dumps(unplotted, indent=2))
    if unparsed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
