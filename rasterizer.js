const renderCache = new Map();

function createSprite(text, fixed, color) {
    const metrics = getMetrics(text, fixed);

    const paddingX = 4;
    const paddingY = 10;

    const glyphWidth = metrics.width;
    const glyphHeight = metrics.height;

    const width =
        Math.ceil(glyphWidth + paddingX * 2);

    const height =
        Math.ceil(glyphHeight + paddingY * 2);

    const sprite = document.createElement("canvas");

    sprite.width = width;
    sprite.height = height;

    const spriteCtx = sprite.getContext("2d");

    spriteCtx.font = metrics.font;
    spriteCtx.textAlign = "left";
    spriteCtx.textBaseline = "alphabetic";
    spriteCtx.fillStyle = color;

    spriteCtx.fillText(
        text,
        paddingX,
        paddingY + metrics.ascent
    );

    return {
        canvas: sprite,

        width,
        height,

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
