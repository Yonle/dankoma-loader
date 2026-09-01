const canvas = document.getElementById("danmaku");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

const LANE_HEIGHT = 32
const LANE_GAP = 2;

const topLanes = [];
const bottomLanes = [];
const comments = [];

const CENTER_FONT_SIZE = 28;
const CENTER_GAP = 4;
const CENTER_LOOKAHEAD = 8;

function getTextMetrics(text, font) {
    ctx.font = font;

    return ctx.measureText(text);
}

function willCollide(a, b) {
    // First: check vertical overlap.
    const vertical =
        Math.abs(a.y - b.y) <
        (a.height + b.height) / 2 + CENTER_GAP;

    if (!vertical) {
        return false;
    }

    const gap = a.x - (b.x + b.width + CENTER_GAP);

    /*
     * The new comment starts on the right.
     *
     * gap <= 0 means the two comments are already
     * touching or overlapping horizontally.
     */
    if (gap <= 0) {
        return true;
    }

    /*
     * If the new comment is not faster than the
     * existing one, the distance between them will
     * stay the same or increase.
     */
    if (a.vx <= b.vx) {
        return false;
    }

    /*
     * New comment is faster, so calculate when it
     * catches the existing comment.
     */
    const relativeSpeed = a.vx - b.vx;
    const catchTime = gap / relativeSpeed;

    return catchTime < CENTER_LOOKAHEAD;
}

function scoreCenterY(width, height, vx, y) {
    let score = 0;

    const candidate = {
        x: W,
        y,
        width,
        height,
        vx
    };

    for (const c of comments) {
        if (c.mode !== "scroll")
            continue;

        if (willCollide(candidate, c)) {
            score += 1000;
        }
    }

    return score;
}

function findCenterY(width, height, vx) {
    const step = LANE_HEIGHT;

    let bestY = null;
    let bestScore = Infinity;

    for (
        let y = LANE_HEIGHT / 2;
        y <= H - LANE_HEIGHT / 2;
        y += step
    ) {
        const score = scoreCenterY(width, height, vx, y);

        if (score < bestScore) {
            bestScore = score;
            bestY = y;
        }
    }

    return bestY;
}

function rebuildFixedLanes() {
    topLanes.length = 0;
    bottomLanes.length = 0;

    // Use the ENTIRE canvas.
    const laneCount = Math.floor(H / LANE_HEIGHT);
    for (let i = 0; i < laneCount; i++) {
        topLanes.push({
            index: i,
            occupiedUntil: 0
        });

        bottomLanes.push({
            index: i,
            occupiedUntil: 0
        });
    }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = "middle";

  rebuildFixedLanes();
}

window.addEventListener("resize", resize);
resize();

function fontFor(text, fixed) {
    const size = fixed ? 32 : 28;

    return `700 ${size}px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
}

function speedFor(text) {
    const width = measure(text, false);
    const duration = 6; // seconds to cross the screen

    return (W + width) / duration;
}

function measure(text, fixed = false) {
  ctx.font = fontFor(text, fixed);
  return ctx.measureText(text).width;
}

function createFixedComment(text, mode) {
    const fixed = true;
    const font = fontFor(text, fixed);

    ctx.font = font;

    const metrics = ctx.measureText(text);

    const ascent = metrics.actualBoundingBoxAscent;
    const descent = metrics.actualBoundingBoxDescent;
    const height = ascent + descent;
    const width = metrics.width;

    const lanes = mode === "top" ? topLanes : bottomLanes;
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

    const lifetime = 4000;

    lane.occupiedUntil = now + lifetime;

    let y;

    if (mode === "top") {
        // Glyph top starts at the lane position.
        y = lane.index * LANE_HEIGHT + ascent;
    } else {
        // Glyph bottom ends at the lane position.
        y = H - lane.index * LANE_HEIGHT - descent;
    }

    comments.push({
        text,
        mode,
        x: W / 2,
        y,
        width,
        height,
        color: randomColor(),
        alpha: 0.92,
        font,
        vx: 0,
        born: now,
        lifetime,
        lane
    });

    return true;
}
function createComment(text, mode = "scroll") {
    if (mode === "top" || mode === "bottom") {
        return createFixedComment(text, mode);
    }

    const font = fontFor(text, false);
    ctx.font = font;

    const metrics = ctx.measureText(text);

    const width = metrics.width;
    const height =
        metrics.actualBoundingBoxAscent +
        metrics.actualBoundingBoxDescent;

    const now = performance.now();

    const vx = speedFor(text);
    const y = findCenterY(width, height, vx);

    const comment = {
        text,
        mode: "scroll",
        x: W,
        y,
        width,
        height,
        color: "#ffffff",
        alpha: 0.92,
        font,
        vx,
        born: now,
        lifetime: 4000
    };

    comments.push(comment);

    return comment;
}


canvas.addEventListener("click", (event) => {
  const r = Math.random();
  createComment(
    "点击成功 " + samples[Math.floor(Math.random() * samples.length)],
    r < 0.5 ? "scroll" : r < 0.75 ? "top" : "bottom"
  );
});

let last = performance.now();

function drawComment(c) {
  ctx.font = c.font;
  ctx.fillStyle = c.color;
  ctx.globalAlpha = c.alpha;

  if (c.mode === "top" || c.mode === "bottom") {
    // Fixed comments are centered horizontally.
    ctx.textAlign = "center";
    ctx.fillText(c.text, c.x, c.y);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(c.text, c.x, c.y);
  }
}

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    ctx.clearRect(0, 0, W, H);


    /*
     * WORLD 1: CENTER
     *
     * Full canvas.
     * No clipping.
     * No top/bottom exclusion.
     */
    for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];

        if (c.mode !== "scroll")
            continue;

        c.x -= c.vx * dt;

        if (c.x + c.width < -30) {
            comments.splice(i, 1);
            continue;
        }

        drawComment(c);
    }
    /*
     * WORLD 2: TOP OVERLAY
     */
    for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];

        if (c.mode !== "top")
            continue;

        if (now - c.born > c.lifetime) {
            comments.splice(i, 1);
            continue;
        }

        drawComment(c);
    }

    /*
     * WORLD 3: BOTTOM OVERLAY
     */
    for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];

        if (c.mode !== "bottom")
            continue;

        if (now - c.born > c.lifetime) {
            comments.splice(i, 1);
            continue;
        }

        drawComment(c);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
