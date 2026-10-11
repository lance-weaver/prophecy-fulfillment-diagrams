# Prophecy fulfillment diagrams

An interactive, two-column connection chart for embedding in a WordPress post. The first diagram is **Prophecies of the Messiah**: Old Testament books on the left, New Testament books on the right, and a curve for every prophecy that links them.

Hover a curve (desktop) to read the summary and the King James text. Click or tap to keep the full passage open below the chart. The page reports its height to the parent window, so an iframe on [gatheredin.one](https://gatheredin.one) can grow with the reading instead of scrolling inside the frame.

The chart module itself is generic. A new diagram is a data file plus a config file. Words such as “prophecy” and “Messiah” live in those files, not in the drawing code.

## Pages URL

After GitHub Pages is enabled (see below) and this repo’s default branch has been deployed:

**https://lance-weaver.github.io/prophecy-fulfillment-diagrams/**

A parent-page demo that iframes the chart and shows the resize message:

**https://lance-weaver.github.io/prophecy-fulfillment-diagrams/examples/embed-test.html**

## Embed in WordPress

Add a Custom HTML block with an iframe and the small resize script. The placeholder height is replaced as soon as the chart loads.

```html
<iframe
  id="prophecies-of-the-messiah"
  data-pfd-id="messianic-prophecies"
  title="Prophecies of the Messiah"
  src="https://lance-weaver.github.io/prophecy-fulfillment-diagrams/"
  scrolling="no"
  style="width:100%;border:0;overflow:hidden;height:720px;background:#fff;display:block;"
></iframe>
<script
  src="https://lance-weaver.github.io/prophecy-fulfillment-diagrams/embed.js"
  data-origin="https://lance-weaver.github.io"
></script>
```

`embed.js` listens for `{ type: "pfd:resize", height, id }`, checks that the message came from that iframe, and sets the iframe’s height. `data-origin` is optional. Set it to the chart’s origin so messages from other sites are ignored. `data-pfd-id` on the iframe should match the `id` in the chart config (`messianic-prophecies`).

The chart page does not send `X-Frame-Options` or a frame-blocking Content-Security-Policy. The iframe should not show its own scrollbar: the frame is `scrolling="no"` and its height follows the content.

If the WordPress host strips `<script>` tags, use a block or plugin that allows them for administrators, or use the iframe-resizer option below.

### iframe-resizer (alternative)

The chart page already includes [iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) 4.3.11 (`vendor/iframeResizer.contentWindow.min.js`). On the WordPress side, load the parent script and call it instead of (or in addition to) `embed.js`:

```html
<iframe
  id="prophecies-of-the-messiah"
  title="Prophecies of the Messiah"
  src="https://lance-weaver.github.io/prophecy-fulfillment-diagrams/"
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

- One curve is drawn for each source book paired with each target book on the same item.
- A target with `"plot": false` is still shown in the detail view and does not get a curve. The Judgment Day entry does this: Psalm 110 is cited to Daniel, which is not a New Testament book.
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

Every row on that chart parsed. One row does not become a curve:

| Entry | Summary | Why there is no curve |
| --- | --- | --- |
| 69 | The Messiah will return to preside over Judgment Day | The chart cites Daniel 7:13–14 and Daniel 12:1–2 as a future fulfillment, not a New Testament book. Select **Psalms** to read the summary, the note, and the King James text. |

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
