import {
    playPause,
    seekbar,
    volume,
    canvasToggle,
    fullscreen,
} from "./videocontrol.js";

import { openLoader } from "./nwloader.js";

const loadButton =
    document.querySelector(
        '#nwMenuBar [data-action="load"]'
    );

if (!loadButton) {
    console.warn(
        'Keyboard shortcut: Load menu item not found.'
    );
}

function seek(seconds) {
    const value =
        Number(seekbar.value) +
        (seconds / document.querySelector("video").duration) * 100;

    seekbar.value = Math.max(
        0,
        Math.min(100, value),
    );

    seekbar.dispatchEvent(
        new Event("input", {
            bubbles: true,
        }),
    );
}

function changeVolume(delta) {
    const value = Math.max(
        0,
        Math.min(
            1,
            Number(volume.value) + delta,
         ),
     );
     
     volume.value = value;
     volume.dispatchEvent(
        new Event("input", {
            bubbles: true, 
        }), 
    ); 
}

document.addEventListener("keydown", event => {
    /*
     * Don't hijack keyboard input while typing into
     * form controls.
     */
    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    ) {
        return;
    }

    switch (event.code) {
        case "Space":
            event.preventDefault();
            playPause.click();
            break;

        case "ArrowLeft":
            event.preventDefault();

            seek(
                event.shiftKey
                    ? -10
                    : -5
            );

            break;

        case "ArrowRight":
            event.preventDefault();

            seek(
                event.shiftKey
                    ? 10
                    : 5
            );

            break;

        case "ArrowUp":
            event.preventDefault();
            changeVolume(0.05);
            break;
            
        case "ArrowDown":
            event.preventDefault();
            changeVolume(-0.05);
            break;

        case "KeyL":
            event.preventDefault();

            if (loadButton) {
                loadButton.click();
            }

            break;

        case "KeyF":
            event.preventDefault();
            fullscreen.click();
            break;

        case "KeyD":
            event.preventDefault();
            canvasToggle.click();
            break;

        case "KeyO":
            event.preventDefault();
            openLoader();
            break;
    }
});