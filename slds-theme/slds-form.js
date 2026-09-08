/* =====================================================================
   slds-form.js - Salesforce Lightning "record page" behaviour for
   Frappe forms.  Adds (idempotently, scoped to frappe.container.page):
     - a kicker (doctype label) above the record title in the page head,
     - a horizontal row of key fields under the title (highlights panel),
     - a "Path" bar (docstatus or `status` Select progression),
     - a dirty flag on the page head, and the sticky offsets for the
       form tab bar / sidebar (the highlights panel makes the head taller).
   Hooks: frappe.ui.form.on("*", refresh) (supported by script_manager),
   $(document) "form-refresh", frappe.router "change", the form's "dirty"
   event and a debounced MutationObserver on the page head.
   ===================================================================== */
(function () {
	"use strict";

	const SPRITE_UTILITY = "/assets/slds/icons/utility-sprite.svg";
	const MAX_HIGHLIGHTS = 6;
	const MAX_PATH_STEPS = 7;
	const SKIP_TYPES = new Set([
		"Table", "Table MultiSelect", "Section Break", "Column Break", "Tab Break", "HTML", "Heading",
		"Text Editor", "Long Text", "Small Text", "Text", "Code", "Markdown Editor", "HTML Editor",
		"Attach", "Attach Image", "Image", "Button", "Geolocation", "Signature", "Barcode", "Password",
		"JSON", "Fold", "Icon", "Color",
	]);

	function escapeHtml(s) {
		return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	}
	function utilityIcon(id) {
		return `<svg aria-hidden="true"><use href="${SPRITE_UTILITY}#${id}"></use></svg>`;
	}
	function tr(s) {
		return typeof __ === "function" ? __(s) : s;
	}

	/* ---------------------------------------------------------------- */
	/* Current form                                                      */
	/* ---------------------------------------------------------------- */
	function currentForm() {
		const route = (frappe.get_route && frappe.get_route()) || [];
		if (route[0] !== "Form") return null;
		const frm = window.cur_frm;
		if (!frm || !frm.doc || !frm.page || !frm.page.wrapper) return null;
		/* make sure cur_frm belongs to the visible page */
		const page = frappe.container && frappe.container.page;
		if (page && frm.page.wrapper[0] && !page.contains(frm.page.wrapper[0])) return null;
		return frm;
	}

	/* ---------------------------------------------------------------- */
	/* Highlights: kicker + key fields                                   */
	/* ---------------------------------------------------------------- */
	function isEmpty(v) {
		return v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
	}

	function highlightFields(frm) {
		const meta = frappe.get_meta(frm.doctype);
		if (!meta) return [];
		const doc = frm.doc;
		const seen = new Set();
		const picked = [];
		const consider = (df, force) => {
			if (!df || picked.length >= MAX_HIGHLIGHTS) return;
			if (seen.has(df.fieldname)) return;
			if (SKIP_TYPES.has(df.fieldtype)) return;
			if (df.fieldname === "naming_series" || df.fieldname === "amended_from") return;
			if (df.hidden && !force) return;
			if (df.fieldname === meta.title_field && doc[df.fieldname] === doc.name) return;
			if (df.fieldtype === "Check") return;
			const value = doc[df.fieldname];
			if (isEmpty(value)) return;
			seen.add(df.fieldname);
			picked.push(df);
		};
		const fields = meta.fields || [];
		/* 1. title field, 2. list-view / bold / standard-filter fields, 3. status, 4. required */
		if (meta.title_field) consider(fields.find((f) => f.fieldname === meta.title_field));
		fields.filter((f) => f.in_list_view).forEach((f) => consider(f));
		fields.filter((f) => f.bold).forEach((f) => consider(f));
		fields.filter((f) => f.in_standard_filter).forEach((f) => consider(f));
		consider(fields.find((f) => f.fieldname === "status"));
		fields.filter((f) => f.reqd).forEach((f) => consider(f));
		/* Lightning always shows a few record facts; pad with owner / modified */
		if (picked.length < 4 && !doc.__islocal) {
			if (doc.owner) picked.push({ fieldname: "owner", label: "Owner", fieldtype: "__user" });
			if (doc.modified) picked.push({ fieldname: "modified", label: "Last Modified", fieldtype: "__timestamp" });
		}
		return picked;
	}

	function formatValue(df, doc) {
		const value = doc[df.fieldname];
		try {
			if (df.fieldtype === "__user") {
				const info = (frappe.user_info && frappe.user_info(value)) || {};
				return escapeHtml(info.fullname || value);
			}
			if (df.fieldtype === "__timestamp") {
				const pretty = frappe.datetime && frappe.datetime.prettyDate ? frappe.datetime.prettyDate(value) : value;
				return `<span title="${escapeHtml(value)}">${escapeHtml(pretty)}</span>`;
			}
			if (df.fieldtype === "Link" || df.fieldtype === "Dynamic Link") {
				/* plain text link (no navigation surprises inside a sticky header) */
				const html = frappe.format(value, df, { inline: true, only_value: true }, doc);
				return html || escapeHtml(value);
			}
			return frappe.format(value, df, { inline: true, only_value: true }, doc) || escapeHtml(value);
		} catch (e) {
			return escapeHtml(value);
		}
	}

	function renderHighlights(frm, page) {
		const head = page.querySelector(".page-head");
		if (!head) return;
		const content = head.querySelector(".page-head-content");
		const titleArea = head.querySelector(".page-title .title-area");
		if (!content || !titleArea) return;

		/* kicker */
		let kicker = titleArea.querySelector(".slds-page-title-kicker");
		if (!kicker) {
			kicker = document.createElement("span");
			kicker.className = "slds-page-title-kicker";
			titleArea.prepend(kicker);
		}
		const label = tr(frm.doctype);
		if (kicker.textContent !== label) kicker.textContent = label;

		/* key-field row */
		let row = content.querySelector(":scope > .slds-highlights");
		if (!row) {
			row = document.createElement("div");
			row.className = "slds-highlights";
			content.appendChild(row);
		}
		/* a new, never-saved record only has defaults: no key-field row yet */
		const fields = frm.doc.__islocal ? [] : highlightFields(frm);
		const html = fields
			.map(
				(df) =>
					`<div class="slds-highlights__item" title="${escapeHtml(tr(df.label))}">` +
					`<span class="slds-highlights__label">${escapeHtml(tr(df.label))}</span>` +
					`<span class="slds-highlights__value">${formatValue(df, frm.doc)}</span></div>`
			)
			.join("");
		if (row.dataset.sig !== html) {
			row.dataset.sig = html;
			row.innerHTML = html;
		}

		/* dirty flag (Frappe already swaps the pill to orange "Not Saved") */
		const dirty = !!(frm.doc.__unsaved || (typeof frm.is_dirty === "function" && frm.is_dirty()));
		head.classList.toggle("slds-is-dirty", dirty);
	}

	/* ---------------------------------------------------------------- */
	/* Path                                                              */
	/* ---------------------------------------------------------------- */
	function pathSteps(frm) {
		const meta = frappe.get_meta(frm.doctype);
		if (!meta) return null;
		const doc = frm.doc;
		if (meta.is_submittable) {
			const cur = Math.max(0, Math.min(2, Number(doc.docstatus) || 0));
			const labels = [tr("Draft"), tr("Submitted"), tr("Cancelled")];
			return labels.map((label, i) => ({
				label,
				state: i < cur ? "complete" : i === cur ? (i === 2 ? "lost" : "current") : "incomplete",
			}));
		}
		const sf = (meta.fields || []).find((f) => f.fieldname === "status" && f.fieldtype === "Select" && f.options);
		if (!sf) return null;
		const opts = String(sf.options).split("\n").map((s) => s.trim()).filter(Boolean);
		if (!opts.length || opts.length > MAX_PATH_STEPS) return null;
		const idx = opts.indexOf(doc.status);
		return opts.map((o, i) => ({
			label: tr(o),
			state: idx < 0 ? "incomplete" : i < idx ? "complete" : i === idx ? (/cancel|lost|closed|reject/i.test(o) ? "lost" : "current") : "incomplete",
		}));
	}

	function renderPath(frm, page) {
		const pageContent = page.querySelector(".page-body .page-content");
		const layoutMain = pageContent && pageContent.querySelector(":scope > .layout-main");
		if (!pageContent || !layoutMain) return;
		let bar = pageContent.querySelector(":scope > .slds-path");
		const steps = pathSteps(frm);
		if (!steps) {
			if (bar) bar.remove();
			return;
		}
		if (!bar) {
			bar = document.createElement("div");
			bar.className = "slds-path";
			bar.setAttribute("role", "presentation");
			pageContent.insertBefore(bar, layoutMain);
		}
		const meta = frappe.get_meta(frm.doctype);
		const status = frm.doc.status;
		const showStatus = meta.is_submittable && status && !steps.some((s) => s.label === status);
		const html =
			`<div class="slds-path__track">` +
			steps
				.map((s) => {
					const icon = s.state === "complete" ? utilityIcon("check") : "";
					return `<div class="slds-path__item slds-is-${s.state}">${icon}<span>${escapeHtml(s.label)}</span></div>`;
				})
				.join("") +
			`</div>` +
			(showStatus ? `<div class="slds-path__status">${escapeHtml(tr("Status"))}: <b>${escapeHtml(tr(status))}</b></div>` : "");
		if (bar.dataset.sig !== html) {
			bar.dataset.sig = html;
			bar.innerHTML = html;
		}
	}

	/* ---------------------------------------------------------------- */
	/* Sticky offsets (tab bar + sidebar sit under the taller head)      */
	/* ---------------------------------------------------------------- */
	function syncStickyOffset(page) {
		const head = page.querySelector(".page-head");
		if (!head) return;
		const mt = parseFloat(getComputedStyle(head).marginTop) || 0;
		const h = head.offsetHeight + mt;
		const v = h + "px";
		if (page.style.getPropertyValue("--slds-form-head-h") !== v) page.style.setProperty("--slds-form-head-h", v);
		/* body[data-route] scoping reads the var from the page container */
		document.body.style.setProperty("--slds-form-head-h", v);
		/* Chrome does not always re-resolve `top: var(...)` when only the custom
		   property changes, so write the sticky offsets inline as well. */
		const gap = 12;
		page.querySelectorAll(".form-layout > .form-page > .form-tabs-list").forEach((el) => {
			if (el.style.top !== v) el.style.setProperty("top", v, "important");
		});
		const side = page.querySelector(".layout-side-section");
		if (side && window.innerWidth > 991) {
			const st = h + gap + "px";
			if (side.style.top !== st) side.style.setProperty("top", st, "important");
		} else if (side) {
			side.style.removeProperty("top");
		}
		/* the head grows/shrinks when the key-field row or the actions wrap */
		if (!head.__slds_ro && window.ResizeObserver) {
			head.__slds_ro = new ResizeObserver(() => syncStickyOffset(page));
			head.__slds_ro.observe(head);
		}
	}

	/* ---------------------------------------------------------------- */
	/* Decorate                                                          */
	/* ---------------------------------------------------------------- */
	let rendering = false;
	function decorate() {
		const frm = currentForm();
		if (!frm) return;
		const page = frappe.container.page;
		if (!page) return;
		rendering = true;
		try {
			renderHighlights(frm, page);
			renderPath(frm, page);
			syncStickyOffset(page);
			bindForm(frm);
		} finally {
			rendering = false;
		}
	}

	let pending = null;
	function schedule() {
		if (pending) return;
		pending = setTimeout(() => {
			pending = null;
			decorate();
		}, 60);
	}

	function bindForm(frm) {
		if (frm.__slds_bound) return;
		frm.__slds_bound = true;
		if (window.jQuery && frm.wrapper) {
			jQuery(frm.wrapper).on("dirty", schedule);
		}
	}

	/* ---------------------------------------------------------------- */
	/* Boot                                                              */
	/* ---------------------------------------------------------------- */
	function start() {
		if (!window.frappe || !frappe.boot || !frappe.ui || !frappe.ui.form) return false;

		/* wildcard form handlers: frappe.ui.form.handlers["*"] is honoured by script_manager */
		try {
			frappe.ui.form.on("*", {
				refresh: schedule,
				onload_post_render: schedule,
				after_save: schedule,
			});
		} catch (e) {
			/* fall back to the document-level event below */
		}
		if (window.jQuery) jQuery(document).on("form-refresh", schedule);
		if (frappe.router && typeof frappe.router.on === "function") frappe.router.on("change", schedule);
		window.addEventListener("resize", schedule);

		/* pill text / class changes (Not Saved, Submitted, ...) and late-loaded sidebar bits */
		const main = document.querySelector(".main-section");
		if (main) {
			new MutationObserver((records) => {
				if (rendering) return;
				for (const r of records) {
					const t = r.target;
					if (!(t instanceof Element)) continue;
					if (t.closest(".slds-highlights, .slds-path")) continue;
					if (t.closest(".page-head, .form-tabs-list, .form-sidebar")) {
						schedule();
						return;
					}
				}
			}).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"], characterData: true });
		}

		schedule();
		return true;
	}

	let tries = 0;
	const timer = setInterval(() => {
		tries += 1;
		if (start() || tries > 100) clearInterval(timer);
	}, 100);
})();
