# Firefox — Privacy & Security Stack

**A layered browser protection strategy — each tool covers what the others can't see.**

---

## Author

**Benoit (BSM) Saint-Moulin**
- **Website**: [bsm3d.com](https://www.bsm3d.com)
- **GitHub**: [github.com/bsm3d](https://github.com/bsm3d)

---

## Introduction

Most browser attacks happen in layers. A single tool — even a good one — leaves gaps.
The approach here is defense in depth: each layer stops what the others don't see.

This is not a paranoid setup. It is a reasonable, lightweight stack that runs entirely locally, requires no account, no subscription, and no ongoing maintenance beyond keeping Firefox updated.

Every tool listed here transmits zero personal data.

---

## Table of Contents

- [The Stack](#the-stack)
- [Layer 1 — DNS · Quad9](#layer-1--dns--quad9)
- [Layer 2 — Network · uBlock Origin](#layer-2--network--ublock-origin)
- [Layer 3 — Page load · Firefox built-in](#layer-3--page-load--firefox-built-in)
- [Layer 4 — Page behavior · Sentinel](#layer-4--page-behavior--sentinel)
- [Layer 5 — Privacy · ClearURLs](#layer-5--privacy--clearurls)
- [Layer 5 — Comfort · FB Optimizer](#layer-5--comfort--fb-optimizer)
- [Full Stack at a Glance](#full-stack-at-a-glance)
- [What this stack does not cover](#what-this-stack-does-not-cover)
- [Disclaimer](#disclaimer)

---

## The Stack

```
[ DNS ]  ->  [ Network ]  ->  [ Page load ]  ->  [ Page behavior ]  ->  [ Comfort ]
  Quad9       uBlock Origin    Firefox native      Sentinel              ClearURLs
                                                                         FB Optimizer
```

Each arrow represents a point where something malicious can be stopped — or slip through if that layer is missing.

---

## Layer 1 — DNS · Quad9

**Type:** Encrypted DNS resolver (DoH — DNS over HTTPS)
**Endpoint:** `https://dns.quad9.net/dns-query`
**Where to configure:** Firefox — Settings — Privacy & Security — DNS over HTTPS

**What it does:**
- Intercepts domain resolution before Firefox opens any connection
- Blocks domains associated with malware, phishing, C2 servers and botnets
- Threat intelligence from 19+ cybersecurity firms, updated in real time
- DNSSEC validation — prevents DNS spoofing and hijacking
- Swiss non-profit — no IP logging, GDPR compliant, not subject to US law

**What it doesn't cover:**
The content of pages. A clean domain serving a malicious page gets through.
Everything stops at the DNS level — nothing inside the page is inspected.

---

## Layer 2 — Network · uBlock Origin

**Type:** Content blocker / network filter
**Install:** [addons.mozilla.org — uBlock Origin](https://addons.mozilla.org/firefox/addon/ublock-origin/)

**What it does:**
- Blocks requests to known ad, tracker and malware domains before they load
- Prevents third-party scripts from reaching the page
- Cosmetic filtering — removes ad placeholders from the DOM
- Large community-maintained signature base, updated continuously

**What it doesn't cover:**
First-party inline scripts, page behavior after load, storage manipulation.
A legitimate domain serving modified malicious content gets through.

---

## Layer 3 — Page load · Firefox built-in

**Type:** Google Safe Browsing integration
**Status:** Active by default
**Where to check:** Firefox — Settings — Privacy & Security — Security

**What it does:**
- Checks every visited URL against a list of reported phishing and malware sites
- List downloaded locally, refreshed every 30 minutes
- Blocks dangerous file downloads before they open
- Full-page warning for known attack sites

**What it doesn't cover:**
New domains not yet in the list. Page behavior after load. Inline scripts. Storage.
A domain that got listed yesterday may not be blocked until the next refresh.

---

## Layer 4 — Page behavior · Sentinel

**Type:** Browser firewall — content script + network monitor
**Source:** [github.com/bsm3d/sentinel](https://github.com/bsm3d/sentinel)

**What it does that the others can't:**

| Threat | Method |
|---|---|
| Inline `eval()`, `new Function()`, proto pollution | Script scan on every page |
| Crypto-miners injected dynamically after load | MutationObserver — kills SCRIPT nodes in real time |
| Hidden iframes | DOM scan + MutationObserver |
| Tampered `fetch` / `JSON.parse` natives | `[native code]` integrity check |
| Payloads stored in `localStorage` / `sessionStorage` | Storage scan on each page load |
| C2 domains not yet in any reputation list | webRequest interception with pattern matching |
| Dangerous file downloads | Extension-based blocking (.exe, .dll, .ps1…) |
| Script injection via clipboard paste | Paste event guard |

**Why it's not redundant with the other layers:**
Quad9, uBlock and Firefox Safe Browsing all work on domain reputation — they decide whether to allow a connection before the page loads. Sentinel works on page behavior — it sees what happens after the page loads, inside the page, in memory. Completely different attack surface.

---

## Layer 5 — Privacy · ClearURLs

**Type:** URL tracking parameter cleaner
**Install:** [addons.mozilla.org — ClearURLs](https://addons.mozilla.org/firefox/addon/clearurls/)

**What it does:**
- Strips tracking parameters from URLs automatically (`utm_source`, `fbclid`, `ref`…) — over 250 rules
- Prevents Google and Yandex from wrapping search result links with tracking redirectors
- Blocks the `ping` attribute — stops silent HTTP beacons fired on link clicks
- Prevents tracking injection via the History API (`replaceState`)
- Cleans Amazon, social media and newsletter links in the background, silently

**Privacy impact:** Removes the identifiers that allow third-party servers to correlate your sessions across sites.
**Security impact:** Eliminates tracking redirectors as potential intermediaries — a compromised redirect server can't intercept your navigation.

---

## Layer 5 — Comfort · FB Optimizer

**Type:** Facebook feed cleaner
**Source:** [github.com/bsm3d/fb-optimizer](https://github.com/bsm3d/fb-optimizer)

**What it does:**
- Removes Reels, Stories, Sponsored posts and People You May Know from the feed
- Per-block toggles — enable or disable each filter individually
- Blocks `fbevents.js` on third-party sites — prevents the Facebook tracking pixel from loading on external pages
- CSS-first approach — most filtering happens before first paint, near-zero CPU cost

**Privacy impact:** Blocking `fbevents.js` prevents Facebook from tracking your activity on sites you visit outside of Facebook.
**Security impact:** `fbevents.js` is a third-party script loaded on millions of external sites. Blocking it reduces supply chain attack exposure — a compromise of that script would otherwise execute in every page that loads it.
**Comfort impact:** The rest is purely about removing noise from the feed.

---

## Full Stack at a Glance

| Tool | Layer | Stops | Privacy | Security |
|---|---|---|---|---|
| Quad9 | DNS | Malicious domains before connection | No IP logs | yes |
| uBlock Origin | Network | Ads, trackers, known bad domains | yes | yes |
| Firefox Safe Browsing | Page load | Phishing & malware URLs (30 min list) | Hash sent to Google | yes |
| Sentinel | Page behavior | Inline scripts, injections, storage, hooks | 100% local | yes |
| ClearURLs | URL | Tracking parameters, redirect wrappers | 100% local | partial |
| FB Optimizer | Feed | Reels, ads, fbevents.js | partial | partial |

---

## What this stack does not cover

**OS-level attacks** — keyloggers, rootkits, driver exploits. That's antivirus / EDR territory, outside the browser entirely.

**0-day browser vulnerabilities** — a flaw in Firefox itself bypasses everything. Keep Firefox updated. That's the only defense against this.

**VPN / ISP surveillance** — DNS queries are encrypted via Quad9, but your traffic is not hidden. A VPN solves a different problem.

**New phishing on clean domains** — a brand-new domain with a valid TLS certificate that isn't in any reputation list yet will pass layers 1–3. Sentinel may catch suspicious page behavior, but there's no guarantee.

**Social engineering** — no tool protects against a user who clicks Allow on everything, enters credentials on a convincing fake page, or installs software they were asked to install. Awareness is the only defense here.

---

## Disclaimer

This document reflects a personal setup and a personal opinion on browser security.
It is not a security audit, not a guarantee, and not professional advice.

The tools described have been tested and are in daily use on my own machines.
No affiliation with any of the projects listed. No sponsorship.

---

Documentation version 1.0 — March 2026

Made with love by Benoit (BSM) Saint-Moulin
