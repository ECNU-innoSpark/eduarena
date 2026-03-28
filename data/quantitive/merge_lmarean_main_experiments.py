#!/usr/bin/env python3
"""Merge LM Arena leaderboard fields into main_experiments.csv."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from model_names import (
    mapping,
    name_version1_file,
    name_version1_name_column,
    name_version2_column,
    name_version2_file,
)

MERGE_COLUMNS = [
    "lmarena_match_status",
    "lmarena_match_type",
    "lmarena_join_key",
    "lmarena_model",
    "lmarena_provider",
    "lmarena_rank",
    "lmarena_rank_spread",
    "lmarena_score",
    "lmarena_score_ci",
    "lmarena_score_note",
    "lmarena_votes",
    "lmarena_price",
    "lmarena_price_input_per_1m",
    "lmarena_price_output_per_1m",
    "lmarena_context_window",
    "lmarena_license",
    "lmarena_model_url",
]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Merge LM Arena leaderboard data into main_experiments.csv."
    )
    parser.add_argument(
        "--main-csv",
        default=name_version1_file,
        help="Path to the main experiments CSV to update.",
    )
    parser.add_argument(
        "--lmarena-csv",
        default=name_version2_file,
        help="Path to the LM Arena CSV used as the lookup table.",
    )
    parser.add_argument(
        "--name-column",
        default=name_version1_name_column,
        help="Column in the main experiments CSV containing the display model name.",
    )
    parser.add_argument(
        "--lookup-column",
        default=name_version2_column,
        help="Column in the LM Arena CSV containing the canonical model id.",
    )
    return parser


def load_lmarena_records(csv_path: Path, lookup_column: str) -> dict[str, dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if not rows:
        raise ValueError(f"{csv_path} is empty.")

    by_key: dict[str, dict[str, str]] = {}
    for row in rows:
        key = row.get(lookup_column, "").strip()
        if key:
            by_key[key] = row
    return by_key


def build_merge_payload(
    matched_record: dict[str, str] | None,
    match_status: str,
    match_type: str,
    join_key: str,
) -> list[str]:
    if matched_record is None:
        return [match_status, match_type, join_key] + [""] * (len(MERGE_COLUMNS) - 3)

    return [
        match_status,
        match_type,
        join_key,
        matched_record.get("model", ""),
        matched_record.get("provider", ""),
        matched_record.get("rank", ""),
        matched_record.get("rank_spread", ""),
        matched_record.get("score", ""),
        matched_record.get("score_ci", ""),
        matched_record.get("score_note", ""),
        matched_record.get("votes", ""),
        matched_record.get("price_display", ""),
        matched_record.get("price_input_per_1m", ""),
        matched_record.get("price_output_per_1m", ""),
        matched_record.get("context_window", ""),
        matched_record.get("license", ""),
        matched_record.get("model_url", ""),
    ]


def find_match(
    model_name: str,
    records_by_key: dict[str, dict[str, str]],
) -> tuple[dict[str, str] | None, str, str, str]:
    mapped_name = mapping.get(model_name, "").strip()
    if mapped_name:
        matched_record = records_by_key.get(mapped_name)
        if matched_record is not None:
            return matched_record, "matched", "mapping_table", mapped_name
        return None, "unmatched", "mapping_missing_in_lookup", mapped_name

    direct_match = records_by_key.get(model_name)
    if direct_match is not None:
        return direct_match, "matched", "direct_exact", model_name

    match_type = "mapping_empty" if model_name in mapping else "not_in_mapping"
    return None, "unmatched", match_type, mapped_name


def merge_main_experiments(
    main_csv_path: Path,
    name_column: str,
    records_by_key: dict[str, dict[str, str]],
) -> tuple[int, int, list[str]]:
    with main_csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))

    if not rows:
        raise ValueError(f"{main_csv_path} is empty.")

    header = rows[0]
    if name_column not in header:
        raise ValueError(f"Column {name_column!r} not found in {main_csv_path}.")

    keep_indices = [index for index, column in enumerate(header) if column not in MERGE_COLUMNS]

    trimmed_rows: list[list[str]] = []
    for row in rows:
        padded = row + [""] * max(0, len(header) - len(row))
        trimmed_rows.append([padded[index] for index in keep_indices])

    trimmed_header = trimmed_rows[0]
    trimmed_name_index = trimmed_header.index(name_column)
    merged_header = trimmed_header + MERGE_COLUMNS
    merged_rows = [merged_header]
    matched_count = 0
    unmatched_models: list[str] = []

    for row in trimmed_rows[1:]:
        model_name = row[trimmed_name_index].strip() if trimmed_name_index < len(row) else ""
        matched_record, match_status, match_type, join_key = find_match(
            model_name=model_name,
            records_by_key=records_by_key,
        )
        if matched_record is not None:
            matched_count += 1
        else:
            unmatched_models.append(model_name)
        merged_rows.append(row + build_merge_payload(matched_record, match_status, match_type, join_key))

    with main_csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(merged_rows)

    return matched_count, len(trimmed_rows) - 1, unmatched_models


def main() -> int:
    args = build_parser().parse_args()
    main_csv_path = Path(args.main_csv).expanduser().resolve()
    lmarena_csv_path = Path(args.lmarena_csv).expanduser().resolve()
    records_by_key = load_lmarena_records(lmarena_csv_path, lookup_column=args.lookup_column)
    matched_count, total_count, unmatched_models = merge_main_experiments(
        main_csv_path=main_csv_path,
        name_column=args.name_column,
        records_by_key=records_by_key,
    )

    print(f"Merged LM Arena fields into {main_csv_path}")
    print(f"Matched {matched_count}/{total_count} main_experiments rows")
    if unmatched_models:
        print("Unmatched models: " + ", ".join(unmatched_models))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
