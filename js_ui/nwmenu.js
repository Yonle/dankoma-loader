import { openLoader } from "./nwloader.js";
import { openAbout } from "./about.js";

const menuBar = document.querySelector("#nwMenuBar");

if (!menuBar) {
    throw new Error(
        'Missing #nwMenuBar element.'
    );
}

const menus = [
    ...menuBar.querySelectorAll(".menu"),
];

function closeMenus(except = null) {
    for (const menu of menus) {
        if (menu !== except) {
            menu.classList.remove("open");
        }
    }
}

for (const menu of menus) {
    const button = menu.querySelector(".menu-button");

    button.addEventListener("click", event => {
        event.stopPropagation();

        const isOpen =
            menu.classList.contains("open");

        closeMenus();

        if (!isOpen) {
            menu.classList.add("open");
        }
    });
}

menuBar.addEventListener("click", event => {
    const item =
        event.target.closest(".menu-item");

    if (!item) {
        return;
    }

    const action = item.dataset.action;

    closeMenus();

    switch (action) {
        case "load":
            openLoader();
            break;

        case "about":
            openAbout();
            break;
    }
});

document.addEventListener("click", () => {
    closeMenus();
});