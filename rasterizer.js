const renderCache = new Map();

function makeCanvas(width, height) {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}


function drawText(
    ctx,
    text,
    color,
    paddingX,
    paddingY,
    metrics
) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "#000";

    ctx.strokeText(
        text,
        paddingX,
        paddingY + metrics.ascent
    );

    ctx.fillStyle = color;

    ctx.fillText(
        text,
        paddingX,
        paddingY + metrics.ascent
    );
}

const SPRITE_DPR = CONFIG.dpr;

function createSprite(text, fixed, color) {
    const metrics = getMetrics(text, fixed);

    const paddingX = 4;
    const paddingY = 10;

    const glyphWidth = metrics.width;
    const glyphHeight = metrics.height;

    const logicalWidth =
        Math.ceil(glyphWidth + paddingX * 2);

    const logicalHeight =
        Math.ceil(glyphHeight + paddingY * 2);

    const width =
        Math.ceil(logicalWidth * SPRITE_DPR);

    const height =
        Math.ceil(logicalHeight * SPRITE_DPR);

    const canvas =
        makeCanvas(width, height);

    const ctx =
        canvas.getContext("2d");

    ctx.scale(SPRITE_DPR, SPRITE_DPR);

    ctx.font = metrics.font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    drawText(
        ctx,
        text,
        color,
        paddingX,
        paddingY,
        metrics
    );

    return {
        canvas,

        width: logicalWidth,
        height: logicalHeight,

        glyphWidth,
        glyphHeight,

        glyphX: paddingX,
        glyphY: paddingY,

        anchorX:
            paddingX +
            glyphWidth / 2,

        anchorY:
            paddingY +
            glyphHeight / 2
    };
}

function getSprite(text, fixed, color) {
    const key =
        `${fixed ? "fixed" : "scroll"}|${color}|${text}`;

    let sprite = renderCache.get(key);

    if (sprite) {
        return sprite;
    }

    sprite = createSprite(
        text,
        fixed,
        color
    );

    renderCache.set(key, sprite);

    return sprite;
}
