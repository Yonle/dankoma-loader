const video = document.querySelector("video");
const canvas = document.querySelector("#danmaku");

const dankoma = new Dankoma(canvas);

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

const fontFiles = {
    "Microsoft YaHei": "fonts/msyh.ttc",
    "Microsoft JhengHei": "fonts/msjh.ttf",
    "MS Mincho": "fonts/MSMINCHO.TTF",
    "SimHei": "fonts/SimHei.ttf",
};

const missingFonts = new Set();

dankoma.onMissingFont(fontname => {
    missingFonts.add(fontname);
});

async function loadMissingFonts() {
    const fonts = [...missingFonts];

    missingFonts.clear();

    await Promise.all(
        fonts.map(async fontname => {
            const url = fontFiles[fontname];

            if (!url) {
                console.warn(`Missing font: ${fontname}`);
                return;
            }

            const font = new FontFace(
                fontname,
                `url("${url}")`,
            );

            try {
                await font.load();
                document.fonts.add(font);
            } catch (error) {
                console.error(
                    `Failed to load font "${fontname}":`,
                    error,
                );
            }
        }),
    );
}

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

loader.querySelector("#loadButton").style.cssText = `
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
        throw new TypeError(
            "Unsupported danmaku source."
        );
    }

    // Check for gzip magic header.
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


async function load(videoSource, danmakuSources) {
    if (typeof videoSource === "string") {
        video.src = videoSource;
    } else {
        video.src = URL.createObjectURL(videoSource);
    }

    video.load();

    dankoma.trackVideo(video);

    if (!Array.isArray(danmakuSources)) {
        danmakuSources = [danmakuSources];
    }

    if (!danmakuSources.length) {
        throw new Error(
            "No danmaku segments were provided."
        );
    }

    for (let i = 0; i < danmakuSources.length; i++) {
        const source = danmakuSources[i];

        status.textContent =
            `Loading danmaku segment ${i + 1}/${danmakuSources.length}...`;

        const danmakuBlob =
            await loadDanmakuSource(source);

        await dankoma.loadDanmaJSONL(danmakuBlob);
    }


    status.textContent = "Loading fonts...";

    await loadMissingFonts();

    overlay.remove();
}

async function loadSample(sample) {
    loadButton.disabled = true;

    status.textContent =
        `Loading ${sample.name}...`;

    try {
        await load(
            sample.video,
            sample.danmaku,
        );
    } catch (error) {
        console.error(error);

        status.textContent =
            `Failed to load sample: ${error.message}`;

        loadButton.disabled = false;
    }
}

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
    } catch (error) {
        console.error(error);

        status.textContent =
            `Failed to load: ${error.message}`;

        loadButton.disabled = false;
    }
});