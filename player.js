const video = document.querySelector("video");
const activeMode7 = new Set();

let danmaku = [];
let timeline = [];
let danmakuIndex = 0;
let lastVideoTime = 0;
let drawEnabled = true;

let danmakuRunning = false;


/* ---------------------------------------------------------
 * JSONL parser
 * ------------------------------------------------------ */

async function parseJSONL(response, onComment) {
    const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        buffer += value;

        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            onComment(JSON.parse(line));
        }
    }

    if (buffer.trim()) {
        onComment(JSON.parse(buffer));
    }
}


/* ---------------------------------------------------------
 * Danmaku
 * ------------------------------------------------------ */

function emitDanmaku(comment) {
    const [
        text,
        time,
        mode,
        timestamp,
        color,
        weight,
    ] = comment;

    switch (mode) {
        case 1:
        case 2:
        case 3:
            createComment(text, "scroll", color, 0);
            break;

        case 4:
            createComment(text, "bottom", color, 0);
            break;

        case 5:
            createComment(text, "top", color, 0);
            break;

        case 6:
            createComment(text, "scroll", color, 1);
            break;

        case 7:
            try {
                activeMode7.add(
                    createMode7(comment)
                );
            } catch (err) {
                console.error(
                    timestamp,
                    "Got error on mode7:",
                    err
                );

                console.error(
                    timestamp,
                    text
                );
            }
            break;
    }
}

function seekDanmaku(time) {
    let lo = 0;
    let hi = timeline.length;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (timeline[mid].time < time) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    danmakuIndex = lo;
}

function updateDanmaku(currentTime) {
    if (currentTime < lastVideoTime) {
        seekDanmaku(currentTime);
    }

    while (
        danmakuIndex < timeline.length &&
        timeline[danmakuIndex].time <= currentTime
    ) {
        const comment =
            danmaku[timeline[danmakuIndex].index];

        emitDanmaku(comment);
        danmakuIndex++;
    }

    lastVideoTime = currentTime;
}

function mode7frameDanma(currentTime) {
    for (const d of activeMode7) {
        if (!drawMode7(ctx, d, currentTime)) {
            activeMode7.delete(d);
        }
    }
}


/* ---------------------------------------------------------
 * Animation loops
 * ------------------------------------------------------ */

// Keep these as separate animation loops.
// Mode 7 and normal danmaku rendering should not be
// structurally coupled together.

function frameDanma() {
    if (!video.paused && drawEnabled) {
        const currentTime = video.currentTime;

        updateDanmaku(currentTime);
        mode7frameDanma(currentTime);
    }

    requestAnimationFrame(frameDanma);
}

function danmaFrame(now) {
    if (!video.paused) {
        drawDanmaFrame(now);
    }

    requestAnimationFrame(danmaFrame);
}


/* ---------------------------------------------------------
 * Public API
 * ------------------------------------------------------ */

async function initDanmaku(source) {
    const response = await fetch(source);

    if (!response.ok) {
        throw new Error(
            `failed to fetch danmaku: ${response.status}`
        );
    }

    danmaku = [];
    timeline = [];
    danmakuIndex = 0;
    lastVideoTime = video.currentTime;

    activeMode7.clear();

    await parseJSONL(response, comment => {
        const index = danmaku.length;

        danmaku.push(comment);

        timeline.push({
            time: comment[1],
            index,
        });
    });

    timeline.sort(
        (a, b) => a.time - b.time
    );

    danmakuIndex = 0;

    /*
     * Start the playback/update loop once.
     *
     * IMPORTANT:
     * This is deliberately separate from initDanmaku().
     */
    if (!danmakuRunning) {
        danmakuRunning = true;
        requestAnimationFrame(frameDanma);
    }
}

requestAnimationFrame(danmaFrame);