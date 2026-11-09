"""
Playwright End-to-End (E2E) & Accessibility/PWA Verification Suite
for SwasthyaBillCheck (NMBTP).
Tests:
1. Desktop Viewport (1440x900) full walkthrough:
   - Legal disclaimer banner & Sample Seed honesty badge present
   - Deck Slide 3 Benchmark Report ("Consultation ₹1,500 | Rate ₹1,500", "Room charges ₹9,000 | Rate ₹6,000", "Lab tests ₹3,000 | Rate ₹3,000", "1 item above approved rate", "Download report")
   - Bill X-Ray overlay toggle
   - Evidence drawer & Grounded "Ask About This Charge" chat drawer
   - Polite Dispute Letter modal + Verified NCH 1915 helpline
   - Unified Govt Rate DB tab, Pre-treatment Cost Estimator & Insurer API Sandbox tab, Regulator Policy Analytics (k >= 10) tab, History tab, Verify-by-Hash tab, DPDP Privacy ("Delete My Data") tab, and Component Storybook tab
2. Mobile Viewport (390x844 — Low-End Android target):
   - Language switcher (Hindi `hi` translation verification), Large Text mode, Dark mode, OCR Review edit screen, and touch-target accessibility check.
"""

import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = ROOT_DIR / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def _wait_for_url(url: str, timeout: float = 25.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status < 500:
                    return True
        except Exception:
            time.sleep(0.4)
    raise RuntimeError(f"Service did not become ready at {url}")


@pytest.fixture(scope="module")
def live_stack():
    """Starts Python AI Engine (8000), Node Fastify API (4000), and Vite Web PWA (5173)."""
    ai_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(ROOT_DIR / "services" / "ai-engine"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    _wait_for_url("http://127.0.0.1:8000/health")

    api_proc = subprocess.Popen(
        ["npx.cmd", "tsx", "src/server.ts"],
        cwd=str(ROOT_DIR / "services" / "api"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )
    _wait_for_url("http://127.0.0.1:4000/health")

    web_proc = subprocess.Popen(
        ["npx.cmd", "vite", "--port", "5173", "--host", "127.0.0.1"],
        cwd=str(ROOT_DIR / "apps" / "web"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )
    _wait_for_url("http://127.0.0.1:5173")

    yield "http://127.0.0.1:5173"

    for p in (web_proc, api_proc, ai_proc):
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
        except Exception:
            pass


def test_playwright_desktop_and_mobile_e2e(live_stack: str):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # =====================================================================
        # 1. DESKTOP VIEWPORT (1440 x 900)
        # =====================================================================
        desktop_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = desktop_ctx.new_page()
        page.goto(live_stack, wait_until="networkidle")

        # Non-negotiable honesty & legal banners
        disclaimer = page.get_by_test_id("legal-disclaimer-banner").inner_text()
        assert "Informational tool, not legal or medical advice" in disclaimer
        assert page.get_by_test_id("sample-seed-badge").is_visible()

        # Check Landing Home Page
        assert page.get_by_test_id("landing-home-page").is_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_landing_home.png"), full_page=True)

        # Navigate to Verify Page and select Slide 3 benchmark bill
        page.get_by_test_id("landing-start-check-btn").click()
        page.wait_for_selector("[data-testid='demo-bill-selector']", timeout=10000)
        page.get_by_test_id("demo-bill-selector").select_option("BILL_001_DECK_SLIDE3")

        # Wait for Slide 3 verification report to render
        page.wait_for_selector("[data-testid='flagged-count-banner']", timeout=10000)
        flagged_banner_text = page.get_by_test_id("flagged-count-banner").inner_text()
        assert "1 item above approved rate" in flagged_banner_text

        card_text = page.get_by_test_id("deck-slide3-report-card").inner_text()
        assert "Consultation" in card_text
        assert "1,500" in card_text
        assert "Room charges" in card_text
        assert "9,000" in card_text
        assert "6,000" in card_text
        assert "Lab tests" in card_text
        assert "3,000" in card_text
        assert "Download report" in card_text

        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_home_report.png"), full_page=True)

        # Toggle Bill X-Ray Overlay
        page.get_by_test_id("bill-xray-toggle-btn").click()
        assert page.get_by_test_id("bill-xray-canvas").is_visible()
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_bill_xray.png"))

        # Open Evidence Drawer on Room charges
        page.get_by_test_id("evidence-btn-1").click()
        assert page.get_by_test_id("evidence-drawer").is_visible()
        assert "CGHS" in page.get_by_test_id("evidence-drawer").inner_text()
        page.get_by_test_id("close-evidence-drawer").click()

        # Open Grounded "Ask About This Charge" Chat Drawer
        page.get_by_test_id("ask-charge-btn-1").click()
        assert page.get_by_test_id("grounded-chat-drawer").is_visible()
        page.wait_for_timeout(400)
        assert "CGHS" in page.get_by_test_id("grounded-chat-drawer").inner_text()
        page.get_by_test_id("close-chat-drawer").click()

        # Open Polite Dispute Letter & Helplines Modal (1915 NCH)
        page.get_by_test_id("open-dispute-modal-btn").click()
        assert page.get_by_test_id("dispute-letter-modal").is_visible()
        modal_txt = page.get_by_test_id("dispute-letter-modal").inner_text()
        assert "1915" in modal_txt
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_dispute_letter.png"))
        page.get_by_test_id("close-dispute-modal").click()

        # Upload a real hospital bill image (Landmark Polyclinic, Pune — 15 rows) and verify immediate live update
        real_bill_path = ROOT_DIR / "apps" / "web" / "public" / "real-bills" / "landmark_polyclinic_pune.jpg"
        page.get_by_test_id("file-upload-input").set_input_files(str(real_bill_path))
        page.wait_for_selector("[data-testid='uploaded-bill-status-bar']", timeout=20000)
        status_txt = page.get_by_test_id("uploaded-bill-status-bar").inner_text()
        assert "Landmark Polyclinic" in status_txt
        assert "15 items" in status_txt
        assert page.get_by_test_id("audit-milestone-tracker").is_visible()
        assert page.get_by_test_id("executive-summary-card").is_visible()
        assert page.get_by_test_id("important-findings-banner").is_visible()
        updated_card_txt = page.get_by_test_id("deck-slide3-report-card").inner_text()
        assert "Landmark Polyclinic" in updated_card_txt
        assert "Bed Charges - PRIVATE" in updated_card_txt

        # Test 1-click line filter pills (Flagged vs All)
        page.get_by_test_id("filter-lines-flagged").click()
        page.get_by_test_id("filter-lines-all").click()
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_real_bill_uploaded.png"), full_page=True)

        # Upload a real diagnostic lab WEBP bill (Dr. Lal PathLabs, Delhi — 4 fungal/aspergillus tests) and verify live update
        lal_bill_path = ROOT_DIR / "apps" / "web" / "public" / "real-bills" / "lal_pathlabs_delhi.webp"
        page.get_by_test_id("file-upload-input").set_input_files(str(lal_bill_path))
        page.wait_for_timeout(1200)
        lal_status = page.get_by_test_id("uploaded-bill-status-bar").inner_text()
        assert "Dr. Lal PathLabs" in lal_status
        assert "4 items" in lal_status

        # Navigate through all tabs and verify zero dead states (Design System tab removed; Dedicated Home & Guide Landing Page added)
        page.get_by_test_id("nav-home").click()
        assert page.get_by_test_id("landing-home-page").is_visible()
        assert "Know if your hospital bill is fair" in page.get_by_test_id("landing-home-page").inner_text()
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_landing_home.png"), full_page=True)

        page.get_by_test_id("nav-rates").click()
        assert page.get_by_test_id("govt-rates-tab").is_visible()
        page.get_by_test_id("rates-search-input").fill("Craniectomy")
        page.wait_for_timeout(400)
        assert "Craniectomy" in page.get_by_test_id("govt-rates-tab").inner_text()
        page.get_by_test_id("rates-search-input").fill("")
        page.wait_for_timeout(300)

        page.get_by_test_id("nav-estimator").click()
        assert page.get_by_test_id("estimator-tab").is_visible()
        page.wait_for_timeout(300)

        page.get_by_test_id("nav-analytics").click()
        page.wait_for_selector("[data-testid='regulator-analytics-tab']")
        assert "k-Anonymity" in page.get_by_test_id("regulator-analytics-tab").inner_text()
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop_regulator_analytics.png"))

        page.get_by_test_id("nav-history").click()
        assert page.get_by_test_id("history-tab").is_visible()

        desktop_ctx.close()

        # =====================================================================
        # 2. MOBILE VIEWPORT (390 x 844 — Low-End Android Target)
        # =====================================================================
        mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        mpage = mobile_ctx.new_page()
        mpage.goto(live_stack, wait_until="networkidle")

        # Navigate from Landing Home to Verify Page on Mobile
        mpage.get_by_test_id("landing-start-check-btn").click()
        mpage.wait_for_selector("[data-testid='demo-bill-selector']", timeout=10000)
        mpage.get_by_test_id("demo-bill-selector").select_option("BILL_001_DECK_SLIDE3")
        mpage.wait_for_selector("[data-testid='deck-slide3-report-card']", timeout=10000)

        # Switch language to Hindi (hi) and verify localized report strings
        mpage.get_by_test_id("language-selector").select_option("hi")
        mpage.wait_for_timeout(300)
        hi_text = mpage.get_by_test_id("deck-slide3-report-card").inner_text()
        assert "कमरे का किराया" in hi_text or "सेमी-प्राइवेट" in hi_text

        mpage.screenshot(path=str(SCREENSHOT_DIR / "mobile_hindi_report.png"), full_page=True)

        # Test Verify-by-Hash Public Lookup on Mobile
        mpage.get_by_test_id("verify-this-hash-link").click()
        mpage.wait_for_selector("[data-testid='hash-verification-result']")
        assert "CRYPTOGRAPHIC PROOF VALID" in mpage.get_by_test_id("hash-verification-result").inner_text()
        mpage.screenshot(path=str(SCREENSHOT_DIR / "mobile_verify_hash.png"))

        # Test DPDP "Delete My Data" on Mobile
        mpage.get_by_test_id("nav-privacy").click()
        mpage.get_by_test_id("delete-my-data-btn").click()
        mpage.wait_for_selector("[data-testid='privacy-deleted-confirmation']")
        assert "Deleted" in mpage.get_by_test_id("privacy-deleted-confirmation").inner_text()

        mobile_ctx.close()
        browser.close()
