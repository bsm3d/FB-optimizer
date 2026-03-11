/**
 * FB Optimizer — background.js  v1.0
 * Author  : Benoît (BSM) Saint-Moulin — bsm3d.com
 * License : MIT
 *
 * Blocks FB tracking scripts loaded by THIRD-PARTY sites.
 * We do NOT block anything on facebook.com itself —
 * that would break the site without much benefit.
 *
 * Blocked:
 *   - fbevents.js   → advertising pixel
 *   - all.js        → social SDK
 *   - sdk.js        → social SDK (alternate path)
 */

"use strict";

const BLOCKED = [
  "*://connect.facebook.net/*/fbevents.js*",
  "*://connect.facebook.net/*/all.js*",
  "*://connect.facebook.net/*/sdk.js*"
];

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    // If request comes from facebook.com itself → let it through
    // (FB needs its own SDK on its own domain)
    if (details.originUrl && details.originUrl.includes("facebook.com")) {
      return { cancel: false };
    }
    return { cancel: true };
  },
  { urls: BLOCKED, types: ["script"] },
  ["blocking"]
);
