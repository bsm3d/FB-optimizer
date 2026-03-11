/**
 * FB Optimizer — popup.js  v1.0
 * Author: Benoît (BSM) Saint-Moulin — bsm3d.com
 * License: MIT
 *
 * Handles the main toggle + 7 individual block toggles.
 * Prefs are persisted in storage.local and forwarded to
 * the content script via SET_BLOCKS message.
 */

"use strict";

const toggleEnable = document.getElementById("toggleEnable");
const countEl    = document.getElementById("countSession");
const totalEl    = document.getElementById("countTotal");
const resetBtn   = document.getElementById("resetBtn");
const badge      = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const blocksList = document.getElementById("blocksList");

const BLOCK_KEYS = [
  "bl-reels",
  "bl-ads",
  "bl-stories",
  "bl-pymk",
  "bl-marketplace",
  "bl-suggested",
  "bl-tracking"
];

let baseline = 0;


// ---- UI helpers ----

function getBlockStates() {
  const states = {};
  BLOCK_KEYS.forEach(k => {
    states[k] = document.getElementById(k).checked;
  });
  return states;
}

function applyBlockStates(states) {
  BLOCK_KEYS.forEach(k => {
    const el = document.getElementById(k);
    if (el && states[k] !== undefined) el.checked = states[k];
  });
}

function updateUI(enabled, count) {
  toggleEnable.checked = enabled;
  const session = Math.max(0, count - baseline);
  countEl.textContent = session;
  totalEl.textContent = count;
  badge.className = "status-badge " + (enabled ? "on" : "off");
  statusText.textContent = enabled ? "Active" : "Inactive";
  blocksList.classList.toggle("disabled", !enabled);
}


// ---- Messaging ----

function sendToActiveTab(msg) {
  return browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      if (!tabs[0]) return null;
      return browser.tabs.sendMessage(tabs[0].id, msg).catch(() => null);
    });
}


// ---- Init ----

const defaults = { enabled: true, count: 0 };
BLOCK_KEYS.forEach(k => { defaults[k] = true; });

browser.storage.local.get(defaults).then(data => {
  baseline = data.count;
  updateUI(data.enabled, data.count);
  applyBlockStates(data);
});

// Pull live status from content script if a FB tab is open
sendToActiveTab({ type: "GET_STATUS" }).then(res => {
  if (!res) return;
  updateUI(res.enabled, res.count);
  if (res.blocks) applyBlockStates(res.blocks);
});


// ---- Main toggle ----

toggleEnable.addEventListener("change", () => {
  const val = toggleEnable.checked;
  browser.storage.local.set({ enabled: val });
  sendToActiveTab({ type: "SET_ENABLED", value: val });
  browser.storage.local.get({ count: 0 }).then(({ count }) => updateUI(val, count));
});


// ---- Per-block toggles ----

BLOCK_KEYS.forEach(k => {
  document.getElementById(k).addEventListener("change", () => {
    const states = getBlockStates();
    browser.storage.local.set(states);
    sendToActiveTab({ type: "SET_BLOCKS", blocks: states });
  });
});


// ---- Reset counter ----

resetBtn.addEventListener("click", () => {
  browser.storage.local.set({ count: 0 });
  baseline = 0;
  sendToActiveTab({ type: "RESET_COUNT" });
  countEl.textContent = "0";
  totalEl.textContent = "0";
});
