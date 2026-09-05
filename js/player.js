const canvas = document.querySelector("#danmaku");

export const video = document.querySelector("video");
export const dankoma = new Dankoma(canvas);

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

export async function load(videoSource, danmakuSources) {
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

    for (const source of danmakuSources) {
        const danmakuBlob =
            await loadDanmakuSource(source);

        await dankoma.loadDanmaJSONL(danmakuBlob);
    }

    await loadMissingFonts();
}