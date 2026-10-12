/**
 * Parent-page helper for the connection chart.
 *
 * Paste this script after the iframe. It listens for
 * { source: "prophecy-charts", type: "resize", height, id } and sets the
 * matching iframe's height so the embedded chart does not scroll inside
 * the frame. The older { type: "pfd:resize" } payload is still accepted.
 *
 * Optional: <script src="embed.js" data-origin="https://utahgeology.com"></script>
 * When data-origin is set, messages from other origins are ignored.
 */
(function () {
  var script = document.currentScript;
  var expectedOrigin = script && script.getAttribute("data-origin");

  function isResize(data) {
    if (!data || typeof data !== "object") return false;
    if (data.source === "prophecy-charts" && data.type === "resize") return true;
    return data.type === "pfd:resize";
  }

  function apply(event) {
    var data = event.data;
    if (!isResize(data)) return;
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
