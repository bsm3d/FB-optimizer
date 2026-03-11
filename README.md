# FB Optimizer — Facebook Cleaner

**Firefox extension** that removes distracting and tracking elements from Facebook before they even render.  
100% local — zero data collected, zero external connections.

> By **Benoît (BSM) Saint-Moulin** — [bsm3d.com](https://www.bsm3d.com)

---

## What it blocks

| Element | Method |
|---|---|---|
| Reels & short videos | CSS + Observer |
| Sponsored posts | CSS + Observer |
| Stories | CSS |
| People You May Know | CSS + Observer |
| Marketplace (in feed) | CSS + Observer |
| Suggested for you | Observer |
| Tracking pixel (fbevents.js) | webRequest |

**CSS is injected at `document_start`** — elements are hidden before the first render, not after. No content flash.

> Note: This extension does its best to keep up with Facebook's interface, but as Facebook frequently updates its layout and code, some features may stop working as expected after a Facebook update.

---

## Dashboard

- **Master toggle** — enable / disable the extension in one click
- **Per-block toggles** — enable or disable each category independently
- **Session counter** — number of elements blocked since the popup was opened
- **Total counter** — cumulative count across all sessions

---

## Installation

### Via Firefox Add-ons (recommended)

> *(submission in progress — link coming soon)*

### Manual (signed XPI)

1. Download `fb-optimizer-1.0.xpi` from [Releases](../../releases)
2. In Firefox: `about:addons` — *Install Add-on From File*
3. Accept the installation

### Developer mode (sources)

```bash
git clone https://github.com/bsm3d/fb-optimizer.git
```

1. Firefox → `about:debugging` → *This Firefox*
2. *Load Temporary Add-on*
3. Select `manifest.json` from the cloned folder

---

## Architecture

```
fb-optimizer/
├── manifest.json       # MV2, AMO compliant, gecko strict_min 140.0
├── fb-optimizer.css    # Injected at document_start — hides elements before render
├── content.js          # MutationObserver (rAF throttle) + multi-block scan
├── background.js       # webRequest — blocks fbevents.js on third-party sites only
├── popup.html          # Dashboard UI (no inline JS — AMO compliant)
├── popup.js            # Dashboard logic
└── icons/
```

### How it works

```
document_start
    └── fb-optimizer.css injected  →  immediate hide via stable selectors

DOM loaded
    └── content.js starts
          ├── initial synchronous scan
          └── MutationObserver (rAF throttle ~16ms)
                ├── dynamically injected Reels
                ├── Sponsored posts (aria + innerText)
                ├── PYMK, Suggested, Marketplace
                └── WeakSet → no strong references, GC free

webRequest (background.js)
    └── blocks fbevents.js / connect.facebook.net on THIRD-PARTY sites only
        (facebook.com itself is left untouched to avoid breaking the site)
```

### Why it's fast

- **CSS-first** — 90% of the work is done by CSS, no JS needed for static elements
- **rAF throttle** — the observer fires at most once per frame (~16ms)
- **WeakSet** — processed nodes are never re-scanned, GC can free them freely
- **Auto-pause** — observer stops when the tab goes to the background (`visibilitychange`)
- **Stable selectors** — no obfuscated React classes (`xABCDE`) — resistant to FB updates

---

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist toggle states and blocked counter across sessions |
| `tabs` | Send messages from popup to the active content script |
| `webRequest` + `webRequestBlocking` | Block fbevents.js on third-party sites before it reaches the network |
| `*://*.facebook.com/*` | Inject CSS and content script on Facebook |
| `*://connect.facebook.net/*` | Intercept tracking pixel requests |

---

## Compatibility

- **Firefox 140+** (`strict_min_version` in manifest)
- Manifest Version 2 (MV2) — AMO compliant
- Tested on facebook.com — French and English interfaces

---

## License

MIT — see [LICENSE](LICENSE)

---

## Changelog

### v1.0
- Initial release
- CSS-first blocking at `document_start` for Reels, Stories, PYMK
- MutationObserver with rAF throttle for dynamically injected content
- webRequest blocking of fbevents.js on third-party sites
- Per-block toggles with live apply / reveal (no page reload needed)
- WeakSet node tracking, visibilitychange auto-pause, pagehide cleanup
- Fixed: `data_collection_permissions` moved inside `gecko` block (AMO MV2 compliance)
- Fixed: `strict_min_version` raised to 140.0 to match `data_collection_permissions` support
- Fixed: `gecko_android` min version set to 142.0
