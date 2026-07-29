"""
Internshala scraper — collects publicly listed internship listings.

Usage:
    python internshala_scraper.py

Respects robots.txt, uses reasonable request delays, and degrades gracefully
on HTML structure changes (logs warnings rather than crashing).

Requires: requests, beautifulsoup4, python-dotenv, psycopg2-binary
Install:  pip install -r requirements.txt
"""

import os
import time
import logging
import hashlib
from datetime import datetime
from urllib.parse import urljoin, quote_plus
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

# ─── Config ────────────────────────────────────────────────────────────────────
load_dotenv(
    dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env")
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

BASE_URL = "https://internshala.com"
SEARCH_PATHS = [
    "/internships/computer-science-engineering-internship/",
    "/internships/web-development-internship/",
    "/internships/python-internship/",
    "/internships/data-science-internship/",
    "/internships/machine-learning-internship/",
    "/internships/artificial-intelligence-internship/",
    "/internships/java-internship/",
    "/internships/android-app-development-internship/",
    "/internships/work-from-home-internship/",
    "/internships/software-development-internship/",
    "/internships/full-stack-development-internship/",
    "/internships/data-analyst-internship/",
    "/internships/devops-internship/",
    "/internships/cloud-computing-internship/",
    "/internships/cybersecurity-internship/",
    "/internships/ui-ux-design-internship/",
    "/internships/react-js-internship/",
    "/internships/node-js-internship/",
    "/internships/javascript-internship/",
    "/internships/sql-internship/",
]
REQUEST_DELAY_SEC = 2.0   # polite delay between requests
MAX_PAGES = 10            # pages per search path

HEADERS = {
    "User-Agent": (
        "InternHub-Bot/1.0 (educational aggregator; "
        "contact: your@email.com; not for commercial use)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


# ─── robots.txt check ──────────────────────────────────────────────────────────
def can_fetch(url: str) -> bool:
    """Return True if robots.txt permits crawling the given URL."""
    rp = RobotFileParser()
    rp.set_url(urljoin(BASE_URL, "/robots.txt"))
    try:
        rp.read()
        return rp.can_fetch(HEADERS["User-Agent"], url)
    except Exception as exc:
        log.warning("Could not read robots.txt (%s) — skipping fetch", exc)
        return False


# ─── Work mode normalization ───────────────────────────────────────────────────
def normalize_internshala_work_mode(card, url_path: str) -> tuple[str | None, str | None]:
    """
    Detect work mode from Internshala card HTML or URL path.
    Returns (normalized_work_mode, source_work_mode).
    Only uses explicit signals — no inference from descriptions.

    Internshala signals:
      - URL path contains '/work-from-home-internship/' or '/wfh-jobs/'
      - Card has a label/badge with text "Work from Home"
      - Card location text is "Work From Home"
      - Card has a label with "In Office"
    """
    source_work_mode = None

    # 1. Check the URL path — most reliable signal
    path_lower = url_path.lower()
    if "work-from-home" in path_lower or "wfh" in path_lower:
        return "Remote", "Work from Home"

    # 2. Check card for explicit work-mode labels / badges
    # Internshala renders a "Work from Home" label inside the card
    label_els = card.select(
        ".work_from_home, .location_type, .wfh_label, "
        "[class*='work_from'], [class*='location_type']"
    )
    for el in label_els:
        text = el.get_text(strip=True).lower()
        if "work from home" in text or "remote" in text or "wfh" in text:
            return "Remote", el.get_text(strip=True)
        if "in office" in text or "on-site" in text or "onsite" in text:
            return "OnSite", el.get_text(strip=True)
        if "hybrid" in text:
            return "Hybrid", el.get_text(strip=True)

    # 3. Check location text — Internshala sometimes puts "Work From Home" there
    location_el = card.select_one(".location-link, .location_link, [id*='location']")
    if location_el:
        loc_text = location_el.get_text(strip=True).lower()
        if "work from home" in loc_text or "wfh" in loc_text or "remote" in loc_text:
            return "Remote", location_el.get_text(strip=True)
        if "in office" in loc_text:
            return "OnSite", location_el.get_text(strip=True)

    return None, None


def extract_location_from_url(url_slug: str) -> str | None:
    """
    Extract city from Internshala URL slug as a reliable fallback.
    e.g. 'digital-marketing-internship-in-bangalore-at-company-123' → 'Bangalore'
    e.g. 'work-from-home-python-internship-at-company-123' → None (WFH, not a city)
    """
    import re
    slug = url_slug.lower()
    # Work-from-home slugs don't have a city
    if "work-from-home" in slug or "wfh" in slug:
        return None
    # Match '-in-<city>-at-' pattern
    match = re.search(r'-in-([a-z][a-z\-]+?)-at-', slug)
    if match:
        city = match.group(1).replace('-', ' ').title()
        return city
    return None


# ─── Parsing ───────────────────────────────────────────────────────────────────
def parse_internship_card(card) -> dict | None:
    """
    Extract internship data from a single BS4 card element.
    Returns None if required fields are missing.

    NOTE: Internshala updated their HTML in 2024/2025. Updated selectors:
      - title:    .job-internship-name a  |  .profile a  |  .internship-heading a
      - company:  .company-name a  |  .company_name  |  .internship_info .company_name
      - location: .internship_item_location  |  .row-1-item.locations  |  URL slug fallback
      - stipend:  .item_body.stipend_container  |  .stipend  |  .stipend_salary
      - duration: .item_body.duration  |  .item_body.duration_container
      - link:     a[href*='/internship/detail/']
    """
    try:
        # ── Title ──
        title_el = card.select_one(
            ".job-internship-name a, .profile a, "
            ".internship-heading a, h3.job-internship-name a, "
            "a.job-title-href"
        )

        # ── Company ──
        company_el = card.select_one(
            ".company-name a, .company_name, "
            ".internship_info .company_name, "
            "p.company-name"
        )

        # ── Location — updated to new class names ──
        location_el = card.select_one(
            ".internship_item_location, "
            ".row-1-item.locations, "
            ".locations, "
            ".location-link, .location_link, "
            "[id*='location_']"
        )

        # ── Stipend ──
        stipend_el = card.select_one(
            ".item_body.stipend_container, "
            ".stipend_container, "
            ".stipend, .stipend_salary, "
            ".item_body span.stipend"
        )

        # ── Duration ──
        duration_el = card.select_one(
            ".item_body.duration, "
            ".duration_container, "
            ".item_body span.duration"
        )

        # ── Apply By (deadline) ──
        # Internshala shows "Apply By" as a date string e.g. "16 Aug' 26"
        # It appears inside .apply_by, .closing_date, or as a label+value pair
        deadline_el = card.select_one(
            ".apply_by, .closing_date, "
            "[class*='apply_by'], [class*='closing_date'], "
            ".item_body.apply_by"
        )
        # Fallback: scan all .other_detail_item or .row-1-item for "Apply By" label
        if not deadline_el:
            for detail in card.select(".other_detail_item, .row-1-item, .internship_other_details_container span"):
                if "apply by" in detail.get_text(strip=True).lower():
                    deadline_el = detail
                    break

        # ── Apply link ──
        link_el = card.select_one("a[href*='/internship/detail/'], a.job-title-href")

        if not title_el or not link_el:
            return None

        relative_url = link_el.get("href", "")
        apply_url = urljoin(BASE_URL, relative_url) if relative_url else None
        if not apply_url:
            return None

        # ── Resolve location: card element first, then URL slug fallback ──
        location = None
        location_raw = ""
        if location_el:
            location_raw = location_el.get_text(strip=True)
            loc_lower = location_raw.lower()
            # Skip "Work From Home" as a location — it's a work mode, not a city
            if location_raw and "work from home" not in loc_lower:
                location = location_raw
        if not location:
            location = extract_location_from_url(relative_url)

        work_mode, source_work_mode = normalize_internshala_work_mode(card, relative_url)

        # ── Override work mode if location string embeds it ──────────────────
        # Internshala sometimes puts "Chennai(Hybrid)" or "Delhi(In Office)" in location.
        # Extract and strip the work-mode tag so location stays clean.
        if location:
            import re as _re
            tag_match = _re.search(r'\(([^)]+)\)\s*$', location)
            if tag_match:
                tag = tag_match.group(1).strip().lower()
                if tag in ('hybrid',):
                    work_mode = 'Hybrid'
                    source_work_mode = tag_match.group(1).strip()
                elif tag in ('in office', 'in-office', 'onsite', 'on-site'):
                    work_mode = 'OnSite'
                    source_work_mode = tag_match.group(1).strip()
                elif tag in ('remote', 'wfh', 'work from home'):
                    work_mode = 'Remote'
                    source_work_mode = tag_match.group(1).strip()
                # Strip the tag from location so we don't show "Chennai(Hybrid)"
                location = _re.sub(r'\s*\([^)]+\)\s*$', '', location).strip()

        # Detect closed listings.
        # Internshala search results should only show open listings, but
        # some cards may still carry a "closed" banner.
        # Strategy: check multiple signals — CSS class, text anywhere in card.
        closed_el = card.select_one(
            ".closed_internship_msg, .application_closed, "
            ".closed_banner, .deadline_passed, "
            "[class*='closed'], [class*='application_closed'], "
            "[class*='deadline_passed'], [class*='expired']"
        )
        closed_text = closed_el.get_text(strip=True).lower() if closed_el else ""

        # Also check the full card text for definitive closed signals
        card_text = card.get_text(separator=" ", strip=True).lower()
        closed_keywords = [
            "applications closed",
            "application closed",
            "deadline over",
            "registrations closed",
        ]
        text_says_closed = any(kw in card_text for kw in closed_keywords)

        is_active = (
            "closed" not in closed_text
            and "deadline over" not in closed_text
            and not text_says_closed
        )

        # ── Parse deadline string into a date ──
        deadline = None
        if deadline_el:
            import re as _re2
            raw_deadline = deadline_el.get_text(strip=True)
            # Remove "Apply By" label text if embedded e.g. "Apply By16 Aug' 26"
            raw_deadline = _re2.sub(r'(?i)apply\s*by\s*', '', raw_deadline).strip()
            # Parse formats: "16 Aug' 26", "16 Aug '26", "16 Aug 2026"
            raw_deadline = raw_deadline.replace("'", "").strip()
            for fmt in ("%d %b %y", "%d %b %Y", "%d %B %Y", "%d %B %y"):
                try:
                    from datetime import datetime as _dt
                    deadline = _dt.strptime(raw_deadline, fmt)
                    break
                except ValueError:
                    continue

        return {
            "title": title_el.get_text(strip=True),
            "company": company_el.get_text(strip=True) if company_el else "Unknown",
            "location": location,
            "stipend": stipend_el.get_text(strip=True) if stipend_el else None,
            "duration": duration_el.get_text(strip=True) if duration_el else None,
            "apply_url": apply_url,
            # sourceId derived from the URL slug (stable across re-scrapes)
            "source_id": relative_url.rstrip("/").split("/")[-1],
            "work_mode": work_mode,
            "source_work_mode": source_work_mode,
            "is_active": is_active,
            "deadline": deadline,
        }
    except Exception as exc:
        log.warning("Error parsing card: %s", exc)
        return None


def scrape_page(url: str) -> list[dict]:
    """Scrape one page and return a list of parsed internship dicts."""
    if not can_fetch(url):
        log.warning("robots.txt disallows: %s", url)
        return []

    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except requests.RequestException as exc:
        log.error("Request failed for %s: %s", url, exc)
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    # Internshala uses `.individual_internship` as the card class (as of 2024)
    cards = soup.select(".individual_internship")
    if not cards:
        log.warning("No internship cards found at %s — HTML structure may have changed", url)
        return []

    results = []
    for card in cards:
        parsed = parse_internship_card(card)
        if parsed:
            results.append(parsed)

    return results


# ─── Database upsert ───────────────────────────────────────────────────────────
def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(database_url)


def upsert_internships(internships: list[dict]) -> tuple[int, int]:
    """
    Upsert a list of internship dicts into the Internship table.
    Returns (upserted_count, error_count).
    """
    if not internships:
        return 0, 0

    upserted = 0
    errors = 0

    with get_db_connection() as conn, conn.cursor() as cur:
        for item in internships:
            try:
                cur.execute(
                    """
                    INSERT INTO "Internship"
                        (id, title, company, location, stipend, duration,
                         "applyUrl", source, "sourceId",
                         "workMode", "sourceWorkMode", "isActive", "scrapedAt", deadline)
                    VALUES
                        (gen_random_uuid(), %s, %s, %s, %s, %s,
                         %s, 'Internshala', %s,
                         %s, %s, %s, now(), %s)
                    ON CONFLICT ("applyUrl")
                    DO UPDATE SET
                        title           = EXCLUDED.title,
                        company         = EXCLUDED.company,
                        location        = EXCLUDED.location,
                        stipend         = EXCLUDED.stipend,
                        duration        = EXCLUDED.duration,
                        "workMode"      = EXCLUDED."workMode",
                        "sourceWorkMode" = EXCLUDED."sourceWorkMode",
                        "isActive"      = EXCLUDED."isActive",
                        deadline        = EXCLUDED.deadline,
                        "scrapedAt"     = now()
                    """,
                    (
                        item["title"],
                        item["company"],
                        item.get("location"),
                        item.get("stipend"),
                        item.get("duration"),
                        item["apply_url"],
                        item.get("source_id"),
                        item.get("work_mode"),
                        item.get("source_work_mode"),
                        item.get("is_active", True),
                        item.get("deadline"),
                    ),
                )
                upserted += 1
            except Exception as exc:
                log.error("DB error for %s: %s", item.get("apply_url"), exc)
                errors += 1
                conn.rollback()

        conn.commit()

    return upserted, errors


# ─── Main runner ───────────────────────────────────────────────────────────────
def run_internshala_scrape():
    log.info("Starting Internshala scrape...")
    all_internships = []

    for path in SEARCH_PATHS:
        for page_num in range(1, MAX_PAGES + 1):
            # Internshala paginates with /page-N/ suffix
            url = urljoin(BASE_URL, f"{path}page-{page_num}/")
            log.info("Scraping: %s", url)

            internships = scrape_page(url)
            if not internships:
                log.info("No results at %s — stopping pagination for this path.", url)
                break

            all_internships.extend(internships)
            log.info("Found %d listings so far.", len(all_internships))

            time.sleep(REQUEST_DELAY_SEC)

    # Deduplicate in-memory by apply_url before hitting the DB
    seen_urls = set()
    deduped = []
    for item in all_internships:
        if item["apply_url"] not in seen_urls:
            seen_urls.add(item["apply_url"])
            deduped.append(item)

    log.info("Scraped %d unique listings. Upserting to DB...", len(deduped))
    upserted, errors = upsert_internships(deduped)
    log.info("Done. Upserted: %d, Errors: %d", upserted, errors)


if __name__ == "__main__":
    run_internshala_scrape()
