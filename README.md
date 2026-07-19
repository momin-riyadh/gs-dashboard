# Nimbus Admin — HTML/Bootstrap 5 + Vite build

Mobile-first admin theme with local Bootstrap 5 assets bundled by Vite. Page
markup stays in each HTML file, while editable content stays isolated as JSON
in its own folder.

## ⚠️ Run this through Vite, not by double-clicking the files

Every page fetches its data from `assets/data/*.json` at load time. Browsers
block `fetch()` of local files when a page is opened directly from disk
(`file://...`). From inside this folder, install the local dependencies once
and start the Vite dev server:

```
npm install
npm run dev
```

then open the local URL printed by Vite. To create an optimized production
build, run:

```
npm run build
```

All fonts, Bootstrap JS, Bootstrap Icons, and custom assets are loaded from
local npm packages and bundled by Vite — no CDN is required. **Bootstrap's CSS
is vendored as an editable local file** (`assets/vendor/bootstrap/bootstrap.css`)
instead of imported from the package, so Bootstrap itself can be customized in
place (see below).

## Structure

```
index.html, users.html, ...        27 pages — each owns its FULL static markup (chrome + content skeleton)
assets/js/main.js                   Local Vite entry: fonts, local Bootstrap CSS, Bootstrap JS, icons, custom CSS, initializer call
assets/vendor/bootstrap/bootstrap.css  Editable local copy of Bootstrap 5's CSS (customize Bootstrap here)
assets/css/custom.css               The custom stylesheet (layers on Bootstrap 5 — upgrade-safe overrides)
assets/js/hydrate.js                Data binder: pours JSON into the static markup via data-nx-* attributes
assets/data/nav.json                Sidebar menu structure (supports nested children, 2 levels deep)
assets/data/themes.json              The two themes: Default (#0081CE) and Client (#F97316)
assets/data/notifications.json       Topbar notification dropdown content
assets/data/messages.json            Topbar messages dropdown content
assets/data/profile-menu.json        Topbar avatar dropdown content
assets/data/pages/*.json             One file per page — this is the ONLY place that page's content lives
package.json                         Vite scripts and local Bootstrap/font/icon dependencies
vite.config.js                       Multi-page build configuration for every HTML shell
```

## How a page works

**Markup lives in the HTML file; data lives in JSON.** Every page writes out its
full markup — the chrome (sidebar, topbar, footer, customizer) *and* the content
skeleton for that page — as real static HTML. The skeleton carries `data-nx-*`
binding attributes that mark where JSON data goes. `assets/js/hydrate.js` reads
the page's `data-nx-data` JSON, fills the markup, and never builds layout itself.

```html
<body>
  <div class="nx-app" id="nxAppRoot">
    <div class="nx-layout">
      <aside class="nx-sidebar" id="nxSidebar">
        <ul class="nx-nav" id="nxNav"></ul>   <!-- filled from nav.json -->
      </aside>
      <div class="nx-main">
        <header class="nx-topbar"> ... static topbar, dropdown lists filled from JSON ... </header>
        <main class="nx-content" id="nxPageContent"
              data-nx-data="assets/data/pages/users.json"
              data-nx-switcher="full">
          <!-- real content markup for THIS page's type, with data-nx-* bindings -->
          <div class="nx-card">
            <table class="nx-table">
              <thead><tr data-nx-list="columns"><template><th data-nx-text="."></th></template></tr></thead>
              <tbody data-nx-list="rows"><template><tr data-nx-widget="cells"></tr></template></tbody>
            </table>
          </div>
        </main>
        <footer class="nx-footer"> ... </footer>
      </div>
    </div>
    <aside class="nx-customizer" id="nxCustomizer"> ... </aside>
    <div class="nx-flyout" id="nxFlyout"></div>
    <div class="nx-flyout nx-flyout-2" id="nxFlyout2"></div>
    <div class="nx-tooltip" id="nxTooltip"></div>
  </div>
  <script type="module" src="assets/js/main.js"></script>
</body>
```

Vite loads `assets/js/main.js`, which imports local fonts, the **local
Bootstrap CSS** (`assets/vendor/bootstrap/bootstrap.css`), Bootstrap Icons,
`assets/css/custom.css`, Bootstrap's JS bundle, then calls `initNimbusAdmin()`
from `assets/js/hydrate.js`. Each page's content skeleton is authored to match
its JSON `"type"`:

| type | used by | markup skeleton |
|---|---|---|
| `dashboard` | Default + 8 dashboard variants, Finance, Client Preview | stat cards, chart placeholder, side panel, optional table |
| `table` | Users, Orders, Invoices, Reports, Tables | data table with avatar/badge/action cells |
| `kanban` | Projects | kanban columns of cards |
| `calendar` | Calendar | month grid + upcoming list |
| `form` | Settings, Forms | grouped form sections (text/select/switch/checkbox) |
| `cards` | File Manager (`cards-files`), Apps / AI Tools / Pages (`cards-grid`) | icon card grid |
| `charts` | Charts | placeholder chart tile gallery |
| `list` | Messages | full-width inbox list |
| `ui-elements` | UI Elements | buttons/badges/alerts + the search & file dropdown demos |

### The `data-nx-*` binding directives

Paths resolve against the current data scope (the page JSON, or the current item
inside a `data-nx-list`); `.` means the scope itself, and `path|transform` runs a
registered transform.

| directive | effect |
|---|---|
| `data-nx-text="path"` | set `textContent` from the value |
| `data-nx-html="path"` | set `innerHTML` |
| `data-nx-attr="a=path,b=p2"` | set attributes `a`, `b` (skipped when null) |
| `data-nx-classtpl="a-{p} b"` | add classes; `{p}` is interpolated, and any token whose `{p}` is empty is dropped |
| `data-nx-flag="cls=path"` | add `cls` when `path` is truthy |
| `data-nx-if` / `data-nx-ifnot` | keep/drop the element on truthiness |
| `data-nx-list="path"` | repeat the single child `<template>` per array item |
| `data-nx-widget="name"` | hand off the few polymorphic pieces (`cells`, `calendar`, `formfield`, `breadcrumb`, `searchgroups`) |

**To add a new page:** add a nav entry to `assets/data/nav.json`, add
`assets/data/pages/<id>.json`, create `<id>.html` (copy a sibling of the same
type so it already has the right chrome + content skeleton, then change its
`<title>` and `data-nx-data`), and add it to the `pages` array in
`vite.config.js`. The 27 shipped pages were assembled by a one-time generator so
their chrome stays identical; copying a sibling keeps that consistency by hand.

**To edit content:** only touch the JSON — e.g. to change a stat on the
dashboard, edit `assets/data/pages/index.json`. Edit the HTML only to change the
page's structure/layout, and `assets/vendor/bootstrap/bootstrap.css` /
`assets/css/custom.css` to change styling.

## Sidebar behaviour

- **Collapsed (icon rail) is the default state.** Hovering an item with
  children opens a flyout card; items whose children *also* have children
  (eCommerce, CRM) open a second flyout beside the first (2 levels deep).
  Leaf icons show a tooltip instead.
- Expanding the sidebar (hamburger button) turns the same nested structure
  into a click-to-open accordion.
- Under 992px the sidebar becomes an off-canvas drawer.

## Two theme switchers

Set per page in that page's HTML through the `data-nx-switcher` value
(`"full"` or `"simple"`):

- **`full`** (used on every page except Client Preview) — sliders icon opens
  a small customizer: light/dark/system mode, and a **Theme** choice between
  **Default** (`#0081CE`, light sidebar) and **Client** (`#F97316`, gradient
  sidebar) — picking one sets the accent color and sidebar background
  together, plus RTL.
- **`simple`** (`client-preview.html`) — just a sun/moon toggle, no panel.

To ship a specific client build with their color fixed (no picker at all),
set `window.NX_THEMES` in `assets/data/themes.json` to just their one preset
and set that page's `data-nx-switcher` value to `"simple"`.

## Topbar

Messages, notifications, and the avatar all open real dropdown cards backed
by `assets/data/messages.json`, `notifications.json`, and `profile-menu.json`
respectively. Every page has a footer: *© Copyright 2026 - Powered by
gPlex. All rights reserved.*

## Porting to React

- `custom.css` imports as-is (global stylesheet).
- Every JSON file becomes a fetch/import in a React data layer — the schema
  doesn't need to change.
- `shell.js`'s render functions map 1:1 to components: `<Sidebar>`,
  `<Topbar>`, `<ThemeCustomizer>`, and one component per content type
  (`<DashboardView>`, `<TableView>`, `<KanbanView>`, etc.) each taking its
  JSON as props.
- Theme persistence (mode + theme preset, localStorage keys) moves into a
  `ThemeProvider` + `useTheme()` context hook.

Say the word when you're ready and I'll scaffold the React version next,
reusing this same design system and data schema.
