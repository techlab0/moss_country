"""Focused browser contract for the Feedmusic-style homepage navigation."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from terrarium_experience_e2e import (
    allow_local_maintenance_preview,
    assert_following_section_is_not_covered_by_pinned_artwork,
    assert_homepage_changes_one_full_screen_per_wheel,
)


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3000")
BROWSERS = (
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
)


def main() -> int:
    browser_path = next((path for path in BROWSERS if path.exists()), None)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            **({"executable_path": str(browser_path)} if browser_path else {}),
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        allow_local_maintenance_preview(context)
        page = context.new_page()
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=180_000)
        page.wait_for_timeout(8_000)

        checks = (
            ("one wheel changes one full screen", assert_homepage_changes_one_full_screen_per_wheel),
            ("following copy stays above pinned art", assert_following_section_is_not_covered_by_pinned_artwork),
        )
        failures: list[str] = []
        for name, assertion in checks:
            try:
                assertion(page)
                print(f"[PASS] {name}")
            except AssertionError as error:
                failures.append(f"{name}: {error}")
                print(f"[FAIL] {name}: {error}")

        context.close()
        browser.close()

    if failures:
        print("\n".join(failures))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
