#!/usr/bin/env python3
"""Aggregate pairwise rating snapshots and merge the stats into main_experiments.csv."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RATING_FOLDER = Path(
    "/Users/l/klee_code/git_repos/eduarena/data/qualitative/message_pariwise_ratings"
)
MAIN_CSV = Path("/Users/l/klee_code/git_repos/eduarena/data/quantitive/main_experiments.csv")
SUMMARY_CSV = Path(
    "/Users/l/klee_code/git_repos/eduarena/data/quantitive/pairwise_ratings_summary.csv"
)

VALID_WINNERS = {"a", "b", "tie", "both_bad"}

# These aliases come from the storage folder names used in pairwise review snapshots.
PAIRWISE_MODEL_ALIASES = {
    "qz__glm-5": "glm-5",
    "qz__Kimi-K25": "Kimi-K25",
    "qz__qwen3.5-397b": "qwen3.5-397b",
}

MERGE_COLUMNS = [
    "pairwise_match_status",
    "pairwise_match_type",
    "pairwise_join_key",
    "pairwise_model",
    "pairwise_raw_model",
    "pairwise_battles_seen",
    "pairwise_battles_finished",
    "pairwise_battles_won",
    "pairwise_battles_lost",
    "pairwise_ties",
    "pairwise_both_bad",
    "pairwise_win_rate",
    "pairwise_decisive_win_rate",
    "pairwise_non_loss_rate",
]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parse pairwise rating snapshots and merge model stats into main_experiments.csv."
    )
    parser.add_argument(
        "--ratings-dir",
        default=RATING_FOLDER,
        type=Path,
        help="Folder containing saved pairwise rating JSON snapshots.",
    )
    parser.add_argument(
        "--main-csv",
        default=MAIN_CSV,
        type=Path,
        help="Main experiments CSV to update in place.",
    )
    parser.add_argument(
        "--summary-csv",
        default=SUMMARY_CSV,
        type=Path,
        help="Output CSV containing only the aggregated pairwise stats.",
    )
    parser.add_argument(
        "--name-column",
        default="模型名",
        help="Display-name column in the main CSV.",
    )
    parser.add_argument(
        "--join-column",
        default="lmarena_join_key",
        help="Canonical join-key column in the main CSV.",
    )
    return parser


def parse_time(value: str | None) -> float:
    if not isinstance(value, str) or not value.strip():
        return 0
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0


def normalize_model_key(raw_model: str) -> tuple[str, str]:
    raw_model = str(raw_model or "").strip()
    return raw_model, PAIRWISE_MODEL_ALIASES.get(raw_model, raw_model.removeprefix("qz__"))


def extract_candidate_model(candidate_file: str) -> tuple[str, str]:
    parts = [part for part in str(candidate_file or "").replace("\\", "/").split("/") if part]
    raw_model = parts[-2] if len(parts) >= 2 else ""
    return normalize_model_key(raw_model)


def load_snapshot(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def iter_snapshot_files(ratings_dir: Path) -> list[Path]:
    return sorted(
        path for path in ratings_dir.glob("*.json") if path.is_file() and path.suffix.lower() == ".json"
    )


def pick_newer_record(current_entry: dict | None, next_entry: dict) -> dict:
    if current_entry is None:
        return next_entry

    current_time = max(
        parse_time(current_entry.get("updatedAt")),
        parse_time(current_entry.get("savedAt")),
    )
    next_time = max(
        parse_time(next_entry.get("updatedAt")),
        parse_time(next_entry.get("savedAt")),
    )
    return next_entry if next_time >= current_time else current_entry


def load_latest_records(ratings_dir: Path) -> dict[str, dict]:
    latest_by_record_id: dict[str, dict] = {}

    for snapshot_path in iter_snapshot_files(ratings_dir):
        snapshot = load_snapshot(snapshot_path)
        saved_at = snapshot.get("savedAt", "")
        for record_id, record in (snapshot.get("records") or {}).items():
            latest_by_record_id[record_id] = pick_newer_record(
                latest_by_record_id.get(record_id),
                {
                    **record,
                    "record_id": record.get("record_id") or record_id,
                    "savedAt": saved_at,
                    "_snapshot_file": str(snapshot_path),
                },
            )

    return latest_by_record_id


def format_rate(numerator: float, denominator: float) -> str:
    if denominator <= 0:
        return ""
    return f"{numerator / denominator:.4f}"


def build_summary_rows(latest_records: dict[str, dict]) -> list[dict[str, str]]:
    stats_by_model: dict[tuple[str, str], dict[str, float]] = defaultdict(
        lambda: {
            "battles_seen": 0,
            "battles_finished": 0,
            "battles_won": 0,
            "battles_lost": 0,
            "ties": 0,
            "both_bad": 0,
        }
    )

    for record in latest_records.values():
        winner = str((record.get("pairwise") or {}).get("winner", "")).strip()
        meta = record.get("pairwise_meta") or {}
        candidate_a = extract_candidate_model(meta.get("candidate_a_file", ""))
        candidate_b = extract_candidate_model(meta.get("candidate_b_file", ""))

        if not candidate_a[0] or not candidate_b[0]:
            continue

        stats_by_model[candidate_a]["battles_seen"] += 1
        stats_by_model[candidate_b]["battles_seen"] += 1

        if winner not in VALID_WINNERS:
            continue

        stats_by_model[candidate_a]["battles_finished"] += 1
        stats_by_model[candidate_b]["battles_finished"] += 1

        if winner == "a":
            stats_by_model[candidate_a]["battles_won"] += 1
            stats_by_model[candidate_b]["battles_lost"] += 1
        elif winner == "b":
            stats_by_model[candidate_b]["battles_won"] += 1
            stats_by_model[candidate_a]["battles_lost"] += 1
        elif winner == "tie":
            stats_by_model[candidate_a]["ties"] += 1
            stats_by_model[candidate_b]["ties"] += 1
        elif winner == "both_bad":
            stats_by_model[candidate_a]["both_bad"] += 1
            stats_by_model[candidate_b]["both_bad"] += 1

    rows: list[dict[str, str]] = []
    for (raw_model, join_key), stats in stats_by_model.items():
        battles_finished = stats["battles_finished"]
        decisive_total = stats["battles_won"] + stats["battles_lost"]
        rows.append(
            {
                "pairwise_join_key": join_key,
                "pairwise_model": join_key,
                "pairwise_raw_model": raw_model,
                "pairwise_battles_seen": str(int(stats["battles_seen"])),
                "pairwise_battles_finished": str(int(battles_finished)),
                "pairwise_battles_won": str(int(stats["battles_won"])),
                "pairwise_battles_lost": str(int(stats["battles_lost"])),
                "pairwise_ties": str(int(stats["ties"])),
                "pairwise_both_bad": str(int(stats["both_bad"])),
                "pairwise_win_rate": format_rate(
                    stats["battles_won"] + 0.5 * stats["ties"], battles_finished
                ),
                "pairwise_decisive_win_rate": format_rate(
                    stats["battles_won"], decisive_total
                ),
                "pairwise_non_loss_rate": format_rate(
                    stats["battles_won"] + stats["ties"], battles_finished
                ),
            }
        )

    rows.sort(
        key=lambda row: (
            -float(row["pairwise_win_rate"] or 0),
            -int(row["pairwise_battles_finished"]),
            row["pairwise_model"],
        )
    )
    return rows


def write_summary_csv(summary_csv: Path, rows: list[dict[str, str]]) -> None:
    summary_csv.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [column for column in MERGE_COLUMNS if not column.startswith("pairwise_match_")]
    with summary_csv.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(
            {field: row.get(field, "") for field in fieldnames}
            for row in rows
        )


def find_match(
    model_name: str,
    join_key: str,
    summary_by_name: dict[str, dict[str, str]],
    summary_by_join_key: dict[str, dict[str, str]],
) -> tuple[dict[str, str] | None, str, str]:
    model_name = str(model_name or "").strip()
    join_key = str(join_key or "").strip()

    if join_key and join_key in summary_by_join_key:
        return summary_by_join_key[join_key], "matched", "join_column_exact"

    if model_name and model_name in summary_by_name:
        return summary_by_name[model_name], "matched", "name_column_exact"

    return None, "unmatched", "no_pairwise_match"


def build_merge_payload(
    matched_row: dict[str, str] | None,
    match_status: str,
    match_type: str,
    requested_join_key: str,
) -> list[str]:
    if matched_row is None:
        return [match_status, match_type, requested_join_key] + [""] * (len(MERGE_COLUMNS) - 3)

    return [
        match_status,
        match_type,
        matched_row.get("pairwise_join_key", requested_join_key),
        matched_row.get("pairwise_model", ""),
        matched_row.get("pairwise_raw_model", ""),
        matched_row.get("pairwise_battles_seen", ""),
        matched_row.get("pairwise_battles_finished", ""),
        matched_row.get("pairwise_battles_won", ""),
        matched_row.get("pairwise_battles_lost", ""),
        matched_row.get("pairwise_ties", ""),
        matched_row.get("pairwise_both_bad", ""),
        matched_row.get("pairwise_win_rate", ""),
        matched_row.get("pairwise_decisive_win_rate", ""),
        matched_row.get("pairwise_non_loss_rate", ""),
    ]


def merge_main_csv(
    main_csv_path: Path,
    name_column: str,
    join_column: str,
    summary_rows: list[dict[str, str]],
) -> tuple[int, int, list[str], int]:
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
    name_index = trimmed_header.index(name_column)
    join_index = trimmed_header.index(join_column) if join_column in trimmed_header else -1

    summary_by_name: dict[str, dict[str, str]] = {}
    summary_by_join_key: dict[str, dict[str, str]] = {}
    for row in summary_rows:
        summary_by_name.setdefault(row["pairwise_model"], row)
        summary_by_name.setdefault(row["pairwise_raw_model"], row)
        summary_by_join_key.setdefault(row["pairwise_join_key"], row)

    merged_rows = [trimmed_header + MERGE_COLUMNS]
    matched_count = 0
    unmatched_models: list[str] = []
    matched_summary_keys: set[str] = set()
    for row in trimmed_rows[1:]:
        model_name = row[name_index].strip() if name_index < len(row) else ""
        join_key = row[join_index].strip() if join_index >= 0 and join_index < len(row) else ""
        matched_row, match_status, match_type = find_match(
            model_name=model_name,
            join_key=join_key,
            summary_by_name=summary_by_name,
            summary_by_join_key=summary_by_join_key,
        )
        if matched_row is None:
            unmatched_models.append(model_name)
        else:
            matched_count += 1
            matched_summary_keys.add(matched_row["pairwise_join_key"])

        merged_rows.append(row + build_merge_payload(matched_row, match_status, match_type, join_key))

    appended_count = 0
    for summary_row in summary_rows:
        summary_join_key = summary_row["pairwise_join_key"]
        if summary_join_key in matched_summary_keys:
            continue

        appended_row = [""] * len(trimmed_header)
        appended_row[name_index] = summary_row["pairwise_model"]
        if join_index >= 0:
            appended_row[join_index] = summary_join_key

        merged_rows.append(
            appended_row
            + build_merge_payload(
                matched_row=summary_row,
                match_status="pairwise_only",
                match_type="outer_join_append",
                requested_join_key=summary_join_key,
            )
        )
        appended_count += 1

    with main_csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(merged_rows)

    return matched_count, len(trimmed_rows) - 1, unmatched_models, appended_count


def main() -> int:
    args = build_parser().parse_args()
    ratings_dir = args.ratings_dir.expanduser().resolve()
    main_csv_path = args.main_csv.expanduser().resolve()
    summary_csv_path = args.summary_csv.expanduser().resolve()

    latest_records = load_latest_records(ratings_dir)
    summary_rows = build_summary_rows(latest_records)
    write_summary_csv(summary_csv_path, summary_rows)
    matched_count, total_count, unmatched_models, appended_count = merge_main_csv(
        main_csv_path=main_csv_path,
        name_column=args.name_column,
        join_column=args.join_column,
        summary_rows=summary_rows,
    )

    print(f"Loaded {len(latest_records)} latest pairwise records from {ratings_dir}")
    print(f"Wrote pairwise summary to {summary_csv_path}")
    print(f"Merged pairwise fields into {main_csv_path}")
    print(f"Matched {matched_count}/{total_count} rows in main_experiments.csv")
    print(f"Appended {appended_count} pairwise-only rows via outer join")
    if unmatched_models:
        print("Unmatched main models: " + ", ".join(unmatched_models))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
