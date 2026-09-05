let activeAdvert = null;

async function createAdvert() {
    const response =
        await fetch("./templ/advert_desktopapp.html");

    if (!response.ok) {
        throw new Error(
            `Failed to load desktop app advert: ` +
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
            "Desktop app advert template is empty."
        );
    }

    const openButton =
        overlay.querySelector(
            "#desktopAppButton"
        );

    const closeButton =
        overlay.querySelector(
            "#desktopAppCloseButton"
        );

    if (!openButton || !closeButton) {
        throw new Error(
            "Desktop app advert template is missing required elements."
        );
    }

    return {
        overlay,
        openButton,
        closeButton,
    };
}

function closeAdvert() {
    if (!activeAdvert) {
        return;
    }

    activeAdvert.overlay.remove();
    activeAdvert = null;
}

export async function openDesktopAdvert() {
    if (activeAdvert) {
        return;
    }

    try {
        const advert =
            await createAdvert();

        activeAdvert = advert;

        advert.overlay.hidden = false;

        document.body.appendChild(
            advert.overlay,
        );

        advert.openButton.addEventListener(
            "click",
            () => {
                window.open(
                    "https://github.com/Yonle/dankomap/releases",
                    "_blank",
                );
            },
        );

        advert.closeButton.addEventListener(
            "click",
            closeAdvert,
        );
    } catch (error) {
        console.error(
            "Failed to open desktop app advert:",
            error,
        );
    }
}

export function setupWebMenu() {
    const menuBar =
        document.querySelector("#nwMenuBar");

    if (!menuBar) {
        return;
    }

    menuBar.replaceChildren();

    const menu = document.createElement("div");

    menu.className = "menu";

    menu.innerHTML = `
        <button
            class="menu-button"
            type="button"
        >
            Get DankomaP for Windows/Linux/Mac!
        </button>
    `;

    menuBar.appendChild(menu);

    menu.querySelector(".menu-button")
        .addEventListener(
            "click",
            openDesktopAdvert,
        );
}