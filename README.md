# Prophecy fulfillment diagrams

An interactive, two-column connection chart for embedding in a WordPress post. The first diagram is **Prophecies of the Messiah**: Old Testament books on the left, New Testament books on the right, and a curve for every prophecy that links them.

Each axis lists every scripture passage, not just the book. Hover a reference to read the King James text in a popup. Click it to open that passage on [lds.org](https://www.lds.org/scriptures). Hover a curve to see the prophecy that connects the two passages, and click the curve to keep that entry open below the chart. The page posts its document height to the parent window as `{ source: "prophecy-charts", type: "resize", height }`, so a cross-origin iframe on [gatheredin.one](https://gatheredin.one) (or www.gatheredin.one) can grow with the chart instead of scrolling inside the frame.

The chart module itself is generic. A new diagram is a data file plus a config file. Words such as “prophecy” and “Messiah” live in those files, not in the drawing code.

## Pages URL

After GitHub Pages is enabled (see below) and this repo’s default branch has been deployed:

**https://lance-weaver.github.io/prophecy-fulfillment-diagrams/**

A parent-page demo that iframes the chart and shows the resize message:

**https://lance-weaver.github.io/prophecy-fulfillment-diagrams/examples/embed-test.html**

## Embed in WordPress

Live chart: **https://utahgeology.com/bin/prophecy_charts/**

Add a Custom HTML block on [gatheredin.one](https://gatheredin.one). The placeholder height is replaced as soon as the chart reports its document height. The listener accepts messages only from `https://utahgeology.com` and asks the child for a height on load.

```html
<iframe
  id="prophecy-charts"
  title="Prophecies of the Messiah"
  src="https://utahgeology.com/bin/prophecy_charts/"
  scrolling="no"
  style="width:100%;border:0;overflow:hidden;height:720px;background:#fff;display:block;"
></iframe>
<script>
(function () {
  var frame = document.getElementById("prophecy-charts");
  var allowedOrigin = "https://utahgeology.com";

  window.addEventListener("message", function (event) {
    if (event.origin !== allowedOrigin) return;
    var data = event.data;
    if (!data || data.source !== "prophecy-charts" || data.type !== "resize") return;
    if (typeof data.height !== "number" || !isFinite(data.height) || data.height < 1) return;
    if (event.source !== frame.contentWindow) return;
    frame.style.height = Math.ceil(data.height) + "px";
  });

  frame.addEventListener("load", function () {
    frame.contentWindow.postMessage(
      { source: "prophecy-charts", type: "request-height" },
      allowedOrigin
    );
  });
})();
</script>
```

The child page posts `{ source: "prophecy-charts", type: "resize", height }` with `parent.postMessage(..., "*")` so both `gatheredin.one` and `www.gatheredin.one` receive it. The parent must check `event.origin` as shown above.

`embed.js` is an optional helper if you prefer not to inline the listener. It accepts the same payload (and the older `{ type: "pfd:resize" }` shape). Set `data-origin` to `https://utahgeology.com`. `data-pfd-id` on the iframe should match the `id` in the chart config (`messianic-prophecies`) when you use that helper.

The chart page does not send `X-Frame-Options` or a frame-blocking Content-Security-Policy. The iframe should not show its own scrollbar: the frame is `scrolling="no"` and its height follows the content.

If the WordPress host strips `<script>` tags, use a block or plugin that allows them for administrators, or use the iframe-resizer option below.

### iframe-resizer (alternative)

The chart page already includes [iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) 4.3.11 (`vendor/iframeResizer.contentWindow.min.js`). On the WordPress side, load the parent script and call it instead of (or in addition to) `embed.js`:

```html
<iframe
  id="prophecies-of-the-messiah"
  title="Prophecies of the Messiah"
  src="https://utahgeology.com/bin/prophecy_charts/"
  style="width:100%;border:0;background:#fff;"
></iframe>
<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.11/js/iframeResizer.min.js"></script>
<script>
  iFrameResize({ log: false, checkOrigin: false, scrolling: false }, "#prophecies-of-the-messiah");
</script>
```

## Swap in another diagram

1. Add a data JSON file and a config JSON file (copy the messianic pair and edit them).
2. Point the page at them with query parameters:

```
https://lance-weaver.github.io/prophecy-fulfillment-diagrams/?data=data/your-data.json&config=data/your-config.json
```

Use that URL as the iframe `src`. Give the config its own `id`, and set the iframe’s `data-pfd-id` to the same value.

`?item=14` opens that entry when the page loads.

### Data file

`data/messianic-prophecies.json` is the shape the chart reads:

```json
{
  "credit": { "translation": "King James Version", "url": "https://example.com/source" },
  "books": { "source": ["Genesis"], "target": ["Matthew"] },
  "passages": {
    "Genesis 3:15": [{ "n": 15, "text": "And I will put enmity…" }]
  },
  "items": [
    {
      "id": "1",
      "summary": "Short description shown on hover and in the panel.",
      "note": "Optional note from the source chart.",
      "infoUrl": "https://example.com/more",
      "sources": [{ "book": "Genesis", "reference": "Genesis 3:15" }],
      "targets": [{ "book": "Matthew", "reference": "Matthew 1:18" }]
    }
  ]
}
```

- One curve is drawn for each source passage paired with each fulfillment passage on the same item. The axis label is the full reference (`Isaiah 53:4-9`), grouped under its book.
- Each reference can include a `url`. On this chart that URL is the passage on lds.org. Hovering the label shows the verse text; clicking it opens `url` in a new tab.
- A target with `"plot": false` is still a fulfillment citation. This chart draws it: Psalm 110’s future-fulfillment entry cites Daniel 7:13–14 and Daniel 12:1–2, which appear at the bottom of the fulfillment column.
- Verse text can live in `passages` (shared) or inline on a reference as `"verses": [{ "n": 1, "text": "…" }]`.
- Book order in `books.source` / `books.target` is the fallback when the config does not set `bookOrder`.

### Config file

`data/messianic-prophecies.config.json` holds the title, subtitle, column headings, colors, legend, callouts, footnote, and credit line. `colorBy` is `"target"` (color each curve by the right-hand book) or `"source"`. `callouts` are the short labels drawn on wide screens and shown as buttons on narrow ones:

```json
{ "itemId": "14", "label": "Born in Bethlehem", "citation": "Micah 5:2" }
```

`shortLabels` supplies compact book names when the column is too narrow for the full name.

## What’s in the messianic dataset

The 70 entries come from Ray Konig’s [Chart of Old Testament prophecies fulfilled by Jesus](https://www.about-jesus.org/complete-chart-prophecies-jesus.htm) (retrieved 11 October 2026). The page gives a summary and references, not the verse text. The King James Version text (public domain) was copied into the data file when it was built. It is not requested from a Bible API when someone views the chart.

Regenerate it from the repo root (this downloads the chart and a public-domain KJV JSON):

```bash
python3 scripts/build_dataset.py
```

Every row on that chart parsed. Entry 69, “The Messiah will return to preside over Judgment Day,” cites Daniel 7:13–14 and Daniel 12:1–2 rather than a New Testament book. Those Daniel passages are still drawn, at the bottom of the fulfillment column, and each one opens on lds.org.

## Local development

No build step is required to view the site. From the repo root:

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/ and http://127.0.0.1:8765/examples/embed-test.html . Fetching the JSON files needs HTTP; opening `index.html` as a `file://` URL will not load the data.

The drawing code is `js/connection-chart.js` (D3 7.9.0, vendored in `vendor/d3.min.js`). `js/main.js` only loads the data and config URLs and starts height reporting.

## GitHub Pages

The workflow `.github/workflows/pages.yml` deploys the repository root on every push to `main`.

One setting has to be turned on in the GitHub repo (it cannot be switched on from the workflow file alone):

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

The first deploy runs when `main` contains the workflow and Pages has been enabled. Until then, https://lance-weaver.github.io/prophecy-fulfillment-diagrams/ will 404.

## Credits and licenses

- Prophecy summaries and pairings: Ray Konig, [about-jesus.org](https://www.about-jesus.org/complete-chart-prophecies-jesus.htm).
- Scripture text: King James Version, public domain. The build script reads the structured text at [thiagobodruk/bible](https://github.com/thiagobodruk/bible) `json/en_kjv.json` (MIT packaging of the public-domain KJV).
- [D3](https://d3js.org/) 7.9.0, © Mike Bostock, ISC license, in `vendor/d3.min.js`.
- [iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) 4.3.11, MIT, in `vendor/iframeResizer.contentWindow.min.js`.
