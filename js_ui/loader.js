const video = document.querySelector("video");
const canvas = document.querySelector("#danmaku");

const dankoma = new Dankoma(canvas);

const samples = [
    {
        name: "CONNECT - 阿良良木健 [BV1Yx411T7Uz]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/9/vid.mp4",
        danmaku: "https://pcf.waltuh.cyou/danma/dm_vid/9/danma.json.gz"
    },
    {
        name: "緋色月下、狂咲ノ絶 [BV1qx411c772]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/3/vid.mp4",
        danmaku: "https://pcf.waltuh.cyou/danma/dm_vid/3/danma.json.gz"
    },
    {
        name: "佩佩角色PV [BV1Sf421q7dN]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/5/vid.mp4",
        danmaku: "https://pcf.waltuh.cyou/danma/dm_vid/5/danma.json.gz"
    }
];

const overlay = document.createElement("div");

overlay.innerHTML = `
    <div class="loader">
        <h2>Load video</h2>

        <label>
            Video
            <input id="videoFile" type="file" accept="video/*">
        </label>

        <label>
            Dankoma JSONL
            <input
                id="danmakuFile"
                type="file"
                accept=".jsonl,.json,.gz,text/plain,application/json,application/gzip"
            >
        </label>

        <button id="loadButton" type="button">Load</button>

        ${
            samples.length
                ? `
                    <h3>Samples</h3>
                    <div id="samples"></div>
                `
                : ""
        }

        <div id="loaderStatus"></div>
    </div>
`;

overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100;

    display: grid;
    place-items: center;

    background: rgba(0, 0, 0, 0.8);
    color: white;

    font-family: system-ui, sans-serif;
`;

const loader = overlay.querySelector(".loader");

loader.style.cssText = `
    width: min(400px, calc(100vw - 32px));
    padding: 24px;

    box-sizing: border-box;

    background: #1c1c1c;
    border-radius: 8px;
`;

loader.querySelectorAll("label").forEach(label => {
    label.style.cssText = `
        display: block;
        margin: 12px 0;
        font-size: 13px;
    `;
});

loader.querySelectorAll("input").forEach(input => {
    input.style.cssText = `
        display: block;
        width: 100%;
        margin-top: 6px;
        box-sizing: border-box;
    `;
});

loader.querySelector("button").style.cssText = `
    width: 100%;
    margin-top: 12px;
    padding: 8px;

    border: 0;
    border-radius: 4px;

    background: #00aeec;
    color: white;

    cursor: pointer;
`;

const samplesElement = overlay.querySelector("#samples");

if (samplesElement) {
    samplesElement.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 12px;
    `;

    for (const sample of samples) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = sample.name;

        button.style.cssText = `
            width: 100%;
            padding: 8px;

            border: 0;
            border-radius: 4px;

            background: #333;
            color: white;

            cursor: pointer;
        `;

        button.addEventListener("click", async () => {
            await loadSample(sample);
        });

        samplesElement.appendChild(button);
    }
}

loader.querySelector("#loaderStatus").style.cssText = `
    margin-top: 10px;
    font-size: 12px;
    opacity: 0.7;
`;

document.body.appendChild(overlay);

const videoFile = overlay.querySelector("#videoFile");
const danmakuFile = overlay.querySelector("#danmakuFile");
const loadButton = overlay.querySelector("#loadButton");
const status = overlay.querySelector("#loaderStatus");

async function decompressGzip(blob) {
    if (!("DecompressionStream" in window)) {
        throw new Error(
            "This browser does not support gzip decompression."
        );
    }

    const stream = blob.stream().pipeThrough(
        new DecompressionStream("gzip")
    );

    return new Response(stream).blob();
}

async function loadDanmakuSource(source) {
    let blob;

    if (source instanceof Blob) {
        blob = source;
    } else if (typeof source === "string") {
        const response = await fetch(source);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch danmaku: ${response.status} ${response.statusText}`
            );
        }

        blob = await response.blob();
    } else {
        throw new TypeError("Unsupported danmaku source.");
    }

    // Gzip header
    const header = new Uint8Array(
        await blob.slice(0, 2).arrayBuffer()
    );

    const isGzip =
        header.length >= 2 &&
        header[0] === 0x1f &&
        header[1] === 0x8b;

    if (isGzip) {
        blob = await decompressGzip(blob);
    }

    return blob;
}

async function load(videoSource, danmakuSource) {
    if (typeof videoSource === "string") {
        video.src = videoSource;
    } else {
        video.src = URL.createObjectURL(videoSource);
    }

    video.load();

    dankoma.trackVideo(video);

    const danmakuBlob = await loadDanmakuSource(danmakuSource);

    await dankoma.loadDanmaJSONL(danmakuBlob);

    overlay.remove();
}

async function loadSample(sample) {
    loadButton.disabled = true;
    status.textContent = `Loading ${sample.name}...`;

    try {
        await load(sample.video, sample.danmaku);
    } catch (error) {
        console.error(error);
        status.textContent = `Failed to load sample: ${error.message}`;
        loadButton.disabled = false;
    }
}

loadButton.addEventListener("click", async () => {
    const videoSource = videoFile.files[0];
    const danmakuSource = danmakuFile.files[0];

    if (!videoSource || !danmakuSource) {
        status.textContent = "Select both files.";
        return;
    }

    loadButton.disabled = true;
    status.textContent = "Loading...";

    try {
        await load(videoSource, danmakuSource);
    } catch (error) {
        console.error(error);
        status.textContent = `Failed to load: ${error.message}`;
        loadButton.disabled = false;
    }
});