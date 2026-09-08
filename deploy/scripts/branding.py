"""UtilNext branding: Website Settings + Navbar Settings.

Run inside the backend container's bench python (see apply-theme.sh):
    cd sites && ../env/bin/python - < deploy/scripts/branding.py
Environment: SITE_NAME (required).
Idempotent: re-running only rewrites the same values.
"""
import os

import frappe

SITE = os.environ["SITE_NAME"]
BRAND = "UtilNext"
LOGO = "/assets/slds/utilnext-logo.svg"
HEAD_TAGS = (
    '<link rel="stylesheet" href="/assets/slds/slds-login.css">\n'
    '<script defer src="/assets/slds/slds-login.js"></script>'
)

frappe.init(site=SITE)
frappe.connect()
try:
    ws = frappe.get_doc("Website Settings", "Website Settings")
    ws.app_name = BRAND
    ws.title_prefix = BRAND
    ws.favicon = LOGO
    ws.app_logo = LOGO
    head = ws.head_html or ""
    if "slds-login" not in head:
        ws.head_html = (head.rstrip() + "\n" if head.strip() else "") + HEAD_TAGS
    ws.flags.ignore_permissions = True
    ws.save()

    nb = frappe.get_doc("Navbar Settings", "Navbar Settings")
    nb.app_logo = LOGO
    nb.flags.ignore_permissions = True
    nb.save()

    frappe.db.commit()
    print(f"branding applied to {SITE}: app_name={ws.app_name}, logo={nb.app_logo}")
finally:
    frappe.destroy()
