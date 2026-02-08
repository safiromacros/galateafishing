try {
    var mixin = require("./mixinEntry");
    ChatLib.chat("&bsafiro's macros &8>>&a connected");
} catch (e) {
    var mixin = null;
    ChatLib.chat("&csafiro's macros &8>>&c failed to connect: " + e);
}


var enabled = false;
var PREFIX = "&b&lsafiro's macros&r &8>>&r ";
var UI_LINE = "&8&m------------------------------";
var state = "IDLE";
var cooldownActive = false;
var lastCastTime = 0;
var playerIgn = null;

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
var catchesCount = 0;
var totalStridersCaught = 0;
var fishingXP = 0;
var xpPerCatch = 1;
var XP_PER_STRIDER = 1851.8;

var striderCountAtMacroStart = 0;


function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
                                if (enabled) castRod();
                                scheduleNextStriderBreak();
                                striderRoutineActive = false;
                            }, random(150, 300));
                        }, 200 + random(-15, 15));
                    }, 50);
                }, 50);
            }, 50);
        }, 50);
    } else {
        setSlot(STRIDER_SLOT);

        var clicksRemaining = 5;

        if (!oneTapEnabled) {
            if (typeof damagePerHit !== "number" || isNaN(damagePerHit) || damagePerHit <= 0) {
                ChatLib.chat(PREFIX + "&fSet your damage first: &b/safiro damage <number>&7 (rounded to nearest 1k).");
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
            safeLeftClick();
            clicksRemaining--;

            if (clicksRemaining > 0 && striderRoutineActive) {
                var jitter = random(-STRIDER_LEFTCLICK_JITTER, STRIDER_LEFTCLICK_JITTER);
                var next = Math.max(50, STRIDER_LEFTCLICK_INTERVAL + jitter);
                setTimeout(clickLoop, next);
            } else {
                setSlot(savedSlot);

                setTimeout(function () {
                    if (enabled) castRod();
                    scheduleNextStriderBreak();
                    striderRoutineActive = false;
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


register("step", function () {
    var now = Date.now();

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
        return;
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


register("chat", function (message, event) {
    try {
        if (!message) return;
        var plain = message.replace(/Ã‚Â§./g, "");

        if (plain.indexOf("You caught a Stridersurfer.") !== -1) {
            totalStridersCaught = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0) + 1;
        }
    } catch (e) {
    }
});


function formatNumber(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
}

function showHelp() {
    ChatLib.chat(UI_LINE);
    ChatLib.chat("&b&lsafiro's macros&r &7Help");
    ChatLib.chat("&b/safiro <ign>&7 - Set your IGN (required to start)");
    ChatLib.chat("&b/safiro toggle&7 - Enable or disable the macro");
    ChatLib.chat("&b/safiro strider&7 - Run a strider routine now");
    ChatLib.chat("&b/safiro melee&7 - Set strider mode to melee");
    ChatLib.chat("&b/safiro flay&7 - Set strider mode to flay");
    ChatLib.chat("&b/safiro onetap&7 - Toggle onetap mode");
    ChatLib.chat("&b/safiro damage <number>&7 - Set damage for non-onetap");
    ChatLib.chat("&b/safiro status&7 - Show current status");
    ChatLib.chat("&b/safiro resetstats&7 - Reset session stats");
    ChatLib.chat("&b/safiro setxp <number>&7 - Set XP per catch");
    ChatLib.chat(UI_LINE);
}


function handleCommand(args) {
    var subRaw = "";
    if (args.length > 0 && args[0] !== undefined && args[0] !== null) subRaw = String(args[0]);
    var sub = subRaw.toLowerCase();

    if (sub !== "" && sub !== "toggle" && sub !== "strider" && sub !== "melee" && sub !== "flay" && sub !== "onetap" && sub !== "damage" && sub !== "status" && sub !== "resetstats" && sub !== "setxp" && sub !== "help") {
        playerIgn = subRaw;
        ChatLib.chat(PREFIX + "&fIGN set to &b" + playerIgn + "&f.");
        return;
    }

    if (sub === "toggle") {
        if (isGuiBlocked()) {
            ChatLib.chat(PREFIX + "&fClose your menu before toggling the macro.");
            return;
        }
        if (!playerIgn) {
            ChatLib.chat(PREFIX + "&fSet your IGN first: &b/safiro <name>&f.");
            return;
        }
        enabled = !enabled;
        if (enabled) {
            macroStart = Date.now();
            striderCountAtMacroStart = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0);
            scheduleNextStriderBreak();
            if (state === "IDLE") castRod();
            ChatLib.chat(PREFIX + "&aEnabled &7(" + playerIgn + ").");
        } else {
            macroStart = null;
            state = "IDLE";
            armorWatcherActive = false;
            ChatLib.chat(PREFIX + "&cDisabled.");
        }
        return;
    }

    if (sub === "strider") {
        startStriderRoutine();
        return;
    }

    if (sub === "melee") {
        striderMode = "melee";
        ChatLib.chat(PREFIX + "&fStrider mode: &bmelee&f.");
        return;
    }

    if (sub === "flay") {
        striderMode = "flay";
        ChatLib.chat(PREFIX + "&fStrider mode: &bflay&f.");
        return;
    }

    if (sub === "onetap") {
        oneTapEnabled = !oneTapEnabled;
        ChatLib.chat(PREFIX + "&fOnetap mode: " + (oneTapEnabled ? "&aenabled&f." : "&cdisabled&f."));
        if (!oneTapEnabled && (typeof damagePerHit !== "number" || isNaN(damagePerHit) || damagePerHit <= 0)) {
            ChatLib.chat(PREFIX + "&fSet damage: &b/safiro damage <number>&7 (rounded to nearest 1k).");
        }
        return;
    }

    if (sub === "damage") {
        var rawDmg = "";
        if (args.length > 1 && args[1] !== undefined && args[1] !== null) rawDmg = String(args[1]);
        var dmgVal = parseFloat(rawDmg);
        if (rawDmg !== "" && !isNaN(dmgVal) && dmgVal > 0) {
            damagePerHit = dmgVal;
            ChatLib.chat(PREFIX + "&fDamage set to &b" + damagePerHit + "&7 (rounded to nearest 1k recommended).");
        } else {
            ChatLib.chat(PREFIX + "&fUsage: &b/safiro damage <number>");
        }
        return;
    }

    if (sub === "status") {
        ChatLib.chat(UI_LINE);
        ChatLib.chat("&b&lsafiro's macros&r &7Status");
        ChatLib.chat("&fEnabled: &b" + enabled);
        ChatLib.chat("&fState: &b" + state);
        ChatLib.chat("&fStrider mode: &b" + striderMode);
        ChatLib.chat("&fOnetap mode: &b" + oneTapEnabled + (oneTapEnabled ? "" : (" &7(damage=" + (damagePerHit !== null ? damagePerHit : "unset") + ")")));
        ChatLib.chat("&fSession time: &b" + Math.floor((Date.now() - sessionStart) / 60000) + "m");
        var striderRateText = "0.0/h (macro idle)";
        if (macroStart) {
            var now2 = Date.now();
            var elapsedMs2 = now2 - macroStart;
            var hours2 = Math.max(1e-6, elapsedMs2 / 3600000);
            var deltaStriders2 = (typeof totalStridersCaught === "number" ? totalStridersCaught : 0) - (typeof striderCountAtMacroStart === "number" ? striderCountAtMacroStart : 0);
            if (deltaStriders2 < 0) deltaStriders2 = 0;
            striderRateText = formatNumber(deltaStriders2 / hours2) + "/h since toggle";
        }
        ChatLib.chat("&fStrider runs (total): &b" + (typeof totalStridersCaught === "number" ? totalStridersCaught : 0) + " &7(" + striderRateText + ")");
        var elapsedMs3 = Date.now() - sessionStart;
        var hours3 = Math.max(1e-6, elapsedMs3 / 3600000);
        ChatLib.chat("&fCatches: &b" + catchesCount + " &7(" + (catchesCount / hours3).toFixed(1) + "/h)");
        ChatLib.chat("&fFishingXP (session est): &b" + fishingXP.toFixed(1) + " &7(" + (fishingXP / hours3).toFixed(1) + "/h)");
        ChatLib.chat(UI_LINE);
        return;
    }

    if (sub === "resetstats") {
        sessionStart = Date.now();
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
        } else {
            ChatLib.chat(PREFIX + "&fUsage: &b/safiro setxp <number>");
        }
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

    if (wasEnabled) {
        ChatLib.chat(PREFIX + "&fWorld changed. Macro paused for safety.");
        ChatLib.chat(PREFIX + "&fUse &b/safiro toggle&f to resume when ready.");
    }
});
