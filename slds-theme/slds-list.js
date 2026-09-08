/* =====================================================================
   slds-list.js - Salesforce Lightning list view behaviour for Frappe.
   Structural additions only (CSS lives in slds-list.css):
     1. kicker line above the title  ("Customers")
     2. meta line under the title    ("3 items • Sorted by Created On")
     3. moves the "List View" / "Saved Filters" controls from the page
        header into the filter toolbar (Salesforce list-view controls)
   Everything is idempotent, scoped to frappe.container.page, re-run on
   frappe.router "change" and through a debounced MutationObserver on
   .main-section. See THEME-GUIDE.md.
   ===================================================================== */
(function () {
	"use strict";

	/* ---------------------------------------------------------------- */
	/* Helpers                                                           */
	/* ---------------------------------------------------------------- */
	function currentPageEl() {
		return (window.frappe && frappe.container && frappe.container.page) || null;
	}

	function isListRoute() {
		if (!window.frappe || typeof frappe.get_route !== "function") return false;
		const route = frappe.get_route() || [];
		return route[0] === "List" && !!route[1];
	}

	function translate(s) {
		return typeof window.__ === "function" ? __(s) : s;
	}

	/* English plural of a doctype label: Customer -> Customers,
	   Company -> Companies, Address -> Addresses, Terms and Conditions
	   stays as is. Good enough for a kicker line. */
	function pluralize(label) {
		const s = String(label || "").trim();
		if (!s) return s;
		if (/(ss|us|is|x|z|ch|sh)$/i.test(s)) return s + "es";
		if (/s$/i.test(s)) return s;
		if (/[^aeiou]y$/i.test(s)) return s.slice(0, -1) + "ies";
		return s + "s";
	}

	function text(el) {
		return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
	}

	function escapeHtml(s) {
		return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	}

	/* ---------------------------------------------------------------- */
	/* 1 + 2. Kicker and meta line in the page title                     */
	/* ---------------------------------------------------------------- */
	function ensureTitleBlock(page) {
		const titleArea = page.querySelector(".page-head .page-title .title-area");
		if (!titleArea) return null;

		let kicker = titleArea.querySelector(":scope > .slds-page-title-kicker");
		if (!kicker) {
			kicker = document.createElement("span");
			kicker.className = "slds-page-title-kicker";
			titleArea.prepend(kicker);
		}
		let meta = titleArea.querySelector(":scope > .slds-list-meta");
		if (!meta) {
			meta = document.createElement("div");
			meta.className = "slds-list-meta";
			titleArea.appendChild(meta);
		}
		return { kicker, meta };
	}

	/* "3 of 3" -> "3 items", "20 of 45" -> "20 of 45 items", "1 of 1" -> "1 item" */
	function countLabel(raw) {
		if (!raw) return "";
		const m = raw.match(/^(.+?)\s+of\s+(.+)$/i);
		if (!m) return /^\d/.test(raw) ? `${raw} ${raw === "1" ? translate("item") : translate("items")}` : raw;
		const shown = m[1].trim();
		const total = m[2].trim();
		if (shown === total) return `${total} ${total === "1" ? translate("item") : translate("items")}`;
		return `${shown} ${translate("of")} ${total} ${translate("items")}`;
	}

	function sortLabel(page) {
		const btn = page.querySelector(".sort-selector .sort-selector-button");
		if (!btn) return "";
		const label = text(btn.querySelector(".dropdown-text")) || text(btn);
		if (!label) return "";
		const use = page.querySelector(".sort-selector .btn-order use");
		const href = use ? use.getAttribute("href") || use.getAttribute("xlink:href") || "" : "";
		const arrow = href.indexOf("ascending") > -1 ? " ↑" : href.indexOf("descending") > -1 ? " ↓" : "";
		return `${translate("Sorted by")} ${label}${arrow}`;
	}

	function filterLabel(page) {
		const label = page.querySelector(".filter-selector .filter-button .filter-label");
		const n = parseInt(text(label), 10);
		if (!n || n < 1) return "";
		return n === 1 ? translate("Filtered by 1 filter") : `${translate("Filtered by")} ${n} ${translate("filters")}`;
	}

	function updateTitle(page) {
		const parts = ensureTitleBlock(page);
		if (!parts) return;
		const route = frappe.get_route() || [];
		const doctype = route[1];

		const kickerText = pluralize(translate(doctype));
		if (parts.kicker.textContent !== kickerText) parts.kicker.textContent = kickerText;

		const segments = [
			countLabel(text(page.querySelector(".frappe-list .list-count"))),
			sortLabel(page),
			filterLabel(page),
		].filter(Boolean);
		const html = segments.map(escapeHtml).join('<span class="slds-list-meta__sep">•</span>');
		if (parts.meta.innerHTML !== html) parts.meta.innerHTML = html;
	}

	/* ---------------------------------------------------------------- */
	/* 3. List-view controls -> filter toolbar                           */
	/* ---------------------------------------------------------------- */
	function moveListControls(page) {
		const customActions = page.querySelector(".page-head .page-actions .custom-actions");
		const pageForm = page.querySelector(".layout-main-section > .page-form");
		if (!customActions || !pageForm) return;
		if (customActions.parentElement && customActions.parentElement.classList.contains("slds-list-controls")) return;
		/* Views with hide_page_form keep the filter section inside
		   .custom-actions and hide .page-form: leave those alone. */
		if (pageForm.classList.contains("hide")) return;
		if (customActions.querySelector(".filter-section")) return;
		if (window.frappe && typeof frappe.is_mobile === "function" && frappe.is_mobile()) return;
		if (!customActions.querySelector(".btn")) return;

		/* One right-aligned group so the controls wrap together when the
		   standard filters need the whole first row. */
		let group = pageForm.querySelector(":scope > .slds-list-controls");
		if (!group) {
			group = document.createElement("div");
			group.className = "slds-list-controls";
			pageForm.appendChild(group);
		}
		group.appendChild(customActions);
		const filterSection = pageForm.querySelector(":scope > .filter-section");
		if (filterSection) group.appendChild(filterSection);
	}

	/* ---------------------------------------------------------------- */
	/* Runner                                                            */
	/* ---------------------------------------------------------------- */
	function decorate() {
		if (!isListRoute()) return;
		const page = currentPageEl();
		if (!page || !page.querySelector(".page-head")) return;
		moveListControls(page);
		updateTitle(page);
	}

	let pending = null;
	function schedule() {
		if (pending) return;
		pending = setTimeout(() => {
			pending = null;
			try {
				decorate();
			} catch (e) {
				/* never break the desk because of a cosmetic error */
				if (window.console) console.warn("slds-list:", e);
			}
		}, 100);
	}

	function start() {
		if (!window.frappe || !frappe.boot || !frappe.router) return false;
		const main = document.querySelector(".main-section");
		if (!main) return false;

		schedule();
		const observer = new MutationObserver(schedule);
		observer.observe(main, { childList: true, subtree: true, characterData: true });
		if (typeof frappe.router.on === "function") frappe.router.on("change", schedule);
		return true;
	}

	let tries = 0;
	const timer = setInterval(() => {
		tries += 1;
		if (start() || tries > 100) clearInterval(timer);
	}, 100);
})();
