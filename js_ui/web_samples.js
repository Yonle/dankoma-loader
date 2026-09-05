import { load, video } from "../js/player.js";
import { samples } from "./samples.js";

const sampleList = document.querySelector("#sampleList");
const overlay = document.querySelector("#loaderOverlay");
const status = document.querySelector("#loaderStatus");

if (!sampleList) {
    throw new Error(
        'Missing "#sampleList" element.'
    );
}

for (const sample of samples) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "sample-button";
    button.textContent = sample.name;

    button.addEventListener("click", async () => {
        button.disabled = true;

        status.textContent =
            `Loading ${sample.name}...`;

        for (const other of sampleList.querySelectorAll(
            ".sample-button"
        )) {
            other.disabled = true;
        }

        try {
            await load(
                sample.video,
                sample.danmaku,
            );

            overlay.hidden = true;
            status.textContent = "";

            video.play();
        } catch (error) {
            console.error(error);

            status.textContent =
                `Failed to load sample: ${error.message}`;

            for (const other of sampleList.querySelectorAll(
                ".sample-button"
            )) {
                other.disabled = false;
            }

            button.disabled = false;
        }
    });

    sampleList.appendChild(button);
}