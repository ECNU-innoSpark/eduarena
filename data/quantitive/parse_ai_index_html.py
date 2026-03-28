#!/usr/bin/env python3
"""Parse the saved Artificial Analysis leaderboard HTML into a clean table.

This script is the local-file counterpart to ``crawl_llm_metadata.py``:
it reads the saved leaderboard page from disk, extracts the rows shown in the
Artificial Analysis table, normalizes the column names, and writes CSV / JSON
artifacts that are easier to join with the rest of EduArena's quantitative
datasets.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

from crawl_llm_metadata import parse_leaderboard_rows

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_HTML_PATH = SCRIPT_DIR / "LLM Performance Leaderboard _ Artificial Analysis.html"
DEFAULT_CSV_PATH = SCRIPT_DIR / "ai_index_table.csv"
DEFAULT_JSON_PATH = SCRIPT_DIR / "ai_index_table.json"
DEFAULT_SOURCE_URL = "https://artificialanalysis.ai/embed/llm-performance-leaderboard"
DEFAULT_MAIN_EXPERIMENTS_PATH = SCRIPT_DIR / "main_experiments.csv"

COLUMN_MAP = {
    "rank": "rank",
    "apiprovider": "api_provider",
    "model": "model",
    "contextwindow": "context_window",
    "license": "license",
    "artificialanalysisintelligence_index": "artificial_analysis_intelligence_index",
    "blendedusd_1m_tokens": "blended_usd_per_1m_tokens",
    "mediantokens_s": "median_tokens_per_s",
    "medianfirst_chunk_s": "median_first_chunk_s",
    "totalresponse_s": "total_response_s",
    "reasoningtime_s": "reasoning_time_s",
    "model_url": "model_url",
    "providers_url": "providers_url",
}

OUTPUT_COLUMNS = [
    "rank",
    "api_provider",
    "model",
    "context_window",
    "license",
    "artificial_analysis_intelligence_index",
    "blended_usd_per_1m_tokens",
    "median_tokens_per_s",
    "median_first_chunk_s",
    "total_response_s",
    "reasoning_time_s",
    "model_url",
    "providers_url",
]

MERGE_COLUMNS = [
    "ai_index_match_status",
    "ai_index_match_type",
    "ai_index_model",
    "ai_index_provider",
    "ai_index_rank",
    "ai_index_score",
    "ai_index_price",
    "ai_index_speed",
    "ai_index_latency",
    "ai_index_total_response",
    "ai_index_reasoning_time",
    "ai_index_context_window",
    "ai_index_license",
    "ai_index_model_url",
    "ai_index_providers_url",
]

PROVIDER_PREFERENCE = [
    "OpenAI",
    "Anthropic",
    "Google (AI Studio)",
    "Google Vertex",
    "Google",
    "xAI",
    "DeepSeek",
]

# These are explicit name inferences for rows already present in main_experiments.csv.
MANUAL_MODEL_ALIASES = {
    "gpt5": {
        "model": "GPT-5.4 (xhigh)",
        "provider": "OpenAI",
        "match_type": "manual_alias",
    },
    "gemini25propreview": {
        "model": "Gemini 2.5 Pro (AI Studio)",
        "provider": "Google (AI Studio)",
        "match_type": "manual_alias",
    },
    "claudesonnet4": {
        "model": "Claude Sonnet 4.6 (max)",
        "provider": "Anthropic",
        "match_type": "manual_alias",
    },
    "grok4": {
        "model": "Grok 4.20 Beta 0309",
        "provider": "xAI",
        "match_type": "manual_alias",
    },
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parse a saved Artificial Analysis leaderboard HTML file."
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
    parser.add_argument(
        "--merge-main",
        action="store_true",
        help="Merge parsed AI Index fields into main_experiments.csv.",
    )
    parser.add_argument(
        "--main-csv",
        dest="main_csv_path",
        default=str(DEFAULT_MAIN_EXPERIMENTS_PATH),
        help="Destination path for the merged main_experiments CSV.",
    )
    return parser


def transform_records(records: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized_records: list[dict[str, str]] = []
    for record in records:
        normalized = {
            output_key: record.get(input_key, "")
            for input_key, output_key in COLUMN_MAP.items()
        }
        normalized_records.append(normalized)
    return normalized_records


def normalize_model_name(value: str) -> str:
    lowered = value.lower().strip()
    lowered = lowered.replace("&", " and ")
    lowered = lowered.replace("_", "-")
    lowered = re.sub(r"\(ai studio\)|\(vertex\)|vertex|ai studio", " ", lowered)
    lowered = re.sub(r"preview-\d{2}-\d{2}", " preview ", lowered)
    lowered = re.sub(r"beta\s+\d+", " ", lowered)
    lowered = re.sub(r"\bmax\b|\bxhigh\b|\bhigh\b|\bmedium\b|\bnano\b|\bmini\b", " ", lowered)
    lowered = re.sub(r"\([^)]*\)", " ", lowered)
    lowered = re.sub(r"[^a-z0-9]+", "", lowered)
    return lowered


def rank_value(record: dict[str, str]) -> int:
    try:
        return int(record.get("rank", "999999"))
    except ValueError:
        return 999999


def provider_priority(provider: str) -> int:
    try:
        return PROVIDER_PREFERENCE.index(provider)
    except ValueError:
        return len(PROVIDER_PREFERENCE)


def build_ai_lookups(
    records: list[dict[str, str]],
) -> tuple[dict[str, list[dict[str, str]]], dict[tuple[str, str], dict[str, str]]]:
    by_model_key: dict[str, list[dict[str, str]]] = {}
    by_model_provider: dict[tuple[str, str], dict[str, str]] = {}
    for record in records:
        model_key = normalize_model_name(record["model"])
        by_model_key.setdefault(model_key, []).append(record)
        by_model_provider[(record["model"], record["api_provider"])] = record

    for candidates in by_model_key.values():
        candidates.sort(key=lambda item: (rank_value(item), provider_priority(item["api_provider"])))

    return by_model_key, by_model_provider


def build_merge_payload(
    matched_record: dict[str, str] | None,
    match_status: str,
    match_type: str = "",
) -> list[str]:
    if matched_record is None:
        return [match_status, match_type] + [""] * (len(MERGE_COLUMNS) - 2)

    return [
        match_status,
        match_type,
        matched_record["model"],
        matched_record["api_provider"],
        matched_record["rank"],
        matched_record["artificial_analysis_intelligence_index"],
        matched_record["blended_usd_per_1m_tokens"],
        matched_record["median_tokens_per_s"],
        matched_record["median_first_chunk_s"],
        matched_record["total_response_s"],
        matched_record["reasoning_time_s"],
        matched_record["context_window"],
        matched_record["license"],
        matched_record["model_url"],
        matched_record["providers_url"],
    ]


def find_ai_match(
    model_name: str,
    by_model_key: dict[str, list[dict[str, str]]],
    by_model_provider: dict[tuple[str, str], dict[str, str]],
) -> tuple[dict[str, str] | None, str, str]:
    manual_rule = MANUAL_MODEL_ALIASES.get(normalize_model_name(model_name))
    if manual_rule is not None:
        manual_match = by_model_provider.get((manual_rule["model"], manual_rule["provider"]))
        if manual_match is not None:
            return manual_match, "matched", manual_rule["match_type"]

    exact_matches = by_model_key.get(normalize_model_name(model_name))
    if exact_matches:
        return exact_matches[0], "matched", "normalized_exact"

    return None, "unmatched", ""


def merge_main_experiments(
    main_csv_path: Path,
    ai_records: list[dict[str, str]],
) -> tuple[int, int, list[str]]:
    by_model_key, by_model_provider = build_ai_lookups(ai_records)

    with main_csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))

    if not rows:
        raise ValueError(f"{main_csv_path} is empty.")

    keep_indices = [index for index, name in enumerate(rows[0]) if name not in MERGE_COLUMNS]
    trimmed_rows = []
    for row in rows:
        padded = row + [""] * max(0, len(rows[0]) - len(row))
        trimmed_rows.append([padded[index] for index in keep_indices])

    header = trimmed_rows[0] + MERGE_COLUMNS
    merged_rows = [header]
    matched_count = 0
    unmatched_models: list[str] = []

    for row in trimmed_rows[1:]:
        padded = row + [""] * max(0, len(trimmed_rows[0]) - len(row))
        model_name = padded[0].strip()
        matched_record, match_status, match_type = find_ai_match(
            model_name,
            by_model_key=by_model_key,
            by_model_provider=by_model_provider,
        )
        if matched_record is not None:
            matched_count += 1
        else:
            unmatched_models.append(model_name)

        merged_rows.append(padded + build_merge_payload(matched_record, match_status, match_type))

    with main_csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(merged_rows)

    return matched_count, len(trimmed_rows) - 1, unmatched_models


def write_csv(records: list[dict[str, str]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(records)


def write_json(records: list[dict[str, str]], source_url: str, path: Path) -> None:
    payload = {
        "source_url": source_url,
        "record_count": len(records),
        "columns": OUTPUT_COLUMNS,
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
                record["api_provider"],
                record["model"],
                record["artificial_analysis_intelligence_index"],
                record["blended_usd_per_1m_tokens"],
                record["median_tokens_per_s"],
                record["median_first_chunk_s"],
                record["total_response_s"],
            ]
        )
        print(row)


def main() -> int:
    args = build_parser().parse_args()
    html_path = Path(args.html_path).expanduser().resolve()
    csv_path = Path(args.csv_path).expanduser().resolve()
    json_path = Path(args.json_path).expanduser().resolve()
    main_csv_path = Path(args.main_csv_path).expanduser().resolve()

    html = html_path.read_text(encoding="utf-8")
    parsed_records = parse_leaderboard_rows(html, page_url=args.source_url)
    normalized_records = transform_records(parsed_records)

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    write_csv(normalized_records, csv_path)
    write_json(normalized_records, source_url=args.source_url, path=json_path)

    print(f"Parsed {len(normalized_records)} leaderboard rows from {html_path}")
    print(f"Wrote CSV table to {csv_path}")
    print(f"Wrote JSON metadata to {json_path}")
    if args.preview:
        print_preview(normalized_records, limit=args.preview)
    if args.merge_main:
        matched_count, total_count, unmatched_models = merge_main_experiments(
            main_csv_path=main_csv_path,
            ai_records=normalized_records,
        )
        print(f"Merged AI Index fields into {main_csv_path}")
        print(f"Matched {matched_count}/{total_count} main_experiments rows")
        if unmatched_models:
            print("Unmatched models: " + ", ".join(unmatched_models))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
