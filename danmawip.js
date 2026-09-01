const canvas = document.getElementById("danmaku");
const ctx = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true
});

let W = 0;
let H = 0;
let dpr = 1;

const CONFIG = {
    laneHeight: 32,

    fonts: {
        scroll: 28,
        fixed: 32,
        weight: 700,
        family: `"Noto Sans CJK SC", "Microsoft YaHei", sans-serif`
    },

    style: {
        opacity: 0.8
    },

    scroll: {
        duration: 6,
        lookahead: 8,
        gap: 2
    },

    fixed: {
        lifetime: 4000
    },

    spawn: {
        interval: 50
    }
};

const topLanes = [];
const bottomLanes = [];
const centerLanes = [];
const comments = [];

const metricsCache = new Map();

function fontFor(fixed) {
    const size = fixed
        ? CONFIG.fonts.fixed
        : CONFIG.fonts.scroll;

    return `${CONFIG.fonts.weight} ${size}px ${CONFIG.fonts.family}`;
}

function getMetrics(text, fixed = false) {
    const key = `${fixed ? "fixed" : "scroll"}:${text}`;

    let cached = metricsCache.get(key);

    if (cached) {
        return cached;
    }

    const font = fontFor(fixed);
    ctx.font = font;

    const metrics = ctx.measureText(text);

    cached = {
        font,
        width: metrics.width,
        ascent: metrics.actualBoundingBoxAscent,
        descent: metrics.actualBoundingBoxDescent
    };

    cached.height = cached.ascent + cached.descent;

    metricsCache.set(key, cached);

    return cached;
}

function rebuildLanes() {
    topLanes.length = 0;
    bottomLanes.length = 0;
    centerLanes.length = 0;

    const count = Math.max(
        1,
        Math.floor(H / CONFIG.laneHeight)
    );

    for (let i = 0; i < count; i++) {
        topLanes.push({
            index: i,
            occupiedUntil: 0
        });

        bottomLanes.push({
            index: i,
            occupiedUntil: 0
        });

        centerLanes.push({
            index: i,
            comments: []
        });
    }
}

function resize() {
    dpr = Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 768 ? 1 : 2
    );

    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = "middle";

    rebuildLanes();
}

window.addEventListener("resize", resize);
resize();

function randomColor() {
    const colors = [
        "#ffffff",
        "#ffdc73",
        "#7dd3fc",
        "#fca5a5",
        "#86efac",
        "#c4b5fd",
        "#f9a8d4"
    ];

    return colors[
        Math.floor(Math.random() * colors.length)
    ];
}

function speedFor(width) {
    return (W + width) / CONFIG.scroll.duration;
}

function verticalOverlap(a, b) {
    return (
        Math.abs(a.y - b.y) <
        (a.height + b.height) / 2 +
        CONFIG.scroll.gap
    );
}

function willScrollCollide(a, b) {
    if (!verticalOverlap(a, b)) {
        return false;
    }

    const gap =
        a.x -
        (b.x + b.width + CONFIG.scroll.gap);

    // Already touching.
    if (gap <= 0) {
        return true;
    }

    // New comment cannot catch an equal/faster existing one.
    if (a.vx <= b.vx) {
        return false;
    }

    const relativeSpeed = a.vx - b.vx;
    const catchTime = gap / relativeSpeed;

    return catchTime < CONFIG.scroll.lookahead;
}

function canUseCenterLane(width, height, vx, laneIndex) {
    const lane = centerLanes[laneIndex];

    if (!lane) {
        return false;
    }

    const candidate = {
        x: W,
        y: CONFIG.laneHeight / 2 +
            laneIndex * CONFIG.laneHeight,
        width,
        height,
        vx
    };

    /*
     * Only inspect comments already assigned to this lane.
     * This avoids scanning every active comment for every
     * candidate lane.
     */
    for (const c of lane.comments) {
        if (willScrollCollide(candidate, c)) {
            return false;
        }
    }

    return true;
}

function findCenterLane(width, height, vx) {
    let fallback = null;

    for (let i = 0; i < centerLanes.length; i++) {
        const lane = centerLanes[i];

        // Keep a fallback if nothing is completely free.
        if (fallback === null && lane.comments.length === 0) {
            fallback = i;
        }

        if (canUseCenterLane(width, height, vx, i)) {
            return i;
        }
    }

    return fallback;
}

function createFixedComment(text, mode) {
    const metrics = getMetrics(text, true);
    const lanes = mode === "top"
        ? topLanes
        : bottomLanes;

    const now = performance.now();

    let lane = null;

    for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].occupiedUntil <= now) {
            lane = lanes[i];
            break;
        }
    }

    if (!lane) {
        return false;
    }

    const lifetime = CONFIG.fixed.lifetime;

    lane.occupiedUntil = now + lifetime;

    let y;

    if (mode === "top") {
        y =
            lane.index * CONFIG.laneHeight +
            metrics.ascent;
    } else {
        y =
            H -
            lane.index * CONFIG.laneHeight -
            metrics.descent;
    }

    comments.push({
        text,
        mode,
        x: W / 2,
        y,
        width: metrics.width,
        height: metrics.height,
        color: randomColor(),
        alpha: CONFIG.style.opacity,
        font: metrics.font,
        vx: 0,
        born: now,
        lifetime,
        lane
    });

    return true;
}

function createScrollComment(text) {
    const metrics = getMetrics(text, false);

    const vx = speedFor(metrics.width);

    const laneIndex =
        findCenterLane(
            metrics.width,
            metrics.height,
            vx
        );

    if (laneIndex === null) {
        return false;
    }

    const now = performance.now();

    const comment = {
        text,
        mode: "scroll",
        x: W,
        y:
            CONFIG.laneHeight / 2 +
            laneIndex * CONFIG.laneHeight,
        width: metrics.width,
        height: metrics.height,
        color: "#ffffff",
        alpha: CONFIG.style.opacity,
        font: metrics.font,
        vx,
        born: now,
        lifetime: null,
        laneIndex
    };

    comments.push(comment);

    centerLanes[laneIndex].comments.push(comment);

    return comment;
}

function createComment(text, mode = "scroll") {
    if (mode === "top" || mode === "bottom") {
        return createFixedComment(text, mode);
    }

    return createScrollComment(text);
}

function removeComment(index) {
    const c = comments[index];

    if (!c) {
        return;
    }

    if (c.mode === "scroll") {
        const lane = centerLanes[c.laneIndex];

        if (lane) {
            const laneIndex = lane.comments.indexOf(c);

            if (laneIndex !== -1) {
                lane.comments.splice(laneIndex, 1);
            }
        }
    }

    comments.splice(index, 1);
}

function drawComment(c) {
    ctx.font = c.font;
    ctx.fillStyle = c.color;
    ctx.globalAlpha = c.alpha;

    if (c.mode === "scroll") {
        ctx.textAlign = "left";
    } else {
        ctx.textAlign = "center";
    }

    ctx.fillText(c.text, c.x, c.y);
}

canvas.addEventListener("click", () => {
    const r = Math.random();

    createComment(
        "点击成功 " +
        samples[Math.floor(Math.random() * samples.length)],
        r < 0.5
            ? "scroll"
            : r < 0.75
                ? "top"
                : "bottom"
    );
});

let last = performance.now();

function frame(now) {
    const dt = Math.min(
        (now - last) / 1000,
        0.05
    );

    last = now;

    ctx.clearRect(0, 0, W, H);

    /*
     * Single pass.
     *
     * This replaces three full-array iterations.
     */
    for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];

        if (c.mode === "scroll") {
            c.x -= c.vx * dt;

            if (c.x + c.width < -30) {
                removeComment(i);
                continue;
            }
        } else {
            if (now - c.born > c.lifetime) {
                removeComment(i);
                continue;
            }
        }

        drawComment(c);
    }

    ctx.globalAlpha = 1;

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
