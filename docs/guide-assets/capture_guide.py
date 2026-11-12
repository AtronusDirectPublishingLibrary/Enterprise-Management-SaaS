from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT = Path(__file__).resolve().parent
BASE = "http://localhost:5173"
OUT = ROOT

def snap(page, name):
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / name), type="jpeg", quality=86, full_page=False)
    print(name, page.url)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=1,
        reduced_motion="reduce",
        color_scheme="light",
    )
    page = ctx.new_page()

    # Public landing page
    page.goto(BASE + "/", wait_until="networkidle", timeout=45000)
    snap(page, "03-public-home.jpg")

    # Sign in as the Strategy and Planning Officer, who holds full system-admin rights.
    page.goto(BASE + "/login", wait_until="domcontentloaded", timeout=30000)
    page.locator('input[autocomplete="username"]').wait_for(state="visible", timeout=15000)
    page.locator('input[autocomplete="username"]').fill("strategy.officer")
    page.locator('input[autocomplete="current-password"]').fill("Demo12345!")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard", timeout=30000)
    page.wait_for_timeout(2500)
    snap(page, "04-dashboard.jpg")

    routes = [
        ("/database/pms", "05-pms-projects.jpg", 1200),
        ("/database/aop", "06-annual-plan.jpg", 1200),
        ("/progress-updates", "08-progress-updates.jpg", 1400),
        ("/reports", "09-consolidated-reports.jpg", 1800),
        ("/planning-calendar", "10-planning-calendar.jpg", 1200),
        ("/my-hr", "11-my-portal.jpg", 1200),
        ("/hr", "12-hr-suite.jpg", 1400),
        ("/payroll", "13-payroll.jpg", 1600),
        ("/fleet", "14-fleet-dashboard.jpg", 1400),
        ("/fleet/new", "15-fleet-request.jpg", 1000),
        ("/users", "16-users.jpg", 1000),
        ("/audit-log", "17-audit-log.jpg", 1200),
    ]

    for path, name, wait_ms in routes:
        page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(wait_ms)
        # Some pages redirect if a dependency is unavailable; record the final URL.
        snap(page, name)

    # New feature surfaces: cost control, executive BI, appraisal framework,
    # news/social distribution and the public footer QR.
    page.goto(BASE + "/fleet/cost-control", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(2200)
    snap(page, "18-fleet-cost-control.jpg")

    page.goto(BASE + "/executive", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(2200)
    snap(page, "19-executive-bi.jpg")

    page.goto(BASE + "/hr-operations", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(1600)
    framework = page.get_by_role("button", name="Framework")
    if framework.count():
        framework.first.click()
        page.wait_for_timeout(900)
    snap(page, "20-appraisal-framework.jpg")

    page.goto(BASE + "/manage-news", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(1800)
    snap(page, "21-news-social.jpg")

    page.goto(BASE + "/", wait_until="networkidle", timeout=45000)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(1200)
    snap(page, "22-public-footer-qr.jpg")

    # Open the first annual plan so the editor is shown with its real tabs.
    page.goto(BASE + "/database/aop", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(1000)
    open_buttons = page.get_by_role("button", name="Open plan")
    if open_buttons.count():
        open_buttons.first.click()
        page.wait_for_timeout(1600)
        snap(page, "07-plan-editor.jpg")
    else:
        print("No Open plan button found for the editor screenshot")

    browser.close()
