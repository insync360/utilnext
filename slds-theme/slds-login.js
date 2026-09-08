/* Salesforce-style login page: small structural additions on top of
   Frappe's /login markup (logo above the card, link list under the
   button, footer, promo pane). Injected via Website Settings → head HTML. */
(function () {
	"use strict";
	if (document.body.getAttribute("data-path") !== "login") return;

	function el(tag, cls, html) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (html != null) e.innerHTML = html;
		return e;
	}

	function decorate() {
		const page = document.getElementById("page-login");
		const main = page && page.querySelector("main.container");
		const loginCard = page && page.querySelector("section.for-login .page-card");
		if (!page || !main || !loginCard || page.querySelector(".slds-login-logo")) return;

		/* Logo + wordmark above the card */
		const logoSrc = "/assets/slds/utilnext-logo.svg";
		const logo = el("div", "slds-login-logo", `<img src="${logoSrc}" alt=""><span>UtilNext</span>`);
		main.insertBefore(logo, main.firstChild);

		/* Card title + primary button wording */
		const h4 = loginCard.querySelector(".page-card-head h4");
		if (h4 && /sign in/i.test(h4.textContent)) h4.textContent = "UtilNext login";
		const btn = loginCard.querySelector(".btn-login");
		if (btn && /continue/i.test(btn.textContent)) btn.textContent = "Log In";

		/* Remember me (visual parity; Frappe keeps the session regardless) */
		const actions = loginCard.querySelector(".page-card-actions");
		if (actions) {
			const remember = el("label", "slds-remember", `<input type="checkbox" checked><span>Remember me</span>`);
			actions.insertBefore(remember, btn ? btn.nextSibling : null);

			/* Forgot password + secondary options under a divider */
			const links = el("div", "slds-login-links");
			const forgot = loginCard.querySelector(".forgot-password-message");
			if (forgot) links.appendChild(forgot);
			loginCard.querySelectorAll(".btn-login-option").forEach((a) => links.appendChild(a));
			actions.appendChild(links);
		}

		/* Footer */
		const wrapper = page.querySelector(".page-content-wrapper");
		if (wrapper) {
			wrapper.appendChild(
				el("div", "slds-login-footer", `&copy; ${new Date().getFullYear()} UtilNext. All rights reserved.`)
			);
		}

		/* Promo pane */
		const promo = el(
			"aside",
			"slds-login-promo",
			`<p class="slds-login-promo__kicker">UtilNext &nbsp;|&nbsp; Cloud ERP</p>
			 <h1 class="slds-login-promo__title">Run your whole business from one place</h1>
			 <p class="slds-login-promo__text">Accounting, inventory, sales, purchasing, manufacturing, projects and HR in a single system, with dashboards and reports that update as your team works.</p>
			 <a class="slds-login-promo__cta" href="https://docs.erpnext.com" target="_blank" rel="noopener">Explore the docs
			   <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h8v8h-2V5.4L5.4 12 4 10.6 10.6 4H6V2z"/><path d="M2 4h3v2H4v6h6v-1h2v3H2V4z"/></svg></a>
			 <ul class="slds-login-promo__features">
			   <li><strong>Sales &amp; CRM</strong>Leads, quotations, orders and invoices in one flow.</li>
			   <li><strong>Stock &amp; Manufacturing</strong>Warehouses, BOMs and work orders with live valuation.</li>
			   <li><strong>Accounting</strong>Multi-company, multi-currency books with instant reports.</li>
			 </ul>`
		);
		page.appendChild(promo);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", decorate);
	} else {
		decorate();
	}
})();
