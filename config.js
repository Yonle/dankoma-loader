let CONFIG = {
    laneHeight: 32,
    dpr: 1.5,

    fonts: {
        scroll: 28,
        fixed: 32,
        weight: 500,
        family: `"SimHei", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`
    },

    style: {
        opacity: 0.8
    },

    scroll: {
        duration: 6.5,
        lookahead: 8,
        gap: 2
    },

    fixed: {
        lifetime: 5000
    },

    mode7: {
        // Used when the embedded font doesn't specify anything.
        weight: 400,

        // Text outline.
        outlineWidth: 1,

        focalLength: 800,
    }
};

let height = 27

CONFIG.laneHeight = height
CONFIG.fonts.scroll = height
CONFIG.fonts.fixed = height