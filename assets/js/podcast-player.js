(function () {
  "use strict";

  var STORAGE_PREFIX = "bergtatt:progress:";
  var SAVE_INTERVAL_MS = 5000;
  var RESUME_MIN_SEC = 15;
  var COMPLETE_RATIO = 0.95;
  var SPEEDS = [1, 1.25, 1.5, 1.75, 2];
  var SKIP_BACK = 15;
  var SKIP_FWD = 30;

  var master = document.querySelector("[data-podcast-player]:not([data-dock-for])");
  if (!master) return;

  var episodeId = master.getAttribute("data-episode-id");
  var audio = master.querySelector(".podcast-player__media");
  var dock = document.querySelector('[data-dock-for="' + master.id + '"]');
  if (!audio || !episodeId) return;

  var players = [master];
  if (dock) players.push(dock);

  var resumeBanner = master.querySelector("[data-resume-banner]");
  var resumeLabel = master.querySelector("[data-resume-label]");
  var pendingResume = null;
  var saveTimer = null;
  var seeking = false;
  var speedIndex = 0;
  var savedSpeed = parseFloat(localStorage.getItem("bergtatt:playbackRate"));
  if (SPEEDS.indexOf(savedSpeed) !== -1) {
    speedIndex = SPEEDS.indexOf(savedSpeed);
    audio.playbackRate = savedSpeed;
  }

  function storageKey() {
    return STORAGE_PREFIX + episodeId;
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveProgress(force) {
    if (!audio.duration || !isFinite(audio.duration)) return;
    var ratio = audio.currentTime / audio.duration;
    var completed = ratio >= COMPLETE_RATIO;
    var payload = {
      position: completed ? 0 : audio.currentTime,
      duration: audio.duration,
      completed: completed,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(storageKey(), JSON.stringify(payload));
    } catch (e) {
      /* quota */
    }
    if (force) scheduleSave.cancel && scheduleSave.cancel();
  }

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = window.setTimeout(function () {
      saveTimer = null;
      saveProgress(false);
    }, SAVE_INTERVAL_MS);
  }
  scheduleSave.cancel = function () {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  function parseDurationHint(str) {
    if (!str) return NaN;
    var parts = String(str).trim().split(":").map(Number);
    if (parts.some(isNaN)) return NaN;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return NaN;
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) {
      return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }
    return m + ":" + String(s).padStart(2, "0");
  }

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function eachPlayer(fn) {
    players.forEach(fn);
  }

  function updatePlayState() {
    var playing = !audio.paused && !audio.ended;
    eachPlayer(function (root) {
      root.classList.toggle("is-playing", playing);
      var btn = qs(root, "[data-action='toggle-play']");
      if (btn) btn.setAttribute("aria-label", playing ? "Pause" : "Spill av");
    });
    updateMediaSessionState();
  }

  function updateTimes() {
    var cur = audio.currentTime;
    var dur = audio.duration;
    var hint = parseDurationHint(master.getAttribute("data-duration-hint"));
    var durText = isFinite(dur) ? formatTime(dur) : isFinite(hint) ? formatTime(hint) : "--:--";

    eachPlayer(function (root) {
      var curEl = qs(root, "[data-time-current]");
      var durEl = qs(root, "[data-time-duration]");
      if (curEl) curEl.textContent = formatTime(cur);
      if (durEl) durEl.textContent = durText;
    });
  }

  function updateSeekUI() {
    var dur = audio.duration;
    var ratio = dur > 0 ? audio.currentTime / dur : 0;
    var bufferRatio = 0;
    if (audio.buffered.length && dur > 0) {
      bufferRatio = audio.buffered.end(audio.buffered.length - 1) / dur;
    }

    eachPlayer(function (root) {
      var input = qs(root, "[data-seek-input]");
      var played = qs(root, "[data-seek-played]");
      var buffer = qs(root, "[data-seek-buffer]");
      var val = Math.round(ratio * 1000);

      if (input) {
        input.value = String(val);
        if (isFinite(dur)) {
          input.setAttribute("aria-valuemax", String(Math.floor(dur)));
          input.setAttribute("aria-valuenow", String(Math.floor(audio.currentTime)));
        }
      }
      if (played) played.style.width = ratio * 100 + "%";
      if (buffer) buffer.style.width = Math.min(bufferRatio, 1) * 100 + "%";
    });
  }

  function updateSpeedLabel() {
    var label = SPEEDS[speedIndex] + "×";
    var btn = qs(master, "[data-action='speed']");
    if (btn) {
      btn.textContent = label;
      btn.setAttribute("aria-label", "Avspillingshastighet " + label);
    }
  }

  function applyResumeChoice(startFresh) {
    if (resumeBanner) resumeBanner.hidden = true;
    if (startFresh) {
      audio.currentTime = 0;
    } else if (pendingResume != null) {
      audio.currentTime = pendingResume;
    }
    pendingResume = null;
    updateTimes();
    updateSeekUI();
  }

  function maybeOfferResume() {
    var saved = loadProgress();
    if (!saved || saved.completed) return;
    var pos = saved.position;
    var dur = saved.duration || parseDurationHint(master.getAttribute("data-duration-hint"));
    if (!pos || pos < RESUME_MIN_SEC) return;
    if (dur && pos / dur >= COMPLETE_RATIO) return;

    pendingResume = pos;
    if (resumeLabel) resumeLabel.textContent = formatTime(pos);
    if (resumeBanner) resumeBanner.hidden = false;
  }

  function setupDockVisibility() {
    if (!dock) return;

    var dockTitle = qs(dock, "[data-dock-title]");
    var title = master.getAttribute("data-title");
    if (dockTitle && title) dockTitle.textContent = title;

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries[0] && entries[0].isIntersecting;
        dock.hidden = visible;
        document.body.classList.toggle("has-player-dock", !visible);
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 }
    );
    observer.observe(master);
  }

  function bindControls(root) {
    var playBtn = qs(root, "[data-action='toggle-play']");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (audio.paused) {
          if (pendingResume != null && resumeBanner && !resumeBanner.hidden) {
            applyResumeChoice(false);
          }
          audio.play().catch(function () {});
        } else {
          audio.pause();
        }
      });
    }

    var seekInput = qs(root, "[data-seek-input]");
    if (seekInput) {
      seekInput.addEventListener("pointerdown", function () {
        seeking = true;
      });
      seekInput.addEventListener("input", function () {
        var dur = audio.duration;
        if (!dur) return;
        audio.currentTime = (Number(seekInput.value) / 1000) * dur;
        updateTimes();
        updateSeekUI();
      });
      seekInput.addEventListener("change", function () {
        seeking = false;
        saveProgress(true);
      });
    }

    var rail = qs(root, "[data-seek-rail]");
    if (rail && seekInput) {
      rail.addEventListener("click", function (e) {
        var dur = audio.duration;
        if (!dur) return;
        var rect = rail.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * dur;
        saveProgress(true);
        updateTimes();
        updateSeekUI();
      });
    }
  }

  function bindMasterOnly() {
    master.querySelectorAll("[data-action='resume']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyResumeChoice(false);
        audio.play().catch(function () {});
      });
    });
    master.querySelectorAll("[data-action='restart']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyResumeChoice(true);
        audio.play().catch(function () {});
      });
    });

    master.querySelectorAll("[data-action='skip']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sec = Number(btn.getAttribute("data-skip"));
        var dur = audio.duration || Infinity;
        audio.currentTime = Math.max(0, Math.min(dur, audio.currentTime + sec));
        saveProgress(true);
        updateTimes();
        updateSeekUI();
      });
    });

    var speedBtn = qs(master, "[data-action='speed']");
    if (speedBtn) {
      speedBtn.addEventListener("click", function () {
        speedIndex = (speedIndex + 1) % SPEEDS.length;
        audio.playbackRate = SPEEDS[speedIndex];
        try {
          localStorage.setItem("bergtatt:playbackRate", String(SPEEDS[speedIndex]));
        } catch (e) {}
        updateSpeedLabel();
      });
    }
  }

  function setupKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (audio.paused) {
          if (pendingResume != null && resumeBanner && !resumeBanner.hidden) {
            applyResumeChoice(false);
          }
          audio.play().catch(function () {});
        } else {
          audio.pause();
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - SKIP_BACK);
        saveProgress(true);
        updateTimes();
        updateSeekUI();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        var dur = audio.duration || Infinity;
        audio.currentTime = Math.min(dur, audio.currentTime + SKIP_FWD);
        saveProgress(true);
        updateTimes();
        updateSeekUI();
      }
    });
  }

  function setupMediaSession() {
    if (!("mediaSession" in navigator)) return;

    var title = master.getAttribute("data-title") || "Bergtatt";
    var artworkUrl = master.getAttribute("data-artwork");
    var artwork = [];
    if (artworkUrl) {
      artwork.push({ src: artworkUrl, sizes: "512x512", type: "image/jpeg" });
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: "Bergtatt",
      album: "Bergtatt podcast",
      artwork: artwork,
    });

    navigator.mediaSession.setActionHandler("play", function () {
      audio.play().catch(function () {});
    });
    navigator.mediaSession.setActionHandler("pause", function () {
      audio.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", function () {
      audio.currentTime = Math.max(0, audio.currentTime - SKIP_BACK);
    });
    navigator.mediaSession.setActionHandler("seekforward", function () {
      var dur = audio.duration || Infinity;
      audio.currentTime = Math.min(dur, audio.currentTime + SKIP_FWD);
    });
  }

  function updateMediaSessionState() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
  }

  audio.addEventListener("loadedmetadata", function () {
    updateTimes();
    updateSeekUI();
    maybeOfferResume();
  });

  audio.addEventListener("play", function () {
    updatePlayState();
    scheduleSave();
  });

  audio.addEventListener("pause", function () {
    updatePlayState();
    saveProgress(true);
  });

  audio.addEventListener("ended", function () {
    updatePlayState();
    saveProgress(true);
  });

  audio.addEventListener("timeupdate", function () {
    updateTimes();
    if (!seeking) updateSeekUI();
    scheduleSave();
  });

  audio.addEventListener("progress", updateSeekUI);

  window.addEventListener("beforeunload", function () {
    saveProgress(true);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveProgress(true);
  });

  players.forEach(bindControls);
  bindMasterOnly();
  setupDockVisibility();
  setupKeyboard();
  setupMediaSession();
  updateSpeedLabel();
  updatePlayState();
  updateTimes();
})();
