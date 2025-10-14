import { APP_VERSION } from "./version.js";
import { loadUserId } from "./storage.js";

function getDefaultOptions() {
    const nav = navigator;
    const ua = nav.userAgent || "";

    // Detect OS from userAgent since navigator.platform is deprecated
    let os = "unknown";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return {
        deviceInfos: {
            game: "match2048",
            platform: "Native",
            os: os,
            osVersion: ua,
            browserVersion: ua,
            appVersion: APP_VERSION,
            bundle: "com.match2048.web",
            advertisingId: null,
            category: "browser",
            mobileBrandName: null,
            mobileModelName: null,
            mobileOsHardwareModel: null,
        },
        userProperties: {},
        userData: {},
        performUserIdHashing: true,
    };
}

function isDevelopment() {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname); // IPv4 pattern
    return isLocalhost || isIPAddress;
}

async function track(eventName, parameters = {}, options = {}) {
    // Skip tracking in development (localhost or IP addresses)
    if (isDevelopment()) {
        console.log("[Tracker] Skipping tracking in development:", eventName, parameters);
        return null;
    }

    const trackingURL = "https://octolytics.lotum.com/v3/collect";
    const sessionStartTimestamp = Date.now();

    // Load user ID from localStorage if not provided
    const userId = loadUserId();

    // Merge provided options with defaults
    const defaultOptions = getDefaultOptions();
    options = {
        deviceInfos: { ...defaultOptions.deviceInfos, ...(options.deviceInfos || {}) },
        userProperties: { ...defaultOptions.userProperties, ...(options.userProperties || {}) },
        userData: { userID: userId, ...(options.userData || {}) },
        performUserIdHashing:
            options.performUserIdHashing !== undefined
                ? options.performUserIdHashing
                : defaultOptions.performUserIdHashing,
    };

    // Optional hashing utilities
    const cyrb53 = (str, seed = 0) => {
        let h1 = 0xdeadbeef ^ seed,
            h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }

        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        return ((h2 >>> 0).toString(36) + (h1 >>> 0).toString(36)).padEnd(16, "0");
    };

    const hashCode = (s) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return h.toString(36);
    };

    // Extract optional device/user data
    const deviceInfo = options.deviceInfos || {};
    const userProperties = options.userProperties || {};
    const userData = options.userData || {};
    const performHash = options.performUserIdHashing !== false;

    const hashedUserID = userData.userID && performHash ? cyrb53(userData.userID) : userData.userID;
    const userPseudoId = userData.userID ? userData.userID.replace(/-/g, "") : crypto.randomUUID().replace(/-/g, "");

    const event = {
        eventTimestamp: Date.now(),
        tzOffset: new Date().getTimezoneOffset(),
        eventName,
        sessionStartTimestamp,
        game: deviceInfo.game,
        platform: deviceInfo.platform,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        browserVersion: deviceInfo.browserVersion,
        appVersion: deviceInfo.appVersion,
        bundle: deviceInfo.bundle,
        device: {
            advertisingId: deviceInfo.advertisingId,
            category: deviceInfo.category,
            mobileBrandName: deviceInfo.mobileBrandName,
            mobileModelName: deviceInfo.mobileModelName,
            mobileOsHardwareModel: deviceInfo.mobileOsHardwareModel,
        },
        userId: hashedUserID,
        userProperties,
        eventParams: parameters,
        consentGiven: false,
        eventSequenceNumber: 0,
        userPseudoId: userPseudoId,
        userFirstTouchTimestamp: Date.now(),
        userCreatedAt: userData.userCreatedAt,
    };

    event.hash = hashCode(JSON.stringify(event));

    // Send the event
    const response = await fetch(trackingURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        console.error("Failed to send tracking event", response.status);
    }

    return event;
}

export { track, isDevelopment };
