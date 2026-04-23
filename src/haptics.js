// Mobile haptic feedback.
// navigator.vibrate works on Android Chrome/Firefox. iOS Safari does not
// implement it. iOS 17.4+ renders <input type="checkbox" switch> as a
// native Taptic-enabled control: clicking the wrapping <label> fires a
// brief haptic. Must run inside a user-gesture handler.
//
// Structure and `all:initial / appearance:auto` trick cribbed from
// https://github.com/lochie/web-haptics — directly clicking the input
// or omitting the native rendering reset does not reliably fire Taptic.

let hapticLabel = null;

function ensureLabel() {
    if (hapticLabel) return hapticLabel;
    if (typeof document === "undefined") return null;

    const id = "web-haptics-switch";
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.style.display = "none";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = id;
    input.style.all = "initial";
    input.style.appearance = "auto";
    input.style.display = "none";

    label.appendChild(input);
    document.body.appendChild(label);
    hapticLabel = label;
    return label;
}

export function haptic(ms = 5) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(ms);
        return;
    }
    ensureLabel()?.click();
}
