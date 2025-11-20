#!/usr/bin/env python3
"""Update daily_vocabulary rows with Supabase Storage paths for generated TTS audio."""

from __future__ import annotations

import argparse
import csv
import os
from pathlib import Path
from typing import Dict, Any, List

from datetime import datetime, timezone

from supabase import create_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload-csv", required=True, help="CSV produced by prep_tts_payload.py")
    parser.add_argument("--report-csv", required=True, help="CSV report from batch_tts_to_supabase.py")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"))
    parser.add_argument("--supabase-key", default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
    parser.add_argument("--bucket", default="TTSCanto")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def extract_storage_path(url_or_path: str, bucket: str) -> str:
    if not url_or_path:
        return ""
    token = f"/{bucket}/"
    if token in url_or_path:
        return url_or_path.split(token, 1)[1]
    return url_or_path.strip("/ ")


def main() -> None:
    args = parse_args()
    if not args.supabase_url or not args.supabase_key:
        raise SystemExit("Supabase URL/key required (set env vars or pass flags).")

    payload_rows = {row["id"]: row for row in read_csv(Path(args.payload_csv))}
    report_rows = {row["id"]: row for row in read_csv(Path(args.report_csv))}

    client = create_client(args.supabase_url, args.supabase_key)
    table = client.table("daily_vocabulary")
    updates = []
    for entry_id, payload in payload_rows.items():
        report = report_rows.get(entry_id)
        if not report:
            continue
        path = extract_storage_path(report.get("supabase_url", ""), args.bucket)
        if not path:
            continue
        day = int(payload.get("day", 0))
        language = (payload.get("language") or "").lower()
        word = payload.get("tts_text")
        if not (day and language and word):
            continue
        updates.append((day, language, word, path, payload.get("speaker_id", "")))

    print(f"Prepared {len(updates)} updates")
    for day, language, word, path, voice_id in updates:
        print(f"  day {day}, {language}, {word} -> {path}")

    if args.dry_run:
        print("Dry run enabled; no database updates performed.")
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    for day, language, word, path, voice_id in updates:
        data: Dict[str, Any] = {
            "tts_bucket": args.bucket,
            "tts_storage_path": path,
            "tts_voice_id": voice_id,
            "tts_last_generated_at": now_iso,
        }
        resp = table.update(data).eq("day_number", day).eq("language", language).eq("word", word).execute()
        if resp.data:
            print(f"[ok] {word} (day {day}) updated")
        else:
            print(f"[warn] no rows updated for day {day} {language} {word}")


if __name__ == "__main__":
    main()
