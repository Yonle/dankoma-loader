import { load, video } from "./player.js";
import { openLoader } from "../js_ui/nwloader.js";

import {
    getArguments,
    pathToURL,
    onOpen,
} from "./nwhelper.js";

const fs = require("node:fs/promises");
const path = require("node:path");

const DANMAKU_EXTENSIONS = [
    ".dankoma.json",
    ".dankoma.jsonl",
    ".dankoma.json.gz",
    ".dankoma.jsonl.gz",
];

async function findDanmakuFile(videoPath) {
    const directory =
        path.dirname(videoPath);

    const filename =
        path.basename(videoPath);

    for (const extension of DANMAKU_EXTENSIONS) {
        const candidate =
            path.join(
                directory,
                filename.replace(
                    path.extname(filename),
                    "",
                ) + extension,
            );

        try {
            await fs.access(candidate);

            return candidate;
        } catch {
            // Doesn't exist. Try the next extension.
        }
    }

    return null;
}

function resolveArgumentPath(value) {
    if (path.isAbsolute(value)) {
        return value;
    }

    const cwd =
        process.platform === "win32"
            ? process.cwd()
            : process.env.PWD || process.cwd();

    return path.resolve(
        cwd,
        value,
    );
}

async function loadArguments(args) {
    if (!args.length) {
        openLoader();
        return;
    }

    let [
        videoPath,
        ...danmakuPaths
    ] = args;

    videoPath = resolveArgumentPath(videoPath);
    danmakuPaths = danmakuPaths.map(resolveArgumentPath);

    if (danmakuPaths.length) {
        try {
            await load(
                pathToURL(videoPath),
                danmakuPaths.map(pathToURL),
            );

            video.play();

            return;
        } catch (error) {
            console.error(
                "Failed to load command-line files:",
                error,
            );

            openLoader();

            return;
        }
    }

    try {
        const danmakuPath =
            await findDanmakuFile(videoPath);

        if (!danmakuPath) {
            console.warn(
                "No matching Dankoma file found for:",
                videoPath,
            );

            openLoader();

            return;
        }

        await load(
            pathToURL(videoPath),
            [
                pathToURL(danmakuPath),
            ],
        );

        video.play();
    } catch (error) {
        console.error(
            "Failed to load command-line files:",
            error,
        );

        openLoader();
    }
}

const args = getArguments();

await loadArguments(args);

onOpen(async args => {
    await loadArguments(args);
});