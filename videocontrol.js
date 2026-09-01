const playPause = document.getElementById("playPause");
const seekbar = document.getElementById("seekbar");
const volume = document.getElementById("volume");
const settings = document.getElementById("settings");

const canvasToggle =
    document.getElementById("canvasToggle");

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

settings.addEventListener("click", () => {
    console.log("settings");
});