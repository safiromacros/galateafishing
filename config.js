/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

const Files = Java.type("java.nio.file.Files");
const Paths = Java.type("java.nio.file.Paths");
const StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
const File = Java.type("java.io.File");

const CONFIG_PATH = "./config/ChatTriggers/modules/GF/settings.json";

const DEFAULTS = {
    macroEnabled: false,
    ign: "safiro",
    overlayEnabled: true,
    striderMode: 0,
    cleanupEnabled: false,
    oneTapEnabled: true,
    damagePerHit: 0,
    xpPerCatch: 1,

    striderSlot: 2,
    flaySlot3: 3,
    flaySlot2: 2,
    striderBase: 90000,
    striderJitter: 5000,
    striderLeftClickInterval: 250,
    striderLeftClickJitter: 30,

    killRange: 2.0,
    killClickInterval: 220,
    killClickJitter: 30,
    killYawThreshold: 12.0,
    killPitchThreshold: 10.0,
    killYawStep: 8.0,
    killPitchStep: 6.0,
    killReturnYawThreshold: 1.5,
    killReturnPitchThreshold: 1.0,
    killNoTargetTicks: 25,

    castCooldown: 100,
    detectMin: 80,
    detectMax: 160,
    recastMin: 200,
    recastMax: 450,
    humanPauseMin: 150,
    humanPauseMax: 250,
    stabilizeMin: 500,
    stabilizeMax: 900,
    armorName: "!!!",
    armorCheckInterval: 120
};

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function mergeDefaults(target, defaults) {
    Object.keys(defaults).forEach(k => {
        if (target[k] === undefined) target[k] = defaults[k];
    });
    return target;
}

function readConfig() {
    try {
        const path = Paths.get(CONFIG_PATH);
        if (!Files.exists(path)) return deepCopy(DEFAULTS);
        const raw = new java.lang.String(Files.readAllBytes(path), StandardCharsets.UTF_8);
        const data = JSON.parse(String(raw));
        return mergeDefaults(data, DEFAULTS);
    } catch (e) {
        return deepCopy(DEFAULTS);
    }
}

function writeConfig(data) {
    try {
        const file = new File(CONFIG_PATH);
        const parent = file.getParentFile();
        if (parent && !parent.exists()) parent.mkdirs();
        const json = JSON.stringify(data, null, 2);
        Files.write(Paths.get(CONFIG_PATH), new java.lang.String(json).getBytes(StandardCharsets.UTF_8));
    } catch (e) {
        try { console.log("[GF] Failed to save settings: " + e); } catch (err) {}
    }
}

const settings = readConfig();
Object.defineProperty(settings, "__gfCustomGui", { value: true, enumerable: false });
settings.save = () => writeConfig(settings);

// Screen GUI using CT Gui (lazy init)
let gui = null;
let guiInitialized = false;
let activeTab = 0;
let clickTargets = [];
let focusedField = null;
let blinkTick = 0;

const TABS = ["General", "Strider", "Cleanup", "Fishing"];

const CONTROLS = [
    {
        name: "General",
        items: [
            { type: "toggle", label: "Macro Enabled", key: "macroEnabled" },
            { type: "text", label: "Player IGN", key: "ign", maxLen: 16, filter: "ign" },
            { type: "select", label: "Strider Mode", key: "striderMode", options: ["melee", "flay"] },
            { type: "toggle", label: "Cleanup Enabled", key: "cleanupEnabled" },
            { type: "toggle", label: "Onetap Enabled", key: "oneTapEnabled" },
            { type: "number", label: "Damage Per Hit", key: "damagePerHit", maxLen: 12 },
            { type: "number", label: "XP Per Catch", key: "xpPerCatch", maxLen: 12 }
        ]
    },
    {
        name: "Strider",
        items: [
            { type: "slider", label: "Strider Slot", key: "striderSlot", min: 1, max: 9, step: 1 },
            { type: "slider", label: "Flay Slot 3", key: "flaySlot3", min: 1, max: 9, step: 1 },
            { type: "slider", label: "Flay Slot 2", key: "flaySlot2", min: 1, max: 9, step: 1 },
            { type: "slider", label: "Strider Base (ms)", key: "striderBase", min: 1000, max: 200000, step: 250 },
            { type: "slider", label: "Strider Jitter (ms)", key: "striderJitter", min: 0, max: 60000, step: 100 },
            { type: "slider", label: "Left Click Interval (ms)", key: "striderLeftClickInterval", min: 50, max: 500, step: 5 },
            { type: "slider", label: "Left Click Jitter (ms)", key: "striderLeftClickJitter", min: 0, max: 200, step: 5 }
        ]
    },
    {
        name: "Cleanup",
        items: [
            { type: "slider", label: "Kill Range", key: "killRange", min: 1.0, max: 6.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "Kill Click Interval", key: "killClickInterval", min: 50, max: 500, step: 5 },
            { type: "slider", label: "Kill Click Jitter", key: "killClickJitter", min: 0, max: 200, step: 5 },
            { type: "slider", label: "Kill Yaw Threshold", key: "killYawThreshold", min: 1.0, max: 45.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "Kill Pitch Threshold", key: "killPitchThreshold", min: 1.0, max: 45.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "Kill Yaw Step", key: "killYawStep", min: 1.0, max: 30.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "Kill Pitch Step", key: "killPitchStep", min: 1.0, max: 30.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "Return Yaw Threshold", key: "killReturnYawThreshold", min: 0.2, max: 10.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "Return Pitch Threshold", key: "killReturnPitchThreshold", min: 0.2, max: 10.0, step: 0.1, decimals: 1 },
            { type: "slider", label: "No Target Ticks", key: "killNoTargetTicks", min: 1, max: 100, step: 1 }
        ]
    },
    {
        name: "Fishing",
        items: [
            { type: "slider", label: "Cast Cooldown", key: "castCooldown", min: 50, max: 500, step: 5 },
            { type: "slider", label: "Detect Min", key: "detectMin", min: 0, max: 500, step: 5 },
            { type: "slider", label: "Detect Max", key: "detectMax", min: 0, max: 1000, step: 5 },
            { type: "slider", label: "Recast Min", key: "recastMin", min: 0, max: 1500, step: 10 },
            { type: "slider", label: "Recast Max", key: "recastMax", min: 0, max: 2000, step: 10 },
            { type: "slider", label: "Human Pause Min", key: "humanPauseMin", min: 0, max: 1000, step: 5 },
            { type: "slider", label: "Human Pause Max", key: "humanPauseMax", min: 0, max: 1000, step: 5 },
            { type: "slider", label: "Stabilize Min", key: "stabilizeMin", min: 0, max: 2000, step: 10 },
            { type: "slider", label: "Stabilize Max", key: "stabilizeMax", min: 0, max: 2500, step: 10 },
            { type: "text", label: "Armor Name", key: "armorName", maxLen: 24, filter: "any" },
            { type: "slider", label: "Armor Check Interval", key: "armorCheckInterval", min: 20, max: 500, step: 5 }
        ]
    }
];

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function roundToStep(val, step, decimals) {
    if (!step) return val;
    const rounded = Math.round(val / step) * step;
    if (decimals !== undefined) {
        const p = Math.pow(10, decimals);
        return Math.round(rounded * p) / p;
    }
    return rounded;
}

function drawCentered(text, x, y, w, color) {
    const width = Renderer.getStringWidth(text);
    Renderer.drawStringWithShadow(text, x + (w - width) / 2, y, color);
}

function addTarget(target) {
    clickTargets.push(target);
}

function isInside(mx, my, x, y, w, h) {
    return mx >= x && my >= y && mx <= x + w && my <= y + h;
}

function formatValue(item, value) {
    if (item.type === "toggle") return value ? "ON" : "OFF";
    if (item.type === "select") return item.options[value] || item.options[0];
    if (item.type === "slider" && item.decimals !== undefined) return String(value.toFixed(item.decimals));
    return String(value);
}

function drawToggle(x, y, w, h, item) {
    const value = !!settings[item.key];
    const color = value ? 0xFF2ECC71 : 0xFF555555;
    Renderer.drawRect(color, x + w - 40, y + 3, 34, h - 6);
    drawCentered(value ? "ON" : "OFF", x + w - 40, y + 5, 34, 0xFFFFFFFF);
    addTarget({ x, y, w, h, type: "toggle", item });
}

function drawSelector(x, y, w, h, item) {
    const value = settings[item.key] || 0;
    const text = formatValue(item, value);
    Renderer.drawRect(0xFF444444, x + w - 120, y + 3, 110, h - 6);
    drawCentered(text, x + w - 120, y + 5, 110, 0xFFFFFFFF);
    addTarget({ x: x + w - 120, y, w: 110, h, type: "select", item });
}

function drawSlider(x, y, w, h, item) {
    const min = item.min;
    const max = item.max;
    let value = settings[item.key];
    if (value === undefined) value = min;

    const trackX = x + w - 200;
    const trackW = 180;
    const trackY = y + h / 2 - 3;
    const t = clamp((value - min) / (max - min), 0, 1);

    Renderer.drawRect(0xFF333333, trackX, trackY, trackW, 6);
    Renderer.drawRect(0xFF5DADE2, trackX, trackY, trackW * t, 6);
    Renderer.drawRect(0xFFFFFFFF, trackX + trackW * t - 2, trackY - 2, 4, 10);

    const label = formatValue(item, value);
    Renderer.drawStringWithShadow(label, trackX + trackW + 6, y + 5, 0xFFFFFFFF);

    addTarget({ x: trackX, y: trackY - 4, w: trackW, h: 14, type: "slider", item });
}

function drawTextField(x, y, w, h, item) {
    const isFocused = focusedField === item.key;
    Renderer.drawRect(isFocused ? 0xFF3E3E3E : 0xFF2A2A2A, x + w - 200, y + 3, 190, h - 6);
    const value = settings[item.key] === undefined ? "" : String(settings[item.key]);
    const display = value + (isFocused && (blinkTick % 20) < 10 ? "_" : "");
    Renderer.drawStringWithShadow(display, x + w - 195, y + 6, 0xFFFFFFFF);
    addTarget({ x: x + w - 200, y, w: 190, h, type: "text", item });
}

function drawNumberField(x, y, w, h, item) {
    drawTextField(x, y, w, h, item);
}

function getScreenSize() {
    try {
        return { w: Renderer.screen.getWidth(), h: Renderer.screen.getHeight() };
    } catch (e) {}
    try {
        return { w: Renderer.getScreenWidth(), h: Renderer.getScreenHeight() };
    } catch (e) {}
    return { w: 0, h: 0 };
}

function initGui() {
    if (guiInitialized) return;
    guiInitialized = true;
    gui = new Gui();

    gui.registerDraw((mouseX, mouseY) => {
        blinkTick++;
        clickTargets = [];

        const size = getScreenSize();
        const screenW = size.w;
        const screenH = size.h;
        const width = 520;
        const height = 320;
        const x = (screenW - width) / 2;
        const y = (screenH - height) / 2;

        Renderer.drawRect(0xDD111111, x, y, width, height);
        Renderer.drawRect(0xFF222222, x, y, width, 26);
        Renderer.drawStringWithShadow("Safiro Macro Settings", x + 8, y + 8, 0xFFFFFFFF);

        const tabW = Math.floor(width / TABS.length);
        for (let i = 0; i < TABS.length; i++) {
            const tx = x + i * tabW;
            const active = i === activeTab;
            Renderer.drawRect(active ? 0xFF3A3A3A : 0xFF1E1E1E, tx, y + 26, tabW, 22);
            drawCentered(TABS[i], tx, y + 31, tabW, 0xFFFFFFFF);
            addTarget({ x: tx, y: y + 26, w: tabW, h: 22, type: "tab", tab: i });
        }

        const contentX = x + 12;
        let contentY = y + 56;
        const rowH = 22;
        const itemBlock = CONTROLS[activeTab];

        itemBlock.items.forEach(item => {
            Renderer.drawStringWithShadow(item.label, contentX, contentY + 6, 0xFFFFFFFF);
            const rowW = width - 24;
            if (item.type === "toggle") {
                drawToggle(contentX, contentY, rowW, rowH, item);
            } else if (item.type === "select") {
                drawSelector(contentX, contentY, rowW, rowH, item);
            } else if (item.type === "slider") {
                drawSlider(contentX, contentY, rowW, rowH, item);
            } else if (item.type === "text") {
                drawTextField(contentX, contentY, rowW, rowH, item);
            } else if (item.type === "number") {
                drawNumberField(contentX, contentY, rowW, rowH, item);
            }
            contentY += rowH + 6;
        });
    });

    gui.registerClicked((mouseX, mouseY, button) => {
        for (let i = 0; i < clickTargets.length; i++) {
            const t = clickTargets[i];
            if (!isInside(mouseX, mouseY, t.x, t.y, t.w, t.h)) continue;

            if (t.type === "tab") {
                activeTab = t.tab;
                focusedField = null;
                return;
            }
            if (t.type === "toggle") {
                settings[t.item.key] = !settings[t.item.key];
                settings.save();
                return;
            }
            if (t.type === "select") {
                const opts = t.item.options;
                let val = settings[t.item.key] || 0;
                val = (val + 1) % opts.length;
                settings[t.item.key] = val;
                settings.save();
                return;
            }
            if (t.type === "slider") {
                const min = t.item.min;
                const max = t.item.max;
                const step = t.item.step || 1;
                const decimals = t.item.decimals;
                const ratio = clamp((mouseX - t.x) / t.w, 0, 1);
                let v = min + (max - min) * ratio;
                v = roundToStep(v, step, decimals);
                settings[t.item.key] = v;
                settings.save();
                return;
            }
            if (t.type === "text" || t.type === "number") {
                focusedField = t.item.key;
                return;
            }
        }

        focusedField = null;
    });

    function keyMatch(code, name, fallback) {
        try {
            if (typeof Keyboard !== "undefined" && Keyboard[name] !== undefined) {
                return code === Keyboard[name];
            }
        } catch (e) {}
        return code === fallback;
    }

    gui.registerKeyTyped((typedChar, keyCode) => {
        if (!focusedField) return;

        const item = CONTROLS[activeTab].items.find(i => i.key === focusedField);
        if (!item) return;

        if (keyMatch(keyCode, "KEY_ESCAPE", 1)) {
            focusedField = null;
            return;
        }
        if (keyMatch(keyCode, "KEY_RETURN", 28)) {
            focusedField = null;
            settings.save();
            return;
        }
        if (keyMatch(keyCode, "KEY_BACK", 14) || keyMatch(keyCode, "KEY_BACKSPACE", 14)) {
            const val = String(settings[item.key] || "");
            settings[item.key] = val.slice(0, -1);
            settings.save();
            return;
        }

        if (!typedChar || typedChar.length === 0) return;

        let add = String(typedChar);
        if (item.filter === "ign") {
            if (!/^[a-zA-Z0-9_]$/.test(add)) return;
        } else if (item.type === "number") {
            if (!/^[0-9.-]$/.test(add)) return;
        }

        const current = String(settings[item.key] || "");
        if (item.maxLen && current.length >= item.maxLen) return;
        settings[item.key] = current + add;
        settings.save();
    });
}

settings.openGUI = () => {
    try {
        initGui();
        gui.open();
    } catch (e) {
        try { ChatLib.chat("&cGUI failed to open: " + e); } catch (err) {}
    }
};

module.exports = settings;
