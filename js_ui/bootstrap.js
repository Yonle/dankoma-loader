const isNW = typeof nw !== "undefined";

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = src;

        script.addEventListener("load", resolve);

        script.addEventListener("error", () => {
            reject(new Error(
                `Failed to load script: ${src}`
            ));
        });

        document.head.appendChild(script);
    });
}

async function main() {
    const dankoma = isNW
        ? "../modules/dankoma.js/js/dankoma.js"
        : "https://cdn.jsdelivr.net/npm/dankoma.js@0.1.3";

    await loadScript(dankoma);
    await import("./videocontrol.js");
    await import("./settings_ui.js");
    await import("./keybind.js");

    if (isNW) {
        await import("./nwmenu.js");
        await import("../js/nwmain.js");
        await import("./converterUI.js")
        return
    }

    await import("./web_samples.js");
    
    const { setupWebMenu } = await import("./advert_desktopapp.js");
    const { openLoader } = await import("./nwloader.js");
    openLoader()
    setupWebMenu()
}

main().catch(error => {
    console.error(
        "Failed to initialize DankomaP:",
        error,
    );
});