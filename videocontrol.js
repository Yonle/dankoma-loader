const playPause = document.getElementById("playPause");
const seekbar = document.getElementById("seekbar");
const volume = document.getElementById("volume");
const settings = document.getElementById("settings");
const fullscreen = document.getElementById("fullscreen");
const canvasToggle = document.getElementById("canvasToggle");
let controlsTimer = null;

function showControls() {
    controls.classList.remove("hidden");

    clearTimeout(controlsTimer);

    controlsTimer = setTimeout(hideControls, 2500);
}

function hideControls() {
    if (!video.paused && !settingsPopup.hidden
) {
        controls.classList.add("hidden");
    }
}

video.addEventListener("mousemove", showControls);
video.addEventListener("click", showControls);

controls.addEventListener("mousemove", showControls);

video.addEventListener("play", () => {
    showControls();
});

video.addEventListener("pause", () => {
    showControls();
});

showControls();

canvasToggle.addEventListener("click", () => {
    drawEnabled = !drawEnabled;

    canvas.style.display = drawEnabled
        ? "block"
        : "none";
});

playPause.addEventListener("click", () => {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
});

video.addEventListener("play", () => {
    playPause.textContent = "⏸";
});

video.addEventListener("pause", () => {
    playPause.textContent = "▶";
});

video.addEventListener("loadedmetadata", () => {
    seekbar.value = 0;
});

video.addEventListener("timeupdate", () => {
    if (!video.duration) {
        return;
    }

    seekbar.value =
        (video.currentTime / video.duration) * 100;
});

seekbar.addEventListener("input", () => {
    if (!video.duration) {
        return;
    }

    video.currentTime =
        (Number(seekbar.value) / 100) *
        video.duration;
});

volume.addEventListener("input", () => {
    video.volume = Number(volume.value);
});

fullscreen.addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (err) {
        console.error(
            "fullscreen failed:",
            err
        );
    }
});

document.addEventListener("fullscreenchange", () => {
    fullscreen.textContent =
        document.fullscreenElement
            ? "⛶"
            : "⛶";
});
