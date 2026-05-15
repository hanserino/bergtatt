(function () {
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

  var dock = document.getElementById("audio-dock");
  var mainPlayer = document.querySelector(".episode-player");
  if (dock && mainPlayer) {
    var dockAudio = dock.querySelector("audio");
    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries[0] && entries[0].isIntersecting;
        dock.hidden = visible;
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0 }
    );
    observer.observe(mainPlayer);
    if (dockAudio) {
      dockAudio.addEventListener("play", function () {
        mainPlayer.pause();
      });
      mainPlayer.addEventListener("play", function () {
        dockAudio.pause();
      });
    }
  }

  var gallery = document.querySelector(".gallery__track");
  if (gallery && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gallery.style.animation = "none";
  }
})();
