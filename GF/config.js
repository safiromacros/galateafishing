/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import { @Vigilant, @SwitchProperty, @SliderProperty, @ButtonProperty } from "../Vigilance";

@Vigilant("AutoFish", "AutoFish Configuration", {
    getCategoryComparator: () => (a, b) => {
        const categories = ["General", "Detection", "Advanced"];
        return categories.indexOf(a.name) - categories.indexOf(b.name);
    }
})
class Settings {
    constructor() {
        this.initialize(this);
    }

    // General Settings
    @SwitchProperty({
        name: "Enabled",
        description: "Enable or disable the auto-fishing module",
        category: "General"
    })
    enabled = false;

    @SwitchProperty({
        name: "Test Mode",
        description: "Enable test mode for all mobs",
        category: "General"
    })
    testMode = false;

    @SwitchProperty({
        name: "Chat Notifications",
        description: "Show notifications in chat when fishing",
        category: "General"
    })
    chatNotifications = true;

    // Detection Settings
    @SwitchProperty({
        name: "Particle Detection",
        description: "Detect fish using water wake particles",
        category: "Detection"
    })
    particleDetection = true;

    @SwitchProperty({
        name: "Sound Detection",
        description: "Detect fish using splash sounds",
        category: "Detection"
    })
    soundDetection = true;

    @SliderProperty({
        name: "Detection Radius",
        description: "Radius (in blocks) to detect particles/sounds near bobber",
        category: "Detection",
        min: 0.1,
        max: 5.0
    })
    detectionRadius = 0.5;

    // Advanced Settings
    @SliderProperty({
        name: "Cast Cooldown (ms)",
        description: "Cooldown between casts in milliseconds",
        category: "Advanced",
        min: 50,
        max: 500
    })
    castCooldown = 100;

    @SliderProperty({
        name: "Detection Delay (ms)",
        description: "Delay before right-clicking after detection",
        category: "Advanced",
        min: 0,
        max: 200
    })
    detectionDelay = 50;
}

export default new Settings();
