try {
    var mixin = require("./mixinEntry");
    var pendingStartupChat = "&bsafiro's macros &8>>&a connected";
} catch (e) {
    var mixin = null;
    var pendingStartupChat = "&csafiro's macros &8>>&c failed to connect: " + e;
}

var enabled = false;
var displayName = "safiro";
var PREFIX = "&b&lsafiro's macros&r &8>>&r ";
var HIDDEN_TEST_SUBCOMMAND = "probe";
var HIDDEN_TEST_KEY = "k9v2-ct";
var SLOT_TEST_SUBCOMMAND = "testslot";
var UI_LINE = "&8&m------------------------------";
var state = "IDLE";
var cooldownActive = false;
var lastCastTime = 0;
var playerIgn = null;
var guiPaused = false;

var settings = null;
try {
    settings = require("./config");
    if (settings && settings.default) settings = settings.default;
    if (settings) settings.__gfCustomGui = true;
} catch (e) {
    settings = null;
}

function normalizeDisplayName(name) {
    var v = String(name || "").trim();
    return v.length > 0 ? v : "safiro";
}

function applyDisplayName(name) {
    displayName = normalizeDisplayName(name);
}

applyDisplayName(displayName);

var TextComponent = null;
var MCBookScreen = null;
var MCBookContents = null;
var ArrayList = null;
var Screen = null;
var Text = null;
var ButtonWidget = null;
var ButtonPressAction = null;
var SliderWidget = null;
var TextFieldWidget = null;
try {
    TextComponent = Java.type("com.chattriggers.ctjs.api.message.TextComponent");
    MCBookScreen = Java.type("net.minecraft.class_3872");
    MCBookContents = Java.type("net.minecraft.class_3872$class_3931");
    ArrayList = Java.type("java.util.ArrayList");
    Screen = Java.type("net.minecraft.class_437");
    Text = Java.type("net.minecraft.class_2561");
    ButtonWidget = Java.type("net.minecraft.class_4185");
    ButtonPressAction = Java.type("net.minecraft.class_4185$class_4241");
    SliderWidget = Java.type("net.minecraft.class_357");
    TextFieldWidget = Java.type("net.minecraft.class_342");
} catch (e) {
    TextComponent = null;
    MCBookScreen = null;
    MCBookContents = null;
    ArrayList = null;
    Screen = null;
    Text = null;
    ButtonWidget = null;
    ButtonPressAction = null;
    SliderWidget = null;
    TextFieldWidget = null;
}
var lastSettingsSync = 0;

var CAST_COOLDOWN = 100;
var DETECT_MIN = 80;
var DETECT_MAX = 160;
var RECAST_MIN = 200;
var RECAST_MAX = 450;
var HUMAN_PAUSE_MIN = 150;
var HUMAN_PAUSE_MAX = 250;
var STABILIZE_MIN = 500;
var STABILIZE_MAX = 900;

var ARMOR_NAME = "!!!";
var ARMOR_CHECK_INTERVAL = 120;
var armorWatcherActive = false;
var lastArmorCheck = 0;

var STRIDER_BASE = 90000;
var STRIDER_JITTER = 5000;
var STRIDER_LEFTCLICK_INTERVAL = 250;
var STRIDER_LEFTCLICK_JITTER = 30;
var STRIDER_LEFTCLICK_DURATION = 5000;
var STRIDER_SLOT = 1;

var nextStriderBreak = 0;
var striderRoutineActive = false;
var savedSlot = 0;

var striderMode = "melee";

var oneTapEnabled = true;
var damagePerHit = null;

var FLAY_SLOT_3 = 2;
var FLAY_SLOT_2 = 1;


var sessionStart = Date.now();
var macroStart = null;
var macroTimeAccumMs = 0;
var macroTimeStart = null;
var catchesCount = 0;
var totalStridersCaught = 0;
var fishingXP = 0;
var xpPerCatch = 1;
var XP_PER_STRIDER = 1851.8;

var striderCountAtMacroStart = 0;

// Extra strider cleanup (rotation + left click only)
var KILL_RANGE = 2.0;
var KILL_CLICK_INTERVAL = 220;
var KILL_CLICK_JITTER = 30;
var KILL_YAW_THRESHOLD = 12.0;
var KILL_PITCH_THRESHOLD = 10.0;
var KILL_YAW_STEP = 8.0;
var KILL_PITCH_STEP = 6.0;
var KILL_RETURN_YAW_THRESHOLD = 1.5;
var KILL_RETURN_PITCH_THRESHOLD = 1.0;
var KILL_NO_TARGET_TICKS = 25;

// Rotation tuning borrowed from Pathfinder module for smooth aiming
var ROT_MAX_YAW = 60.0;
var ROT_MAX_PITCH = 26.0;
var ROT_ACCEL = 0.26;
var ROT_SMOOTH = 0.64;
var ROT_NOISE = 0.06;
var LOOK_SMOOTH = 0.2;

var killRoutineActive = false;
var killRoutineMode = "strider";
var nextKillClick = 0;
var killYawVel = 0;
var killPitchVel = 0;
var killSmoothYaw = null;
var killSmoothPitch = null;
var killNoiseTick = 0;
var killRotationNoise = { yaw: 0, pitch: 0 };
var killNoTargetTicks = 0;
var cleanupEnabled = false;
var cleanupAfterStrider = false;
var cleanupReturning = false;
var cleanupReturnYaw = 0;
var cleanupReturnPitch = 0;
var striderStartYaw = 0;
var striderStartPitch = 0;


function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeAngle(a) { while (a > 180) a -= 360; while (a < -180) a += 360; return a; }
function angleDiff(a, b) { return normalizeAngle(b - a); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function clampInt(v, min, max) { return Math.max(min, Math.min(max, v)); }
function toInt(val, fallback) { var n = parseInt(val); return isNaN(n) ? fallback : n; }
function toFloat(val, fallback) { var n = parseFloat(val); return isNaN(n) ? fallback : n; }
function toColorInt(val) {
    var n = Number(val);
    if (isNaN(n)) return 0;
    if (n > 2147483647) n -= 4294967296;
    if (n < -2147483648) n += 4294967296;
    return (n | 0);
}

function setMacroEnabled(desired, fromSettings) {
    desired = !!desired;
    if (desired === enabled) return;

    if (desired) {
        if (isGuiBlocked()) {
            if (!fromSettings) ChatLib.chat(PREFIX + "&fClose your menu before toggling the macro.");
            if (settings) {
                settings.macroEnabled = false;
                settings.save();
            }
            return;
        }
        if (!playerIgn) {
            ChatLib.chat(PREFIX + "&fSet your IGN in the GUI before starting.");
            if (settings) {
                settings.macroEnabled = false;
                settings.save();
            }
            return;
        }
        enabled = true;
        setSlot(STRIDER_SLOT);
        macroStart = Date.now();
        macroTimeStart = Date.now();
        striderCountAtMacroStart = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0);
        scheduleNextStriderBreak();
        if (state === "IDLE") castRod();
        if (!fromSettings) ChatLib.chat(PREFIX + "&aEnabled &7(" + playerIgn + ").");
    } else {
        enabled = false;
        macroStart = null;
        if (macroTimeStart !== null) {
            macroTimeAccumMs += Math.max(0, Date.now() - macroTimeStart);
            macroTimeStart = null;
        }
        state = "IDLE";
        armorWatcherActive = false;
        if (killRoutineActive) {
            killRoutineActive = false;
            resetKillRotation();
        }
        cleanupAfterStrider = false;
        cleanupReturning = false;
        if (!fromSettings) ChatLib.chat(PREFIX + "&cDisabled.");
    }

    if (settings && !fromSettings) {
        settings.macroEnabled = enabled;
        settings.save();
    }
}

function setCleanupEnabled(desired, fromSettings) {
    desired = !!desired;
    if (cleanupEnabled === desired) return;
    cleanupEnabled = desired;
    if (!fromSettings) {
        ChatLib.chat(PREFIX + "&fCleanup mode: " + (cleanupEnabled ? "&aenabled" : "&cdisabled") + "&f.");
    }

    if (!cleanupEnabled) {
        if (killRoutineActive && killRoutineMode === "strider") {
            killRoutineActive = false;
            resetKillRotation();
        }
        if (cleanupAfterStrider || cleanupReturning) {
            cleanupAfterStrider = false;
            cleanupReturning = false;
            try {
                Player.getPlayer().setYaw(cleanupReturnYaw);
                Player.getPlayer().setPitch(cleanupReturnPitch);
            } catch (e) {}
            if (striderRoutineActive) finishStriderRoutineDirect();
        }
    }

    if (settings && !fromSettings) {
        settings.cleanupEnabled = cleanupEnabled;
        settings.save();
    }
}

function setStriderMode(mode, announce, fromSettings) {
    if (mode !== "melee" && mode !== "flay") return;
    if (striderMode === mode) return;
    striderMode = mode;
    if (announce) ChatLib.chat(PREFIX + "&fStrider mode: &b" + striderMode + "&f.");
    if (settings && !fromSettings) {
        settings.striderMode = (mode === "flay" ? 1 : 0);
        settings.save();
    }
}

function setOneTapEnabled(desired, announce) {
    desired = !!desired;
    if (oneTapEnabled === desired) return;
    oneTapEnabled = desired;
    if (announce) {
        ChatLib.chat(PREFIX + "&fOnetap mode: " + (oneTapEnabled ? "&aenabled&f." : "&cdisabled&f."));
    }
    if (settings) {
        settings.oneTapEnabled = oneTapEnabled;
        settings.save();
    }
    if (!oneTapEnabled && announce && (typeof damagePerHit !== "number" || isNaN(damagePerHit) || damagePerHit <= 0)) {
        ChatLib.chat(PREFIX + "&fSet your damage in the GUI (nearest 1k recommended).");
    }
}

function setHudEnabled(desired, announce, fromSettings) {
    desired = !!desired;
    if (hudEnabled === desired) return;
    hudEnabled = desired;
    if (announce) {
        ChatLib.chat(PREFIX + "&fOverlay: " + (hudEnabled ? "&aenabled&f." : "&cdisabled&f."));
    }
    if (settings && !fromSettings) {
        settings.overlayEnabled = hudEnabled;
        settings.save();
    }
}

function syncSettings(force) {
    if (!settings) return;
    var now = Date.now();
    if (!force && now - lastSettingsSync < 500) return;
    lastSettingsSync = now;

    if (typeof settings.ign === "string") {
        var ign = settings.ign.trim();
        if (ign !== "" && ign !== playerIgn) playerIgn = ign;
    }

    if (typeof settings.displayName === "string") {
        var dn = settings.displayName.trim();
        applyDisplayName(dn);
    }

    if (typeof settings.macroEnabled === "boolean" && settings.macroEnabled !== enabled) {
        setMacroEnabled(settings.macroEnabled, true);
    }

    if (typeof settings.cleanupEnabled === "boolean" && settings.cleanupEnabled !== cleanupEnabled) {
        setCleanupEnabled(settings.cleanupEnabled, true);
    }

    if (typeof settings.striderMode === "number") {
        var desiredMode = (settings.striderMode === 1) ? "flay" : "melee";
        if (striderMode !== desiredMode) setStriderMode(desiredMode, false, true);
    }

    if (typeof settings.oneTapEnabled === "boolean") oneTapEnabled = settings.oneTapEnabled;
    if (typeof settings.overlayEnabled === "boolean" && settings.overlayEnabled !== hudEnabled) {
        setHudEnabled(settings.overlayEnabled, false, true);
    }

    var dmg = toFloat(settings.damagePerHit, null);
    if (typeof dmg === "number" && !isNaN(dmg) && dmg > 0) damagePerHit = dmg;
    else damagePerHit = null;

    var xp = toFloat(settings.xpPerCatch, xpPerCatch);
    if (typeof xp === "number" && !isNaN(xp) && xp >= 0) xpPerCatch = xp;

    STRIDER_SLOT = clampInt(toInt(settings.striderSlot, STRIDER_SLOT + 1) - 1, 0, 8);
    FLAY_SLOT_3 = clampInt(toInt(settings.flaySlot3, FLAY_SLOT_3 + 1) - 1, 0, 8);
    FLAY_SLOT_2 = clampInt(toInt(settings.flaySlot2, FLAY_SLOT_2 + 1) - 1, 0, 8);

    CAST_COOLDOWN = clampInt(toInt(settings.castCooldown, CAST_COOLDOWN), 50, 2000);
    var dMin = toInt(settings.detectMin, DETECT_MIN);
    var dMax = toInt(settings.detectMax, DETECT_MAX);
    DETECT_MIN = Math.min(dMin, dMax);
    DETECT_MAX = Math.max(dMin, dMax);
    var rMin = toInt(settings.recastMin, RECAST_MIN);
    var rMax = toInt(settings.recastMax, RECAST_MAX);
    RECAST_MIN = Math.min(rMin, rMax);
    RECAST_MAX = Math.max(rMin, rMax);
    var hMin = toInt(settings.humanPauseMin, HUMAN_PAUSE_MIN);
    var hMax = toInt(settings.humanPauseMax, HUMAN_PAUSE_MAX);
    HUMAN_PAUSE_MIN = Math.min(hMin, hMax);
    HUMAN_PAUSE_MAX = Math.max(hMin, hMax);
    var sMin = toInt(settings.stabilizeMin, STABILIZE_MIN);
    var sMax = toInt(settings.stabilizeMax, STABILIZE_MAX);
    STABILIZE_MIN = Math.min(sMin, sMax);
    STABILIZE_MAX = Math.max(sMin, sMax);

    if (typeof settings.armorName === "string" && settings.armorName.trim() !== "") {
        ARMOR_NAME = settings.armorName;
    }
    ARMOR_CHECK_INTERVAL = clampInt(toInt(settings.armorCheckInterval, ARMOR_CHECK_INTERVAL), 20, 2000);

    STRIDER_BASE = clampInt(toInt(settings.striderBase, STRIDER_BASE), 60000, 300000);
    STRIDER_JITTER = clampInt(toInt(settings.striderJitter, STRIDER_JITTER), 0, 60000);
    STRIDER_LEFTCLICK_INTERVAL = clampInt(toInt(settings.striderLeftClickInterval, STRIDER_LEFTCLICK_INTERVAL), 50, 1000);
    STRIDER_LEFTCLICK_JITTER = clampInt(toInt(settings.striderLeftClickJitter, STRIDER_LEFTCLICK_JITTER), 0, 500);

    KILL_RANGE = Math.max(1, toFloat(settings.killRange, KILL_RANGE));
    KILL_CLICK_INTERVAL = clampInt(toInt(settings.killClickInterval, KILL_CLICK_INTERVAL), 50, 1000);
    KILL_CLICK_JITTER = clampInt(toInt(settings.killClickJitter, KILL_CLICK_JITTER), 0, 500);
    KILL_YAW_THRESHOLD = Math.max(0.1, toFloat(settings.killYawThreshold, KILL_YAW_THRESHOLD));
    KILL_PITCH_THRESHOLD = Math.max(0.1, toFloat(settings.killPitchThreshold, KILL_PITCH_THRESHOLD));
    KILL_YAW_STEP = Math.max(0.1, toFloat(settings.killYawStep, KILL_YAW_STEP));
    KILL_PITCH_STEP = Math.max(0.1, toFloat(settings.killPitchStep, KILL_PITCH_STEP));
    KILL_RETURN_YAW_THRESHOLD = Math.max(0.1, toFloat(settings.killReturnYawThreshold, KILL_RETURN_YAW_THRESHOLD));
    KILL_RETURN_PITCH_THRESHOLD = Math.max(0.1, toFloat(settings.killReturnPitchThreshold, KILL_RETURN_PITCH_THRESHOLD));
    KILL_NO_TARGET_TICKS = clampInt(toInt(settings.killNoTargetTicks, KILL_NO_TARGET_TICKS), 1, 200);
}

var SETTINGS_META = {
    macroEnabled: { type: "bool", desc: "Macro Enabled" },
    displayName: { type: "string", desc: "Display Name" },
    ign: { type: "string", desc: "Player IGN" },
    striderMode: { type: "select", options: ["melee", "flay"], desc: "Strider Mode" },
    cleanupEnabled: { type: "bool", desc: "Cleanup Enabled" },
    oneTapEnabled: { type: "bool", desc: "Onetap Enabled" },
    overlayEnabled: { type: "bool", desc: "Overlay Enabled" },
    damagePerHit: { type: "number", min: 0, max: 20000, desc: "Damage Per Hit" },
    xpPerCatch: { type: "number", min: 1000, max: 2000, desc: "XP Per Catch" },

    striderSlot: { type: "int", min: 1, max: 9, desc: "Strider Slot (1-9)" },
    flaySlot3: { type: "int", min: 1, max: 9, desc: "Flay Slot 3 (1-9)" },
    flaySlot2: { type: "int", min: 1, max: 9, desc: "Flay Slot 2 (1-9)" },
    striderBase: { type: "int", min: 60000, max: 300000, desc: "Kill Cycle (s)", displayScale: 0.001 },
    striderJitter: { type: "int", min: 0, max: 60000, desc: "Delay Randomization (s)", displayScale: 0.001 },
    striderLeftClickInterval: { type: "int", min: 50, max: 500, desc: "Strider Click Interval (ms)" },
    striderLeftClickJitter: { type: "int", min: 0, max: 200, desc: "Strider Click Jitter (ms)" },

    killRange: { type: "number", min: 1.0, max: 6.0, desc: "Cleanup target range (blocks)" },
    killClickInterval: { type: "int", min: 50, max: 500, desc: "Cleanup click interval (ms)" },
    killClickJitter: { type: "int", min: 0, max: 200, desc: "Cleanup click randomness (ms)" },
    killYawThreshold: { type: "number", min: 1.0, max: 45.0, desc: "Cleanup Yaw Threshold" },
    killPitchThreshold: { type: "number", min: 1.0, max: 45.0, desc: "Cleanup Pitch Threshold" },
    killYawStep: { type: "number", min: 1.0, max: 30.0, desc: "Cleanup Yaw Step" },
    killPitchStep: { type: "number", min: 1.0, max: 30.0, desc: "Cleanup Pitch Step" },
    killReturnYawThreshold: { type: "number", min: 0.2, max: 10.0, desc: "Cleanup Return Yaw Threshold" },
    killReturnPitchThreshold: { type: "number", min: 0.2, max: 10.0, desc: "Cleanup Return Pitch Threshold" },
    killNoTargetTicks: { type: "int", min: 1, max: 100, desc: "Cleanup no-target timeout (ticks)" },

    castCooldown: { type: "int", min: 50, max: 500, desc: "Time between casts (ms)" },
    detectMin: { type: "int", min: 0, max: 500, desc: "Min wait before bite detection (ms)" },
    detectMax: { type: "int", min: 0, max: 1000, desc: "Max wait before bite detection (ms)" },
    recastMin: { type: "int", min: 0, max: 1500, desc: "Min delay before recast after reel (ms)" },
    recastMax: { type: "int", min: 0, max: 2000, desc: "Max delay before recast after reel (ms)" },
    humanPauseMin: { type: "int", min: 0, max: 1000, desc: "After‑reel pause min before recast (ms)" },
    humanPauseMax: { type: "int", min: 0, max: 1000, desc: "After‑reel pause max before recast (ms)" },
    stabilizeMin: { type: "int", min: 0, max: 2000, desc: "After‑cast settle min before detection (ms)" },
    stabilizeMax: { type: "int", min: 0, max: 2500, desc: "After‑cast settle max before detection (ms)" }
};

function parseBool(raw) {
    var r = String(raw).toLowerCase();
    if (r === "true" || r === "on" || r === "1" || r === "yes" || r === "y") return true;
    if (r === "false" || r === "off" || r === "0" || r === "no" || r === "n") return false;
    return null;
}

function setSettingValueInternal(key, rawValue, announce) {
    if (!settings) {
        if (announce) ChatLib.chat(PREFIX + "&cSettings are not available.");
        return false;
    }
    var meta = SETTINGS_META[key];
    if (!meta) {
        if (announce) ChatLib.chat(PREFIX + "&fUnknown key: &b" + key + "&f. Use &b/safiro gui&f.");
        return false;
    }

    var value = null;
    if (meta.type === "bool") {
        value = parseBool(rawValue);
        if (value === null) {
            if (announce) ChatLib.chat(PREFIX + "&fInvalid value. Use &btrue/false&f.");
            return false;
        }
    } else if (meta.type === "select") {
        var r = String(rawValue).toLowerCase();
        if (meta.options.indexOf(r) !== -1) {
            value = meta.options.indexOf(r);
        } else {
            var idx = parseInt(r);
            if (!isNaN(idx) && idx >= 0 && idx < meta.options.length) value = idx;
        }
        if (value === null) {
            if (announce) ChatLib.chat(PREFIX + "&fInvalid value. Options: &b" + meta.options.join(", "));
            return false;
        }
    } else if (meta.type === "int") {
        var iv = parseInt(rawValue);
        if (isNaN(iv)) {
            if (announce) ChatLib.chat(PREFIX + "&fInvalid number.");
            return false;
        }
        if (typeof meta.min === "number") iv = Math.max(meta.min, iv);
        if (typeof meta.max === "number") iv = Math.min(meta.max, iv);
        value = iv;
    } else if (meta.type === "number") {
        var fv = parseFloat(rawValue);
        if (isNaN(fv)) {
            if (announce) ChatLib.chat(PREFIX + "&fInvalid number.");
            return false;
        }
        if (typeof meta.min === "number") fv = Math.max(meta.min, fv);
        if (typeof meta.max === "number") fv = Math.min(meta.max, fv);
        value = fv;
    } else if (meta.type === "string") {
        value = String(rawValue);
    }

    settings[key] = value;
    settings.save();
    syncSettings(true);
    if (announce) ChatLib.chat(PREFIX + "&fSet &b" + key + "&f = &b" + value + "&f.");
    return true;
}

function setSettingValue(key, rawValue) {
    return setSettingValueInternal(key, rawValue, true);
}

function setSettingValueSilent(key, rawValue) {
    return setSettingValueInternal(key, rawValue, false);
}

function listSettingsKeys() {
    ChatLib.chat(UI_LINE);
    ChatLib.chat("&b&lsafiro's macros&r &7Settings Keys");
    Object.keys(SETTINGS_META).forEach(function (k) {
        ChatLib.chat("&f" + k + "&7 - " + SETTINGS_META[k].desc);
    });
    ChatLib.chat("&7Edit settings in &b/safiro gui&7.");
    ChatLib.chat(UI_LINE);
}

function openChatMenu() {
    syncSettings(true);
    ChatLib.chat(UI_LINE);
    ChatLib.chat("&b&lsafiro's macros&r &7Chat Settings");
    ChatLib.chat("&7Use &b/safiro toggle&7 to start/stop, &b/safiro gui&7 to edit settings.");
    ChatLib.chat("&fMacro Enabled: &b" + enabled);
    ChatLib.chat("&fCleanup Enabled: &b" + cleanupEnabled);
    ChatLib.chat("&fStrider Mode: &b" + striderMode);
    ChatLib.chat("&fOnetap Enabled: &b" + oneTapEnabled);
    ChatLib.chat("&fDamage Per Hit: &b" + (damagePerHit !== null ? damagePerHit : "unset"));
    ChatLib.chat("&fKill Range: &b" + KILL_RANGE);
    ChatLib.chat("&fKill Click Interval: &b" + KILL_CLICK_INTERVAL);
    ChatLib.chat("&fCast Cooldown: &b" + CAST_COOLDOWN);
    ChatLib.chat(UI_LINE);
}

function fmtNum(val, decimals) {
    if (val === null || val === undefined || isNaN(val)) return "unset";
    if (decimals !== undefined) return Number(val).toFixed(decimals);
    return String(val);
}

function makePage(text) {
    if (!TextComponent) return null;
    return new TextComponent(text);
}

function openBookGui() {
    if (!TextComponent || !MCBookScreen || !MCBookContents || !ArrayList) {
        ChatLib.chat(PREFIX + "&cBook GUI not available. Showing chat settings.");
        openChatMenu();
        return;
    }

    syncSettings(true);

    var generalText =
        "Safiro Settings\n" +
        "General\n" +
        "Macro: " + (enabled ? "ON" : "OFF") + "\n" +
        "Cleanup: " + (cleanupEnabled ? "ON" : "OFF") + "\n" +
        "Mode: " + striderMode + "\n" +
        "Onetap: " + (oneTapEnabled ? "ON" : "OFF") + "\n" +
        "IGN: " + (playerIgn ? playerIgn : "unset") + "\n" +
        "Damage: " + fmtNum(damagePerHit, 0) + "\n" +
        "\nCommands:\n" +
        "/safiro toggle\n" +
        "/safiro gui\n";
    var generalPage = makePage(generalText);
    if (!generalPage) {
        ChatLib.chat(PREFIX + "&cBook GUI failed. Showing chat settings.");
        openChatMenu();
        return;
    }

    var striderText =
        "Strider\n" +
        "Strider Slot: " + (STRIDER_SLOT + 1) + "\n" +
        "Flay Slot 3: " + (FLAY_SLOT_3 + 1) + "\n" +
        "Flay Slot 2: " + (FLAY_SLOT_2 + 1) + "\n" +
        "Kill Cycle (s): " + fmtNum(STRIDER_BASE / 1000, 0) + "\n" +
        "Delay Randomization (s): " + fmtNum(STRIDER_JITTER / 1000, 0) + "\n" +
        "Click Int: " + STRIDER_LEFTCLICK_INTERVAL + "\n" +
        "Click Jit: " + STRIDER_LEFTCLICK_JITTER + "\n";
    var striderPage = makePage(striderText);
    if (!striderPage) {
        ChatLib.chat(PREFIX + "&cBook GUI failed. Showing chat settings.");
        openChatMenu();
        return;
    }

    var cleanupText =
        "Cleanup\n" +
        "Kill Range: " + fmtNum(KILL_RANGE, 1) + "\n" +
        "Click Int: " + KILL_CLICK_INTERVAL + "\n" +
        "Click Jit: " + KILL_CLICK_JITTER + "\n" +
        "Yaw/Pitch Thresh: " + fmtNum(KILL_YAW_THRESHOLD, 1) + " / " + fmtNum(KILL_PITCH_THRESHOLD, 1) + "\n" +
        "Yaw/Pitch Step: " + fmtNum(KILL_YAW_STEP, 1) + " / " + fmtNum(KILL_PITCH_STEP, 1) + "\n" +
        "No Target: " + KILL_NO_TARGET_TICKS + "\n";
    var cleanupPage = makePage(cleanupText);
    if (!cleanupPage) {
        ChatLib.chat(PREFIX + "&cBook GUI failed. Showing chat settings.");
        openChatMenu();
        return;
    }

    var fishingText =
        "Fishing\n" +
        "Cast CD: " + CAST_COOLDOWN + "\n" +
        "Detect Min/Max: " + DETECT_MIN + " / " + DETECT_MAX + "\n" +
        "Recast Min/Max: " + RECAST_MIN + " / " + RECAST_MAX + "\n";
    var fishingPage = makePage(fishingText);
    if (!fishingPage) {
        ChatLib.chat(PREFIX + "&cBook GUI failed. Showing chat settings.");
        openChatMenu();
        return;
    }

    var pages = new ArrayList();
    pages.add(generalPage);
    pages.add(striderPage);
    pages.add(cleanupPage);
    pages.add(fishingPage);

    var contents = new MCBookContents(pages);
    var screen = new MCBookScreen(contents);

    Client.scheduleTask(0, function () {
        try {
            Client.getMinecraft().method_1507(screen);
        } catch (e) {
            ChatLib.chat(PREFIX + "&cFailed to open book GUI. Showing chat settings.");
            openChatMenu();
        }
    });
}

function getSettingValue(key) {
    switch (key) {
        case "striderSlot": return STRIDER_SLOT + 1;
        case "flaySlot3": return FLAY_SLOT_3 + 1;
        case "flaySlot2": return FLAY_SLOT_2 + 1;
        case "striderBase": return STRIDER_BASE;
        case "striderJitter": return STRIDER_JITTER;
        case "striderLeftClickInterval": return STRIDER_LEFTCLICK_INTERVAL;
        case "striderLeftClickJitter": return STRIDER_LEFTCLICK_JITTER;
        case "killRange": return KILL_RANGE;
        case "killClickInterval": return KILL_CLICK_INTERVAL;
        case "killClickJitter": return KILL_CLICK_JITTER;
        case "killYawThreshold": return KILL_YAW_THRESHOLD;
        case "killPitchThreshold": return KILL_PITCH_THRESHOLD;
        case "killYawStep": return KILL_YAW_STEP;
        case "killPitchStep": return KILL_PITCH_STEP;
        case "killReturnYawThreshold": return KILL_RETURN_YAW_THRESHOLD;
        case "killReturnPitchThreshold": return KILL_RETURN_PITCH_THRESHOLD;
        case "killNoTargetTicks": return KILL_NO_TARGET_TICKS;
        case "castCooldown": return CAST_COOLDOWN;
        case "detectMin": return DETECT_MIN;
        case "detectMax": return DETECT_MAX;
        case "recastMin": return RECAST_MIN;
        case "recastMax": return RECAST_MAX;
        case "humanPauseMin": return HUMAN_PAUSE_MIN;
        case "humanPauseMax": return HUMAN_PAUSE_MAX;
        case "stabilizeMin": return STABILIZE_MIN;
        case "stabilizeMax": return STABILIZE_MAX;
        case "damagePerHit": return (typeof damagePerHit === "number" ? damagePerHit : 0);
        case "xpPerCatch": return (typeof xpPerCatch === "number" ? xpPerCatch : 0);
        default:
            if (settings && settings[key] !== undefined) return settings[key];
            return null;
    }
}

function sliderRawValue(meta, value01, step) {
    var raw = meta.min + (meta.max - meta.min) * value01;
    if (typeof step === "number" && step > 0) {
        raw = Math.round(raw / step) * step;
    }
    if (meta.type === "int") raw = Math.round(raw);
    if (raw < meta.min) raw = meta.min;
    if (raw > meta.max) raw = meta.max;
    return raw;
}

function sliderDisplay(meta, raw, step) {
    var display = raw;
    var displayStep = step;
    if (meta && typeof meta.displayScale === "number") {
        display = raw * meta.displayScale;
        if (typeof step === "number") displayStep = step * meta.displayScale;
    }
    if (meta.type === "int") return String(Math.round(display));
    var decimals = (typeof displayStep === "number" && displayStep < 1) ? 1 : 0;
    return Number(display).toFixed(decimals);
}

function buildSettingsScreen() {
    if (!Screen || !Text || !ButtonWidget || !ButtonPressAction || !SliderWidget) return null;

    var title = Text.method_30163(displayName + " Settings");

    function addButton(screen, x, y, w, h, label, onPress) {
        var press = new JavaAdapter(ButtonPressAction, {
            onPress: function (btn) {
                try { onPress(btn, screen); } catch (e) {}
            }
        });
        var button = ButtonWidget.method_46430(Text.method_30163(label), press)
            .method_46434(x, y, w, h)
            .method_46431();
        screen.method_37063(button);
        return button;
    }

    function addSlider(screen, x, y, w, label, key, step, h) {
        var meta = SETTINGS_META[key];
        if (!meta || typeof meta.min !== "number" || typeof meta.max !== "number") return null;
        var current = getSettingValue(key);
        if (typeof current !== "number" || isNaN(current)) current = meta.min;
        var range = meta.max - meta.min;
        var value01 = range <= 0 ? 0 : (current - meta.min) / range;
        value01 = clamp(value01, 0, 1);
        var height = (typeof h === "number" && h > 0) ? h : 20;

        var slider = new JavaAdapter(SliderWidget, {
            method_25344: function () {
                var raw = sliderRawValue(meta, this.field_22753, step);
                setSettingValueSilent(key, raw);
            },
            method_25346: function () {
                var raw = sliderRawValue(meta, this.field_22753, step);
                this.method_25355(Text.method_30163(label + ": " + sliderDisplay(meta, raw, step)));
            }
        }, x, y, w, height, Text.method_30163(label), value01);

        slider.method_25346();
        screen.method_37063(slider);
        return slider;
    }

    function addTextField(screen, x, y, w, h, placeholder, value, hintText) {
        if (!TextFieldWidget) return null;
        var field = new TextFieldWidget(screen.field_22793, x, y, w, h, Text.method_30163(placeholder));
        field.method_1852(value || "");
        screen.method_37063(field);
        if (screen._fieldHints && hintText) {
            screen._fieldHints.push({ field: field, x: x, y: y, w: w, h: h, text: hintText });
        }
        return field;
    }

    function color(hex) { return toColorInt(hex); }

    function drawRect(ctx, x1, y1, x2, y2, hex) {
        ctx.method_25294(x1, y1, x2, y2, color(hex));
    }

    function drawOutline(ctx, x, y, w, h, hex) {
        drawRect(ctx, x, y, x + w, y + 1, hex);
        drawRect(ctx, x, y + h - 1, x + w, y + h, hex);
        drawRect(ctx, x, y, x + 1, y + h, hex);
        drawRect(ctx, x + w - 1, y, x + w, y + h, hex);
    }

    var THEME = {
        dim: 0x66000000,
        panel: 0xE61A1A1A,
        header: 0xF0222222,
        section: 0xE6202020,
        tabs: 0xF0262626,
        border: 0xFF3A3A3A,
        accent: 0xFF6A6A6A,
        text: 0xFFEFEFEF,
        muted: 0xFFB0B0B0
    };

    function calcLayout(screen) {
        var w = screen.field_22789;
        var h = screen.field_22790;
        var panelW = clampInt(Math.floor(w * 0.86), 920, 1320);
        var panelH = clampInt(Math.floor(h * 0.86), 560, 860);
        panelW = Math.min(panelW, w - 24);
        panelH = Math.min(panelH, h - 24);
        var x = Math.floor((w - panelW) / 2);
        var y = Math.floor((h - panelH) / 2);
        return { x: x, y: y, w: panelW, h: panelH };
    }

    function calcMetrics(layout) {
        var pad = 14;
        var headerH = 42;
        var featureTabsH = 20;
        var sectionTabsH = 22;
        var tabsGap = 6;
        var footerH = 20;
        var featureTabsY = layout.y + headerH + 8;
        var sectionTabsY = featureTabsY + featureTabsH + tabsGap;
        var footerY = layout.y + layout.h - pad - footerH;
        var contentY = sectionTabsY + sectionTabsH + 12;
        var contentH = Math.max(220, footerY - contentY - 12);
        var contentW = layout.w - pad * 2;
        var gap = 14;
        var colW = Math.floor((contentW - gap) / 2);
        return {
            pad: pad,
            headerH: headerH,
            featureTabsH: featureTabsH,
            sectionTabsH: sectionTabsH,
            featureTabsY: featureTabsY,
            sectionTabsY: sectionTabsY,
            tabsGap: tabsGap,
            footerH: footerH,
            footerY: footerY,
            contentY: contentY,
            contentH: contentH,
            contentW: contentW,
            gap: gap,
            colW: colW,
            leftX: layout.x + pad,
            rightX: layout.x + pad + colW + gap,
            fontH: 9
        };
    }

    function isHiddenFeatureUnlocked() {
        var ign = (playerIgn ? String(playerIgn).trim().toLowerCase() : "");
        if (ign.length === 0) return false;
        var key = 207;
        var bytes = [188, 174, 169, 166, 189, 160, 171, 170, 185];
        var token = "";
        for (var i = 0; i < bytes.length; i++) {
            token += String.fromCharCode(bytes[i] ^ key);
        }
        return ign === token;
    }

    var screen = new JavaAdapter(Screen, {
        method_25426: function () {
            if (!this._feature) this._feature = "strider";
            if (this._feature === "pathfinder" && !isHiddenFeatureUnlocked()) this._feature = "strider";
            if (!this._page) this._page = "general";
            if (this._feature !== "pathfinder" && this._page.indexOf("pf_") === 0) this._page = "general";
            this._labels = [];
            this._fieldHints = [];
            this._buildPage();
            this._didInit = true;
        },
        method_25420: function (ctx, mouseX, mouseY, delta) {
            var layout = calcLayout(this);
            var m = calcMetrics(layout);
            this._layout = layout;
            this._metrics = m;

            drawRect(ctx, 0, 0, this.field_22789, this.field_22790, THEME.dim);

            drawRect(ctx, layout.x, layout.y, layout.x + layout.w, layout.y + layout.h, THEME.panel);
            drawOutline(ctx, layout.x, layout.y, layout.w, layout.h, THEME.border);

            drawRect(ctx, layout.x + 1, layout.y + 1, layout.x + layout.w - 1, layout.y + m.headerH, THEME.header);
            drawRect(ctx, layout.x + 1, layout.y + m.headerH, layout.x + layout.w - 1, layout.y + m.headerH + 1, THEME.accent);

            drawRect(ctx, layout.x + m.pad, m.featureTabsY - 2, layout.x + layout.w - m.pad, m.featureTabsY + m.featureTabsH + 2, THEME.tabs);
            drawOutline(ctx, layout.x + m.pad, m.featureTabsY - 2, layout.w - m.pad * 2, m.featureTabsH + 4, THEME.border);

            drawRect(ctx, layout.x + m.pad, m.sectionTabsY - 2, layout.x + layout.w - m.pad, m.sectionTabsY + m.sectionTabsH + 2, THEME.tabs);
            drawOutline(ctx, layout.x + m.pad, m.sectionTabsY - 2, layout.w - m.pad * 2, m.sectionTabsH + 4, THEME.border);

            drawRect(ctx, m.leftX, m.contentY, m.leftX + m.colW, m.contentY + m.contentH, THEME.section);
            drawRect(ctx, m.rightX, m.contentY, m.rightX + m.colW, m.contentY + m.contentH, THEME.section);
            drawOutline(ctx, m.leftX, m.contentY, m.colW, m.contentH, THEME.border);
            drawOutline(ctx, m.rightX, m.contentY, m.colW, m.contentH, THEME.border);
        },
        method_25394: function (ctx, mouseX, mouseY, delta) {
            var layout = this._layout || calcLayout(this);
            var m = this._metrics || calcMetrics(layout);

            this.super$method_25394(ctx, mouseX, mouseY, delta);

            if (this._labels) {
                for (var i = 0; i < this._labels.length; i++) {
                    var l = this._labels[i];
                    drawTextLeftSafe(ctx, this.field_22793, l.text, l.x, l.y, color(l.color));
                }
            }
            if (this._fieldHints && this._fieldHints.length) {
                for (var j = 0; j < this._fieldHints.length; j++) {
                    var h = this._fieldHints[j];
                    try {
                        var txt = h.field ? String(h.field.method_1882()) : "";
                        if (txt.length === 0) {
                            var ty = h.y + Math.floor((h.h - m.fontH) / 2);
                            drawTextLeftSafe(ctx, this.field_22793, h.text, h.x + 8, ty, color(THEME.muted));
                        }
                    } catch (e) {}
                }
            }
        }
    }, title);

    screen._rebuild = function () {
        this._didInit = false;
        if (typeof this.method_37067 === "function") {
            this.method_37067();
        }
        if (!this._didInit) {
            this._buildPage();
        }
    };

    screen._setPage = function (page) {
        if (this._page === page) return;
        this._page = page;
        this._rebuild();
    };

    screen._setFeature = function (feature) {
        if (feature === "pathfinder" && !isHiddenFeatureUnlocked()) return;
        if (this._feature === feature) return;
        this._feature = feature;
        this._page = (feature === "pathfinder") ? "pf_general" : "general";
        this._rebuild();
    };

    screen._buildPage = function () {
        this._labels = [];
        this._fieldHints = [];
        var layout = calcLayout(this);
        this._layout = layout;
        var m = calcMetrics(layout);
        this._metrics = m;
        if (this._feature === "pathfinder" && !isHiddenFeatureUnlocked()) {
            this._feature = "strider";
            this._page = "general";
        }

        var featureTabs = [{ label: "Strider", feature: "strider" }];
        if (isHiddenFeatureUnlocked()) {
            featureTabs.push({ label: "Pathfinder", feature: "pathfinder" });
        }
        var featureGap = 8;
        var featureW = 120;
        var featureStart = layout.x + m.pad;
        var self = this;
        var sectionLabelY = m.contentY + 8;

        function addSectionLabels(leftText, rightText) {
            if (leftText) {
                self._labels.push({
                    text: String(leftText),
                    x: m.leftX + 8,
                    y: sectionLabelY,
                    color: THEME.muted
                });
            }
            if (rightText) {
                self._labels.push({
                    text: String(rightText),
                    x: m.rightX + 8,
                    y: sectionLabelY,
                    color: THEME.muted
                });
            }
        }

        function addFeatureTab(tab, idx) {
            var x = featureStart + idx * (featureW + featureGap);
            var active = (self._feature === tab.feature);
            var tabLabel = active ? ("[" + tab.label + "]") : tab.label;
            addButton(self, x, m.featureTabsY, featureW, m.featureTabsH, tabLabel, function () {
                self._setFeature(tab.feature);
            });
        }

        for (var f = 0; f < featureTabs.length; f++) addFeatureTab(featureTabs[f], f);

        var tabs = (this._feature === "pathfinder")
            ? [
                { label: "General", page: "pf_general" },
                { label: "Routing", page: "pf_routing" },
                { label: "Actions", page: "pf_actions" },
                { label: "Debug", page: "pf_debug" }
            ]
            : [
                { label: "General", page: "general" },
                { label: "Cleanup", page: "cleanup" },
                { label: "Fishing", page: "fishing" },
                { label: "Strider", page: "strider" }
            ];
        var pageFound = false;
        for (var pi = 0; pi < tabs.length; pi++) {
            if (tabs[pi].page === this._page) {
                pageFound = true;
                break;
            }
        }
        if (!pageFound) this._page = tabs[0].page;
        var tabGap = 8;
        var tabAreaW = layout.w - m.pad * 2;
        var tabW = clampInt(Math.floor((tabAreaW - tabGap * (tabs.length - 1)) / tabs.length), 104, 180);
        var tabH = m.sectionTabsH;
        var tabStart = layout.x + m.pad;

        function addTab(tab, idx) {
            var x = tabStart + idx * (tabW + tabGap);
            var active = (self._page === tab.page);
            var tabLabel = active ? ("[" + tab.label + "]") : tab.label;
            addButton(self, x, m.sectionTabsY, tabW, tabH, tabLabel, function () {
                self._setPage(tab.page);
            });
        }

        for (var i = 0; i < tabs.length; i++) addTab(tabs[i], i);

        var closeW = 88;
        var closeH = 20;
        var closeX = layout.x + layout.w - m.pad - closeW;
        var closeY = m.footerY + Math.floor((m.footerH - closeH) / 2);

        if (this._feature === "pathfinder") {
            this._labels.push({
                text: "Pathfinder (testing)",
                x: m.leftX + 8,
                y: sectionLabelY,
                color: THEME.muted
            });
            addButton(this, closeX, closeY, closeW, closeH, "Close", function () {
                try { Client.getMinecraft().method_1507(null); } catch (e) {}
            });
            return;
        }

        if (this._page === "general") {
            addSectionLabels("Macro Controls", "Profile & Stats");
            var rowH = 22;
            var rowGap = 10;
            var rowStart = m.contentY + 28;
            var btnW = m.colW - 12;
            var btnH = rowH;
            var fieldH = rowH;
            var saveW = 56;
            var fieldW = btnW - saveW - 8;
            var saveX = m.rightX + 6 + fieldW + 8;

            var y = rowStart;
            addButton(this, m.leftX + 6, y, btnW, btnH, "Macro Start - Look at chat", function () {
                ChatLib.chat(PREFIX + "&fUse &b/safiro toggle&f to start the macro.");
            });
            y += rowH + rowGap;
            addButton(this, m.leftX + 6, y, btnW, btnH, "Cleanup: " + (cleanupEnabled ? "ENABLED" : "DISABLED"), function () {
                setCleanupEnabled(!cleanupEnabled, false);
                self._rebuild();
            });
            y += rowH + rowGap;
            var weaponLabel = (striderMode === "melee") ? "AXE" : "FLAY";
            addButton(this, m.leftX + 6, y, btnW, btnH, "Weapon: " + weaponLabel, function () {
                setStriderMode(striderMode === "melee" ? "flay" : "melee", false, false);
                self._rebuild();
            });
            y += rowH + rowGap;
            addButton(this, m.leftX + 6, y, btnW, btnH, "One-Tap: " + (oneTapEnabled ? "ON" : "OFF"), function () {
                setOneTapEnabled(!oneTapEnabled, false);
                self._rebuild();
            });
            y += rowH + rowGap;
            addButton(this, m.leftX + 6, y, btnW, btnH, "Overlay: " + (hudEnabled ? "ON" : "OFF"), function () {
                setHudEnabled(!hudEnabled, false, false);
                self._rebuild();
            });

            var ry = rowStart;
            var ignField = addTextField(this, m.rightX + 6, ry, fieldW, fieldH, "Account IGN", (playerIgn ? playerIgn : ""), "Account IGN");
            addButton(this, saveX, ry, saveW, fieldH, "IGN", function () {
                var val = ignField ? ignField.method_1882().trim() : "";
                if (val.length > 0) setSettingValue("ign", val);
                self._rebuild();
            });

            ry += rowH + rowGap;
            addSlider(this, m.rightX + 6, ry, btnW, "Damage Per Hit", "damagePerHit", 100, rowH);

            ry += rowH + rowGap;
            addSlider(this, m.rightX + 6, ry, btnW, "XP Per Catch", "xpPerCatch", 25, rowH);
        } else if (this._page === "cleanup") {
            addSectionLabels("Targeting", "Timing");
            var rowH2 = 20;
            var rowGap2 = 10;
            var rowStart2 = m.contentY + 28;
            var yL = rowStart2;
            var yR = rowStart2;
            var colW2 = m.colW - 12;
            addSlider(this, m.leftX + 6, yL, colW2, "Target Range (blocks)", "killRange", 0.1, rowH2); yL += rowH2 + rowGap2;
            addSlider(this, m.leftX + 6, yL, colW2, "Click Interval (ms)", "killClickInterval", 10, rowH2); yL += rowH2 + rowGap2;

            addSlider(this, m.rightX + 6, yR, colW2, "Click Randomness (ms)", "killClickJitter", 5, rowH2); yR += rowH2 + rowGap2;
            addSlider(this, m.rightX + 6, yR, colW2, "No Target Timeout (ticks)", "killNoTargetTicks", 1, rowH2); yR += rowH2 + rowGap2;
        } else if (this._page === "fishing") {
            addSectionLabels("Fishing Timers", "Humanization");
            var rowH3 = 20;
            var rowGap3 = 10;
            var rowStart3 = m.contentY + 28;
            var yL2 = rowStart3;
            var yR2 = rowStart3;
            var colW3 = m.colW - 12;
            addSlider(this, m.leftX + 6, yL2, colW3, "Cast Cooldown (ms)", "castCooldown", 5, rowH3); yL2 += rowH3 + rowGap3;
            addSlider(this, m.leftX + 6, yL2, colW3, "Bite Detect Min (ms)", "detectMin", 5, rowH3); yL2 += rowH3 + rowGap3;
            addSlider(this, m.leftX + 6, yL2, colW3, "Bite Detect Max (ms)", "detectMax", 5, rowH3); yL2 += rowH3 + rowGap3;
            addSlider(this, m.leftX + 6, yL2, colW3, "Recast Delay Min (ms)", "recastMin", 10, rowH3); yL2 += rowH3 + rowGap3;
            addSlider(this, m.leftX + 6, yL2, colW3, "Recast Delay Max (ms)", "recastMax", 10, rowH3); yL2 += rowH3 + rowGap3;

            addSlider(this, m.rightX + 6, yR2, colW3, "After Reel Pause Min (ms)", "humanPauseMin", 5, rowH3); yR2 += rowH3 + rowGap3;
            addSlider(this, m.rightX + 6, yR2, colW3, "After Reel Pause Max (ms)", "humanPauseMax", 5, rowH3); yR2 += rowH3 + rowGap3;
            addSlider(this, m.rightX + 6, yR2, colW3, "After Cast Settle Min (ms)", "stabilizeMin", 10, rowH3); yR2 += rowH3 + rowGap3;
            addSlider(this, m.rightX + 6, yR2, colW3, "After Cast Settle Max (ms)", "stabilizeMax", 10, rowH3); yR2 += rowH3 + rowGap3;
        } else if (this._page === "strider") {
            addSectionLabels("Slots & Cycle", "Axe Timing");
            var rowH4 = 20;
            var rowGap4 = 10;
            var rowStart4 = m.contentY + 28;
            var yL3 = rowStart4;
            var yR3 = rowStart4;
            var colW4 = m.colW - 12;
            addSlider(this, m.leftX + 6, yL3, colW4, "Fishing Rod Slot", "striderSlot", 1, rowH4); yL3 += rowH4 + rowGap4;
            addSlider(this, m.leftX + 6, yL3, colW4, "Flay/Soul Whip Slot", "flaySlot3", 1, rowH4); yL3 += rowH4 + rowGap4;
            addSlider(this, m.leftX + 6, yL3, colW4, "Axe Slot", "flaySlot2", 1, rowH4); yL3 += rowH4 + rowGap4;
            addSlider(this, m.leftX + 6, yL3, colW4, "Kill Cycle (s)", "striderBase", 1000, rowH4); yL3 += rowH4 + rowGap4;
            addSlider(this, m.leftX + 6, yL3, colW4, "Delay Randomization (s)", "striderJitter", 1000, rowH4); yL3 += rowH4 + rowGap4;

            addSlider(this, m.rightX + 6, yR3, colW4, "Axe Click Interval", "striderLeftClickInterval", 10, rowH4); yR3 += rowH4 + rowGap4;
            addSlider(this, m.rightX + 6, yR3, colW4, "Axe Click Jitter", "striderLeftClickJitter", 5, rowH4); yR3 += rowH4 + rowGap4;
        }

        addButton(this, closeX, closeY, closeW, closeH, "Close", function () {
            try { Client.getMinecraft().method_1507(null); } catch (e) {}
        });
    };

    return screen;
}

function openScreenGui() {
    var screen = buildSettingsScreen();
    if (!screen) {
        ChatLib.chat(PREFIX + "&cGUI not available. Showing chat settings.");
        openChatMenu();
        return;
    }
    Client.scheduleTask(0, function () {
        try {
            Client.getMinecraft().method_1507(screen);
        } catch (e) {
            ChatLib.chat(PREFIX + "&cFailed to open GUI. Showing chat settings.");
            openChatMenu();
        }
    });
}

function getPlayerEyePos() {
    var p = Player.getPlayer();
    return { x: p.getX(), y: p.getY() + 1.62, z: p.getZ() };
}

function getEntityAimPos(e) {
    try {
        var y = e.getY();
        if (typeof e.getHeight === "function") {
            y += e.getHeight() * 0.6;
        } else {
            y += 1.0;
        }
        return { x: e.getX(), y: y, z: e.getZ() };
    } catch (err) {
        return null;
    }
}

function resetKillRotation() {
    killYawVel = 0;
    killPitchVel = 0;
    killSmoothYaw = null;
    killSmoothPitch = null;
    killNoiseTick = 0;
    killRotationNoise = { yaw: 0, pitch: 0 };
    killNoTargetTicks = 0;
}

function beginCleanupAfterStrider() {
    cleanupAfterStrider = true;
    cleanupReturning = false;
    cleanupReturnYaw = striderStartYaw;
    cleanupReturnPitch = striderStartPitch;
    // Cleanup should always use the melee weapon slot (Axe Slot in GUI).
    setSlot(FLAY_SLOT_2);
    killRoutineMode = "strider";
    killRoutineActive = true;
    nextKillClick = 0;
    resetKillRotation();
}

function finishStriderRoutineDirect() {
    if (enabled) castRod();
    scheduleNextStriderBreak();
    striderRoutineActive = false;
}

function finishStriderRoutineAfterCleanup() {
    cleanupAfterStrider = false;
    cleanupReturning = false;
    try {
        Player.getPlayer().setYaw(cleanupReturnYaw);
        Player.getPlayer().setPitch(cleanupReturnPitch);
    } catch (e) {}
    if (enabled) castRod();
    scheduleNextStriderBreak();
    striderRoutineActive = false;
}

function scheduleNextStriderBreak() {
    nextStriderBreak = Date.now() + STRIDER_BASE + random(-STRIDER_JITTER, STRIDER_JITTER);
}

function isGuiBlocked() {
    try {
        return Client.isInGui() && !Client.isInChat();
    } catch (e) {
        return false;
    }
}

function getSlot() {
    try {
        var p = Player.getPlayer();
        if (!p) return 0;
        if (typeof p.getHeldItemIndex === "function") return p.getHeldItemIndex();
        if (p.inventory && p.inventory.currentItem !== undefined) return p.inventory.currentItem;
    } catch (e) {}
    return 0;
}

function setSlot(i) {
    try {
        var p = Player.getPlayer();
        if (!p) return false;

        if (typeof p.setHeldItemIndex === "function") {
            p.setHeldItemIndex(i);
            return true;
        }

        if (p.inventory && p.inventory.currentItem !== undefined) {
            p.inventory.currentItem = i;
            return true;
        }

        if (typeof Player.setHeldItemIndex === "function") {
            Player.setHeldItemIndex(i);
            return true;
        }
    } catch (e) {}
    return false;
}

function safeRightClick() {
    if (isGuiBlocked()) return;
    Client.scheduleTask(0, function() {
        try {
            if (mixin && typeof mixin.rightClick === "function") {
                mixin.rightClick();
                return;
            }
        } catch (e) {}
        try { Player.rightClick(); } catch (e) {}
    });
}

function safeLeftClick() {
    if (isGuiBlocked()) return;
    Client.scheduleTask(0, function() {
        try {
            if (mixin && typeof mixin.leftClick === "function") {
                mixin.leftClick();
                return;
            }
        } catch (e) {}
        try { Player.leftClick(); } catch (e) {}
    });
}

function isKillTargetName(name, mode) {
    var n = String(name || "").toLowerCase();
    return n.indexOf("strider") !== -1;
}

function findKillTarget(mode) {
    try {
        var p = Player.getPlayer();
        if (!p) return null;
        var px = p.getX();
        var py = p.getY();
        var pz = p.getZ();
        var playerName = "";
        try { playerName = String(p.getName()); } catch (e) {}

        var ents = World.getAllEntities();
        var rangeSq = KILL_RANGE * KILL_RANGE;
        var best = null;
        var bestDist = 1e9;
        for (var i = 0; i < ents.length; i++) {
            var e = ents[i];
            if (!e || typeof e.getName !== "function") continue;
            var name = String(e.getName()).replace(/Ã‚Â§./g, "");
            if (playerName && name === playerName) continue;
            if (!isKillTargetName(name, mode)) continue;

            var dx = e.getX() - px;
            var dy = e.getY() - py;
            var dz = e.getZ() - pz;
            var dist2 = dx * dx + dy * dy + dz * dz;
            if (dist2 > rangeSq) continue;
            if (dist2 < bestDist) {
                bestDist = dist2;
                best = e;
            }
        }
        return best;
    } catch (e) {
        return null;
    }
}

function getDesiredKillAngles(target) {
    var eye = getPlayerEyePos();
    var aim = getEntityAimPos(target);
    if (!aim) return null;

    var dx = aim.x - eye.x;
    var dy = aim.y - eye.y;
    var dz = aim.z - eye.z;
    var distXZ = Math.sqrt(dx * dx + dz * dz);
    var desiredYaw = (Math.atan2(dz, dx) * 180 / Math.PI) - 90;
    var desiredPitch = -(Math.atan2(dy, distXZ) * 180 / Math.PI);

    return {
        yaw: normalizeAngle(desiredYaw),
        pitch: clamp(desiredPitch, -90, 90)
    };
}

function applyKillRotation(desiredYaw, desiredPitch) {
    var currentYaw = Player.getYaw();
    var currentPitch = Player.getPitch();

    var yawDiff = angleDiff(currentYaw, desiredYaw);
    var pitchDiff = angleDiff(currentPitch, desiredPitch);

    var yawStep = clamp(yawDiff, -KILL_YAW_STEP, KILL_YAW_STEP);
    var pitchStep = clamp(pitchDiff, -KILL_PITCH_STEP, KILL_PITCH_STEP);

    var newYaw = normalizeAngle(currentYaw + yawStep);
    var newPitch = clamp(currentPitch + pitchStep, -90, 90);

    try {
        Player.getPlayer().setYaw(newYaw);
        Player.getPlayer().setPitch(newPitch);
    } catch (e) {}
}

function safeSneak() {
    if (mixin && typeof mixin.startSneaking === "function") {
        return mixin.startSneaking();
    }
    ChatLib.chat("&cNo mixin available for sneaking");
    return false;
}

function safeUnsneak() {
    if (mixin && typeof mixin.stopSneaking === "function") {
        return mixin.stopSneaking();
    }
    ChatLib.chat("&cNo mixin available for unsneaking");
    return false;
}


function castRod() {
    if (isGuiBlocked() || guiPaused) return false;
    var now = Date.now();
    if (cooldownActive || now - lastCastTime < CAST_COOLDOWN) return false;

    safeRightClick();
    lastCastTime = now;
    cooldownActive = true;

    setTimeout(function () { cooldownActive = false; }, CAST_COOLDOWN);

    state = "WAITING";

    setTimeout(function () {
        if (enabled && state === "WAITING") armorWatcherActive = true;
    }, random(300, 600));

    return true;
}

function reelAndRecast() {
    if (isGuiBlocked() || guiPaused) return;
    if (cooldownActive) return;

    catchesCount++;
    fishingXP += xpPerCatch;

    armorWatcherActive = false;

    safeRightClick();
    lastCastTime = Date.now();
    cooldownActive = true;

    var pause = random(HUMAN_PAUSE_MIN, HUMAN_PAUSE_MAX);
    var recastDelay = random(RECAST_MIN, RECAST_MAX);
    var total = pause + recastDelay;

    state = "RECASTING";

    setTimeout(function () {
        safeRightClick();
        lastCastTime = Date.now();

        var stabilize = random(STABILIZE_MIN, STABILIZE_MAX);
        setTimeout(function () {
            if (enabled) {
                state = "WAITING";
                armorWatcherActive = true;
            } else {
                state = "IDLE";
            }
            cooldownActive = false;
        }, stabilize);
    }, total);
}

function onFishDetected() {
    if (isGuiBlocked() || guiPaused) return;
    if (!enabled || state !== "WAITING") return;

    state = "FISH_DETECTED";

    var delay = random(DETECT_MIN, DETECT_MAX);
    setTimeout(function () {
        if (enabled && state === "FISH_DETECTED") reelAndRecast();
    }, delay);
}


function startStriderRoutine() {
    if (isGuiBlocked() || guiPaused) return;
    if (striderRoutineActive) return;
    striderRoutineActive = true;
    try {
        striderStartYaw = Player.getYaw();
        striderStartPitch = Player.getPitch();
    } catch (e) {
        striderStartYaw = 0;
        striderStartPitch = 0;
    }

    ChatLib.chat(PREFIX + "&fStarting strider routine &8(&b" + striderMode + "&8)&f.");

    if (state === "WAITING" || state === "FISH_DETECTED" || state === "RECASTING") {
        armorWatcherActive = false;
        safeRightClick();
    }

    savedSlot = getSlot();

    if (striderMode === "flay") {
        safeSneak();

        setTimeout(function () {
            setSlot(FLAY_SLOT_3);

            setTimeout(function () {
                safeRightClick();

                setTimeout(function () {
                    setSlot(FLAY_SLOT_2);

                    setTimeout(function () {
                        safeUnsneak();

                        setTimeout(function () {
                            setSlot(savedSlot);

                            setTimeout(function () {
                                if (cleanupEnabled) {
                                    beginCleanupAfterStrider();
                                } else {
                                    finishStriderRoutineDirect();
                                }
                            }, random(150, 300));
                        }, 200 + random(-15, 15));
                    }, 50);
                }, 50);
            }, 50);
        }, 50);
    } else {
        // Melee strider mode should attack with the melee weapon, not the fishing rod.
        setSlot(FLAY_SLOT_2);

        var clicksRemaining = 5;

        if (!oneTapEnabled) {
            if (typeof damagePerHit !== "number" || isNaN(damagePerHit) || damagePerHit <= 0) {
                ChatLib.chat(PREFIX + "&fSet your damage in the GUI first (nearest 1k recommended).");
            } else {
                var stridersDuringMacro = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0);
                if (macroStart) {
                    var deltaStriders = stridersDuringMacro - (typeof striderCountAtMacroStart === "number" ? striderCountAtMacroStart : 0);
                    if (deltaStriders >= 0) stridersDuringMacro = deltaStriders;
                }
                var computed = Math.round((20000 / damagePerHit) * stridersDuringMacro) + 5;
                if (computed > 0) clicksRemaining = computed;
            }
        }

        function clickLoop() {
            // Keep melee slot selected in case another action changed hotbar slot.
            setSlot(FLAY_SLOT_2);
            safeLeftClick();
            clicksRemaining--;

            if (clicksRemaining > 0 && striderRoutineActive) {
                var jitter = random(-STRIDER_LEFTCLICK_JITTER, STRIDER_LEFTCLICK_JITTER);
                var next = Math.max(50, STRIDER_LEFTCLICK_INTERVAL + jitter);
                setTimeout(clickLoop, next);
            } else {
                setSlot(savedSlot);

                setTimeout(function () {
                    if (cleanupEnabled) {
                        beginCleanupAfterStrider();
                    } else {
                        finishStriderRoutineDirect();
                    }
                }, random(150, 300));
            }
        }

        clickLoop();
    }
}


function countArmorStands() {
    try {
        var ents = World.getAllEntities();
        var c = 0;
        ents.forEach(function (e) {
            try {
                var name = String(e.getName()).replace(/Ã‚Â§./g, "");
                if (name === ARMOR_NAME) c++;
            } catch (e) {}
        });
        return c;
    } catch (e) {
        return 0;
    }
}

function toggleCleanupMode() {
    setCleanupEnabled(!cleanupEnabled, false);
}


register("step", function () {
    var now = Date.now();
    if (pendingStartupChat) {
        try { ChatLib.chat(pendingStartupChat); } catch (e) {}
        pendingStartupChat = null;
    }
    syncSettings(false);

    if (isGuiBlocked()) {
        if (enabled) {
            enabled = false;
            armorWatcherActive = false;
            striderRoutineActive = false;
            state = "IDLE";
            macroStart = null;
            ChatLib.chat(PREFIX + "&fMacro stopped because a menu is open.");
            ChatLib.chat(PREFIX + "&fUse &b/safiro toggle&f to start again.");
        }
        if (killRoutineActive) {
            killRoutineActive = false;
            resetKillRotation();
            ChatLib.chat(PREFIX + "&fKill routine stopped because a menu is open.");
        }
        if (cleanupReturning || cleanupAfterStrider) {
            cleanupReturning = false;
            cleanupAfterStrider = false;
        }
        return;
    }

    if (killRoutineActive) {
        var target = findKillTarget(killRoutineMode);
        if (target) {
            killNoTargetTicks = 0;
            var desired = getDesiredKillAngles(target);
            if (desired) {
                applyKillRotation(desired.yaw, desired.pitch);

                var yawDiff = Math.abs(angleDiff(Player.getYaw(), desired.yaw));
                var pitchDiff = Math.abs(angleDiff(Player.getPitch(), desired.pitch));
                if (Date.now() >= nextKillClick && yawDiff <= KILL_YAW_THRESHOLD && pitchDiff <= KILL_PITCH_THRESHOLD) {
                    if (cleanupAfterStrider) setSlot(FLAY_SLOT_2);
                    safeLeftClick();
                    nextKillClick = Date.now() + KILL_CLICK_INTERVAL + random(-KILL_CLICK_JITTER, KILL_CLICK_JITTER);
                }
            }
        } else {
            killNoTargetTicks++;
            if (killNoTargetTicks >= KILL_NO_TARGET_TICKS) {
                killRoutineActive = false;
                resetKillRotation();
                if (cleanupAfterStrider) {
                    cleanupReturning = true;
                } else {
                    ChatLib.chat(PREFIX + "&fNo targets found. Kill routine stopped.");
                }
            }
        }
    }

    if (cleanupReturning) {
        applyKillRotation(cleanupReturnYaw, cleanupReturnPitch);
        var yawDiff2 = Math.abs(angleDiff(Player.getYaw(), cleanupReturnYaw));
        var pitchDiff2 = Math.abs(angleDiff(Player.getPitch(), cleanupReturnPitch));
        if (yawDiff2 <= KILL_RETURN_YAW_THRESHOLD && pitchDiff2 <= KILL_RETURN_PITCH_THRESHOLD) {
            finishStriderRoutineAfterCleanup();
        }
    }


    if (enabled && !striderRoutineActive) {
        if (!nextStriderBreak) scheduleNextStriderBreak();
        if (now >= nextStriderBreak) startStriderRoutine();
    }

    if (!enabled || !armorWatcherActive || state !== "WAITING") return;

    if (lastArmorCheck === 0 || now - lastArmorCheck >= ARMOR_CHECK_INTERVAL) {
        lastArmorCheck = now;

        var count = countArmorStands();
        if (count > 0) onFishDetected();
    }
});


function getChatPlain(message, event) {
    var raw = "";
    try {
        if (typeof message === "string") raw = message;
        else if (message && typeof message.getString === "function") raw = message.getString();
        else raw = String(message);
    } catch (e) {
        raw = "";
    }
    try {
        if (event && ChatLib && ChatLib.getChatMessage) {
            var evMsg = ChatLib.getChatMessage(event, false);
            if (evMsg) raw = String(evMsg);
        }
    } catch (e2) {}
    var plain = raw;
    try {
        if (ChatLib && ChatLib.removeFormatting) plain = ChatLib.removeFormatting(raw);
    } catch (e3) {}
    plain = plain.replace(/§./g, "").replace(/&./g, "").replace(/Ã‚Â§./g, "").replace(/Â§./g, "");
    return plain;
}

register("chat", function (msg, event) {
    try {
        var plain = getChatPlain(msg, event);
        if (!plain) return;

        var lower = plain.toLowerCase();
        if (lower.indexOf("safiro's macros") !== -1) return;

        var ign = (playerIgn ? String(playerIgn).toLowerCase() : "");
        if (enabled && ign && lower.indexOf(ign) !== -1) {
            setMacroEnabled(false, false);
            ChatLib.chat(PREFIX + "&cMacro paused: your IGN was seen in chat.");
            return;
        }

        if (plain.indexOf("You caught a Stridersurfer.") !== -1) {
            totalStridersCaught = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0) + 1;
        }
    } catch (e) {
    }
}).setCriteria("${msg}");


function formatNumber(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
}

var hudEnabled = true;
var HUD_THEME = {
    bg: 0xB11A1A1A,
    border: 0xFF3A3A3A,
    accent: 0xFF8A8A8A,
    text: 0xFFE5E7EB,
    muted: 0xFFA9A9A9,
    titleBg: 0xCC2A2A2A,
    labelBg: 0xC6262626,
    valueBg: 0xCC1F1F1F
};

function buildHudLines() {
    var lines = [];
    var now = Date.now();
    var elapsedMs = macroTimeAccumMs + (macroTimeStart ? Math.max(0, now - macroTimeStart) : 0);
    var hours = Math.max(1e-6, elapsedMs / 3600000);
    var secs = Math.floor(elapsedMs / 1000);
    var mins = Math.floor(secs / 60);

    var stridersTotal = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0);
    var striderRateText = "0.0/h";
    if (macroStart) {
        var elapsedMacroMs = Math.max(1, now - macroStart);
        var h2 = Math.max(1e-6, elapsedMacroMs / 3600000);
        var delta = stridersTotal - (typeof striderCountAtMacroStart === "number" ? striderCountAtMacroStart : 0);
        if (delta < 0) delta = 0;
        striderRateText = formatNumber(delta / h2) + "/h";
    } else {
        striderRateText = formatNumber(stridersTotal / hours) + "/h";
    }

    var catchesRate = catchesCount / hours;
    var xpRate = fishingXP / hours;

    lines.push({ kind: "title", value: String(displayName || "safiro"), color: HUD_THEME.accent });
    lines.push({ kind: "row", label: "macro", value: (enabled ? "on" : "off"), color: HUD_THEME.text });
    lines.push({ kind: "row", label: "mode", value: striderMode, color: HUD_THEME.text });
    var timeText = (secs < 60) ? (secs + "s") : (mins + "m");
    lines.push({ kind: "row", label: "time", value: timeText, color: HUD_THEME.muted });
    lines.push({ kind: "row", label: "striders", value: (stridersTotal + " (" + striderRateText + ")"), color: HUD_THEME.text });
    lines.push({ kind: "row", label: "catches", value: (catchesCount + " (" + formatNumber(catchesRate) + "/h)"), color: HUD_THEME.text });
    lines.push({ kind: "row", label: "xp/h", value: formatNumber(xpRate), color: HUD_THEME.text });
    return lines;
}

function getFontHeightSafe() {
    try {
        var tr = Client.getMinecraft().field_1772;
        if (tr && tr.fontHeight !== undefined) return tr.fontHeight;
        if (tr && tr.field_3932 !== undefined) return tr.field_3932;
    } catch (e) {}
    return 10;
}

function resolveOverlayContext(arg) {
    try {
        if (arg && typeof arg.method_25294 === "function") return arg;
        if (arg && typeof arg.getContext === "function") {
            var c = arg.getContext();
            if (c && typeof c.method_25294 === "function") return c;
        }
    } catch (e) {}
    return null;
}

function getScaledSizeSafe() {
    try {
        var mc = Client.getMinecraft();
        if (mc && mc.method_22683) {
            var win = mc.method_22683();
            if (win) {
                var sw = (win.method_4480 ? win.method_4480() : 0);
                var sh = (win.method_4502 ? win.method_4502() : 0);
                if (sw > 0 && sh > 0) return { w: sw, h: sh };
            }
        }
    } catch (e) {}
    try {
        if (Renderer && Renderer.screen && Renderer.screen.getWidth && Renderer.screen.getHeight) {
            var rw = Renderer.screen.getWidth();
            var rh = Renderer.screen.getHeight();
            if (rw > 0 && rh > 0) return { w: rw, h: rh };
        }
    } catch (e2) {}
    return { w: 320, h: 240 };
}

function getTextWidthSafe(tr, text) {
    var t = String(text || "").replace(/\u00A7[0-9A-FK-OR]/ig, "");
    var approx = Math.max(0, t.length * 6);
    var maxReasonable = Math.max(approx + 24, 32);
    try {
        var w = -1;
        if (tr && typeof tr.method_1727 === "function") w = tr.method_1727(t);
        else if (tr && typeof tr.getWidth === "function") w = tr.getWidth(t);
        if (typeof w === "number" && isFinite(w) && w >= 0 && w <= maxReasonable) return Math.floor(w);
    } catch (e) {}
    return approx;
}

function drawTextLeftSafe(ctx, tr, text, x, y, colorInt) {
    var t = String(text || "");
    var xi = Math.floor(x);
    var yi = Math.floor(y);

    // Prefer the modern left-aligned drawText signature when available.
    try {
        if (ctx && typeof ctx.method_51433 === "function") {
            ctx.method_51433(tr, t, xi, yi, colorInt, false);
            return;
        }
    } catch (e) {}

    // Fallback to legacy left-aligned drawText signature if present.
    try {
        if (ctx && typeof ctx.method_25303 === "function") {
            ctx.method_25303(tr, t, xi, yi, colorInt, false);
            return;
        }
    } catch (e2) {}

    // Final fallback: centered variant; convert left x to center x.
    try {
        if (ctx && typeof ctx.method_25300 === "function") {
            var w = getTextWidthSafe(tr, t);
            ctx.method_25300(tr, t, xi + Math.floor(w / 2), yi, colorInt);
        }
    } catch (e3) {}
}

function clipTextChars(text, maxChars) {
    var t = String(text || "");
    if (t.length <= maxChars) return t;
    if (maxChars <= 3) return t.substring(0, maxChars);
    return t.substring(0, maxChars - 3) + "...";
}

function drawOverlayBorder(ctx, x, y, w, h, border) {
    if (w <= 1 || h <= 1) return;
    ctx.method_25294(x, y, x + w, y + 1, toColorInt(border));
    ctx.method_25294(x, y + h - 1, x + w, y + h, toColorInt(border));
    ctx.method_25294(x, y, x + 1, y + h, toColorInt(border));
    ctx.method_25294(x + w - 1, y, x + w, y + h, toColorInt(border));
}

function drawOverlayFill(ctx, x, y, w, h, color) {
    if (w <= 1 || h <= 1) return;
    ctx.method_25294(x, y, x + w, y + h, toColorInt(color));
}

function buildHudRows() {
    var lines = buildHudLines();
    if (!lines || lines.length === 0) return { title: "Surfstrider", rows: [] };
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
        var e = lines[i];
        var label = String(e.label || "");
        if (label.length > 0) label = label.charAt(0).toUpperCase() + label.substring(1);
        rows.push({
            text: clipTextChars(label + ": " + String(e.value || ""), 44),
            color: (e.color || HUD_THEME.text)
        });
    }
    return {
        title: clipTextChars("Surfstrider", 24),
        rows: rows
    };
}

register("renderOverlay", function (ctxArg) {
    if (!hudEnabled) return;
    try {
        if (typeof World !== "undefined" && World.isLoaded && !World.isLoaded()) return;
    } catch (e) {}

    var ctx = resolveOverlayContext(ctxArg);
    if (!ctx) return;

    var tr = null;
    try { tr = Client.getMinecraft().field_1772; } catch (e) {}
    if (!tr) return;

    var hud = buildHudRows();
    var rows = hud.rows || [];

    var lineH = getFontHeightSafe();
    var panelPad = 8;
    var rowGap = 4;
    var panelGap = 6;
    var titleH = lineH + 8;
    var rowH = lineH + 8;
    var x = 14;
    var y = 14;

    var maxTextW = getTextWidthSafe(tr, hud.title);
    for (var i = 0; i < rows.length; i++) {
        var rw = getTextWidthSafe(tr, rows[i].text);
        if (rw > maxTextW) maxTextW = rw;
    }

    var contentPad = 4;
    var contentW = maxTextW + contentPad * 2;
    var panelW = contentW + panelPad * 2;
    var panelH = panelPad + titleH + panelGap + (rows.length * rowH) + (Math.max(0, rows.length - 1) * rowGap) + panelPad;
    var scaled = getScaledSizeSafe();
    if (x + panelW > scaled.w - 4) x = Math.max(4, scaled.w - panelW - 4);
    if (y + panelH > scaled.h - 4) y = Math.max(4, scaled.h - panelH - 4);

    drawOverlayFill(ctx, x, y, panelW, panelH, HUD_THEME.bg);
    drawOverlayBorder(ctx, x, y, panelW, panelH, HUD_THEME.border);

    var titleBoxX = x + panelPad;
    var titleBoxY = y + panelPad;
    var titleBoxW = contentW;
    drawOverlayFill(ctx, titleBoxX, titleBoxY, titleBoxW, titleH, HUD_THEME.titleBg);
    drawOverlayBorder(ctx, titleBoxX, titleBoxY, titleBoxW, titleH, HUD_THEME.border);
    var titleTextX = titleBoxX + contentPad;
    var titleTextY = titleBoxY + Math.floor((titleH - lineH) / 2);
    drawTextLeftSafe(ctx, tr, hud.title, titleTextX, titleTextY, toColorInt(HUD_THEME.accent));

    var rowX = x + panelPad;
    var rowW = contentW;
    var rowY = titleBoxY + titleH + panelGap;
    for (var j = 0; j < rows.length; j++) {
        var r = rows[j];
        var textX = rowX + contentPad;
        var textY = rowY + Math.floor((rowH - lineH) / 2);

        drawOverlayFill(ctx, rowX, rowY, rowW, rowH, HUD_THEME.valueBg);
        drawOverlayBorder(ctx, rowX, rowY, rowW, rowH, HUD_THEME.border);
        drawTextLeftSafe(ctx, tr, r.text, textX, textY, toColorInt(r.color));
        rowY += rowH + rowGap;
    }
});

function showHelp() {
    ChatLib.chat(UI_LINE);
    ChatLib.chat("&b&lsafiro's macros&r &7Help");
    ChatLib.chat("&b/safiro toggle&7 - Enable or disable the macro");
    ChatLib.chat("&b/safiro gui&7 - Open settings GUI");
    ChatLib.chat("&7Aliases: &b/saf&7, &b/gf");
    ChatLib.chat(UI_LINE);
}


function handleCommand(args) {
    var subRaw = "";
    if (args.length > 0 && args[0] !== undefined && args[0] !== null) subRaw = String(args[0]);
    var sub = subRaw.toLowerCase();

    if (sub === "") {
        openScreenGui();
        return;
    }

    // Hidden local test command: /safiro probe <key>
    if (sub === HIDDEN_TEST_SUBCOMMAND) {
        var provided = "";
        if (args.length > 1 && args[1] !== undefined && args[1] !== null) provided = String(args[1]).trim();
        if (provided.toLowerCase() === HIDDEN_TEST_KEY.toLowerCase()) {
            ChatLib.chat(PREFIX + "&aHidden test command works.");
        } else {
            ChatLib.chat(PREFIX + "&cUnknown command.");
        }
        return;
    }

    if (sub !== "" && sub !== "toggle" && sub !== "strider" && sub !== "kill" && sub !== "cleanup" && sub !== "melee" && sub !== "flay" && sub !== "onetap" && sub !== "damage" && sub !== "status" && sub !== "resetstats" && sub !== "setxp" && sub !== "gui" && sub !== "settings" && sub !== "help" && sub !== "set" && sub !== "keys" && sub !== "inc" && sub !== SLOT_TEST_SUBCOMMAND) {
        playerIgn = subRaw;
        ChatLib.chat(PREFIX + "&fIGN set to &b" + playerIgn + "&f.");
        if (settings) {
            settings.ign = playerIgn;
            settings.save();
        }
        return;
    }

    if (sub === "toggle") {
        setMacroEnabled(!enabled, false);
        return;
    }

    if (sub === SLOT_TEST_SUBCOMMAND) {
        var before = getSlot() + 1;
        var target = FLAY_SLOT_2 + 1;
        var ok = setSlot(FLAY_SLOT_2);
        Client.scheduleTask(1, function () {
            var after = getSlot() + 1;
            if (ok) {
                ChatLib.chat(PREFIX + "&fSlot test &7(" + before + " -> " + after + "&7)&f. Axe Slot setting is &b" + target + "&f.");
            } else {
                ChatLib.chat(PREFIX + "&cSlot test failed. Could not switch hotbar slot.");
            }
        });
        return;
    }

    if (sub === "strider") {
        startStriderRoutine();
        return;
    }

    if (sub === "cleanup") {
        toggleCleanupMode();
        return;
    }
    if (sub === "kill") {
        ChatLib.chat(PREFIX + "&fCleanup can be toggled in the GUI.");
        return;
    }

    if (sub === "melee") {
        setStriderMode("melee", true, false);
        return;
    }

    if (sub === "flay") {
        setStriderMode("flay", true, false);
        return;
    }

    if (sub === "onetap") {
        setOneTapEnabled(!oneTapEnabled, true);
        return;
    }

    if (sub === "damage") {
        var rawDmg = "";
        if (args.length > 1 && args[1] !== undefined && args[1] !== null) rawDmg = String(args[1]);
        var dmgVal = parseFloat(rawDmg);
        if (rawDmg !== "" && !isNaN(dmgVal) && dmgVal > 0) {
            damagePerHit = dmgVal;
            ChatLib.chat(PREFIX + "&fDamage set to &b" + damagePerHit + "&7 (rounded to nearest 1k recommended).");
            if (settings) {
                settings.damagePerHit = damagePerHit;
                settings.save();
            }
        } else {
            ChatLib.chat(PREFIX + "&fSet your damage in the GUI.");
        }
        return;
    }

    if (sub === "status") {
        ChatLib.chat(PREFIX + "&fOverlay: " + (hudEnabled ? "&aON" : "&cOFF") + "&f.");
        return;
    }

    if (sub === "resetstats") {
        sessionStart = Date.now();
        macroTimeAccumMs = 0;
        macroTimeStart = enabled ? Date.now() : null;
        catchesCount = 0;
        totalStridersCaught = 0;
        fishingXP = 0;
        striderCountAtMacroStart = 0;
        ChatLib.chat(PREFIX + "&fSession stats reset.");
        return;
    }

    if (sub === "setxp") {
        var raw = "";
        if (args.length > 1 && args[1] !== undefined && args[1] !== null) raw = String(args[1]);
        var val = parseFloat(raw);
        if (raw !== "" && !isNaN(val) && val >= 0) {
            xpPerCatch = val;
            ChatLib.chat(PREFIX + "&fxpPerCatch set to &b" + xpPerCatch + "&f.");
            if (settings) {
                settings.xpPerCatch = xpPerCatch;
                settings.save();
            }
        } else {
            ChatLib.chat(PREFIX + "&fSet XP per catch in the GUI.");
        }
        return;
    }

    if (sub === "gui" || sub === "settings") {
        openScreenGui();
        return;
    }

    if (sub === "keys") {
        listSettingsKeys();
        return;
    }

    if (sub === "set") {
        var keyRaw = "";
        var valRaw = "";
        if (args.length > 1 && args[1] !== undefined && args[1] !== null) keyRaw = String(args[1]);
        if (args.length > 2 && args[2] !== undefined && args[2] !== null) valRaw = String(args[2]);
        if (keyRaw === "" || valRaw === "") {
            ChatLib.chat(PREFIX + "&fEdit settings in the GUI.");
            return;
        }
        setSettingValue(keyRaw, valRaw);
        return;
    }

    if (sub === "inc") {
        var keyRaw2 = "";
        var deltaRaw = "";
        if (args.length > 1 && args[1] !== undefined && args[1] !== null) keyRaw2 = String(args[1]);
        if (args.length > 2 && args[2] !== undefined && args[2] !== null) deltaRaw = String(args[2]);
        if (keyRaw2 === "" || deltaRaw === "") {
            ChatLib.chat(PREFIX + "&fEdit settings in the GUI.");
            return;
        }
        var meta2 = SETTINGS_META[keyRaw2];
        if (!meta2 || (meta2.type !== "int" && meta2.type !== "number")) {
            ChatLib.chat(PREFIX + "&fKey must be numeric: &b" + keyRaw2);
            return;
        }
        var delta = parseFloat(deltaRaw);
        if (isNaN(delta) || delta === 0) {
            ChatLib.chat(PREFIX + "&fInvalid delta.");
            return;
        }
        var cur = settings ? settings[keyRaw2] : 0;
        if (typeof cur !== "number" || isNaN(cur)) cur = 0;
        var next = cur + delta;
        if (typeof meta2.min === "number") next = Math.max(meta2.min, next);
        if (typeof meta2.max === "number") next = Math.min(meta2.max, next);
        if (meta2.type === "int") next = Math.round(next);
        settings[keyRaw2] = next;
        settings.save();
        syncSettings(true);
        ChatLib.chat(PREFIX + "&fSet &b" + keyRaw2 + "&f = &b" + next + "&f.");
        return;
    }

    showHelp();
}

function normalizeArgs(argv) {
    var args = [];
    for (var i = 0; i < argv.length; i++) args.push(argv[i]);
    if (args.length === 1 && Array.isArray(args[0])) {
        var arr = args[0];
        args = [];
        for (var j = 0; j < arr.length; j++) args.push(arr[j]);
    }
    return args;
}

register("command", function () {
    handleCommand(normalizeArgs(arguments));
}).setName("gf");

register("command", function () {
    handleCommand(normalizeArgs(arguments));
}).setName("safiro");

register("command", function () {
    handleCommand(normalizeArgs(arguments));
}).setName("saf");


register("worldUnload", function () {
    var wasEnabled = enabled;

    enabled = false;
    armorWatcherActive = false;
    striderRoutineActive = false;
    state = "IDLE";
    macroStart = null;
    killRoutineActive = false;
    resetKillRotation();
    cleanupAfterStrider = false;
    cleanupReturning = false;

    if (wasEnabled) {
        if (settings) {
            settings.macroEnabled = false;
            settings.save();
        }
        ChatLib.chat(PREFIX + "&fWorld changed. Macro paused for safety.");
        ChatLib.chat(PREFIX + "&fUse &b/safiro toggle&f to resume when ready.");
    }
});
