/*
 * Bilibili Mode 7 payload:
 *
 * [
 *   startX,
 *   startY,
 *   opacity,
 *   lifetime,
 *   text,
 *   zRotation,
 *   yRotation,
 *   endX,
 *   endY,
 *   moveDuration,
 *   delay,
 *   outline,
 *   font,
 *   linear
 * ]
 */

const mode7RenderedCache = new WeakMap();

/* ---------------------------------------------------------
 * Helpers
 * ------------------------------------------------------ */

function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function degree(value) {
    return number(value) * Math.PI / 180;
}

function parseOpacity(value) {
    if (typeof value === "number") {
        return {
            from: value,
            to: value,
        };
    }

    const parts = String(value ?? "1-1").split("-");

    return {
        from: Math.max(0, Math.min(1, number(parts[0], 1))),
        to: Math.max(0, Math.min(1, number(parts[1], number(parts[0], 1)))),
    };
}

/*
 * Mode 7 coordinates:
 *
 * 0 <= coordinate <= 1  -> relative
 * coordinate > 1        -> absolute pixel coordinate
 *
 * This is based on observed Mode 7 implementations/specifications.
 */
function parseCoordinate(value, axisSize) {
    const n = number(value);

    if (n >= 0 && n <= 1) {
        return n * axisSize;
    }

    return n;
}

/* ---------------------------------------------------------
 * Easing
 * ------------------------------------------------------ */

/*
 * linear = 1:
 *     straight interpolation.
 *
 * linear = 0:
 *     Bilibili's behavior is not simply "linear".
 *     WIP approximation: decelerating motion.
 *
 * This is intentionally isolated so it can be replaced
 * after we test against real samples.
 */

function mode7_ease(t, linear) {
    t = Math.max(0, Math.min(1, t));

    if (linear) {
        return t;
    }

    // WIP approximation of the observed deceleration.
    return 1 - (1 - t) * (1 - t);
}


/* ---------------------------------------------------------
 * Creation
 * ------------------------------------------------------ */

/*
 * Accepts a complete Bilibili danmaku array:
 *
 * [
 *   payload,
 *   time,
 *   mode,
 *   ctime,
 *   color,
 *   fontsize
 * ]
 *
 * Example:
 *
 * createMode7([
 *   "[\"630\",\"347\",\"1-1\",\"5\",\"hello\",0,0,\"163\",\"167\",500,0,1,\"SimHei\",1]",
 *   14.163,
 *   7,
 *   1650616205,
 *   16755202,
 *   10
 * ]);
 */

function createMode7(record) {
    if (!Array.isArray(record)) {
        throw new TypeError("mode7 record must be an array");
    }

    const payload = record[0];

    const startTime = number(record[1]);
    const mode = number(record[2]);
    const color = number(record[4], 0xffffff);
    
    const fontSize = number(record[5], CONFIG.fonts.fixed);

    if (mode !== 7) {
        throw new Error(`expected Mode 7, got mode ${mode}`);
    }

    let data;

    try {
        data = typeof payload === "string"
            ? JSON.parse(payload)
            : payload;
    } catch (error) {
        throw new Error(
            `failed to parse Mode 7 payload: ${error.message}`
        );
    }

    if (!Array.isArray(data) || data.length < 5) {
        throw new Error("invalid Mode 7 payload");
    }

    const legacy = data.length < 14;

    const width = canvas.width / CONFIG.dpr;
    const height = canvas.height / CONFIG.dpr;

    let opacity;
    let x1;
    let y1;
    let x2;
    let y2;
    let lifetime;
    let moveDuration;
    let delay;
    let zRotation = 0;
    let yRotation = 0;
    let linear = 1;
    let fontFamily = data.length >= 12 ? mode7FontFamily(data[12]) : CONFIG.fonts.family;
    let outline = 0;

    if (!legacy) {
        opacity = parseOpacity(data[2]);

        x1 = parseCoordinate(data[0], width);
        y1 = parseCoordinate(data[1], height);

        x2 = parseCoordinate(data[7], width);
        y2 = parseCoordinate(data[8], height);

        lifetime = Math.max(
            0,
            number(data[3], 0) * 1000
        );

        moveDuration = Math.max(
            0,
            number(data[9], 0)
        );

        delay = Math.max(
            0,
            number(data[10], 0)
        );

        zRotation = number(data[5], 0);
        yRotation = number(data[6], 0);

        fontFamily = data[12]
            ? `"${data[12]}", ${CONFIG.fonts.family}`
            : CONFIG.fonts.family;

        outline = number(data[11], 0);
        linear = number(data[13], 1);
    } else {
        x1 = parseCoordinate(data[0], width);
        y1 = parseCoordinate(data[1], height);

        opacity = parseOpacity(data[2]);

        lifetime = Math.max(
            0,
            number(data[3], 0) * 1000
        );

        x2 = x1;
        y2 = y1;

        moveDuration = 0;
        delay = 0;

        // Legacy Mode 7 has no advanced transform/font fields.
        zRotation = 0;
        yRotation = 0;
        fontFamily = CONFIG.fonts.family;
        outline = 0;
        linear = 1;
    }

    const danmaku = {
        mode: 7,

        startTime,

        raw: data,

        text: String(data[4] ?? ""),

        fontSize,
        fontFamily,
        fontWeight: CONFIG.fonts.weight,
        color,

        outline: Boolean(outline),
        outlineWidth: CONFIG.mode7.outlineWidth,

        x1,
        y1,
        x2,
        y2,

        zRotation,
        yRotation,

        lifetime,
        moveDuration,
        delay,

        opacityFrom: opacity.from,
        opacityTo: opacity.to,

        linear: Boolean(linear),

        sprite: null,
    };

    return danmaku;
}

/* ---------------------------------------------------------
 * Mode 7 rendered-sprite cache
 * ------------------------------------------------------ */

function getMode7RenderedSprite(danmaku) {
    const sprite = getMode7Sprite(danmaku);

    if (danmaku.yRotation === 0) {
        return sprite;
    }

    const focal = CONFIG.mode7.focalLength ?? 1000;

    const slices = Math.min(
        24,
        Math.max(
            8,
            Math.ceil(sprite.width / 8)
        )
    );

    const rotationKey =
        Math.round(danmaku.yRotation * 10) / 10;

    let cache = mode7RenderedCache.get(sprite);

    if (!cache) {
        cache = new Map();
        mode7RenderedCache.set(sprite, cache);
    }

    const key = `${rotationKey}:${focal}:${slices}`;

    let rendered = cache.get(key);

    if (rendered) {
        return rendered;
    }

    const angle = degree(rotationKey);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const width = sprite.width;
    const height = sprite.height;

    const halfW = width / 2;

    const spriteDpr =
        sprite.canvas.width / sprite.width;

    const srcCanvasWidth =
        sprite.canvas.width;

    const srcH =
        sprite.canvas.height;

    const leftX = -halfW;
    const rightX = halfW;

    const leftDepth =
        focal - leftX * sinA;

    const rightDepth =
        focal - rightX * sinA;

    if (leftDepth <= 1 || rightDepth <= 1) {
        return sprite;
    }

    const leftScale =
        focal / leftDepth;

    const rightScale =
        focal / rightDepth;

    const leftProjectedX =
        leftX * cosA * leftScale;

    const rightProjectedX =
        rightX * cosA * rightScale;

    const minX =
        Math.min(
            leftProjectedX,
            rightProjectedX
        );

    const maxX =
        Math.max(
            leftProjectedX,
            rightProjectedX
        );

    const projectedHeight =
        height *
        Math.max(
            leftScale,
            rightScale
        );

    const pad = 2;

    const outputWidth =
        Math.ceil(maxX - minX) +
        pad * 2;

    const outputHeight =
        Math.ceil(projectedHeight) +
        pad * 2;

    const outputCanvas =
        document.createElement("canvas");

    outputCanvas.width =
        Math.ceil(outputWidth * spriteDpr);

    outputCanvas.height =
        Math.ceil(outputHeight * spriteDpr);

    const out =
        outputCanvas.getContext("2d", {
            alpha: true,
        });

    out.setTransform(
        spriteDpr,
        0,
        0,
        spriteDpr,
        0,
        0
    );

    out.translate(
        -minX + pad,
        projectedHeight / 2 + pad
    );

    for (let i = 0; i < slices; i++) {
        const x0 =
            -halfW +
            width * i / slices;

        const x1 =
            -halfW +
            width * (i + 1) / slices;

        const rotX0 =
            x0 * cosA;

        const rotZ0 =
            -x0 * sinA;

        const depth0 =
            focal + rotZ0;

        if (depth0 <= 1) {
            continue;
        }

        const scale0 =
            focal / depth0;

        const destX0 =
            rotX0 * scale0;

        const rotX1 =
            x1 * cosA;

        const rotZ1 =
            -x1 * sinA;

        const depth1 =
            focal + rotZ1;

        if (depth1 <= 1) {
            continue;
        }

        const scale1 =
            focal / depth1;

        const destX1 =
            rotX1 * scale1;

        const destWidth =
            destX1 - destX0;

        if (destWidth <= 0) {
            continue;
        }

        const destHeight =
            height * scale0;

        const destY =
            -destHeight / 2;

        const srcX0 =
            Math.floor(
                srcCanvasWidth * i / slices
            );

        const srcX1 =
            Math.floor(
                srcCanvasWidth * (i + 1) / slices
            );

        const srcW =
            srcX1 - srcX0;

        if (srcW <= 0) {
            continue;
        }

        out.drawImage(
            sprite.canvas,
            srcX0,
            0,
            srcW,
            srcH,
            destX0,
            destY,
            destWidth,
            destHeight
        );
    }

    rendered = {
        canvas: outputCanvas,
        width: outputWidth,
        height: outputHeight,
        offsetX: minX - pad,
        offsetY: -projectedHeight / 2 - pad,
    };

    cache.set(key, rendered);

    return rendered;
}

/* ---------------------------------------------------------
 * Frame evaluation
 * ------------------------------------------------------ */

/*
 * `time` is VIDEO TIME in seconds.
 *
 * Returns the complete state needed by drawMode7().
 */
function mode7_frame(danmaku, time) {
    const elapsed =
        (number(time) - danmaku.startTime) * 1000;

    /*
     * Not visible before the scheduled timestamp.
     */
    if (elapsed < 0) {
        return null;
    }

    /*
     * Lifetime is measured from the start of
     * the Mode 7 object's appearance.
     */
    if (elapsed > danmaku.lifetime) {
        return null;
    }

    /*
     * Delay happens before movement begins.
     */
    const movementTime =
        elapsed - danmaku.delay;

    let movementProgress = 0;

    if (danmaku.moveDuration <= 0) {
        movementProgress =
            movementTime >= 0
                ? 1
                : 0;
    } else if (movementTime <= 0) {
        movementProgress = 0;
    } else {
        movementProgress =
            Math.min(
                1,
                movementTime / danmaku.moveDuration
            );
    }

    const eased =
        mode7_ease(
            movementProgress,
            danmaku.linear
        );

    const x =
        danmaku.x1 +
        (danmaku.x2 - danmaku.x1) * eased;

    const y =
        danmaku.y1 +
        (danmaku.y2 - danmaku.y1) * eased;

    /*
     * Opacity is interpolated across lifetime.
     */
    const lifetimeProgress =
        danmaku.lifetime > 0
            ? Math.min(
                1,
                Math.max(
                    0,
                    elapsed / danmaku.lifetime
                )
            )
            : 1;

    const opacity =
        danmaku.opacityFrom +
        (
            danmaku.opacityTo -
            danmaku.opacityFrom
        ) *
        lifetimeProgress;

    return {
        x,
        y,

        opacity,

        zRotation: danmaku.zRotation,
        yRotation: danmaku.yRotation,

        movementProgress,
        lifetimeProgress,
    };
}


/* ---------------------------------------------------------
 * Drawing
 * ------------------------------------------------------ */

function drawMode7(ctx, danmaku, time) {
    const frame = mode7_frame(danmaku, time);

    if (!frame) {
        return false;
    }

    const sprite =
        getMode7RenderedSprite(danmaku);

    ctx.save();

    ctx.translate(
        frame.x,
        frame.y
    );

    if (frame.zRotation !== 0) {
        ctx.rotate(
            degree(frame.zRotation)
        );
    }

    ctx.globalAlpha =
        Math.max(
            0,
            Math.min(1, frame.opacity)
        );

    if (danmaku.yRotation === 0) {
        ctx.drawImage(
            sprite.canvas,
            0,
            0,
            sprite.width,
            sprite.height
        );
    } else {
        ctx.drawImage(
            sprite.canvas,
            sprite.offsetX,
            sprite.offsetY,
            sprite.width,
            sprite.height
        );
    }

    ctx.restore();

    return true;
}