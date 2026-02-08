/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

const mc = Client.getMinecraft();

const LEFT_CLICK_METHOD = mc.getClass().getDeclaredMethod('method_1536');
const RIGHT_CLICK_METHOD = mc.getClass().getDeclaredMethod('method_1583');
LEFT_CLICK_METHOD.setAccessible(true);
RIGHT_CLICK_METHOD.setAccessible(true);

function triggerLeftClick() {
    if (Client.isInGui() && !Client.isInChat()) {
        return Chat.message('Left click suppressed: User in menu.');
    }
    LEFT_CLICK_METHOD.invoke(mc);
}

function triggerRightClick() {
    if (Client.isInGui() && !Client.isInChat()) {
        return Chat.message('Right click suppressed: User in menu.');
    }
    RIGHT_CLICK_METHOD.invoke(mc);
}

function startSneaking() {
    try {
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