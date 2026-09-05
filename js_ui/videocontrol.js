import { video, dankoma } from "../js/player.js";

export const playPause = document.getElementById("playPause");
export const seekbar = document.getElementById("seekbar");
export const volume = document.getElementById("volume");
export const settings = document.getElementById("settings");
export const fullscreen = document.getElementById("fullscreen");
export const canvasToggle = document.getElementById("canvasToggle");
export const duration = document.getElementById("duration");

let controlsTimer = null;
let durationFrame = null;
let lastDisplayedSecond = -1;

function updateDuration() {
    const current = video.currentTime;
    const total = video.duration;

    if (Number.isFinite(total) && total > 0) {
        seekbar.value =
            (current / total) * 100;

        const second =
            Math.floor(current);

        if (second !== lastDisplayedSecond) {
            lastDisplayedSecond = second;

            duration.textContent =
                `${formatDuration(current)} / ` +
                `${formatDuration(total)}`;
        }
    }

    if (!video.paused && !video.ended) {
        durationFrame =
            requestAnimationFrame(updateDuration);
    } else {
        durationFrame = null;
    }
}

function updateVolumeUI() {
    volume.value = video.muted
        ? 0
        : video.volume;
}

function hideControls() {
    if (settingsPopup.hidden) {
        controls.classList.add("hidden");
    }
}

function showControls() {
    controls.classList.remove("hidden");

    clearTimeout(controlsTimer);

    controlsTimer = setTimeout(hideControls, 2500);
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    seconds = Math.max(0, Math.floor(seconds));

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(
        (seconds % 3600) / 60
    );
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

video.addEventListener("mousemove", showControls);
video.addEventListener("click", showControls);

controls.addEventListener("mousemove", showControls);

video.addEventListener("play", showControls);
video.addEventListener("pause", showControls);

showControls();

canvasToggle.addEventListener("click", () => {
    dankoma.drawEnabled = !dankoma.drawEnabled;

    if (dankoma.drawEnabled) {
        dankoma.unhide();
    } else {
        dankoma.hide();
    }
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

    if (durationFrame === null) {
        durationFrame =
            requestAnimationFrame(updateDuration);
    }
});

video.addEventListener("pause", () => {
    playPause.textContent = "▶";

    if (durationFrame !== null) {
        cancelAnimationFrame(durationFrame);
        durationFrame = null;
    }

    updateDuration();
});

video.addEventListener("ended", () => {
    if (durationFrame !== null) {
        cancelAnimationFrame(durationFrame);
        durationFrame = null;
    }

    updateDuration();
});

video.addEventListener("loadedmetadata", () => {
    seekbar.value = 0;

    duration.textContent =
        `0:00 / ${formatDuration(video.duration)}`;
});

video.addEventListener("volumechange", updateVolumeUI);

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
            await document.querySelector("#player").requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (err) {
        console.error("fullscreen failed:", err);
    }
});

document.addEventListener("fullscreenchange", () => {
    fullscreen.textContent = "⛶";
});