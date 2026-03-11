# FB Optimizer 1.0

**Facebook feed cleaner for Firefox**

Remove Reels, sponsored posts, Stories, People You May Know, Marketplace suggestions and tracking pixels — blocked before they render. Each category can be toggled independently.

> Note: This extension does its best to keep up with Facebook's interface, but as Facebook frequently updates its layout and code, some features may stop working as expected after a Facebook update.

---

## Author

**Benoit (BSM) Saint-Moulin**
- **Website**: [bsm3d.com](https://www.bsm3d.com)
- **GitHub**: [github.com/bsm3d](https://github.com/bsm3d)

---
<img width="421" height="755" alt="image" src="https://github.com/user-attachments/assets/e451fc3f-0a71-46ec-8636-fc3346598472" />


## Table of Contents

- [Quick Start](#quick-start)
- [What it blocks](#what-it-blocks)
- [Installation](#installation)
- [Architecture](#architecture)
- [Permissions](#permissions)
- [Compatibility](#compatibility)
- [Changelog](#changelog)
- [License](#license)
- [Disclaimers](#disclaimers)

---

## Quick Start

1. Download `fb-optimizer-1.0.xpi` from [Releases](../../releases)
2. In Firefox: `about:addons` — *Install Add-on From File*
3. Accept the installation
4. Navigate to facebook.com — the extension activates automatically

---

## What it blocks

| Element | Method |
|---|---|
| Reels & short videos | CSS + Observer |
| Sponsored posts | CSS + Observer |
| Stories | CSS |
| People You May Know | CSS + Observer |
| Marketplace (in feed) | CSS + Observer |
| Suggested for you | Observer |
| Tracking pixel (fbevents.js) | webRequest |

**CSS is injected at `document_start`** — elements are hidden before the first render, not after. No content flash.

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

1. Firefox — `about:debugging` — *This Firefox*
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
    └── blocks fbevents.js / connect.facebook.net on third-party sites only
        (facebook.com itself is left untouched to avoid breaking the site)
```

### Design notes

- **CSS-first** — 90% of the work is done by CSS, no JS needed for static elements
- **rAF throttle** — the observer fires at most once per frame (~16ms)
- **WeakSet** — processed nodes are never re-scanned, GC can free them freely
- **Auto-pause** — observer stops when the tab goes to the background (`visibilitychange`)
- **Stable selectors** — no obfuscated React classes — resistant to FB updates

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

---

## License

Open Source — free for personal and educational use.

Authorized: personal use, educational use, modification with attribution.
Restricted: commercial use requires prior authorization from the author.

Contact via GitHub for authorization requests.

---

## Disclaimers

**Trademarks**: Facebook and Meta are trademarks of Meta Platforms, Inc. All trademarks are property of their respective owners.

**No Warranty**: Software provided "AS IS" without warranty of any kind. Author not liable for any damages arising from software use.

**No Affiliation**: Independent tool, not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.

**User Responsibility**: Facebook's interface changes frequently. Some features may stop working after a Facebook update. Always verify behavior after major Facebook deployments.

---

Documentation version 1.0 — March 2026

**Made with ❤️ by Benoit (BSM) Saint-Moulin**
