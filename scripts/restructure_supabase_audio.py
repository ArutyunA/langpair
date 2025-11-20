#!/usr/bin/env python3
"""Reorganize Supabase Storage files into per-day folders based on filename prefix."""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import List, Dict, Any

try:
    from supabase import Client, create_client
except ImportError as exc:  # pragma: no cover
    raise SystemExit("supabase-py is required. Run `pip install supabase`.") from exc


DAY_PATTERN = re.compile(r"^(day\d{2})", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"), required=False)
    parser.add_argument(
        "--supabase-key",
        default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY"),
        required=False,
    )
    parser.add_argument("--bucket", required=True, help="Supabase Storage bucket name (e.g., TTSCanto).")
    parser.add_argument(
        "--source-folder",
        required=True,
        help="Folder containing the misplaced files (e.g., 'bethany/day01').",
    )
    parser.add_argument(
        "--base-prefix",
        default="bethany",
        help="Root prefix; destination folders become '{base-prefix}/dayXX'.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the planned moves without copying/removing files.",
    )
    return parser.parse_args()


def list_files(storage: Client.storage, path: str) -> List[Dict[str, Any]]:
    return storage.list(path) or []


def main() -> None:
    args = parse_args()
    if not args.supabase_url or not args.supabase_key:
        raise SystemExit("Supabase URL/key required. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or pass flags.")

    client = create_client(args.supabase_url, args.supabase_key)
    storage = client.storage.from_(args.bucket)

    source = args.source_folder.strip("/")
    base_prefix = args.base_prefix.strip("/")

    entries = list_files(storage, source)
    if not entries:
        print(f"No files found in {source}")
        return

    plan = []
    for entry in entries:
        name = entry.get("name")
        if not name:
            continue
        match = DAY_PATTERN.match(name)
        if not match:
            print(f"[skip] {name}: does not match dayXX pattern")
            continue
        day_token = match.group(1).lower()
        dest_folder = f"{base_prefix}/{day_token}"
        old_path = f"{source}/{name}"
        new_path = f"{dest_folder}/{name}"
        if old_path == new_path:
            continue
        plan.append((old_path, new_path))

    if not plan:
        print("Nothing to move.")
        return

    print(f"Planned moves ({len(plan)} files):")
    for old, new in plan:
        print(f"  {old} -> {new}")

    if args.dry_run:
        print("Dry run enabled; no changes made.")
        return

    for old_path, new_path in plan:
        result = storage.copy(old_path, new_path)
        if isinstance(result, dict) and result.get("error"):
            print(f"[fail] copy {old_path} -> {new_path}: {result['error']}")
            continue
        storage.remove([old_path])
        print(f"[moved] {old_path} -> {new_path}")


if __name__ == "__main__":
    main()
