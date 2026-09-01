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

function drawMode7YAxis3D(ctx, sprite, yRotation) {
    const angle = degree(yRotation);

    const width = sprite.width;
    const height = sprite.height;

    const halfW = width / 2;
    const halfH = height / 2;

    /*
     * Camera focal length.
     * Larger = weaker perspective.
     */
    const focal = CONFIG.mode7.focalLength ?? 1000;

    /*
     * Rotate a 3D point around Y.
     */
    function rotateY(px, py, pz) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return {
            x: px * c + pz * s,
            y: py,
            z: -px * s + pz * c,
        };
    }

    /*
     * Project 3D -> 2D.
     */
    function project(v) {
        const depth = focal + v.z;

        if (depth <= 1) {
            return null;
        }

        const scale = focal / depth;

        return {
            x: v.x * scale,
            y: v.y * scale,
            scale,
        };
    }

    /*
     * Y-axis rotation requires VERTICAL slices (columns) 
     * to accurately simulate perspective scaling along the X axis.
     */
    const slices = 32;
    const sourceSliceWidth = width / slices;

    // Calculate DPR specific to the sprite cache
    const spriteDprX = sprite.canvas.width / sprite.width;

    ctx.save();

    // Mode 7 typically anchors top-left, but 3D transforms should pivot around the center.
    ctx.translate(halfW, halfH);

    for (let i = 0; i < slices; i++) {
        const u0 = i / slices;
        const u1 = (i + 1) / slices;

        /*
         * Source-space X coordinates (relative to center).
         */
        const x0 = -halfW + width * u0;
        const x1 = -halfW + width * u1;

        /*
         * Project the left and right boundaries of this column.
         */
        const p0 = project(rotateY(x0, 0, 0));
        const p1 = project(rotateY(x1, 0, 0));

        if (!p0 || !p1) {
            continue;
        }

        /*
         * Width and placement of the strip after perspective.
         */
        const destX = p0.x;
        const destWidth = p1.x - p0.x;

        const destHeight = height * p0.scale;
        const destY = -destHeight / 2;

        /*
         * Draw the vertical source column projected onto the canvas.
         */
        ctx.drawImage(
            sprite.canvas,

            // Source coordinates (accounting for sprite Cache DPR)
            Math.floor(i * sourceSliceWidth * spriteDprX),
            0,
            Math.ceil(sourceSliceWidth * spriteDprX),
            sprite.canvas.height,

            // Destination coordinates
            destX,
            destY,
            destWidth,
            destHeight
        );
    }

    ctx.restore();
}

function drawMode7(ctx, danmaku, time) {
    const frame = mode7_frame(
        danmaku,
        time
    );

    if (!frame) {
        return false;
    }

    const sprite = getMode7Sprite(danmaku);

    const logicalWidth = canvas.width / CONFIG.dpr;
    const logicalHeight = canvas.height / CONFIG.dpr;

    let sx = 1;
    let sy = 1;


    ctx.save();

    // Base coordinate translation (anchors to top-left of the sprite's starting location)
    ctx.translate(
        frame.x * sx,
        frame.y * sy
    );

    /*
     * Z-axis rotation.
     */
    if (frame.zRotation !== 0) {
        ctx.rotate(
            degree(frame.zRotation)
        );
    }

    ctx.globalAlpha = Math.max(
        0,
        Math.min(
            1,
            frame.opacity
        )
    );

    if (frame.yRotation !== 0) {
        // We pass only ctx, sprite, and rotation. 
        // Translation is already managed by the parent block to prevent double-offsets.
        drawMode7YAxis3D(
            ctx,
            sprite,
            frame.yRotation
        );
    } else {
        ctx.drawImage(
            sprite.canvas,
            0,
            0,
            sprite.canvas.width,
            sprite.canvas.height,
            0,
            0,
            sprite.width,
            sprite.height
        );
    }

    ctx.restore();

    return true;
}