#!/usr/bin/env python3
"""Parse the saved Arena text leaderboard HTML into a clean table.

The saved page already contains the rendered leaderboard table, so this script
extracts the visible rows from disk and writes CSV / JSON artifacts that are
easy to join with the rest of EduArena's quantitative datasets.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_HTML_PATH = SCRIPT_DIR / "LLM Leaderboard - Best Text & Chat AI Models Compared.html"
DEFAULT_CSV_PATH = SCRIPT_DIR / "lmarena_table.csv"
DEFAULT_JSON_PATH = SCRIPT_DIR / "lmarena_table.json"
DEFAULT_SOURCE_URL = "https://arena.ai/leaderboard/text"

OUTPUT_COLUMNS = [
    "rank",
    "rank_spread_lower",
    "rank_spread_upper",
    "rank_spread",
    "model",
    "provider",
    "license",
    "score",
    "score_ci",
    "score_note",
    "votes",
    "price_input_per_1m",
    "price_output_per_1m",
    "price_display",
    "context_window",
    "model_url",
]

SEPARATOR_TAGS = {"a", "br", "div", "li", "p", "span"}


@dataclass
class Cell:
    text: str = ""
    links: list[str] = field(default_factory=list)


class LeaderboardTableParser(HTMLParser):
    """Extract the first leaderboard table while preserving line breaks and links."""

    def __init__(self) -> None:
        super().__init__()
        self._in_table = False
        self._table_depth = 0
        self._current_row: list[Cell] | None = None
        self._current_cell: Cell | None = None
        self._current_cell_tag: str | None = None
        self._cell_text_parts: list[str] = []
        self.rows: list[list[Cell]] = []

    def _push_separator(self) -> None:
        if self._current_cell is not None:
            self._cell_text_parts.append("\n")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)

        if tag == "table":
            if not self._in_table:
                self._in_table = True
                self._table_depth = 1
                return
            self._table_depth += 1
            return

        if not self._in_table:
            return

        if tag == "tr":
            self._current_row = []
            return

        if tag in {"th", "td"}:
            self._current_cell = Cell()
            self._current_cell_tag = tag
            self._cell_text_parts = []
            return

        if tag in SEPARATOR_TAGS:
            self._push_separator()

        if tag == "a" and self._current_cell is not None:
            href = attrs_dict.get("href")
            if href:
                self._current_cell.links.append(href)

    def handle_data(self, data: str) -> None:
        if self._current_cell is not None:
            self._cell_text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self._in_table:
            return

        if tag in SEPARATOR_TAGS:
            self._push_separator()

        if tag == "table":
            self._table_depth -= 1
            if self._table_depth == 0:
                self._in_table = False
            return

        if tag == self._current_cell_tag and self._current_cell is not None and self._current_row is not None:
            raw_text = "".join(self._cell_text_parts)
            lines = [normalize_whitespace(line) for line in raw_text.splitlines()]
            self._current_cell.text = "\n".join(line for line in lines if line)
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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parse a saved Arena text leaderboard HTML file."
    )
    parser.add_argument(
        "--html",
        dest="html_path",
        default=str(DEFAULT_HTML_PATH),
        help="Path to the saved leaderboard HTML file.",
    )
    parser.add_argument(
        "--csv",
        dest="csv_path",
        default=str(DEFAULT_CSV_PATH),
        help="Destination CSV path.",
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        default=str(DEFAULT_JSON_PATH),
        help="Destination JSON path.",
    )
    parser.add_argument(
        "--source-url",
        default=DEFAULT_SOURCE_URL,
        help="Canonical source URL used to resolve relative links.",
    )
    parser.add_argument(
        "--preview",
        type=int,
        default=5,
        help="Number of parsed rows to print as a quick preview.",
    )
    return parser


def parse_rank_spread(value: str) -> tuple[str, str, str]:
    parts = [part for part in value.splitlines() if part]
    if len(parts) >= 2 and all(re.fullmatch(r"\d+", part) for part in parts[:2]):
        lower, upper = parts[0], parts[1]
        return lower, upper, f"{lower}-{upper}"

    numbers = re.findall(r"\d+", value)
    if len(numbers) >= 2:
        lower, upper = numbers[0], numbers[1]
        return lower, upper, f"{lower}-{upper}"

    if numbers:
        return numbers[0], numbers[0], numbers[0]

    cleaned = normalize_whitespace(value)
    return "", "", cleaned


def parse_model_cell(value: str) -> tuple[str, str, str]:
    lines = [line for line in value.splitlines() if line]
    provider = ""
    license_name = ""

    if lines and "·" in lines[-1]:
        provider_part, _, license_part = lines[-1].partition("·")
        provider = normalize_whitespace(provider_part)
        license_name = normalize_whitespace(license_part)
        lines = lines[:-1]

    if provider and lines and normalize_whitespace(lines[0]) == provider:
        lines = lines[1:]

    model = lines[-1] if lines else ""
    return model, provider, license_name


def parse_score_cell(value: str) -> tuple[str, str, str]:
    lines = [line for line in value.splitlines() if line]
    score = lines[0] if lines else ""
    score_ci = ""
    note = ""

    for line in lines[1:]:
        if line.startswith("±"):
            score_ci = line
        else:
            note = f"{note}; {line}" if note else line

    return score, score_ci, note


def parse_price_cell(value: str) -> tuple[str, str, str]:
    display = normalize_whitespace(value)
    if not display or display.upper() == "N/A":
        return "", "", display or "N/A"

    parts = [normalize_whitespace(part) for part in display.split("/")]
    if len(parts) >= 2:
        return parts[0], parts[1], display
    return display, "", display


def parse_summary_metadata(html: str) -> dict[str, str]:
    metadata: dict[str, str] = {}

    title_match = re.search(r">((?:Text|Code|Vision|Search|Document) Arena)<", html)
    if title_match:
        metadata["leaderboard_name"] = title_match.group(1)

    updated_match = re.search(r"([A-Z][a-z]{2} \d{1,2}, \d{4})", html)
    if updated_match:
        metadata["updated_at"] = updated_match.group(1)

    total_votes_match = re.search(r"([0-9][0-9,]*) votes", html)
    if total_votes_match:
        metadata["total_votes"] = total_votes_match.group(1).replace(",", "")

    total_models_match = re.search(r"([0-9][0-9,]*) models", html)
    if total_models_match:
        metadata["total_models"] = total_models_match.group(1).replace(",", "")

    return metadata


def parse_leaderboard_rows(html: str, page_url: str) -> list[dict[str, str]]:
    parser = LeaderboardTableParser()
    parser.feed(html)

    if len(parser.rows) < 2:
        raise ValueError("Could not find a leaderboard table with header and data rows.")

    header = [cell.text for cell in parser.rows[0]]
    expected_header = ["Rank", "Rank Spread", "Model", "Score", "Votes", "Price $/M", "Context"]
    if header[: len(expected_header)] != expected_header:
        raise ValueError(f"Unexpected leaderboard header: {header}")

    records: list[dict[str, str]] = []
    for row in parser.rows[1:]:
        if len(row) < len(expected_header):
            continue

        rank = normalize_whitespace(row[0].text)
        rank_spread_lower, rank_spread_upper, rank_spread = parse_rank_spread(row[1].text)
        model, provider, license_name = parse_model_cell(row[2].text)
        score, score_ci, score_note = parse_score_cell(row[3].text)
        votes = normalize_whitespace(row[4].text).replace(",", "")
        price_input, price_output, price_display = parse_price_cell(row[5].text)
        context_window = normalize_whitespace(row[6].text)
        model_url = urljoin(page_url, row[2].links[0]) if row[2].links else ""

        records.append(
            {
                "rank": rank,
                "rank_spread_lower": rank_spread_lower,
                "rank_spread_upper": rank_spread_upper,
                "rank_spread": rank_spread,
                "model": model,
                "provider": provider,
                "license": license_name,
                "score": score,
                "score_ci": score_ci,
                "score_note": score_note,
                "votes": votes,
                "price_input_per_1m": price_input,
                "price_output_per_1m": price_output,
                "price_display": price_display,
                "context_window": context_window,
                "model_url": model_url,
            }
        )

    return records


def write_csv(records: list[dict[str, str]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(records)


def write_json(
    records: list[dict[str, str]],
    source_url: str,
    source_html: Path,
    metadata: dict[str, str],
    path: Path,
) -> None:
    payload = {
        "source_url": source_url,
        "source_html": str(source_html),
        "record_count": len(records),
        "columns": OUTPUT_COLUMNS,
        "metadata": metadata,
        "records": records,
    }
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def print_preview(records: list[dict[str, str]], limit: int) -> None:
    for record in records[: max(limit, 0)]:
        row = " | ".join(
            [
                record["rank"],
                record["rank_spread"],
                record["model"],
                record["provider"],
                record["score"],
                record["votes"],
                record["price_display"],
                record["context_window"],
            ]
        )
        print(row)


def main() -> int:
    args = build_parser().parse_args()
    html_path = Path(args.html_path).expanduser().resolve()
    csv_path = Path(args.csv_path).expanduser().resolve()
    json_path = Path(args.json_path).expanduser().resolve()

    html = html_path.read_text(encoding="utf-8")
    metadata = parse_summary_metadata(html)
    records = parse_leaderboard_rows(html, page_url=args.source_url)

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    write_csv(records, csv_path)
    write_json(
        records,
        source_url=args.source_url,
        source_html=html_path,
        metadata=metadata,
        path=json_path,
    )

    print(f"Parsed {len(records)} leaderboard rows from {html_path}")
    print(f"Wrote CSV table to {csv_path}")
    print(f"Wrote JSON metadata to {json_path}")
    if metadata:
        summary = ", ".join(f"{key}={value}" for key, value in metadata.items())
        print(f"Summary: {summary}")
    if args.preview:
        print_preview(records, limit=args.preview)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
