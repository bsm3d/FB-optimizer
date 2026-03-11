/**
 * =================================================================
 *  FB Optimizer — content.js  v1.0
 *  Author  : Benoît (BSM) Saint-Moulin — bsm3d.com
 *  License : MIT
 * =================================================================
 *
 *  The CSS file does ~90% of the work at document_start.
 *  This script handles elements injected dynamically by React
 *  after initial load (sponsored posts, Reels on scroll, etc.)
 *
 *  CPU STRATEGY
 *  ------------
 *  - Observer on document.body only (not documentElement — avoids
 *    <head> mutations which are useless noise)
 *  - Pre-filter in callback: skip if no addedNodes in the batch
 *  - Skip text-only mutations (nodeType 3) — FB generates tons of those
 *  - Scan only the subtrees of newly added nodes, not the full DOM
 *  - rAF throttle: max 1 scan per frame (~16ms)
 *  - Safety net: full DOM scan every 5s in idle (catches edge cases
 *    where FB sets aria attributes after node insertion)
 *  - Auto-pause when tab is hidden (visibilitychange)
 *  - WeakSet tracking: processed nodes never re-scanned
 *
 *  BLOCKS
 *  ------
 *  bl-reels        → Reels & short videos
 *  bl-ads          → Sponsored posts
 *  bl-stories      → Stories
 *  bl-pymk         → People You May Know
 *  bl-marketplace  → Marketplace suggestions in feed
 *  bl-suggested    → Suggested for you posts
 *  bl-tracking     → fbevents.js (handled by background.js)
 * =================================================================
 */

"use strict";

// -----------------------------------------------------------------
// Localized text sets for header/button detection
// -----------------------------------------------------------------

const REEL_TEXTS = new Set([
  "Reels", "Reels and short videos", "Reels et vidéos courtes",
  "Reels e video brevi", "Reels und Kurzvideos",
  "Reels y videos cortos", "Reels e vídeos curtos"
]);

const SPONSORED_TEXTS = new Set([
  "Sponsored", "Sponsorisé", "Sponsorisée",
  "Patrocinado", "Gesponsert", "Sponsorizzato"
]);

const PYMK_TEXTS = new Set([
  "People You May Know", "Suggestions d'amis",
  "Persone che potresti conoscere",
  "Personen, die du kennen könntest",
  "Personas que quizás conozcas"
]);

const SUGGESTED_TEXTS = new Set([
  "Suggested for you", "Suggéré pour vous",
  "Suggerito per te", "Für dich vorgeschlagen",
  "Sugerido para ti"
]);

const MARKETPLACE_TEXTS = new Set([
  "Marketplace", "Items for sale near you",
  "Articles à vendre près de chez vous"
]);

// -----------------------------------------------------------------
// Stable CSS selectors (no obfuscated React classes)
// -----------------------------------------------------------------

const REEL_SELECTORS = [
  'a[aria-label="reel"]',
  '[data-type="hscroll-child"]:has(a[aria-label="reel"])',
  'a[href^="/reel/"]',
  'a[href^="/reels/"]',
  '[data-pagelet*="Reels"]',
  '[data-pagelet*="reels"]',
  '[role="navigation"] a[href*="/reel"]',
  '[role="tablist"] [href*="reel"]',
  '[data-tab-key="reels"]',
  'li:has(> a[href^="/reel/"])',
  'li:has(> a[href^="/reels/"])'
];

const STORY_SELECTORS = [
  '[data-pagelet*="Stories"]',
  '[aria-label="Stories"][role="region"]'
];

const PYMK_SELECTORS = [
  '[data-pagelet*="PeopleYouMayKnow"]',
  '[data-pagelet*="FriendSuggestions"]'
];

const MARKETPLACE_SELECTORS = [
  '[data-pagelet*="Marketplace"]'
];

// Map block key → data-fbopt marker value
const BLOCK_MARKERS = {
  "bl-reels":       "reel",
  "bl-ads":         "ad",
  "bl-stories":     "stories",
  "bl-pymk":        "pymk",
  "bl-marketplace": "marketplace",
  "bl-suggested":   "suggested"
};

// -----------------------------------------------------------------
// State
// -----------------------------------------------------------------

let isEnabled    = true;
let blockedCount = 0;
let observer     = null;
let rafPending   = false;
let persistTimer = null;
let idleTimer    = null;   // full-scan safety net every 5s

// Per-block preferences
let blocks = {
  "bl-reels":       true,
  "bl-ads":         true,
  "bl-stories":     true,
  "bl-pymk":        true,
  "bl-marketplace": true,
  "bl-suggested":   true,
  "bl-tracking":    true
};

// WeakSet: no strong reference → GC can collect removed nodes freely
const processed = new WeakSet();

// Stored reference so we can remove the listener cleanly on pagehide
const onVisibilityChange = () => {
  if (document.hidden) {
    stopObserver();
  } else if (isEnabled) {
    startObserver();
  }
};

// -----------------------------------------------------------------
// Init — load prefs from storage
// -----------------------------------------------------------------

const STORAGE_DEFAULTS = {
  enabled: true, count: 0,
  "bl-reels": true, "bl-ads": true, "bl-stories": true,
  "bl-pymk":  true, "bl-marketplace": true, "bl-suggested": true,
  "bl-tracking": true
};

browser.storage.local.get(STORAGE_DEFAULTS).then(data => {
  isEnabled    = data.enabled;
  blockedCount = data.count;
  Object.keys(blocks).forEach(k => { blocks[k] = data[k]; });
  if (isEnabled) startObserver();
});

// -----------------------------------------------------------------
// Core: hide a single node
// -----------------------------------------------------------------

function hideNode(node, marker) {
  if (!node || !(node instanceof Element)) return;
  if (processed.has(node)) return;

  processed.add(node);
  node.style.setProperty("display", "none", "important");
  node.setAttribute("data-fbopt", marker || "1");
  blockedCount++;
}

// -----------------------------------------------------------------
// Reveal: show back elements for a given marker (when block toggled off)
// -----------------------------------------------------------------

function showByMarker(marker) {
  const sel = marker ? `[data-fbopt="${marker}"]` : "[data-fbopt]";
  document.querySelectorAll(sel).forEach(el => {
    el.style.removeProperty("display");
    el.removeAttribute("data-fbopt");
    // Note: we can't remove from WeakSet, but hideNode checks getAttribute
    // so we reset the marker — next scan won't re-hide if block is off
  });
}

// -----------------------------------------------------------------
// Scan functions — each checks its block flag first
// -----------------------------------------------------------------

function scanReels(root) {
  if (!blocks["bl-reels"]) return;

  // Header text approach (carousel widget + sidebar button)
  root.querySelectorAll('h3[dir="auto"]').forEach(h3 => {
    if (!REEL_TEXTS.has(h3.innerText?.trim())) return;
    const card = findContainerCard(h3);
    hideNode(card || h3.parentElement || h3, "reel");
  });

  root.querySelectorAll('div > span[dir="auto"]').forEach(span => {
    if (span.innerText?.trim() !== "Reels") return;
    const btn = findSidebarButton(span);
    if (btn) hideNode(btn, "reel");
  });

  // Stable attribute selectors
  REEL_SELECTORS.forEach(sel => {
    try {
      root.querySelectorAll(sel).forEach(el => {
        if (processed.has(el)) return;
        // Prefer the hscroll-child wrapper over the <a> itself
        if (el.getAttribute("aria-label") === "reel") {
          const hs = el.closest('[data-type="hscroll-child"]');
          if (hs) { hideNode(hs, "reel"); return; }
        }
        const card = findContainerCard(el);
        hideNode(card || el, "reel");
      });
    } catch (_) {
      // :has() silently fails on unsupported browsers (FF < 121)
    }
  });
}

function scanSponsored(root) {
  if (!blocks["bl-ads"]) return;

  // aria-label on anchor tags — most reliable signal FB provides
  root.querySelectorAll('a[aria-label]').forEach(a => {
    if (!SPONSORED_TEXTS.has(a.getAttribute("aria-label") || "")) return;
    const card = findFeedCard(a);
    hideNode(card || a, "ad");
  });

  // Span text fallback — limited to [role=feed] to avoid false positives
  root.querySelectorAll('[role="feed"] span, [role="feed"] span[dir="auto"]').forEach(span => {
    if (processed.has(span)) return;
    if (!SPONSORED_TEXTS.has(span.innerText?.trim())) return;
    const card = findFeedCard(span);
    hideNode(card || span, "ad");
  });
}

function scanStories(root) {
  if (!blocks["bl-stories"]) return;
  STORY_SELECTORS.forEach(sel => {
    try {
      root.querySelectorAll(sel).forEach(el => hideNode(el, "stories"));
    } catch (_) {}
  });
}

function scanPYMK(root) {
  if (!blocks["bl-pymk"]) return;

  PYMK_SELECTORS.forEach(sel => {
    try {
      root.querySelectorAll(sel).forEach(el => hideNode(el, "pymk"));
    } catch (_) {}
  });

  root.querySelectorAll('h2[dir="auto"], h3[dir="auto"]').forEach(h => {
    if (!PYMK_TEXTS.has(h.innerText?.trim())) return;
    const card = findContainerCard(h);
    hideNode(card || h.parentElement || h, "pymk");
  });
}

function scanMarketplace(root) {
  if (!blocks["bl-marketplace"]) return;
  // Never hide on the actual Marketplace page — only feed injections
  if (window.location.pathname.startsWith("/marketplace")) return;

  MARKETPLACE_SELECTORS.forEach(sel => {
    try {
      root.querySelectorAll(sel).forEach(el => hideNode(el, "marketplace"));
    } catch (_) {}
  });

  root.querySelectorAll('[role="feed"] h3[dir="auto"]').forEach(h => {
    if (!MARKETPLACE_TEXTS.has(h.innerText?.trim())) return;
    const card = findContainerCard(h);
    hideNode(card || h.parentElement || h, "marketplace");
  });
}

function scanSuggested(root) {
  if (!blocks["bl-suggested"]) return;
  root.querySelectorAll('[role="feed"] h3[dir="auto"], [role="feed"] h4[dir="auto"]').forEach(h => {
    if (!SUGGESTED_TEXTS.has(h.innerText?.trim())) return;
    const card = findFeedCard(h);
    hideNode(card || h.parentElement || h, "suggested");
  });
}

// Run all scans on a given root element
function runAllScans(root) {
  scanReels(root);
  scanSponsored(root);
  scanStories(root);
  scanPYMK(root);
  scanMarketplace(root);
  scanSuggested(root);
  schedulePersist();
}

// -----------------------------------------------------------------
// DOM traversal helpers
// -----------------------------------------------------------------

// Walk up to find the feed "card" container for an element.
// Priority: data-pagelet > hscroll-child > article/li > div under feed
// Stops at role=feed/main, <main>, <body>
function findContainerCard(el) {
  let node  = el.parentElement;
  let depth = 0;

  while (node && depth < 16) {
    const tag     = node.tagName?.toLowerCase();
    const role    = node.getAttribute("role");
    const pagelet = (node.getAttribute("data-pagelet") || "").toLowerCase();
    const dtype   = node.getAttribute("data-type") || "";

    if (pagelet.includes("reel"))             return node;
    if (dtype === "hscroll-child")            return node;
    if (role === "feed" || role === "main")   break;
    if (tag  === "main" || tag === "body")    break;
    if (role === "article" || tag === "li")   return node;

    if (tag === "div") {
      const parentRole = node.parentElement?.getAttribute("role");
      if (parentRole === "feed" || parentRole === "main") return node;
    }

    node = node.parentElement;
    depth++;
  }
  return null;
}

// Walk up to find the article/div that is a direct child of [role=feed]
// Used for sponsored posts and suggested content
function findFeedCard(el) {
  let node  = el.parentElement;
  let depth = 0;

  while (node && depth < 20) {
    const role = node.getAttribute("role");
    const tag  = node.tagName?.toLowerCase();

    if (role === "article")                   return node;
    if (role === "feed" || role === "main")   break;
    if (tag  === "main" || tag === "body")    break;

    // div that is a direct child of [role=feed]
    if (tag === "div" && node.parentElement?.getAttribute("role") === "feed") {
      return node;
    }

    node = node.parentElement;
    depth++;
  }
  return null;
}

// Walk up to find a sidebar button/li — never goes past role=navigation
function findSidebarButton(span) {
  let node  = span.parentElement;
  let depth = 0;

  while (node && depth < 6) {
    const role = node.getAttribute("role");
    const tag  = node.tagName?.toLowerCase();

    if (role === "button")                      return node;
    if (tag  === "li")                          return node;
    // Hard stop — we never want to hide the whole nav bar
    if (role === "navigation" || tag === "nav") break;

    node = node.parentElement;
    depth++;
  }
  return null;
}

// -----------------------------------------------------------------
// MutationObserver — CPU-optimized
// -----------------------------------------------------------------

function mutationCallback(mutations) {
  // Pre-filter: collect only element nodes that were actually added
  // Ignoring attribute/characterData mutations and text nodes here
  // saves a lot of unnecessary rAF scheduling on FB's heavy re-renders
  let hasNewElements = false;

  for (let i = 0; i < mutations.length; i++) {
    const added = mutations[i].addedNodes;
    for (let j = 0; j < added.length; j++) {
      if (added[j].nodeType === 1) {   // ELEMENT_NODE only
        hasNewElements = true;
        break;
      }
    }
    if (hasNewElements) break;
  }

  if (!hasNewElements) return;  // all text / attribute noise → skip
  if (rafPending) return;

  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (!isEnabled) return;

    // Scan only the subtrees of newly added nodes — not the full DOM
    // This is the key CPU optimization vs a global querySelectorAll
    for (let i = 0; i < mutations.length; i++) {
      const added = mutations[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        const node = added[j];
        if (node.nodeType !== 1) continue;
        runAllScans(node);
      }
    }

    schedulePersist();
  });
}

function startObserver() {
  if (observer) return;

  // Initial full scan (synchronous, before observer starts)
  runAllScans(document.body || document.documentElement);

  // Observe body, not documentElement — avoids <head> noise
  observer = new MutationObserver(mutationCallback);
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree:   true
    // No attributes, no characterData — not needed, saves CPU
  });

  // Safety net: full DOM scan every 5s to catch edge cases where
  // FB sets aria attributes after node insertion (2-step injection)
  idleTimer = setInterval(() => {
    if (isEnabled) runAllScans(document.body || document.documentElement);
  }, 5000);
}

function stopObserver() {
  if (observer) {
    observer.takeRecords();  // flush pending callbacks before disconnect
    observer.disconnect();
    observer = null;
  }
  if (idleTimer) {
    clearInterval(idleTimer);
    idleTimer = null;
  }
  rafPending = false;
}

// -----------------------------------------------------------------
// Persistence — throttled to avoid 60 writes/sec
// -----------------------------------------------------------------

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    browser.storage.local.set({ count: blockedCount });
  }, 2000);
}

// -----------------------------------------------------------------
// Cleanup on page unload
// -----------------------------------------------------------------

document.addEventListener("visibilitychange", onVisibilityChange);

window.addEventListener("pagehide", () => {
  stopObserver();
  document.removeEventListener("visibilitychange", onVisibilityChange);

  // Final flush before the page is unloaded
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  browser.storage.local.set({ count: blockedCount });
}, { once: true });

// -----------------------------------------------------------------
// Message handler (from popup)
// -----------------------------------------------------------------

browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {

    case "GET_STATUS":
      sendResponse({ enabled: isEnabled, count: blockedCount, blocks });
      break;

    case "SET_ENABLED":
      isEnabled = msg.value;
      browser.storage.local.set({ enabled: isEnabled });
      if (isEnabled) {
        startObserver();
      } else {
        stopObserver();
        showByMarker(null);  // reveal everything
      }
      sendResponse({ ok: true });
      break;

    case "SET_BLOCKS": {
      Object.keys(msg.blocks).forEach(k => {
        const wasActive = blocks[k];
        const nowActive = msg.blocks[k];
        blocks[k] = nowActive;

        // If a block was just turned off → reveal its hidden elements
        if (wasActive && !nowActive && BLOCK_MARKERS[k]) {
          showByMarker(BLOCK_MARKERS[k]);
        }
      });
      // Re-scan to apply newly enabled blocks
      if (isEnabled) runAllScans(document.body || document.documentElement);
      sendResponse({ ok: true });
      break;
    }

    case "RESET_COUNT":
      blockedCount = 0;
      browser.storage.local.set({ count: 0 });
      sendResponse({ ok: true });
      break;
  }

  return true;  // keep message channel open for async sendResponse
});
