const mode7SpriteCache = new Map();

/* ---------------------------------------------------------
 * Helpers
 * ------------------------------------------------------ */

function mode7FontFamily(value) {
    if (!value) {
        return CONFIG.fonts.family;
    }

    let font = String(value).trim();

    // If Bilibili already supplied a quoted font name,
    // don't quote it again.
    if (
        font.length >= 2 &&
        (
            (font[0] === '"' && font[font.length - 1] === '"') ||
            (font[0] === "'" && font[font.length - 1] === "'")
        )
    ) {
        return `${font}, ${CONFIG.fonts.family}`;
    }

    return `"${font}", ${CONFIG.fonts.family}`;
}

/* ---------------------------------------------------------
 * Sprite generation
 * ------------------------------------------------------ */

function buildMode7Sprite(danmaku) {
    const {
        text,
        fontSize,
        fontFamily,
        fontWeight,
        color,
        outline,
        outlineWidth,
    } = danmaku;

    const lines = String(text).split("\n");

    const font =
        `${fontWeight} ${fontSize}px ${fontFamily}`;

    /*
     * Measure in logical pixels.
     */
    const measureCanvas = makeCanvas(1, 1);
    const measureCtx = measureCanvas.getContext("2d", {
        alpha: false,
    });

    measureCtx.font = font;
    measureCtx.textBaseline = "top";

    let textWidth = 0;

    for (const line of lines) {
        textWidth = Math.max(
            textWidth,
            measureCtx.measureText(line).width
        );
    }

    /*
     * Give each line enough room for the actual font.
     */
    const lineHeight = Math.max(
        CONFIG.laneHeight,
        Math.ceil(fontSize * 1.25)
    );

    const padding = outline
        ? Math.ceil(
            outlineWidth * 2 +
            fontSize * 0.1
        )
        : Math.ceil(
            fontSize * 0.1
        );

    const logicalWidth = Math.max(
        1,
        Math.ceil(
            textWidth +
            padding * 2
        )
    );

    const logicalHeight = Math.max(
        1,
        Math.ceil(
            lines.length * lineHeight +
            padding * 2
        )
    );

    /*
     * Physical backing store.
     */
    const canvas = makeCanvas(
        Math.ceil(logicalWidth * SPRITE_DPR),
        Math.ceil(logicalHeight * SPRITE_DPR)
    );

    const ctx = canvas.getContext("2d", {
        alpha: true,
    });

    /*
     * Everything below this point uses logical pixels.
     */
    ctx.scale(
        SPRITE_DPR,
        SPRITE_DPR
    );

    ctx.font = font;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    for (let i = 0; i < lines.length; i++) {
        const x = padding;
        const y =
            padding +
            i * lineHeight;

        if (outline) {
            ctx.lineWidth = outlineWidth;
            ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(0, 0, 0, 1)";

            ctx.strokeText(
                lines[i],
                x,
                y
            );
        }

        ctx.fillStyle = rgbaFromRGB888(
            color,
            1
        );

        ctx.fillText(
            lines[i],
            x,
            y
        );
    }

    return {
        canvas,

        // Logical dimensions.
        width: logicalWidth,
        height: logicalHeight,
    };
}

/* ---------------------------------------------------------
 * Cache
 * ------------------------------------------------------ */

function getMode7Sprite(danmaku) {
    if (danmaku.sprite) {
        return danmaku.sprite;
    }

    const key = [
        danmaku.text,
        danmaku.fontSize,
        danmaku.fontFamily,
        danmaku.fontWeight,
        danmaku.color,
        danmaku.outline,
        danmaku.outlineWidth,
        CONFIG.laneHeight,
        SPRITE_DPR,
    ].join("|");

    let sprite = mode7SpriteCache.get(key);

    if (!sprite) {
        sprite = buildMode7Sprite(danmaku);
        mode7SpriteCache.set(key, sprite);
    }

    danmaku.sprite = sprite;

    return sprite;
}