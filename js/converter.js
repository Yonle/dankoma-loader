const {
    BiliBili,
    Niconico,
    YouTubeChat,
} = require("../modules/dankomaconv.js");

const converters = {
    bilibili: BiliBili,
    niconico: Niconico,
    youtube: YouTubeChat,
};

function getConverter(platform) {
    const Converter = converters[platform];

    if (!Converter) {
        throw new Error(
            `Unknown converter platform: ${platform}`
        );
    }

    return Converter;
}

function writeChunk(converter, chunk) {
    return new Promise((resolve, reject) => {
        if (converter.write(chunk)) {
            resolve();
            return;
        }

        converter.once("drain", resolve);
        converter.once("error", reject);
    });
}

async function gzipBlob(blob) {
    if (!("CompressionStream" in window)) {
        throw new Error(
            "This environment does not support gzip compression."
        );
    }

    const stream = blob.stream().pipeThrough(
        new CompressionStream("gzip"),
    );

    return new Response(stream).blob();
}

export async function convert(
    platform,
    files,
    onStatus = null,
) {
    const Converter =
        getConverter(platform);

    if (!files?.length) {
        throw new Error(
            "No input files were provided."
        );
    }

    const converter =
        new Converter();

    const chunks = [];

    converter.on("diagnostic", message => {
        console.warn(
            `[${platform}] ${message}`
        );

        onStatus?.(
            String(message),
        );
    });

    converter.on("data", chunk => {
        chunks.push(
            Buffer.from(chunk),
        );
    });

    const finished = new Promise(
        (resolve, reject) => {
            converter.once(
                "finish",
                resolve,
            );

            converter.once(
                "error",
                reject,
            );
        },
    );

    if (platform === "bilibili") {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            onStatus?.(
                `Converting segment ${i + 1}/${files.length}...`,
            );

            const buffer = Buffer.from(
                await file.arrayBuffer(),
            );

            await writeChunk(
                converter,
                buffer,
            );

            converter.nextSeg();
        }
    } else {
        for (const file of files) {
            onStatus?.(
                `Reading ${file.name}...`,
            );

            const buffer = Buffer.from(
                await file.arrayBuffer(),
            );

            await writeChunk(
                converter,
                buffer,
            );
        }
    }

    onStatus?.(
        "Finishing conversion...",
    );

    converter.end();

    await finished;

    return new Blob(
        chunks,
        {
            type: "application/jsonl",
        },
    );
}

export async function convertAndDownload(
    platform,
    files,
    filename = "danma.jsonl.gz",
    onStatus = null,
) {
    const jsonl =
        await convert(
            platform,
            files,
            onStatus,
        );

    onStatus?.(
        "Compressing with gzip...",
    );

    const blob =
        await gzipBlob(jsonl);

    onStatus?.(
        "Preparing download...",
    );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);

    onStatus?.(
        "Conversion complete.",
    );

    return blob;
}