"""Acceptance contract for the home-page terrarium scroll experience.

Run this script against an already-running app. It intentionally uses only the
Python standard library plus the workspace-provided Playwright installation.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from playwright.sync_api import Browser, BrowserContext, Page, TimeoutError, sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3000")
EXPERIENCE = '[data-testid="terrarium-experience"]'
SYSTEM_BROWSER_CANDIDATES = (
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
)


@dataclass
class Check:
    name: str
    error: str | None = None


def load_home(page: Page) -> None:
    # The first Next.js development request compiles the large existing app.
    # Leave enough headroom for that cold start on Windows before asserting UI.
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=180_000)
    page.wait_for_load_state("networkidle", timeout=120_000)
    # The experience is intentionally code-split so it does not compete with
    # the hero LCP. Allow the client-only chunk to mount after hydration.
    page.wait_for_timeout(5_000)


def record(checks: list[Check], name: str, assertion) -> None:
    try:
        assertion()
        checks.append(Check(name))
    except (AssertionError, TimeoutError) as error:
        checks.append(Check(name, str(error) or error.__class__.__name__))


def assert_experience_exists(page: Page) -> None:
    section = page.locator(EXPERIENCE)
    assert section.count() == 1, (
        f"expected exactly one {EXPERIENCE}, found {section.count()} "
        f"at {page.url}; body starts with {(page.locator('body').inner_text() or '')[:160]!r}"
    )
    assert section.is_visible(), "terrarium experience section is not visible"


def assert_descriptive_image_alt(page: Page) -> None:
    assert_experience_exists(page)
    images = page.locator(f"{EXPERIENCE} img")
    assert images.count() >= 1, "terrarium experience must contain an image"

    alts = [(images.nth(index).get_attribute("alt") or "").strip() for index in range(images.count())]
    generic_alts = {"image", "photo", "picture", "画像", "写真"}
    descriptive = [alt for alt in alts if len(alt) >= 6 and alt.lower() not in generic_alts]
    assert descriptive, f"expected a descriptive non-empty image alt, found {alts!r}"


def assert_interpolated_canvas_is_the_visual_source(page: Page) -> None:
    assert_experience_exists(page)
    canvas = page.locator(f'{EXPERIENCE} [data-testid="terrarium-interpolated-canvas"]')
    assert canvas.count() == 1, "expected one cached optical-flow canvas"
    assert canvas.get_attribute("data-renderer") == "cached-canvas-blend"
    assert int(canvas.get_attribute("data-frame-count") or 0) >= 80
    assert len((canvas.get_attribute("aria-label") or "").strip()) >= 6
    assert canvas.get_attribute("data-current-frame") is not None


def assert_artwork_fills_viewport_without_border(page: Page) -> None:
    artwork = page.locator(f'{EXPERIENCE} [data-testid="terrarium-artwork"]')
    assert artwork.count() == 1, "expected one fullscreen terrarium artwork"
    metrics = artwork.evaluate(
        """element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
                width: rect.width,
                height: rect.height,
                viewportWidth: innerWidth,
                viewportHeight: innerHeight,
                borders: [style.borderTopWidth, style.borderRightWidth,
                          style.borderBottomWidth, style.borderLeftWidth],
            };
        }"""
    )
    assert metrics["width"] >= metrics["viewportWidth"] * 0.99, metrics
    assert metrics["height"] >= metrics["viewportHeight"] * 0.99, metrics
    assert all(border == "0px" for border in metrics["borders"]), metrics


def assert_canvas_tracks_scroll_continuously(page: Page) -> None:
    section = page.locator(EXPERIENCE)
    canvas = page.locator(f'{EXPERIENCE} [data-testid="terrarium-interpolated-canvas"]')
    bounds = section.bounding_box()
    viewport = page.viewport_size
    assert bounds and viewport, "terrarium scroll geometry is unavailable"
    start = bounds["y"]
    end = bounds["y"] + bounds["height"] - viewport["height"]
    samples: list[float] = []
    for step in range(11):
        position = start + (end - start) * step / 10
        page.evaluate("y => window.scrollTo(0, y)", position)
        page.wait_for_timeout(500)
        samples.append(float(canvas.get_attribute("data-current-frame") or 0))

    frame_count = int(canvas.get_attribute("data-frame-count") or 0)
    assert samples[-1] >= (frame_count - 1) * 0.85, {
        "frameCount": frame_count,
        "samples": samples,
    }
    assert len({round(value) for value in samples}) >= 8, samples
    assert all(later >= earlier - 1 for earlier, later in zip(samples, samples[1:])), samples


def assert_scroll_settles_on_crisp_frames_without_chapter_copy(page: Page) -> None:
    canvas = page.locator(f'{EXPERIENCE} [data-testid="terrarium-interpolated-canvas"]')
    section = page.locator(EXPERIENCE)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(750)
    bounds = section.bounding_box()
    viewport = page.viewport_size
    assert bounds and viewport, "terrarium scroll geometry is unavailable"
    assert page.get_by_text("ひとつの風景が、完成する。", exact=True).count() == 0, (
        "the lower-right chapter explanation must be removed"
    )

    start = bounds["y"]
    end = bounds["y"] + bounds["height"] - viewport["height"]
    page.evaluate("y => window.scrollTo(0, y)", start + (end - start) * 0.31)
    page.wait_for_timeout(1_500)
    crisp_frame = canvas.get_attribute("data-crisp-frame")
    assert crisp_frame is not None, "scroll must settle on an original crisp source frame"
    assert 0 <= int(crisp_frame) < 24, crisp_frame


def assert_progress_ui_and_copy(page: Page) -> None:
    assert_experience_exists(page)
    progress = page.locator(f'{EXPERIENCE} [role="progressbar"]')
    assert progress.count() == 1, "expected one semantic progressbar"

    label = (progress.get_attribute("aria-label") or "").strip()
    assert label, "progressbar must have an aria-label"

    values = {
        name: progress.get_attribute(name)
        for name in ("aria-valuemin", "aria-valuemax", "aria-valuenow")
    }
    assert all(value is not None for value in values.values()), (
        f"progressbar is missing numeric aria values: {values}"
    )
    minimum = float(values["aria-valuemin"] or "nan")
    maximum = float(values["aria-valuemax"] or "nan")
    current = float(values["aria-valuenow"] or "nan")
    assert minimum < maximum, f"invalid progress range: {values}"
    assert minimum <= current <= maximum, f"progress value is outside its range: {values}"

    copy = page.locator(f'{EXPERIENCE} [data-testid="terrarium-progress-copy"]')
    assert copy.count() == 1, "expected one terrarium progress copy element"
    assert copy.is_visible(), "terrarium progress copy is not visible"
    assert len((copy.inner_text() or "").strip()) >= 2, "terrarium progress copy is empty"


def assert_reduced_motion_marker(page: Page) -> None:
    assert_experience_exists(page)
    assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), (
        "test browser did not enable reduced motion"
    )
    has_marker = page.locator(EXPERIENCE).evaluate(
        """root => [root, ...root.querySelectorAll('*')].some((element) => {
            const className = typeof element.className === 'string' ? element.className : '';
            return element.dataset.reducedMotion === 'true'
                || element.dataset.motion === 'reduced'
                || className.includes('motion-reduce:');
        })"""
    )
    assert has_marker, (
        "reduced-motion handling must be explicit in DOM/CSS via "
        "data-reduced-motion=\"true\", data-motion=\"reduced\", or a motion-reduce:* class"
    )


def assert_no_horizontal_overflow(page: Page) -> None:
    overflow = page.evaluate(
        """() => {
            const viewportWidth = document.documentElement.clientWidth;
            const pageOverflow = document.documentElement.scrollWidth - viewportWidth;
            const offenders = [...document.querySelectorAll('body *')]
                .filter((element) => {
                    const rect = element.getBoundingClientRect();
                    return rect.right > viewportWidth + 1 || rect.left < -1;
                })
                .slice(0, 5)
                .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 2).join('.')}`);
            return { viewportWidth, pageOverflow, offenders };
        }"""
    )
    assert overflow["pageOverflow"] <= 1, (
        f"mobile page overflows horizontally by {overflow['pageOverflow']}px; "
        f"possible offenders: {overflow['offenders']}"
    )


def attach_error_capture(page: Page, errors: list[str]) -> None:
    page.on(
        "console",
        lambda message: errors.append(f"console.{message.type}: {message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))


def allow_local_maintenance_preview(context: BrowserContext) -> None:
    """Use the existing preview path and isolate unrelated external CMS I/O."""
    context.add_cookies(
        [
            {"name": "maintenance-access", "value": "allowed", "url": origin}
            for origin in ("http://127.0.0.1:3000", "http://localhost:3000")
        ]
    )
    context.route(
        "https://*.apicdn.sanity.io/**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"result": []}',
        ),
    )


def exercise_scroll(page: Page) -> None:
    section = page.locator(EXPERIENCE)
    if section.count() != 1:
        return
    bounds = section.bounding_box()
    if not bounds:
        return
    start = max(0, bounds["y"] - page.viewport_size["height"] * 0.5)
    end = bounds["y"] + bounds["height"]
    for position in (start, (start + end) / 2, end):
        page.evaluate("y => window.scrollTo(0, y)", position)
        page.wait_for_timeout(300)


def run(browser: Browser) -> list[Check]:
    checks: list[Check] = []
    runtime_errors: list[str] = []

    desktop_context = browser.new_context(viewport={"width": 1440, "height": 900})
    allow_local_maintenance_preview(desktop_context)
    desktop = desktop_context.new_page()
    attach_error_capture(desktop, runtime_errors)
    load_home(desktop)
    record(checks, "terrarium section exists", lambda: assert_experience_exists(desktop))
    record(checks, "terrarium image has descriptive alt", lambda: assert_descriptive_image_alt(desktop))
    record(
        checks,
        "cached optical-flow canvas is the visual sequence",
        lambda: assert_interpolated_canvas_is_the_visual_source(desktop),
    )
    record(
        checks,
        "artwork fills the viewport without a border",
        lambda: assert_artwork_fills_viewport_without_border(desktop),
    )
    record(
        checks,
        "interpolated canvas tracks scroll continuously",
        lambda: assert_canvas_tracks_scroll_continuously(desktop),
    )
    record(
        checks,
        "scroll settles on crisp frames without chapter copy",
        lambda: assert_scroll_settles_on_crisp_frames_without_chapter_copy(desktop),
    )
    record(checks, "progress UI exposes semantic state and copy", lambda: assert_progress_ui_and_copy(desktop))
    exercise_scroll(desktop)
    desktop_context.close()

    reduced_context = browser.new_context(
        viewport={"width": 1440, "height": 900}, reduced_motion="reduce"
    )
    allow_local_maintenance_preview(reduced_context)
    reduced = reduced_context.new_page()
    attach_error_capture(reduced, runtime_errors)
    load_home(reduced)
    record(checks, "reduced-motion handling is explicit", lambda: assert_reduced_motion_marker(reduced))
    reduced_context.close()

    mobile_context = browser.new_context(viewport={"width": 390, "height": 844})
    allow_local_maintenance_preview(mobile_context)
    mobile = mobile_context.new_page()
    attach_error_capture(mobile, runtime_errors)
    load_home(mobile)
    exercise_scroll(mobile)
    record(checks, "390px viewport has no horizontal page overflow", lambda: assert_no_horizontal_overflow(mobile))
    mobile_context.close()

    record(
        checks,
        "home page emits no console errors while loading and scrolling",
        lambda: (_ for _ in ()).throw(
            AssertionError("\n".join(runtime_errors))
        )
        if runtime_errors
        else None,
    )
    return checks


def main() -> int:
    with sync_playwright() as playwright:
        configured_browser = os.environ.get("PLAYWRIGHT_BROWSER_PATH")
        system_browser = next(
            (
                candidate
                for candidate in (
                    Path(configured_browser) if configured_browser else None,
                    *SYSTEM_BROWSER_CANDIDATES,
                )
                if candidate is not None and candidate.exists()
            ),
            None,
        )
        launch_options = (
            {"headless": True, "executable_path": str(system_browser)}
            if system_browser
            else {"headless": True}
        )
        browser = playwright.chromium.launch(**launch_options)
        try:
            checks = run(browser)
        finally:
            browser.close()

    failures = [check for check in checks if check.error]
    for check in checks:
        status = "FAIL" if check.error else "PASS"
        print(f"[{status}] {check.name}")
        if check.error:
            print(f"       {check.error}")
    print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
