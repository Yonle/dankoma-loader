const canvas = document.getElementById("danmaku");

const ctx = canvas.getContext("2d", {
    alpha: true,
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
        duration: 5,
        lookahead: 8,
        gap: 2
    },

    fixed: {
        lifetime: 4000
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

    return (
        `${CONFIG.fonts.weight} ` +
        `${size}px ` +
        `${CONFIG.fonts.family}`
    );
}

function getMetrics(text, fixed = false) {
    const key = `${fixed ? "fixed" : "scroll"}:${text}`;
    let cached = metricsCache.get(key);

    if (cached) {
        return cached;
    }

    const font = fontFor(fixed);
    ctx.font = font;
    
    ctx.textBaseline = "alphabetic"; 

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
        Math.floor(
            H / CONFIG.laneHeight
        )
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

    for (const c of comments) {
        if (c.mode === "scroll" && centerLanes[c.laneIndex]) {
            centerLanes[c.laneIndex].comments.push(c);
        }
        // Top and bottom lanes check occupiedUntil, so we can restore that too
        else if (c.mode === "top" && topLanes[c.laneIndex]) {
             topLanes[c.laneIndex].occupiedUntil = 
                 Math.max(topLanes[c.laneIndex].occupiedUntil, c.born + c.lifetime);
        }
        else if (c.mode === "bottom" && bottomLanes[c.laneIndex]) {
             bottomLanes[c.laneIndex].occupiedUntil = 
                 Math.max(bottomLanes[c.laneIndex].occupiedUntil, c.born + c.lifetime);
        }
    }
}

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width =
        Math.floor(W * dpr);

    canvas.height =
        Math.floor(H * dpr);

    canvas.style.width =
        `${W}px`;

    canvas.style.height =
        `${H}px`;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    ctx.textBaseline = "middle";

    rebuildLanes();
}

window.addEventListener(
    "resize",
    resize
);

resize();



function speedFor(width) {
    return (
        (W + width) /
        CONFIG.scroll.duration
    );
}



function verticalOverlap(a, b) {
    return (
        a.y < b.y + b.height + CONFIG.scroll.gap &&
        a.y + a.height > b.y - CONFIG.scroll.gap
    );
}

function willScrollCollide(a, b) {
    if (!verticalOverlap(a, b)) {
        return false;
    }

    // Prevent head-on collisions between normal and reverse comments in the same lane
    if ((a.vx > 0 && b.vx < 0) || (a.vx < 0 && b.vx > 0)) {
        return true;
    }

    // 1. Right-to-Left Scrolling (vx > 0)
    if (a.vx > 0) {
        const gap = a.x - (b.x + b.width + CONFIG.scroll.gap);
        if (gap <= 0) return true;
        if (a.vx <= b.vx) return false;

        const relativeSpeed = a.vx - b.vx;
        return (gap / relativeSpeed) < CONFIG.scroll.lookahead;
    }

    // 2. Left-to-Right Scrolling (vx < 0)
    if (a.vx < 0) {
        const gap = b.x - (a.x + a.width + CONFIG.scroll.gap);
        if (gap <= 0) return true;
        
        // A lower/more-negative vx means faster rightward movement
        if (a.vx >= b.vx) return false; 

        const relativeSpeed = b.vx - a.vx; // Positive speed delta
        return (gap / relativeSpeed) < CONFIG.scroll.lookahead;
    }

    return false;
}

function canUseCenterLane(width, height, vx, laneIndex) {
    const lane = centerLanes[laneIndex];
    if (!lane) return false;

    // Set correct starting X based on direction
    const isReverse = vx < 0;
    const candidate = {
        x: isReverse ? -width : W,
        y: CONFIG.laneHeight / 2 + laneIndex * CONFIG.laneHeight,
        width,
        height,
        vx
    };

    for (const c of lane.comments) {
        if (willScrollCollide(candidate, c)) {
            return false;
        }
    }

    return true;
}

function findCenterLane(
    width,
    height,
    vx
) {
    let fallback = null;

    for (
        let i = 0;
        i < centerLanes.length;
        i++
    ) {
        const lane =
            centerLanes[i];

        
        if (
            fallback === null &&
            lane.comments.length === 0
        ) {
            fallback = i;
        }

        if (
            canUseCenterLane(
                width,
                height,
                vx,
                i
            )
        ) {
            return i;
        }
    }

    return fallback;
}


// text   : string
// mode   : "top" || "bottom"
// color  : rgb888 int
function createFixedComment(
    text,
    mode,
    c888
) {
    const metrics =
        getMetrics(text, true);

    const color = `#${c888.toString(16).padStart(6, "0")}`;

    const sprite =
        getSprite(
            text,
            true,
            color
        );

    const lanes =
        mode === "top"
            ? topLanes
            : bottomLanes;

    const now =
        performance.now();

    let lane = null;

    for (
        let i = 0;
        i < lanes.length;
        i++
    ) {
        if (
            lanes[i].occupiedUntil <= now
        ) {
            lane = lanes[i];
            break;
        }
    }

    if (!lane) {
        return false;
    }

    const lifetime =
        CONFIG.fixed.lifetime;

    lane.occupiedUntil =
        now + lifetime;

    
    let y;

    const edgeMargin = 1;

    if (mode === "top") {
        y =
            CONFIG.laneHeight / 2 +
            lane.index * CONFIG.laneHeight;
    } else {
        y =
            H -
            CONFIG.laneHeight / 2 -
            lane.index * CONFIG.laneHeight;
    }

    comments.push({
        text,
        mode,
        x: W / 2,
        y,
        width: metrics.width,
        height: metrics.height,
        sprite: sprite.canvas,
        spriteWidth: sprite.width,
        spriteHeight: sprite.height,
        glyphX: sprite.glyphX,
        glyphY: sprite.glyphY,
        
        anchorX: sprite.anchorX,
        anchorY: sprite.anchorY,

        color,
        alpha: CONFIG.style.opacity,
        font: metrics.font,
        vx: 0,
        born: now,
        lifetime,
        lane
    });
    return true;
}


// text   : string
// reverse: int
// color  : rgb888 int
function createScrollComment(text, c888, reverse) {
    const metrics =
        getMetrics(
            text,
            false
        );

    const color = `#${c888.toString(16).padStart(6, "0")}`;

    const sprite =
        getSprite(
            text,
            false,
            color
        );

    
    const speed =
        speedFor(
            sprite.width
        );

    const vx =
        reverse == 1
            ? -speed
            : speed;
    
    const laneIndex =
        findCenterLane(
            metrics.width,
            metrics.height,
            vx
        );

    if (laneIndex === null) {
        return false;
    }

    const now =
        performance.now();

    
    const edgeMargin = 1;

    const comment = {
        text,
        mode: "scroll",

        x:
            reverse == 1
                ? -sprite.width
                : W,

        y:
            CONFIG.laneHeight / 2 +
            laneIndex *
            CONFIG.laneHeight,

        width: metrics.width,
        height: metrics.height,

        sprite: sprite.canvas,

        spriteWidth: sprite.width,
        spriteHeight: sprite.height,

        glyphX: sprite.glyphX,
        glyphY: sprite.glyphY,

        anchorX: sprite.anchorX,
        anchorY: sprite.anchorY,

        color,
        alpha: CONFIG.style.opacity,

        font: metrics.font,

        vx,

        born: now,
        lifetime: null,

        laneIndex
    };

    comments.push(
        comment
    );

    centerLanes[
        laneIndex
    ].comments.push(
        comment
    );

    return comment;
}



function createComment(
    text,
    mode = "scroll",
    color = 16777215,
    reverse = 0,
) {
    if (
        mode === "top" ||
        mode === "bottom"
    ) {
        return createFixedComment(
            text,
            mode,
            color
        );
    }

    return createScrollComment(
        text,
        color,
        reverse
    );
}



function removeComment(index) {
    const c =
        comments[index];

    if (!c) {
        return;
    }

    if (
        c.mode === "scroll"
    ) {
        const lane =
            centerLanes[
                c.laneIndex
            ];

        if (lane) {
            const laneIndex =
                lane.comments.indexOf(c);

            if (laneIndex !== -1) {
                lane.comments.splice(
                    laneIndex,
                    1
                );
            }
        }
    }

    comments.splice(
        index,
        1
    );
}


function drawComment(c) {
    ctx.globalAlpha = c.alpha;

    let glyphCenterX;

    if (c.mode === "scroll") {
        glyphCenterX =
            c.x +
            c.width / 2;
    } else {
        glyphCenterX =
            c.x;
    }

    const spriteX =
        glyphCenterX -
        c.anchorX;

    const spriteY =
        c.y -
        c.anchorY;

    ctx.drawImage(
        c.sprite,
        Math.round(spriteX),
        Math.round(spriteY)
    );
}



canvas.addEventListener(
    "click",
    () => {
        const r =
            Math.random();

        createComment(
            "点击成功 " +
            samples[
                Math.floor(
                    Math.random() *
                    samples.length
                )
            ],

            r < 0.5
                ? "scroll"
                : r < 0.75
                    ? "top"
                    : "bottom"
        );
    }
);



let last =
    performance.now();

function frame(now) {
    if (!now) {
        now = performance.now();
    }

    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));

    last = now;

    ctx.clearRect(
        0,
        0,
        W,
        H
    );

    
    for (
        let i = comments.length - 1;
        i >= 0;
        i--
    ) {
        const c =
            comments[i];

        if (
            c.mode === "scroll"
        ) {
            c.x -=
                c.vx * dt;

            if (
                c.x + c.width < -30
            ) {
                removeComment(i);
                continue;
            }
        } else {
            if (
                now -
                c.born >
                c.lifetime
            ) {
                removeComment(i);
                continue;
            }
        }

        drawComment(c);
    }

    ctx.globalAlpha = 1;

    requestAnimationFrame(
        frame
    );
}

requestAnimationFrame(
    frame
);
