import { load, video } from "../js/player.js";

const overlay = document.querySelector("#loaderOverlay");
const videoFile = document.querySelector("#videoFile");
const danmakuFile = document.querySelector("#danmakuFile");

const loadButton = document.querySelector("#loadButton");
const cancelButton = document.querySelector("#cancelButton");

const status = document.querySelector("#loaderStatus");

const videoDropZone = videoFile.closest(".drop-zone");
const danmakuDropZone = danmakuFile.closest(".drop-zone");

let activeLoader = false;

function updateDropZone(dropZone, files) {
    const span = dropZone.querySelector("span");

    if (!files.length) {
        return;
    }

    if (files.length === 1) {
        span.textContent = files[0].name;
        return;
    }

    span.textContent =
        `${files.length} files selected`;
}

function setupDropZone(dropZone, input, multiple = false) {
    input.addEventListener("change", () => {
        updateDropZone(
            dropZone,
            input.files,
        );
    });

    dropZone.addEventListener("dragover", event => {
        event.preventDefault();

        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", event => {
        if (
            !dropZone.contains(event.relatedTarget)
        ) {
            dropZone.classList.remove("dragover");
        }
    });

    dropZone.addEventListener("drop", event => {
        event.preventDefault();

        dropZone.classList.remove("dragover");

        const files = [
            ...event.dataTransfer.files,
        ];

        if (!files.length) {
            return;
        }

        if (!multiple) {
            input.files = createFileList(
                files.slice(0, 1),
            );
        } else {
            input.files = createFileList(files);
        }

        updateDropZone(
            dropZone,
            input.files,
        );
    });
}

function createFileList(files) {
    const dataTransfer = new DataTransfer();

    for (const file of files) {
        dataTransfer.items.add(file);
    }

    return dataTransfer.files;
}

function reset() {
    videoFile.value = "";
    danmakuFile.value = "";

    videoDropZone.querySelector("span").textContent =
        "Drag and drop or click to select file";

    danmakuDropZone.querySelector("span").textContent =
        "Drag and drop or click to select file";

    loadButton.disabled = false;
    cancelButton.disabled = false;

    status.textContent = "";
}

function closeLoader() {
    activeLoader = false;

    overlay.hidden = true;

    reset();
}

export function openLoader() {
    if (activeLoader) {
        return;
    }

    activeLoader = true;

    overlay.hidden = false;

    videoFile.focus();
}

setupDropZone(
    videoDropZone,
    videoFile,
);

setupDropZone(
    danmakuDropZone,
    danmakuFile,
    true,
);

cancelButton.addEventListener(
    "click",
    closeLoader,
);

loadButton.addEventListener(
    "click",
    async () => {
        const videoSource = videoFile.files[0];

        const danmakuSources = [
            ...danmakuFile.files,
        ];

        if (!videoSource) {
            status.textContent =
                "Select a video file.";

            return;
        }

        if (!danmakuSources.length) {
            status.textContent =
                "Select at least one danmaku segment.";

            return;
        }

        loadButton.disabled = true;
        cancelButton.disabled = true;

        status.textContent = "Loading...";

        try {
            await load(
                videoSource,
                danmakuSources,
            );

            closeLoader();
            video.play();
        } catch (error) {
            console.error(error);

            status.textContent =
                `Failed to load: ${error.message}`;

            loadButton.disabled = false;
            cancelButton.disabled = false;
        }
    },
);