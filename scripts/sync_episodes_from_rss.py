#!/usr/bin/env python3
"""
Henter Bergtatt-podcastens RSS-feed og skriver Jekyll-poster til _posts/.

Kjør fra repo-roten:
  python3 scripts/sync_episodes_from_rss.py

Miljøvariabel BERGTATT_RSS_URL overstyrer feed-URL.
"""
from __future__ import annotations

import email.utils
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEED_URL = os.environ.get(
    "BERGTATT_RSS_URL", "https://feeds.acast.com/public/shows/bergtatt"
)

ITUNES_NS = "http://www.itunes.com/dtds/podcast-1.0.dtd"
ACAST_NS = "https://schema.acast.com/1.0/"

for prefix, uri in (
    ("itunes", ITUNES_NS),
    ("acast", ACAST_NS),
):
    ET.register_namespace(prefix, uri)


def q(s: str) -> str:
    """YAML dobbeltanførsel-streng."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def strip_acast_boilerplate(html: str) -> str:
    if not html:
        return ""
    return re.sub(
        r"<hr>\s*<p[^>]*>.*?Hosted on Acast.*?</p>\s*",
        "",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ).strip()


def parse_pub_date(text: str | None) -> str | None:
    if not text:
        return None
    dt = email.utils.parsedate_to_datetime(text.strip())
    if dt is None:
        return None
    if dt.tzinfo is None:
        from datetime import timezone

        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone().date().isoformat()


def t(item: ET.Element, tag: str) -> str | None:
    el = item.find(tag)
    if el is None:
        return None
    s = (el.text or "").strip()
    return s or None


def itunes_text(item: ET.Element, local: str) -> str | None:
    el = item.find(f"{{{ITUNES_NS}}}{local}")
    if el is None:
        return None
    s = (el.text or "").strip()
    return s or None


def acast_text(item: ET.Element, local: str) -> str | None:
    el = item.find(f"{{{ACAST_NS}}}{local}")
    if el is None:
        return None
    s = (el.text or "").strip()
    return s or None


def itunes_href(item: ET.Element, local: str) -> str | None:
    el = item.find(f"{{{ITUNES_NS}}}{local}")
    if el is None:
        return None
    v = el.get("href")
    return v.strip() if v else None


def slug_from_item(item: ET.Element, guid: str) -> str:
    acast_url = (acast_text(item, "episodeUrl") or "").strip()
    if acast_url:
        base = acast_url
    else:
        link = t(item, "link") or ""
        if "/episodes/" in link:
            base = link.split("/episodes/", 1)[-1].split("?")[0].strip()
        else:
            base = guid
    base = base.lower()
    base = re.sub(r"[^a-z0-9_-]+", "-", base)
    base = re.sub(r"-+", "-", base).strip("-")
    return base or "episode"


def is_managed_post(path: Path) -> bool:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return False
    if not text.startswith("---"):
        return False
    end = text.find("\n---", 3)
    if end == -1:
        return False
    fm = text[3:end]
    return "source: acast-rss" in fm


def remove_old_generated(posts_dir: Path) -> None:
    for p in posts_dir.glob("*.md"):
        if is_managed_post(p):
            p.unlink()


def build_front_matter(
    *,
    title: str,
    date_iso: str,
    slug: str,
    guid: str,
    episode_number: str | None,
    duration: str | None,
    audio_url: str | None,
    image: str | None,
    acast_url: str | None,
    episode_type: str | None,
) -> str:
    lines = [
        "---",
        "layout: episode",
        f"title: {q(title)}",
        f"date: {date_iso} 12:00:00 +0000",
        f"permalink: /episodes/{slug}/",
        "source: acast-rss",
        f"rss_guid: {q(guid)}",
    ]
    if episode_number:
        lines.append(f"episode_number: {episode_number}")
    if duration:
        lines.append(f"duration: {q(duration)}")
    if audio_url:
        lines.append(f"audio_url: {q(audio_url)}")
    if image:
        lines.append(f"image: {q(image)}")
    if acast_url:
        lines.append(f"acast_url: {q(acast_url)}")
    if episode_type:
        lines.append(f"episode_type: {q(episode_type)}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    posts_dir = root / "_posts"
    posts_dir.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "bergtatt-site-sync/1.0 (+https://bergtattpodcast.no)"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()

    tree = ET.fromstring(raw)
    channel = tree.find("channel")
    if channel is None:
        print("Fant ikke <channel> i feeden.", file=sys.stderr)
        return 1

    to_write: list[tuple[Path, str]] = []
    for item in channel.findall("item"):
        title = t(item, "title") or "Uten tittel"
        guid = t(item, "guid") or ""
        pub = parse_pub_date(t(item, "pubDate"))
        if not pub:
            print(f"Hopper over (mangler pubDate): {title!r}", file=sys.stderr)
            continue

        slug = slug_from_item(item, guid)
        duration = itunes_text(item, "duration")
        episode_number = itunes_text(item, "episode")
        episode_type = itunes_text(item, "episodeType")
        image = itunes_href(item, "image")
        enc = item.find("enclosure")
        audio_url = enc.get("url") if enc is not None else None
        acast_url = t(item, "link")
        desc = t(item, "description") or itunes_text(item, "summary")
        body = strip_acast_boilerplate(desc or "")

        fm = build_front_matter(
            title=title,
            date_iso=pub,
            slug=slug,
            guid=guid,
            episode_number=episode_number,
            duration=duration,
            audio_url=audio_url,
            image=image,
            acast_url=acast_url,
            episode_type=episode_type,
        )

        path = posts_dir / f"{pub}-{slug}.md"
        to_write.append((path, fm + "\n" + body + "\n"))

    remove_old_generated(posts_dir)
    for path, content in to_write:
        path.write_text(content, encoding="utf-8")

    count = len(to_write)
    print(f"Skrev {count} episoder til {posts_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
