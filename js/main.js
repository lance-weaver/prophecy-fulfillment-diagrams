(function () {
  var params = new URLSearchParams(location.search);
  var app = document.getElementById("app");
  var dataUrl = params.get("data") || app.getAttribute("data-data") || "data/chart.json";
  var configUrl = params.get("config") || app.getAttribute("data-config") || "data/chart.config.json";
  var chartId = params.get("id") || "";

  var report = ConnectionChart.watchHeight({
    source: "prophecy-charts",
    type: "resize",
    getId: function () { return chartId; }
  });

  function fail(message) {
    app.replaceChildren();
    var p = document.createElement("p");
    p.className = "pfd-error";
    p.textContent = message || "The chart could not be loaded.";
    app.appendChild(p);
    report();
  }

  Promise.all([
    fetch(new URL(dataUrl, document.baseURI)).then(function (res) {
      if (!res.ok) throw new Error("data");
      return res.json();
    }),
    fetch(new URL(configUrl, document.baseURI)).then(function (res) {
      if (!res.ok) throw new Error("config");
      return res.json();
    })
  ]).then(function (pair) {
    var data = pair[0];
    var config = pair[1];
    if (params.get("id")) config.id = params.get("id");
    chartId = config.id || chartId;
    if (config.title) document.title = config.title;
    var api = ConnectionChart.render(app, data, config);
    api.onChange(report);
    var initial = params.get("item");
    if (initial) api.selectItem(initial);
    report();
  }).catch(function () {
    fail("The chart could not be loaded.");
  });
})();
