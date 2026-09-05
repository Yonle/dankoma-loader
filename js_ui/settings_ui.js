import { dankoma } from "../js/player.js";

let settingsDescriptions = {};

async function loadSettingsDescriptions() {
    const response = await fetch("settings_desc.json");

    if (!response.ok) {
        throw new Error(
            `failed to fetch settings_desc.json: ${response.status}`
        );
    }

    settingsDescriptions = await response.json();
}

function getSettingDescription(path) {
    return (
        settingsDescriptions[path] ||
        path
    );
}

function flattenConfig(value, prefix = "") {
    const result = [];

    for (const [key, current] of Object.entries(value)) {
        const path = prefix
            ? `${prefix}.${key}`
            : key;

        if (
            current !== null &&
            typeof current === "object" &&
            !Array.isArray(current)
        ) {
            result.push(
                ...flattenConfig(current, path)
            );
        } else {
            result.push({
                path,
                value: current,
            });
        }
    }

    return result;
}

function getConfigValue(path) {
    const parts = path.split(".");
    let value = dankoma.config;

    for (const part of parts) {
        value = value?.[part];
    }

    return value;
}

function setConfigValue(path, value) {
    const parts = path.split(".");
    const last = parts.pop();

    // Build a minimal nested config object.
    let update = {};
    let target = update;

    for (const part of parts) {
        target[part] = {};
        target = target[part];
    }

    target[last] = value;

    dankoma.updateConfig(update);

    /*
     * Some settings require additional renderer state changes.
     */

    if (path === "dpr") {
        /*
         * updateConfig() already updates SPRITE_DPR,
         * but existing cached sprites were created
         * using the previous DPR.
         *
         * Clear the relevant caches so new sprites use
         * the new DPR.
         */
        dankoma.mode7RenderedCache = new WeakMap();
        dankoma.mode7SpriteCache.clear();
        dankoma.renderCache.clear();
    }

    if (path === "laneHeight") {
        dankoma.rebuildLanes();
        renderSettings();
    }
}

function createSettingControl(path, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "setting";

    const info = document.createElement("div");
    info.className = "setting-info";

    const name = document.createElement("div");
    name.className = "setting-name";
    name.textContent = path;

    const desc = document.createElement("div");
    desc.className = "setting-desc";
    desc.textContent =
        getSettingDescription(path);

    info.appendChild(name);
    info.appendChild(desc);

    let input;

    if (typeof value === "boolean") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = value;

        input.addEventListener("change", () => {
            setConfigValue(
                path,
                input.checked
            );
        });

    } else if (typeof value === "number") {
        input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.value = value;

        input.addEventListener("change", () => {
            const next = Number(input.value);

            if (Number.isFinite(next)) {
                setConfigValue(
                    path,
                    next
                );
            }
        });

    } else {
        input = document.createElement("input");
        input.type = "text";
        input.value = String(value);

        input.addEventListener("change", () => {
            setConfigValue(
                path,
                input.value
            );
        });
    }

    wrapper.appendChild(info);
    wrapper.appendChild(input);

    return wrapper;
}

function renderSettings() {
    const list =
        document.getElementById("settingsList");

    list.replaceChildren();

    for (const setting of flattenConfig(dankoma.config)) {
        list.appendChild(
            createSettingControl(
                setting.path,
                setting.value
            )
        );
    }
}

const settingsPopup =
    document.getElementById("settingsPopup");

const settingsClose =
    document.getElementById("settingsClose");

settings.addEventListener("click", () => {
    settingsPopup.hidden =
        !settingsPopup.hidden;

    if (!settingsPopup.hidden) {
        renderSettings();
    }
});

settingsClose.addEventListener("click", () => {
    settingsPopup.hidden = true;
});

loadSettingsDescriptions().catch((err) => {
    console.error(
        "Failed to load settings descriptions:",
        err
    );
});
