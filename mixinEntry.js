/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

function getMinecraft() {
    try {
        if (typeof Client === "undefined") return null;
        return Client.getMinecraft();
    } catch (e) {
        return null;
    }
}

function getClickMethods(mc) {
    if (!mc) return null;
    try {
        const left = mc.getClass().getDeclaredMethod('method_1536');
        const right = mc.getClass().getDeclaredMethod('method_1583');
        left.setAccessible(true);
        right.setAccessible(true);
        return { left: left, right: right };
    } catch (e) {
        return null;
    }
}

function triggerLeftClick() {
    if (typeof Client === "undefined") return;
    if (Client.isInGui() && !Client.isInChat()) {
        return Chat.message('Left click suppressed: User in menu.');
    }
    const mc = getMinecraft();
    const methods = getClickMethods(mc);
    if (!methods) return;
    methods.left.invoke(mc);
}

function triggerRightClick() {
    if (typeof Client === "undefined") return;
    if (Client.isInGui() && !Client.isInChat()) {
        return Chat.message('Right click suppressed: User in menu.');
    }
    const mc = getMinecraft();
    const methods = getClickMethods(mc);
    if (!methods) return;
    methods.right.invoke(mc);
}

function startSneaking() {
    try {
        const mc = getMinecraft();
        if (!mc) {
            ChatLib.chat("&cNo Client available");
            return false;
        }
        // Get the game options
        const options = mc.field_1690 || mc.options;
        if (!options) {
            ChatLib.chat("&cNo options found");
            return false;
        }
        
        // Get the sneak keybinding
        // Added field_1832 for 1.21 mappings (field_1844 is often Sprint in 1.21+)
        const sneakKey = options.field_1832 || options.sneakKey || options.keyBindSneak || options.field_1844;
        if (!sneakKey) {
            ChatLib.chat("&cNo sneak key found");
            return false;
        }
        
        // Set the key as pressed
        try {
            sneakKey.setPressed(true);
            ChatLib.chat("&aSneak key pressed");
            return true;
        } catch (e) {
            ChatLib.chat("&cFailed to press sneak key: " + e);
            return false;
        }
    } catch (e) {
        ChatLib.chat("&cSneak error: " + e);
        return false;
    }
}

function stopSneaking() {
    try {
        const mc = getMinecraft();
        if (!mc) {
            ChatLib.chat("&cNo Client available");
            return false;
        }
        // Get the game options
        const options = mc.field_1690 || mc.options;
        if (!options) {
            ChatLib.chat("&cNo options found");
            return false;
        }
        
        // Get the sneak keybinding
        // Added field_1832 for 1.21 mappings
        const sneakKey = options.field_1832 || options.sneakKey || options.keyBindSneak || options.field_1844;
        if (!sneakKey) {
            ChatLib.chat("&cNo sneak key found");
            return false;
        }
        
        // Set the key as not pressed
        try {
            sneakKey.setPressed(false);
            ChatLib.chat("&aSneak key released");
            return true;
        } catch (e) {
            ChatLib.chat("&cFailed to release sneak key: " + e);
            return false;
        }
    } catch (e) {
        ChatLib.chat("&cUnsneak error: " + e);
        return false;
    }
}

module.exports = {
    leftClick: triggerLeftClick,
    rightClick: triggerRightClick,
    startSneaking: startSneaking,
    stopSneaking: stopSneaking
};
