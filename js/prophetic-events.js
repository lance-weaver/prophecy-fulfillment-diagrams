(function () {
  var app = document.getElementById("app");
  var eventsUrl = app.getAttribute("data-events") || "data/prophetic-events.json";
  var scripturesUrl = app.getAttribute("data-scriptures") || "data/scriptures.json";
  var configUrl = app.getAttribute("data-config") || "data/prophetic-events.config.json";

  var report = ConnectionChart.watchHeight({
    source: "prophecy-charts",
    type: "resize",
    getId: function () { return "prophetic-events"; }
  });

  function fail(message) {
    app.replaceChildren();
    var p = document.createElement("p");
    p.className = "pfd-error";
    p.textContent = message || "The timeline could not be loaded.";
    app.appendChild(p);
    report();
  }

  Promise.all([
    fetch(new URL(eventsUrl, document.baseURI)).then(function (res) {
      if (!res.ok) throw new Error("events");
      return res.json();
    }),
    fetch(new URL(scripturesUrl, document.baseURI)).then(function (res) {
      if (!res.ok) throw new Error("scriptures");
      return res.json();
    }),
    fetch(new URL(configUrl, document.baseURI)).then(function (res) {
      if (!res.ok) throw new Error("config");
      return res.json();
    })
  ]).then(function (triple) {
    var events = triple[0];
    var scriptures = triple[1];
    var config = triple[2];
    if (config.title) document.title = config.title;
    var api = TimelineChart.render(app, events, scriptures, config);
    api.onChange(report);
    report();
  }).catch(function () {
    fail("The timeline could not be loaded.");
  });
})();
