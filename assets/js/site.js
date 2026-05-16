(function () {
  function initRandomHeaderImages() {
    var dataEl = document.getElementById("site-header-images");
    if (!dataEl) return;

    var urls;
    try {
      urls = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }
    if (!urls.length) return;

    var headerUrls = urls.filter(function (url) {
      return url.indexOf("/assets/headers/") !== -1;
    });
    if (!headerUrls.length) return;

    document.querySelectorAll("[data-random-header]").forEach(function (wrap) {
      var img = wrap.querySelector("img");
      if (!img) return;
      var next = headerUrls[Math.floor(Math.random() * headerUrls.length)];
      if (next.indexOf("/assets/headers/") === -1) return;
      img.src = next;
    });
  }

  initRandomHeaderImages();

  var header = document.querySelector(".site-header");
  var toggle = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && header && nav) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

})();
