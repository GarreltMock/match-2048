// Mobile haptic feedback.
// navigator.vibrate works on Android Chrome/Firefox. iOS Safari does not
// implement it. On iOS 17.4+ a native <input type="checkbox" switch>
// toggled programmatically fires Taptic Engine feedback — the cheapest
// web-accessible haptic on iOS. Must run inside a user-gesture handler.

let hapticSwitch = null;

function ensureSwitch() {
    if (hapticSwitch) return hapticSwitch;
    const el = document.createElement("input");
    el.type = "checkbox";
    el.setAttribute("switch", "");
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    el.style.position = "absolute";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    hapticSwitch = el;
    return el;
}

export function haptic(ms = 5) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(ms);
        return;
    }
    try {
        ensureSwitch().click();
    } catch {
        /* ignore */
    }
}
