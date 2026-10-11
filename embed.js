/**
 * Parent-page helper for the connection chart.
 *
 * Paste this script after the iframe. It listens for
 * { type: 'pfd:resize', height, id } and sets the matching iframe's height
 * so the embedded chart does not scroll inside the frame.
 *
 * Optional: <script src="embed.js" data-origin="https://lance-weaver.github.io"></script>
 * When data-origin is set, messages from other origins are ignored.
 */
(function () {
  var script = document.currentScript;
  var expectedOrigin = script && script.getAttribute("data-origin");

  function apply(event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "pfd:resize") return;
    if (typeof data.height !== "number" || !isFinite(data.height) || data.height < 1) return;
    if (expectedOrigin && event.origin !== expectedOrigin) return;

    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      if (frame.contentWindow !== event.source) continue;
      var wanted = frame.getAttribute("data-pfd-id");
      if (wanted && data.id && wanted !== data.id) continue;
      frame.style.height = Math.ceil(data.height) + "px";
      frame.style.overflow = "hidden";
      frame.setAttribute("scrolling", "no");
      frame.setAttribute("data-pfd-height", String(Math.ceil(data.height)));
    }
  }

  window.addEventListener("message", apply);
})();
