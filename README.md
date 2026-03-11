# ⚡ FB Optimizer

**Extension Firefox** qui supprime les distractions de Facebook et accélère la navigation.  
Bloque les Reels, publicités, Stories, suggestions et trackers — avant même leur rendu.

> Par **Benoît (BSM) Saint-Moulin** — [bsm3d.com](https://www.bsm3d.com)

---

## Ce que ça bloque

| Élément | Méthode | Gain |
|---|---|---|
| Reels & vidéos courtes | CSS + Observer | ⚡ Réseau + CPU |
| Posts sponsorisés | CSS + Observer | ⚡ Réseau + CPU |
| Stories | CSS | ⚡ Rendu |
| People You May Know | CSS + Observer | ⚡ Rendu |
| Marketplace (dans le feed) | CSS + Observer | ⚡ Rendu |
| "Suggested for you" | Observer | ⚡ CPU |
| Pixel tracking fbevents.js | webRequest | ⚡ Réseau |

**Le CSS est injecté à `document_start`** — les éléments sont masqués avant le premier rendu, pas après. Aucun flash de contenu.

---

## Installation

### Via Firefox Add-ons (recommandé)

> *(soumission en cours — lien à venir)*

### Manuel (XPI signé)

1. Télécharger `fb-optimizer-v1.0.xpi` depuis les [Releases](../../releases)
2. Dans Firefox : `about:addons` → ⚙️ → *Installer depuis un fichier*
3. Accepter l'installation

### Mode développeur (sources)

```bash
git clone https://github.com/TON_USER/fb-optimizer.git
```

1. Firefox → `about:debugging` → *Ce Firefox*
2. *Charger un module temporaire*
3. Sélectionner `manifest.json` dans le dossier cloné

---

## Architecture

```
fb-optimizer/
├── manifest.json       # MV2, valide AMO, gecko strict_min 121.0
├── fb-optimizer.css    # CSS injecté à document_start (masquage avant rendu)
├── content.js          # MutationObserver throttlé rAF + scan multi-blocs
├── background.js       # webRequest → bloque fbevents.js (sites tiers)
├── popup.html          # Interface toggle + compteur
├── popup.js
└── icons/
```

### Principe de fonctionnement

```
document_start
    └── fb-optimizer.css injecté  →  masquage immédiat via sélecteurs stables

DOM chargé
    └── content.js démarre
          ├── scan initial synchrone
          └── MutationObserver (throttle rAF ~16ms)
                ├── Reels injectés dynamiquement
                ├── Sponsored posts (aria + innerText)
                ├── PYMK, Suggested, Marketplace
                └── WeakSet → pas de référence forte, GC libre

webRequest (background.js)
    └── bloque fbevents.js / connect.facebook.net sur sites TIERS uniquement
```

### Pourquoi c'est rapide

- **CSS-first** : 90% du boulot est fait par le CSS, pas de JS pour ces éléments
- **Throttle rAF** : l'observer ne tourne pas plus d'une fois par frame (~16ms)
- **WeakSet** : les nœuds déjà traités ne sont pas re-scannés, le GC peut libérer la mémoire
- **Pause automatique** : l'observer s'arrête quand l'onglet passe en arrière-plan (`visibilitychange`)
- **Sélecteurs stables** : aucun class React obfusqué (`xABCDE`) — résistant aux mises à jour FB

---

## Permissions

| Permission | Utilité |
|---|---|
| `storage` | Mémoriser l'état actif/inactif et le compteur |
| `activeTab` | Communiquer avec l'onglet FB actif (popup → content) |
| `tabs` | Envoyer des messages au content script depuis le popup |
| `webRequest` + `webRequestBlocking` | Bloquer fbevents.js sur sites tiers |
| `*://*.facebook.com/*` | Injecter le CSS et le script sur Facebook |
| `*://connect.facebook.net/*` | Bloquer le pixel de tracking |

---

## Compatibilité

- **Firefox 121+** (strict_min_version dans le manifest)
- Manifest Version 2 (MV2) — compatible AMO
- Testé sur facebook.com · Interface française et anglaise

---

## Licence

MIT — voir [LICENSE](LICENSE)

---

## Changelog

### v1.0
- Fix : suppression de `host_permissions` (invalide en MV2, warning AMO)

### v1.0
- Nouveaux blocs : Sponsored, Stories, PYMK, Marketplace feed, Suggested for you
- Ajout `background.js` + webRequest pour bloquer fbevents.js
- CSS refondu en sections claires avec marqueur `data-fbopt`
- Popup redesigné avec liste des blocs actifs

### v3.1
- Base : blocage Reels uniquement
- Observer throttlé rAF, WeakSet, cleanup pagehide/visibilitychange
