#!/usr/bin/env python3
"""Normalize rows from days1to10.csv into TTS-ready CSV and JSON payloads."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        default="days1to10.csv",
        help="Input CSV containing daily content.",
    )
    parser.add_argument(
        "--language",
        default="Cantonese",
        help="Language filter (case-insensitive). Use 'all' to keep everything.",
    )
    parser.add_argument(
        "--section",
        default="Vocabulary",
        help="Section filter (e.g., Vocabulary, Phrases). Use 'all' to keep everything.",
    )
    parser.add_argument(
        "--instruct-text",
        default="用温柔的语气讲这句话",
        help="Instruction appended to every TTS row.",
    )
    parser.add_argument(
        "--speaker-id",
        default="Beth251112",
        help="Default zero-shot speaker ID to include in the payload.",
    )
    parser.add_argument(
        "--output-prefix",
        default="generated_audio/tts_payload",
        help="Prefix (no extension) for the generated CSV and JSON files.",
    )
    return parser.parse_args()


def row_matches(row: Dict[str, str], *, language: str, section: str) -> bool:
    if language.lower() != "all" and row.get("Language", "").lower() != language.lower():
        return False
    if section.lower() != "all" and row.get("Section", "").lower() != section.lower():
        return False
    return bool(row.get("Target (Script)", "").strip())


def normalize_rows(
    rows: List[Dict[str, str]],
    *,
    language: str,
    section: str,
    instruct_text: str,
    speaker_id: str,
) -> List[Dict[str, str]]:
    per_day_counter: Dict[int, int] = defaultdict(int)
    normalized: List[Dict[str, str]] = []
    for row in rows:
        if not row_matches(row, language=language, section=section):
            continue
        day_str = row.get("Day", "").split()[ -1 ] if row.get("Day", "").startswith("Day ") else row.get("Day", "")
        try:
            day = int(day_str)
        except (TypeError, ValueError):
            continue
        per_day_counter[day] += 1
        idx = per_day_counter[day]
        entry_id = f"day{day:02d}_{section.lower()}_{idx:03d}"
        normalized.append(
            {
                "id": entry_id,
                "day": day,
                "language": row.get("Language", ""),
                "section": row.get("Section", ""),
                "type": row.get("Type", ""),
                "tts_text": row.get("Target (Script)", "").strip(),
                "romanization": row.get("Romanization", "").strip(),
                "english": row.get("English", "").strip(),
                "instruct_text": row.get("instruct_text", "").strip() or instruct_text,
                "speaker_id": row.get("speaker_id", "").strip() or speaker_id,
            }
        )
    return normalized


def write_outputs(data: List[Dict[str, str]], prefix: str) -> None:
    prefix_path = Path(prefix)
    prefix_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path = prefix_path.with_suffix(".csv")
    json_path = prefix_path.with_suffix(".json")
    fieldnames = [
        "id",
        "day",
        "language",
        "section",
        "type",
        "tts_text",
        "romanization",
        "english",
        "instruct_text",
        "speaker_id",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} rows to {csv_path} and {json_path}")


def main() -> None:
    args = parse_args()
    source_path = Path(args.source)
    if not source_path.exists():
        raise FileNotFoundError(f"{source_path} not found")
    with source_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    normalized = normalize_rows(
        rows,
        language=args.language,
        section=args.section,
        instruct_text=args.instruct_text,
        speaker_id=args.speaker_id,
    )
    write_outputs(normalized, args.output_prefix)


if __name__ == "__main__":
    main()
