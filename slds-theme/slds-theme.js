/* =====================================================================
   ERPNext desk re-skin in the style of Salesforce Lightning - behaviour.
   Builds the Lightning global header + context (tab) bar from Frappe's
   own sidebar, adds SLDS object icons to workspace widgets, and wires the
   header controls back to Frappe (search, notifications, user menu).
   Icons: SLDS icon sprites (CC BY-ND 4.0) served from /assets/slds/icons.
   ===================================================================== */
(function () {
	"use strict";

	const SPRITE_STANDARD = "/assets/slds/icons/standard-sprite.svg";
	const SPRITE_UTILITY = "/assets/slds/icons/utility-sprite.svg";

	/* Product branding shown to users (the app underneath is still ERPNext). */
	const BRAND = "UtilNext";
	const BRAND_LOGO = "/assets/slds/utilnext-logo.svg";
	function brand(s) {
		return String(s == null ? "" : s).replace(/ERPNext/g, BRAND);
	}

	/* SLDS standard icon + background colour, keyed by (lower-cased) label. */
	const ICON_MAP = {
		home: ["home", "#ff538a"],
		item: ["product", "#9050e9"],
		items: ["product", "#9050e9"],
		product: ["product", "#9050e9"],
		customer: ["account", "#5867e8"],
		customers: ["account", "#5867e8"],
		"customer group": ["people", "#5867e8"],
		supplier: ["partners", "#06a59a"],
		suppliers: ["partners", "#06a59a"],
		"sales invoice": ["orders", "#1b96ff"],
		"sales order": ["orders", "#1b96ff"],
		"purchase order": ["orders", "#1b96ff"],
		quotation: ["quotes", "#3ba755"],
		accounting: ["currency", "#3ba755"],
		invoicing: ["currency", "#3ba755"],
		"financial reports": ["report", "#06a59a"],
		stock: ["store", "#396547"],
		warehouse: ["store", "#396547"],
		crm: ["opportunity", "#ff5d2d"],
		lead: ["lead", "#1b96ff"],
		opportunity: ["opportunity", "#ff5d2d"],
		selling: ["quotes", "#3ba755"],
		buying: ["orders", "#1b96ff"],
		manufacturing: ["work_order", "#1b96ff"],
		"work order": ["work_order", "#1b96ff"],
		bom: ["bill_of_materials", "#9050e9"],
		"bill of materials": ["bill_of_materials", "#9050e9"],
		assets: ["asset_object", "#2f2cb7"],
		projects: ["task", "#3ba755"],
		task: ["task", "#3ba755"],
		hr: ["employee", "#1b96ff"],
		employee: ["employee", "#1b96ff"],
		payroll: ["currency", "#3ba755"],
		support: ["case", "#ff538a"],
		quality: ["approval", "#06a59a"],
		users: ["user", "#107cad"],
		user: ["user", "#107cad"],
		contact: ["contact", "#9602c7"],
		"data import and settings": ["settings", "#747474"],
		settings: ["settings", "#747474"],
		setup: ["settings", "#747474"],
		tools: ["apps", "#1b96ff"],
		build: ["apps", "#1b96ff"],
		integrations: ["data_integration_hub", "#0176d3"],
		website: ["document", "#baac98"],
		reports: ["report", "#06a59a"],
		dashboard: ["dashboard", "#2f2cb7"],
		"chart of accounts": ["currency", "#3ba755"],
		company: ["account", "#5867e8"],
		territory: ["location", "#ff538a"],
	};
	const ICON_DEFAULT = ["record", "#3ba755"];

	function iconFor(label) {
		const key = (label || "").trim().toLowerCase();
		return ICON_MAP[key] || ICON_DEFAULT;
	}

	function svgUse(sprite, id) {
		return `<svg aria-hidden="true"><use href="${sprite}#${id}"></use></svg>`;
	}
	function standardIcon(label, small) {
		const [id, bg] = iconFor(label);
		return `<span class="slds-icon${small ? " slds-icon_small" : ""}" style="--slds-icon-bg:${bg}">${svgUse(SPRITE_STANDARD, id)}</span>`;
	}
	function utilityIcon(id) {
		return svgUse(SPRITE_UTILITY, id);
	}

	function escapeHtml(s) {
		return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	}

	function slug(name) {
		if (window.frappe && frappe.router && typeof frappe.router.slug === "function") {
			return frappe.router.slug(name);
		}
		return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
	}

	/* Setup gear target: the "... Settings" workspace (ERPNext Settings), taken
	   from frappe.boot.workspaces so the route is right whatever it is called. */
	function settingsRoute() {
		const pages = (frappe.boot && frappe.boot.workspaces && frappe.boot.workspaces.pages) || [];
		const ws =
			pages.find((p) => /^erpnext settings$/i.test(p.title || "")) ||
			pages.find((p) => /settings$/i.test(p.title || "") && !p.parent_page) ||
			pages.find((p) => /^(settings|setup)$/i.test(p.title || ""));
		return ws ? `/desk/${slug(ws.name)}` : "/desk/home";
	}

	/* Frappe pages (Page doctype) available to this user, e.g. "user-profile". */
	function hasDeskPage(name) {
		const info = frappe.boot && frappe.boot.page_info;
		return !!(info && info[name]);
	}

	/* ---------------------------------------------------------------- */
	/* Global chrome                                                     */
	/* ---------------------------------------------------------------- */
	function buildChrome() {
		if (document.getElementById("slds-chrome")) return;

		const logo = BRAND_LOGO;
		const user = frappe.session.user;
		const info = frappe.user_info(user) || {};
		const fullname = info.fullname || frappe.session.user_fullname || user;
		const avatar = info.image
			? `<img src="${escapeHtml(info.image)}" alt="">`
			: escapeHtml(info.abbr || fullname.slice(0, 2).toUpperCase());

		const el = document.createElement("div");
		el.id = "slds-chrome";
		el.innerHTML = `
			<header class="slds-global-header">
				<a class="slds-global-header__logo" href="/desk/home">
					<img src="${escapeHtml(logo)}" alt=""><span>${BRAND}</span>
				</a>
				<div class="slds-global-header__search">
					<div class="slds-global-search">
						${utilityIcon("search")}
						<input type="text" placeholder="Search..." aria-label="Search" data-slds="search">
					</div>
				</div>
				<div class="slds-global-header__actions">
					<a class="slds-global-action" href="https://docs.erpnext.com" target="_blank" rel="noopener" title="Help">${utilityIcon("question")}</a>
					<a class="slds-global-action" href="${escapeHtml(settingsRoute())}" title="Setup" data-slds="setup">${utilityIcon("setup")}</a>
					<button type="button" class="slds-global-action" title="Notifications" data-slds="notifications">
						${utilityIcon("notification")}
					</button>
					<button type="button" class="slds-avatar" title="${escapeHtml(fullname)}" data-slds="user">${avatar}</button>
					<div class="slds-dropdown slds-user-menu" hidden>
						<div class="slds-user-menu__identity">
							<span class="slds-avatar">${avatar}</span>
							<div>
								<div class="slds-user-menu__name">${escapeHtml(fullname)}</div>
								<div class="slds-user-menu__email">${escapeHtml(user)}</div>
							</div>
						</div>
						<div class="slds-dropdown__divider"></div>
						${hasDeskPage("user-profile") ? `<a class="slds-dropdown__item" href="/desk/user-profile">${utilityIcon("user")} My Profile</a>` : ""}
						<a class="slds-dropdown__item" href="/desk/user/${encodeURIComponent(user)}">${utilityIcon("settings")} My Settings</a>
						<a class="slds-dropdown__item" href="${escapeHtml(settingsRoute())}">${utilityIcon("setup")} Setup</a>
						<button type="button" class="slds-dropdown__item" data-slds="reload">${utilityIcon("refresh")} Reload</button>
						<div class="slds-dropdown__divider"></div>
						<button type="button" class="slds-dropdown__item" data-slds="logout">${utilityIcon("close")} Log Out</button>
					</div>
				</div>
			</header>
			<nav class="slds-context-bar">
				<div class="slds-context-bar__primary">
					<button type="button" class="slds-context-bar__icon-action" title="App Launcher" data-slds="launcher">${utilityIcon("apps")}</button>
					<button type="button" class="slds-context-bar__app-name" data-slds="launcher">Home</button>
					<div class="slds-dropdown slds-app-launcher" hidden></div>
				</div>
				<div class="slds-context-bar__secondary"></div>
				<div class="slds-context-bar__overflow" hidden>
					<button type="button" class="slds-context-bar__label-action slds-context-bar__more" data-slds="more">More ${utilityIcon("chevrondown")}</button>
					<div class="slds-dropdown slds-more-menu" hidden></div>
				</div>
			</nav>`;
		document.body.prepend(el);
		document.body.classList.add("slds-ready");

		wireChrome(el);
		syncFromSidebar();
	}

	function closeDropdowns(except) {
		document.querySelectorAll("#slds-chrome .slds-dropdown").forEach((d) => {
			if (d !== except) d.hidden = true;
		});
		const dd = document.querySelector("#slds-chrome .dropdown-notifications");
		if (dd && dd !== except) dd.classList.add("hidden");
	}

	/* Copy Frappe's unread count onto the bell. */
	function syncNotificationBadge() {
		const src = document.querySelector(".sidebar-notification-count");
		const bell = document.querySelector('#slds-chrome [data-slds="notifications"]');
		if (!bell) return;
		let badge = bell.querySelector(".slds-notification-badge");
		if (!badge) {
			badge = document.createElement("span");
			badge.className = "slds-notification-badge";
			bell.appendChild(badge);
		}
		const count = src && !src.classList.contains("hidden") ? src.textContent.trim() : "";
		badge.textContent = count;
		badge.hidden = !count;
	}

	function wireChrome(root) {
		/* Search box opens Frappe's awesomebar (lives in the hidden sidebar). */
		const search = root.querySelector('[data-slds="search"]');
		search.addEventListener("mousedown", (e) => {
			e.preventDefault();
			const bar = document.querySelector(".navbar-search-bar");
			if (bar) bar.click();
		});
		search.addEventListener("keydown", (e) => e.preventDefault());

		/* Notifications: reuse Frappe's dropdown by moving it into the header. */
		/* Mirrors frappe/ui/sidebar/sidebar.js: toggle .hidden and fire
		   show.bs.dropdown so frappe.ui.Notifications refreshes its lists. */
		root.querySelector('[data-slds="notifications"]').addEventListener("click", (e) => {
			e.stopPropagation();
			const dd = document.querySelector(".dropdown-notifications");
			if (!dd) return;
			const actions = root.querySelector(".slds-global-header__actions");
			if (dd.parentElement !== actions) {
				actions.appendChild(dd);
				dd.classList.add("slds-notifications");
			}
			closeDropdowns();
			dd.classList.toggle("hidden");
			if (!dd.classList.contains("hidden") && window.jQuery) {
				jQuery(dd).trigger("show.bs.dropdown");
			}
		});

		/* User menu */
		root.querySelector('[data-slds="user"]').addEventListener("click", (e) => {
			e.stopPropagation();
			const menu = root.querySelector(".slds-user-menu");
			closeDropdowns(menu);
			menu.hidden = !menu.hidden;
		});
		root.querySelector('[data-slds="logout"]').addEventListener("click", () => {
			if (frappe.app && typeof frappe.app.logout === "function") frappe.app.logout();
			else window.location.href = "/?cmd=web_logout";
		});
		root.querySelector('[data-slds="reload"]').addEventListener("click", () => {
			if (frappe.ui && frappe.ui.toolbar && typeof frappe.ui.toolbar.clear_cache === "function") frappe.ui.toolbar.clear_cache();
			else window.location.reload();
		});

		/* group tabs open their dropdown (delegated: the strip is rebuilt often) */
		root.querySelector(".slds-context-bar__secondary").addEventListener("click", (e) => {
			const btn = e.target.closest('[data-slds="tabmenu"]');
			if (!btn) return;
			e.stopPropagation();
			openTabMenu(btn.closest(".slds-context-bar__item"));
		});

		/* "More" tab overflow menu */
		root.querySelector('[data-slds="more"]').addEventListener("click", (e) => {
			e.stopPropagation();
			const menu = root.querySelector(".slds-more-menu");
			closeDropdowns(menu);
			menu.hidden = !menu.hidden;
		});

		/* App launcher */
		root.querySelectorAll('[data-slds="launcher"]').forEach((btn) =>
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const menu = root.querySelector(".slds-app-launcher");
				closeDropdowns(menu);
				if (menu.hidden) renderLauncher(menu);
				menu.hidden = !menu.hidden;
			})
		);

		document.addEventListener("click", () => closeDropdowns());
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") closeDropdowns();
		});
	}

	function currentWorkspaceTitle() {
		const t = document.querySelector(".sidebar-header .header-title");
		return t ? t.textContent.trim() : "";
	}

	function renderLauncher(menu) {
		const pages = ((frappe.boot && frappe.boot.workspaces && frappe.boot.workspaces.pages) || []).filter((p) => !p.parent_page);
		const current = currentWorkspaceTitle();
		menu.innerHTML =
			`<div class="slds-dropdown__header">Workspaces</div><div class="slds-dropdown__items">` +
			pages
				.map(
					(p) =>
						`<a class="slds-dropdown__item${p.title === current ? " slds-is-selected" : ""}" href="/desk/${slug(p.name)}">` +
						`${standardIcon(p.title, true)}<span>${escapeHtml(brand(p.title))}</span></a>`
				)
				.join("") +
			`</div>`;
	}

	/* Read Frappe's sidebar into a tab model. Top-level items become tabs;
	   a "section" item (Material Planning, Tools, Reports, Setup...) becomes
	   one tab that opens a menu of its children, like a Salesforce nav item
	   with a dropdown. */
	function readSidebarTabs() {
		const path = window.location.pathname.replace(/\/$/, "");
		const read = (item) => {
			const a = item.querySelector(":scope > a.item-anchor, :scope > .item-anchor");
			if (!a) return null;
			const label = brand(a.textContent.trim());
			if (!label) return null;
			const href = a.getAttribute("href") || "#";
			return { label, href, active: item.classList.contains("active-sidebar") || href.split("?")[0] === path, children: [] };
		};
		const tabs = [];
		document.querySelectorAll(".sidebar-items > .sidebar-item-container").forEach((box) => {
			const head = box.querySelector(":scope > .standard-sidebar-item");
			if (!head) return;
			const tab = read(head);
			if (!tab) return;
			box.querySelectorAll(":scope > .sidebar-child-item .standard-sidebar-item").forEach((child) => {
				const c = read(child);
				if (c) tab.children.push(c);
			});
			if (tab.children.some((c) => c.active)) tab.active = true;
			tabs.push(tab);
		});
		return tabs;
	}

	function menuItemsHtml(tab) {
		let html = "";
		if (tab.href && tab.href !== "#" && !/^javascript:/.test(tab.href)) {
			html += `<a class="slds-dropdown__item${tab.active && !tab.children.some((c) => c.active) ? " slds-is-selected" : ""}" href="${escapeHtml(tab.href)}">${escapeHtml(tab.label)}</a>`;
		}
		return html + tab.children
			.map((c) => `<a class="slds-dropdown__item${c.active ? " slds-is-selected" : ""}" href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`)
			.join("");
	}

	let tabModel = [];

	/* Rebuild app name + tabs from Frappe's sidebar (it re-renders per workspace). */
	function syncFromSidebar() {
		const chrome = document.getElementById("slds-chrome");
		if (!chrome) return;
		const tabs = chrome.querySelector(".slds-context-bar__secondary");
		const appName = chrome.querySelector(".slds-context-bar__app-name");
		const title = currentWorkspaceTitle() || "Home";
		appName.textContent = brand(title);

		tabModel = readSidebarTabs();
		const html = tabModel
			.map((t, i) => {
				const cls = `slds-context-bar__item${t.active ? " slds-is-active" : ""}${t.children.length ? " slds-has-menu" : ""}`;
				if (t.children.length) {
					return `<div class="${cls}" data-tab="${i}"><button type="button" class="slds-context-bar__label-action" title="${escapeHtml(t.label)}" data-slds="tabmenu">${escapeHtml(t.label)} ${utilityIcon("chevrondown")}</button></div>`;
				}
				return `<div class="${cls}" data-tab="${i}"><a class="slds-context-bar__label-action" href="${escapeHtml(t.href)}" title="${escapeHtml(t.label)}">${escapeHtml(t.label)}</a></div>`;
			})
			.join("");
		if (tabs.dataset.sig !== html) {
			tabs.dataset.sig = html;
			tabs.innerHTML = html;
		}
		fitTabs();
	}

	/* One shared dropdown for group tabs, positioned under the clicked tab
	   (the strip clips overflow, so the menu cannot live inside it). */
	function openTabMenu(itemEl) {
		const chrome = document.getElementById("slds-chrome");
		let menu = chrome.querySelector(".slds-tab-menu");
		if (!menu) {
			menu = document.createElement("div");
			menu.className = "slds-dropdown slds-tab-menu";
			chrome.appendChild(menu);
		}
		const tab = tabModel[Number(itemEl.dataset.tab)];
		if (!tab) return;
		if (!menu.hidden && menu.dataset.tab === itemEl.dataset.tab) {
			menu.hidden = true;
			return;
		}
		closeDropdowns(menu);
		menu.dataset.tab = itemEl.dataset.tab;
		menu.innerHTML = menuItemsHtml(tab);
		const r = itemEl.getBoundingClientRect();
		menu.style.left = Math.max(0, Math.min(r.left, window.innerWidth - 240)) + "px";
		menu.style.top = r.bottom + "px";
		menu.hidden = false;
	}

	/* Salesforce puts the tabs that do not fit into a "More" menu instead of
	   clipping them. Measure the visible strip and move the overflow into
	   the dropdown; re-run on resize and whenever the tabs are rebuilt. */
	function fitTabs() {
		const chrome = document.getElementById("slds-chrome");
		if (!chrome) return;
		const strip = chrome.querySelector(".slds-context-bar__secondary");
		const overflow = chrome.querySelector(".slds-context-bar__overflow");
		const menu = overflow.querySelector(".slds-more-menu");
		const items = [...strip.children];
		items.forEach((i) => (i.hidden = false));
		overflow.hidden = true;
		menu.innerHTML = "";
		overflow.classList.remove("slds-is-active");
		if (!items.length) return;

		const available = strip.clientWidth;
		const fits = (limit) => {
			let used = 0;
			for (let i = 0; i < items.length; i++) {
				used += items[i].offsetWidth;
				if (used > limit) return i;
			}
			return -1;
		};
		if (fits(available) < 0) return;

		overflow.hidden = false;
		/* the More button takes room too: drop one more tab if needed */
		let firstHidden = fits(available - (overflow.offsetWidth || 80));
		if (firstHidden < 0) firstHidden = items.length;
		firstHidden = Math.max(0, firstHidden);
		let html = "";
		for (let i = firstHidden; i < items.length; i++) {
			items[i].hidden = true;
			const tab = tabModel[i];
			if (!tab) continue;
			if (tab.active) overflow.classList.add("slds-is-active");
			if (tab.children.length) {
				html += `<div class="slds-dropdown__header">${escapeHtml(tab.label)}</div>` + menuItemsHtml(tab);
			} else {
				html += `<a class="slds-dropdown__item${tab.active ? " slds-is-selected" : ""}" href="${escapeHtml(tab.href)}">${escapeHtml(tab.label)}</a>`;
			}
		}
		menu.innerHTML = html;
	}

	/* ---------------------------------------------------------------- */
	/* Page header + workspace widgets                                   */
	/* ---------------------------------------------------------------- */
	function currentPageEl() {
		/* Frappe keeps every visited page in the DOM; only frappe.container.page is visible. */
		return (window.frappe && frappe.container && frappe.container.page) || document.querySelector(".page-container");
	}

	function decoratePage() {
		const page = currentPageEl();
		if (!page) return;
		const head = page.querySelector(".page-head .page-title");
		if (head && !head.querySelector(".slds-page-icon")) {
			const wrap = document.createElement("span");
			wrap.className = "slds-page-icon";
			head.prepend(wrap);
		}
		const icon = page.querySelector(".page-head .slds-page-icon");
		if (icon) {
			const [id, bg] = iconFor(pageIconLabel(page));
			if (icon.dataset.icon !== id) {
				icon.dataset.icon = id;
				icon.style.setProperty("--slds-icon-bg", bg);
				icon.style.background = bg;
				icon.innerHTML = svgUse(SPRITE_STANDARD, id);
			}
		}
		ensurePageTitle(page);
	}

	/* Pick the label the object icon is keyed on: the doctype for lists,
	   forms and trees, the workspace title for workspaces, a generic label
	   for reports / dashboards, else the breadcrumb text. */
	function pageIconLabel(page) {
		const route = (frappe.get_route && frappe.get_route()) || [];
		const view = String(route[0] || "").toLowerCase();
		if (view === "workspaces" || page.querySelector(".desk-page.page-main-content")) return currentWorkspaceTitle();
		if (["form", "list", "tree"].includes(view) && route[1]) return route[1];
		if (view === "query-report") return "reports";
		if (view === "dashboard-view") return "dashboard";
		if (view === "print") return route[1] || "";
		const crumb = page.querySelector(".page-head .navbar-breadcrumbs li:last-child");
		return (crumb && crumb.textContent) || (page.page && page.page.title) || document.title;
	}

	/* Some pages (tree views, custom pages) only get the home icon in the
	   breadcrumbs and no title text: show the page title next to the icon. */
	function ensurePageTitle(page) {
		const area = page.querySelector(".page-head .page-title .title-area");
		if (!area) return;
		const crumbs = area.querySelector(".navbar-breadcrumbs");
		const last = crumbs && crumbs.querySelector("li:last-child");
		const crumbText = last ? last.textContent.trim() : "";
		const title = (page.page && page.page.title) || "";
		const view = String(((frappe.get_route && frappe.get_route()) || [])[0] || "").toLowerCase();
		/* forms / lists / workspaces: the last crumb is the record, doctype or
		   workspace name. Elsewhere (tree, reports, custom pages) Frappe's
		   last crumb is the parent workspace, so use the page's own title. */
		const crumbIsTitle = ["form", "list", "workspaces", "print"].includes(view) ? !!crumbText : !!crumbText && (!title || crumbText === title);
		let span = area.querySelector(":scope > .slds-page-title-text");
		if (crumbIsTitle) {
			if (span) span.remove();
			area.classList.remove("slds-no-crumb");
			return;
		}
		const text = title || document.title || crumbText;
		if (!text) return;
		if (!span) {
			span = document.createElement("span");
			span.className = "slds-page-title-text";
			if (crumbs) crumbs.insertAdjacentElement("afterend", span);
			else area.prepend(span);
		}
		if (span.textContent !== text) span.textContent = text;
		area.classList.add("slds-no-crumb");
	}

	/* Replace the product name in the few Frappe-rendered texts users see. */
	function rebrandDom(page) {
		const nodes = [];
		if (page) {
			page.querySelectorAll(".page-head .navbar-breadcrumbs li a, .page-head .slds-page-title-text, .desk-page .ce-header, .desk-page .widget-title, .desk-page .onboarding-widget-box .widget-title, .desktop-icon .icon-title").forEach((n) => nodes.push(n));
		}
		nodes.forEach((n) => {
			n.childNodes.forEach((t) => {
				if (t.nodeType === 3 && /ERPNext/.test(t.nodeValue)) t.nodeValue = brand(t.nodeValue);
			});
		});
		if (/ERPNext/.test(document.title)) document.title = brand(document.title);
	}

	function decorateWidgets() {
		document.querySelectorAll(".desk-page .widget.shortcut-widget-box, .desk-page .widget.links-widget-box").forEach((w) => {
			const label = w.querySelector(".widget-label");
			if (!label || label.querySelector(".slds-icon")) return;
			const title = (w.querySelector(".widget-title") || {}).textContent || "";
			label.insertAdjacentHTML("afterbegin", standardIcon(title, false));
		});
	}

	let pending = null;
	function scheduleSync() {
		if (pending) return;
		pending = setTimeout(() => {
			pending = null;
			syncFromSidebar();
			syncNotificationBadge();
			decoratePage();
			decorateWidgets();
			rebrandDom(currentPageEl());
		}, 80);
	}

	/* ---------------------------------------------------------------- */
	/* Boot                                                              */
	/* ---------------------------------------------------------------- */
	function start() {
		if (!window.frappe || !frappe.boot || !document.querySelector(".body-sidebar")) {
			return false;
		}
		buildChrome();
		scheduleSync();

		const observer = new MutationObserver(scheduleSync);
		const sidebar = document.querySelector(".body-sidebar");
		if (sidebar) observer.observe(sidebar, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
		const main = document.querySelector(".main-section");
		if (main) observer.observe(main, { childList: true, subtree: true });

		if (frappe.router && typeof frappe.router.on === "function") {
			frappe.router.on("change", scheduleSync);
		}
		/* page titles set without a .title-text element do not touch the DOM,
		   so listen to Page.set_title as well */
		if (frappe.ui && frappe.ui.Page && frappe.ui.Page.prototype && !frappe.ui.Page.prototype.__slds_title_hook) {
			const orig = frappe.ui.Page.prototype.set_title;
			frappe.ui.Page.prototype.set_title = function () {
				const r = orig.apply(this, arguments);
				scheduleSync();
				return r;
			};
			frappe.ui.Page.prototype.__slds_title_hook = true;
		}
		let resizeTimer = null;
		window.addEventListener("resize", () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(fitTabs, 100);
		});
		return true;
	}

	let tries = 0;
	const timer = setInterval(() => {
		tries += 1;
		if (start() || tries > 100) clearInterval(timer);
	}, 100);
})();
