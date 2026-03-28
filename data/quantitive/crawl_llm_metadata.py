#!/usr/bin/env python3
"""Download the Artificial Analysis LLM leaderboard table as CSV and JSON."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin
from urllib.request import Request, urlopen

DEFAULT_URL = "https://artificialanalysis.ai/embed/llm-performance-leaderboard"
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    )
}

HEADER_ALIASES = {
    "api provider": "api_provider",
    "model": "model",
    "context window": "context_window",
    "license": "license",
    "artificial analysis intelligence index": "artificial_analysis_intelligence_index",
    "blended usd/1m tokens": "blended_usd_per_1m_tokens",
    "median tokens/s": "median_tokens_per_s",
    "median first chunk (s)": "median_first_chunk_s",
    "total response (s)": "total_response_s",
    "reasoning time (s)": "reasoning_time_s",
    "further analysis": "further_analysis",
}


@dataclass
class Cell:
    text: str = ""
    links: list[str] = field(default_factory=list)


class LeaderboardTableParser(HTMLParser):
    """Parse the first HTML table into rows while preserving cell links."""

    def __init__(self) -> None:
        super().__init__()
        self._in_target_table = False
        self._table_depth = 0
        self._current_row: list[Cell] | None = None
        self._current_cell: Cell | None = None
        self._current_cell_tag: str | None = None
        self._cell_text_parts: list[str] = []
        self.rows: list[list[Cell]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)

        if tag == "table":
            if not self._in_target_table:
                self._in_target_table = True
                self._table_depth = 1
                return
            if self._in_target_table:
                self._table_depth += 1
                return

        if not self._in_target_table:
            return

        if tag == "tr":
            self._current_row = []
            return

        if tag in {"th", "td"}:
            self._current_cell = Cell()
            self._current_cell_tag = tag
            self._cell_text_parts = []
            return

        if tag == "a" and self._current_cell is not None:
            href = attrs_dict.get("href")
            if href:
                self._current_cell.links.append(href)

    def handle_data(self, data: str) -> None:
        if self._current_cell is not None:
            self._cell_text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self._in_target_table:
            return

        if tag == "table":
            self._table_depth -= 1
            if self._table_depth == 0:
                self._in_target_table = False
            return

        if tag == self._current_cell_tag and self._current_cell is not None and self._current_row is not None:
            self._current_cell.text = normalize_whitespace("".join(self._cell_text_parts))
            self._current_row.append(self._current_cell)
            self._current_cell = None
            self._current_cell_tag = None
            self._cell_text_parts = []
            return

        if tag == "tr" and self._current_row is not None:
            if any(cell.text or cell.links for cell in self._current_row):
                self.rows.append(self._current_row)
            self._current_row = None


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_header(value: str) -> str:
    lowered = normalize_whitespace(value).lower()
    if lowered in HEADER_ALIASES:
        return HEADER_ALIASES[lowered]
    slug = re.sub(r"[^a-z0-9]+", "_", lowered).strip("_")
    return slug or "column"


def dedupe_headers(headers: Iterable[str]) -> list[str]:
    seen: dict[str, int] = {}
    result: list[str] = []
    for header in headers:
        count = seen.get(header, 0)
        seen[header] = count + 1
        result.append(header if count == 0 else f"{header}_{count + 1}")
    return result


def fetch_html(url: str, timeout_seconds: int) -> str:
    request = Request(url, headers=DEFAULT_HEADERS)
    with urlopen(request, timeout=timeout_seconds) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def parse_leaderboard_rows(html: str, page_url: str) -> list[dict[str, str]]:
    parser = LeaderboardTableParser()
    parser.feed(html)

    if len(parser.rows) < 2:
        raise ValueError("Could not find a leaderboard table with header and data rows.")

    header_row = parser.rows[1]
    headers = dedupe_headers(normalize_header(cell.text) for cell in header_row)
    records: list[dict[str, str]] = []

    for index, row in enumerate(parser.rows[2:], start=1):
        values = [cell.text for cell in row]
        if not any(values):
            continue

        padded_values = values + [""] * max(0, len(headers) - len(values))
        record = dict(zip(headers, padded_values[: len(headers)], strict=False))
        record["rank"] = str(index)

        if row:
            last_cell = row[-1]
            if last_cell.links:
                if len(last_cell.links) >= 1:
                    record["model_url"] = urljoin(page_url, last_cell.links[0])
                if len(last_cell.links) >= 2:
                    record["providers_url"] = urljoin(page_url, last_cell.links[1])

        records.append(record)

    return records


def write_csv(records: list[dict[str, str]], path: Path) -> None:
    if not records:
        raise ValueError("No records were parsed.")

    fieldnames = list(records[0].keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def write_json(records: list[dict[str, str]], source_url: str, path: Path) -> None:
    payload = {
        "source_url": source_url,
        "record_count": len(records),
        "records": records,
    }
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def build_parser() -> argparse.ArgumentParser:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Download the Artificial Analysis LLM leaderboard table."
    )
    parser.add_argument("--url", default=DEFAULT_URL, help="Leaderboard page URL.")
    parser.add_argument(
        "--csv",
        dest="csv_path",
        default=str(script_dir / "llm_metadata.csv"),
        help="Destination CSV path.",
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        default=str(script_dir / "llm_metadata.json"),
        help="Destination JSON path.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help="HTTP timeout in seconds.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    csv_path = Path(args.csv_path).expanduser().resolve()
    json_path = Path(args.json_path).expanduser().resolve()

    try:
        html = fetch_html(args.url, timeout_seconds=args.timeout)
        records = parse_leaderboard_rows(html, page_url=args.url)
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        write_csv(records, csv_path)
        write_json(records, source_url=args.url, path=json_path)
    except Exception as exc:  # pragma: no cover - CLI error path
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Wrote {len(records)} rows to {csv_path}")
    print(f"Wrote JSON metadata to {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
