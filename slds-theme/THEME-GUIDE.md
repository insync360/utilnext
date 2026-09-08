# ERPNext → Salesforce Lightning re-skin: working guide

Goal: make the ERPNext v16 desk look and feel like Salesforce Lightning Experience
(same colours, cards, typography, spacing) **without changing Frappe behaviour**.
Everything is done with CSS/JS injected into the desk; no Frappe/ERPNext source edits.

## How the theme is loaded (already wired, do not change)

- This folder is bind-mounted into the nginx container and served at `/assets/slds/*`.
- `sites/frontend/site_config.json` lists the files in `app_include_css` / `app_include_js`.
  Load order: `slds-theme.css` → `slds-components.css` → `slds-list.css` → `slds-form.css`,
  then `slds-theme.js` → `slds-list.js` → `slds-form.js`.
- Edit a file, hard-refresh the browser (a plain navigation is enough; no build step).
- Icons: `icons/standard-sprite.svg` and `icons/utility-sprite.svg` (SLDS sprites).
  Use `<svg><use href="/assets/slds/icons/standard-sprite.svg#account"></use></svg>`.
  Do not edit the sprite files (CC BY-ND licence).

## File ownership (one agent per file, never edit another agent's file)

| File | Owner / scope |
|---|---|
| `slds-theme.css`, `slds-theme.js` | Core: tokens, global header + tab bar, page header, buttons, inputs, Home workspace. **Read-only for phase agents.** Reuse its CSS variables and JS helpers. |
| `slds-components.css` | Shared components: modals/dialogs, dropdown menus, awesomebar, toasts/alerts/msgprint, indicators/badges/pills, tooltips, date picker, selects, checkboxes, generic tabs, Frappe DataTable (report view, query reports), dashboards/number cards/charts, kanban/calendar basics. |
| `slds-list.css`, `slds-list.js` | List view (`/desk/<doctype>`): object page header, filter bar, list rows/table, checkboxes, paging, list sidebar, group-by, bulk actions. |
| `slds-form.css`, `slds-form.js` | Form / record page (`/desk/<doctype>/<name>` and `/new`): highlights panel, path/status, form tabs, sections as cards, fields, child-table grid, form sidebar, timeline/comments, form toolbar. |

## Design tokens (defined as CSS variables in `slds-theme.css`; use them)

The theme mirrors **SLDS 2, theme "Cosmos"** (npm `@salesforce-ux/design-system-2` 2.264.1,
`theme.cosmos.css` global hooks). Only token *values* are copied into our own `--slds-*`
variables; no Salesforce CSS is loaded. Variable names are unchanged from the SLDS 1 pass.

```
brand / accent
--slds-brand #066afe (accent-1)      --slds-brand-dark #0250d9 (accent-2: links, neutral-button text, active nav)
--slds-brand-darker #022ac0 (accent-3: link hover, active tab text)
--slds-brand-deep #001e5b (brand-15: focus ring, nav/tab hover bar)   --slds-brand-light #4992fe
--slds-brand-tint #edf4ff (brand-95)   --slds-brand-tint-2 #d6e6ff (brand-90: button/menu/row hover)
--slds-navy #03234d (surface-inverse-2: tooltips, chart tips)   --slds-navy-2 #032d60 (path current)
--slds-link #0250d9   --slds-link-hover #022ac0
surfaces / borders
--slds-page-bg #f3f3f3   --slds-surface #fff   --slds-surface-hover #f3f3f3   --slds-surface-3 #e5e5e5
--slds-border #c9c9c9 (border-1: table rows, dividers, tiles inside cards)
--slds-border-strong #5c5c5c (border-2: inputs, neutral buttons, checkboxes, pills)
--slds-border-soft #e5e5e5 (hairlines inside cards)
--slds-card-border 1px solid transparent   --slds-popup-border 0   (flat cards / borderless menus)
text
--slds-text #2e2e2e (on-surface-2)   --slds-text-heading #03234d (on-surface-3: headings, card titles)
--slds-text-weak #5c5c5c (on-surface-1: labels)   --slds-text-muted #757575
radii / shadows / focus
--slds-radius-sm .25rem (badges, checkboxes)   --slds-radius .5rem (inputs, menus, modals, tables)
--slds-radius-lg .75rem (nav items, tiles)   --slds-radius-xl 1.25rem   --slds-radius-card = xl
--slds-radius-pill 15rem (buttons, pills)
--slds-shadow-1..4 (Cosmos layered)   --slds-shadow-card none   --slds-shadow-header = shadow-1
--slds-shadow-drop = shadow-2 (menus, pickers)
--slds-focus 0 0 0 2px #fff, 0 0 0 4px #001e5b   --slds-focus-inset 0 0 0 2px #001e5b inset
--slds-button-lift 0 1.5px 0 0 #2e2e2e   --slds-button-lift-brand 0 2px 0 0 #002775
status (Cosmos semantic: success = teal, error = crimson, warning = amber)
--slds-success #0b827c / -text #056764 / -bg #acf3e4      --slds-warning #ca8501 / -text #8c4b02 / -bg #f9e3b6
--slds-error #b60554 / --slds-error-bright #e3066a / -bg #fddde3   --slds-info #0b5cab / -bg #d8e6fe
type / chrome
--slds-font (system-ui stack)   --slds-font-size .8125rem   --slds-font-size-1 .875rem   --slds-font-size-neg-1 .75rem
--slds-chrome-h = header 3.125rem + nav bar 3rem (98px)
```

SLDS object icon colours (unchanged, still the SLDS standard-icon palette): account #5867e8,
product #9050e9, contact #9602c7, lead #1b96ff, opportunity #ff5d2d, report #06a59a,
dashboard #2f2cb7, home #ff538a, settings #396547, partners #06a59a, orders #1b96ff,
quotes #3ba755, case #ff538a, task #3ba755, user #107cad, store #396547, record #3ba755,
employee #1b96ff, currency #3ba755. Icons are drawn as **circles** in Cosmos.
Frappe colour pairs (`--bg-green`/`--text-on-green`, …) are mapped to the Cosmos
`<status>-container-1` / `on-<status>-1` pairs in `slds-components.css` section 0 (all >= 4.5:1).
Dark mode: not implemented; a commented `[data-theme="dark"]` block with the Cosmos dark
values for the key tokens sits under the token block in `slds-theme.css`.

## SLDS 2 Cosmos reference (what each thing should look like)

- **Global header / nav**: white header with shadow-1, 3.125rem; nav bar 3rem, white, **no** 3px
  brand bar. Nav items are .75rem-radius pills, 500 weight, on-surface-3 text; hover = 3px
  #001e5b bar under the item; active = #0250d9 text + 3px #0250d9 bar. App name 1.25rem regular.
- **Page/list header**: flat on the page background (no card, border or shadow); object icon
  (2.25rem coloured **circle**) + .8125rem grey kicker above a **1.5rem regular** #03234d title;
  right side: neutral buttons (white pill, 1px #5c5c5c border, #0250d9 text, 600) and one brand
  button (#066afe pill, white text). Below the title a .8125rem grey meta line.
- **Cards** (list card, form sections, widgets, sidebar): white, radius 1.25rem, no border, no
  shadow, on #f3f3f3. Card/section title 1.25rem regular #03234d with a hairline below.
  Tiles inside a white card keep a 1px #c9c9c9 border and .75rem radius.
- **List table**: header row #f3f3f3 with .8125rem/600 #5c5c5c labels, 1px #c9c9c9 row rules,
  hover #f3f3f3, focus = 2px #001e5b inset, first column link #0250d9, checkboxes 1px #5c5c5c.
- **Record page**: highlights = flat header with key-field row (labels .75rem/600). Path: 1.875rem
  segments with pill ends; incomplete #e5e5e5/#2e2e2e, complete #acf3e4/#056764, current
  #032d60/white, lost #fddde3/#b60554. Tabs: .875rem/600 #5c5c5c, hover #001e5b + 3px bar,
  active #022ac0 text + 3px #0250d9 bar, 1px #c9c9c9 rule. Labels .75rem/600 #5c5c5c above values.
- **Buttons**: pill radius, 600 weight, 1.875rem line box. Neutral hover = #d6e6ff bg, #03234d
  text, 1.5px lift (translateY + hard shadow). Brand hover = #0250d9 + 2px lift. Groups don't lift.
- **Inputs**: white, 1px #5c5c5c, radius .5rem, height 2rem; focus keeps the border and adds
  `--slds-focus` (2px white gap + 2px #001e5b ring). Read-only: #f3f3f3 bg, #757575 border.
- **Modal**: radius .5rem, shadow-4, left-aligned 1.25rem regular title, 2px #c9c9c9 header and
  footer rules, bordered circular close button, footer on #f3f3f3, backdrop #2e2e2e @ 80%.
- **Dropdown menu**: white, no border, radius .5rem, shadow-2, items .8125rem, hover #d6e6ff,
  header .75rem/600 (no uppercase).
- **Badge**: bg #e5e5e5 (or status container colour), .75rem **regular** text, radius .25rem,
  height 1.375rem. Data/tag pills: 1.5rem, 1px #5c5c5c, pill radius, hover #d6e6ff.
- **Toast**: dark #2e2e2e bg (or status colour), white text, radius .5rem, shadow-4.

## Frappe DOM facts learned so far (save yourself the digging)

- `.main-section` is the scroll container (100vh). The fixed chrome is compensated with
  padding-top on it; `.page-head` is `position: sticky; top: 0` inside it.
- Every visited page stays in the DOM. The current one is `frappe.container.page`
  (a `.page-container`). Always scope queries to it, not `document`.
- Page header: `.page-head > .container > .page-head-content` with `.page-title`
  (`.title-area .navbar-breadcrumbs`, `.indicator-pill`) and `.page-actions`
  (`.custom-actions`, `.standard-actions` with `.btn-primary` "Add X", `.menu-btn-group`).
  `slds-theme.js` already inserts `<span class="slds-page-icon">` in `.page-title`.
- Route: `frappe.get_route()` → `["List","Customer","List"]`, `["Form","Customer","name"]`,
  `["Workspaces","Home"]`, `["List","Customer","Report"]`. `frappe.router.on("change", fn)` fires on navigation.
- List view root: `.frappe-list` with `.list-row-head` (header), `.list-row-container > .list-row`
  (`.level-left`, `.level-right`, `.list-row-col`, `.list-subject`, `.list-row-checkbox`), `.list-paging-area`,
  `.list-count`; filter area `.page-form` (standard filters) + `.filter-selector`, `.sort-selector`.
  Side section: `.layout-side-section` (`.list-sidebar`), main: `.layout-main-section`.
- Form root: `.form-layout` → `.form-tabs-list` (`.nav-tabs`) + `.form-tab-content` → `.form-page`
  → `.form-section` (`.section-head`, `.section-body`, `.form-column`) → `.frappe-control`
  (`.control-label`, `.control-input`, `.like-disabled-input`). Child table: `.form-grid`
  (`.grid-heading-row`, `.grid-body .grid-row`). Sidebar: `.form-sidebar`. Footer: `.form-footer`
  (`.timeline`, `.comment-box`). Toolbar buttons live in `.page-actions`.
  Meta: `frappe.get_meta(doctype).fields`; current form: `cur_frm` (`cur_frm.doc`, `cur_frm.doctype`).
  Frappe supports `frappe.ui.form.on("*", { refresh(frm) {...} })`? — verify with grep in
  `apps/frappe/frappe/public/js/frappe/form/script_manager.js` inside the container before relying on it.
- Frappe SCSS lives in the container at
  `/home/frappe/frappe-bench/apps/frappe/frappe/public/scss/desk/*.scss` (list.scss, form.scss,
  form_sidebar.scss, list_sidebar.scss, frappe_datatable.scss, report.scss, timeline.scss, …).
  Read it with `docker exec erpnext-backend-1 cat <path>` to find selectors and CSS variables.
  Prefer overriding Frappe's CSS variables (`--bg-color`, `--fg-color`, `--border-color`,
  `--control-bg`, `--text-muted`, …) before writing element selectors.

## Testing (Chrome extension, shared browser)

- Call `tabs_context_mcp` first, then `tabs_create_mcp` to get **your own tab**; use only that
  tabId. Never close or navigate tabs you did not create. The browser is already logged in as
  Administrator (session cookie is shared). Never type passwords.
- Test data: Customers "Palmer Productions Ltd.", "West View Software Ltd.", "Grant Plastics Ltd.";
  Items (10), Suppliers (3), Sales Invoices (5). Sales Invoice is a submittable doctype (good for Path).
- URLs: `http://localhost:8090/desk/customer`, `/desk/customer/Palmer Productions Ltd.`,
  `/desk/sales-invoice`, `/desk/sales-invoice/<name>`, `/desk/customer/view/report`,
  `/desk/item`, `/desk/customer/new`.
- Use `javascript_tool` to inspect DOM; avoid dumping `outerHTML` with hrefs containing query
  strings (the tool blocks output that looks like cookie/query data). Print class trees instead.
- Check `read_console_messages` with `onlyErrors` for regressions. The socket.io "Invalid origin"
  error is pre-existing; ignore it.
- Do not run `docker compose down`, do not rebuild containers, do not change `site_config.json`.

## Rules

- Never break Frappe functionality: do not `display:none` anything the user needs (menus, buttons,
  sidebar toggles). Hiding decorative/duplicate elements is fine.
- Prefer CSS. Use JS only for structural additions (extra wrapper/labels/icons), idempotent
  (check before inserting), scoped to `frappe.container.page`, re-run on `frappe.router.on("change")`
  and via a debounced MutationObserver on `.main-section`.
- Keep dark mode out of scope. Keep selectors specific enough not to leak into the Home workspace
  (already themed) unless intentional.
- Comment the file by section. Keep it readable; no minification.
- When done, report in ≤ 15 lines: what was styled, files touched, screenshots verified, known gaps.
