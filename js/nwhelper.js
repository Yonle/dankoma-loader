const path = require("node:path");
const { pathToFileURL } = require("node:url");

export function getArguments() {
    return [
        ...nw.App.argv,
    ];
}

export function pathToURL(filePath) {
    if (
        typeof filePath !== "string" ||
        !filePath
    ) {
        throw new TypeError(
            "Expected a filesystem path."
        );
    }

    return pathToFileURL(
        path.resolve(filePath),
    ).href;
}

export function onOpen(callback) {
    return nw.App.on("open", args => {
        callback([
            ...args,
        ]);
    });
}