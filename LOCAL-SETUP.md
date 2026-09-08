# ERPNext — local Docker setup

Running via `frappe_docker`'s ready-to-use `pwd.yml` stack (ERPNext v16.33.0 / Frappe v16.31.0),
with `docker-compose.override.yml` moving the published port from 8080 to **8090**
(8080 is taken by another container on this machine).

## URL & credentials

- <http://localhost:8090>
- User: `Administrator`
- Password: `admin`
- Site name: `frontend`  (MariaDB root password is also `admin`)

## Commands

Run from this directory.

```bash
COMPOSE="docker compose -p erpnext -f pwd.yml -f docker-compose.override.yml"

$COMPOSE up -d        # start
$COMPOSE stop         # stop, keep data
$COMPOSE start        # start again
$COMPOSE logs -f backend
$COMPOSE down         # remove containers, KEEPS volumes
$COMPOSE down -v      # remove containers AND all data (site, database)
```

Bench CLI inside the running backend container:

```bash
docker exec -it erpnext-backend-1 bench --site frontend list-apps
docker exec -it erpnext-backend-1 bench --site frontend console
docker exec -it erpnext-backend-1 bench --site frontend set-admin-password <new-password>
```

## Data

Lives in the named Docker volumes `erpnext_db-data`, `erpnext_sites`, `erpnext_logs`,
`erpnext_redis-queue-data` — it survives `down`, but not `down -v`.

## Salesforce-style theme (`slds-theme/`)

The desk is re-skinned to look like Salesforce Lightning using values from the
Salesforce Lightning Design System (icon sprites from `@salesforce-ux/design-system` 2.264.1,
CC BY-ND 4.0).

**SLDS 2 "Cosmos".** Since the Cosmos pass the theme mirrors SLDS 2's *Cosmos* theme
(npm `@salesforce-ux/design-system-2` 2.264.1, `theme.cosmos.css` global styling hooks):
brand #066afe, on-surface text #2e2e2e / #5c5c5c / #03234d, flat white cards with 1.25rem radius
on #f3f3f3, pill buttons, 0.5rem inputs with #5c5c5c borders, a bar-less white nav, teal/crimson
status colours. Only the token *values* are copied into our own `--slds-*` (and `--sf-*` for the
login page) variables in `slds-theme/`; **no Salesforce CSS file is shipped or loaded** (the SLDS 2
package licence differs from SLDS 1). Dark mode is not implemented; the Cosmos dark values for
the key tokens are kept as a commented `[data-theme="dark"]` block in `slds-theme.css`.

- `slds-theme/THEME-GUIDE.md` – tokens, Salesforce reference specs, Frappe DOM notes, testing rules.
- `slds-theme/slds-theme.css` + `slds-theme.js` – core: tokens, global header + tab bar, app launcher,
  user menu, notifications, page header, buttons, inputs, Home workspace.
- `slds-theme/slds-components.css` – modals, menus, awesomebar, toasts, badges, controls, DataTable
  (report views), dashboards/charts, kanban, calendar, tree.
- `slds-theme/slds-list.css` + `slds-list.js` – list view (object header, filter toolbar, table, paging).
- `slds-theme/slds-form.css` + `slds-form.js` – record page (highlights panel, Path, tabs, section
  cards, child tables, sidebar, activity feed).
- `slds-theme/slds-login.css` + `slds-login.js` – website login page (see "Login page" below).
- `slds-theme/icons/` – SLDS standard/utility SVG sprites.

How it is wired (no image rebuild needed):

- `docker-compose.override.yml` bind-mounts `./slds-theme` into the nginx
  container at `/home/frappe/frappe-bench/assets/slds`, served as `/assets/slds/*`.
  (`sites/assets` in the image is a symlink into the image, not the shared volume.)
- `sites/frontend/site_config.json` lists all css/js files in `app_include_css` / `app_include_js`
  (load order: theme, components, list, form); Frappe injects them into every desk page.
  The login page is wired separately through Website Settings (below).

Edit the files and hard-refresh the browser to see changes. To turn the theme off:

```bash
docker exec erpnext-backend-1 bench --site frontend set-config -p app_include_css "[]"
docker exec erpnext-backend-1 bench --site frontend set-config -p app_include_js "[]"
```

### Login page

`slds-theme/slds-login.css` + `slds-login.js` restyle `/login` like the Salesforce login screen
(left pane with logo + card, right promo pane). Website pages ignore `app_include_*`, so these are
injected through **Website Settings → head HTML** (stored in the database, survives `down`, not `down -v`):

```html
<link rel="stylesheet" href="/assets/slds/slds-login.css">
<script defer src="/assets/slds/slds-login.js"></script>
```

To remove: clear that field in Website Settings (or via bench) and run
`docker exec erpnext-backend-1 bench --site frontend clear-website-cache`.

### Branding

The product is presented to users as **UtilNext**: header wordmark, launcher/tab labels and page
titles (`BRAND` in `slds-theme/slds-theme.js`), the login page (`slds-login.js`), and the logo
`slds-theme/utilnext-logo.svg`. In the database, Website Settings has `app_name` / `title_prefix`
= UtilNext and `favicon` / `app_logo` = the SVG; Navbar Settings `app_logo` too. The underlying
apps are still `frappe` + `erpnext`; nothing in the apps or workspace records was renamed.

## Deployment

Production deployment (AWS EC2 + Traefik + Let's Encrypt) is documented in `deploy/README.md`.
The `release` branch is what runs in production; pushes to it trigger
`.github/workflows/deploy-release.yml`.
