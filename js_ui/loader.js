import { load } from "../js/player.js";

const samples = [
    {
        name: "CONNECT - 阿良良木健 [BV1Yx411T7Uz]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/9/vid.mp4",
        danmaku: [
            "https://pcf.waltuh.cyou/danma/dm_vid/9/danma-seg1.json.gz",
            "https://pcf.waltuh.cyou/danma/dm_vid/9/danma-seg2.json.gz",
        ],
    },
    {
        name: "UP↑SIDE↓UP↑SIDE↓DOWN↓ [BV1da411U7PE]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/12/vid.mp4",
        danmaku: [
            "https://pcf.waltuh.cyou/danma/dm_vid/12/danma.json.gz",
        ],
    },
    {
        name: "緋色月下、狂咲ノ絶 [BV1qx411c772]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/3/vid.mp4",
        danmaku: [
            "https://pcf.waltuh.cyou/danma/dm_vid/3/danma-seg1.json.gz",
            "https://pcf.waltuh.cyou/danma/dm_vid/3/danma-seg2.json.gz",
        ],
    },
    {
        name: "佩佩角色PV [BV1Sf421q7dN]",
        video: "https://pcf.waltuh.cyou/danma/dm_vid/5/vid.mp4",
        danmaku: [
            "https://pcf.waltuh.cyou/danma/dm_vid/5/danma-seg1.json.gz",
            "https://pcf.waltuh.cyou/danma/dm_vid/5/danma-seg2.json.gz",
        ],
    },
];

const overlay = document.createElement("div");

overlay.innerHTML = `
    <div class="loader">
        <h2>Load video</h2>

        <label>
            Video
            <input
                id="videoFile"
                type="file"
                accept="video/*"
            >
        </label>

        <label>
            Dankoma JSONL segments
            <input
                id="danmakuFile"
                type="file"
                multiple
                accept=".jsonl,.json,.gz,text/plain,application/json,application/gzip"
            >
        </label>

        <button id="loadButton" type="button">
            Load
        </button>

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

const loadButton = loader.querySelector("#loadButton");

loadButton.style.cssText = `
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
            button.disabled = true;
            loadButton.disabled = true;

            status.textContent =
                `Loading ${sample.name}...`;

            try {
                await load(
                    sample.video,
                    sample.danmaku,
                );

                overlay.remove();
            } catch (error) {
                console.error(error);

                status.textContent =
                    `Failed to load sample: ${error.message}`;

                button.disabled = false;
                loadButton.disabled = false;
            }
        });

        samplesElement.appendChild(button);
    }
}

const status = overlay.querySelector("#loaderStatus");

status.style.cssText = `
    margin-top: 10px;
    font-size: 12px;
    opacity: 0.7;
`;

document.body.appendChild(overlay);

const videoFile = overlay.querySelector("#videoFile");
const danmakuFile = overlay.querySelector("#danmakuFile");

loadButton.addEventListener("click", async () => {
    const videoSource = videoFile.files[0];

    const danmakuSources = [
        ...danmakuFile.files,
    ];

    if (!videoSource || !danmakuSources.length) {
        status.textContent =
            "Select the video and at least one danmaku segment.";

        return;
    }

    loadButton.disabled = true;

    status.textContent = "Loading...";

    try {
        await load(
            videoSource,
            danmakuSources,
        );

        overlay.remove();
    } catch (error) {
        console.error(error);

        status.textContent =
            `Failed to load: ${error.message}`;

        loadButton.disabled = false;
    }
});