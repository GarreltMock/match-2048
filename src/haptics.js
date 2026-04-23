// Mobile haptic feedback via vendored web-haptics lib (src/vendor/).
// Delegates to navigator.vibrate on Android; uses the lib's native-switch
// <label> click pattern on iOS 17.4+ to trigger Taptic Engine.
//
// Preset names: "light", "medium", "heavy", "soft", "rigid",
// "success", "warning", "error". See src/vendor/chunk-*.mjs.

import { WebHaptics } from "./vendor/web-haptics.mjs";

let instance = null;

function getInstance() {
    if (!instance) instance = new WebHaptics();
    return instance;
}

export function haptic(preset = "light") {
    getInstance().trigger(preset);
}
