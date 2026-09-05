import { load, video } from "./player.js";
import { openLoader } from "../js_ui/nwloader.js";
import {
    getArguments,
    pathToURL,
    onOpen,
} from "./nwhelper.js";

async function loadArguments(args) {
    if (!args.length) {
        openLoader();
        return;
    }

    const [videoPath, ...danmakuPaths] = args;

    if (!videoPath || !danmakuPaths.length) {
        openLoader();
        return;
    }

    try {
        const videoSource =
            pathToURL(videoPath);

        const danmakuSources =
            danmakuPaths.map(pathToURL);

        await load(
            videoSource,
            danmakuSources,
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