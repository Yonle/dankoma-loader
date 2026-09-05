const dankomaPackage =
    require("../modules/dankoma.js/package.json");

const dankomaConvPackage =
    require("../modules/dankomaconv.js/package.json");

let activeAbout = null;

async function createAbout() {
    const response =
        await fetch("./templ/about.html");

    if (!response.ok) {
        throw new Error(
            `Failed to load about template: ` +
            `${response.status} ${response.statusText}`
        );
    }

    const html =
        await response.text();

    const template =
        document.createElement("template");

    template.innerHTML = html.trim();

    const overlay =
        template.content.firstElementChild;

    if (!overlay) {
        throw new Error(
            "About template is empty."
        );
    }

    const version =
        overlay.querySelector(
            "#aboutVersion"
        );

    const dankomaVersion =
        overlay.querySelector(
            "#aboutDankomaVersion"
        );

    const dankomaConvVersion =
        overlay.querySelector(
            "#aboutDankomaConvVersion"
        );

    const closeButton =
        overlay.querySelector(
            "#aboutCloseButton"
        );

    if (
        !version ||
        !dankomaVersion ||
        !dankomaConvVersion ||
        !closeButton
    ) {
        throw new Error(
            "About template is missing required elements."
        );
    }

    version.textContent =
        require("../package.json").version;

    dankomaVersion.textContent =
        dankomaPackage.version;

    dankomaConvVersion.textContent =
        dankomaConvPackage.version;

    overlay.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            nw.Shell.openExternal(
                link.href,
            );
        });
    });

    return {
        overlay,
        closeButton,
    };
}

function closeAbout() {
    if (!activeAbout) {
        return;
    }

    activeAbout.overlay.remove();
    activeAbout = null;
}

export async function openAbout() {
    if (activeAbout) {
        return;
    }

    try {
        const about =
            await createAbout();

        activeAbout = about;

        about.overlay.hidden = false;

        document.body.appendChild(
            about.overlay,
        );

        about.closeButton.addEventListener(
            "click",
            closeAbout,
        );
    } catch (error) {
        console.error(
            "Failed to open About dialog:",
            error,
        );
    }
}