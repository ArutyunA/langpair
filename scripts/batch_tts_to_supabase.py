#!/usr/bin/env python3
"""Batch-generate Cantonese TTS WAVs (CosyVoice2) and upload to Supabase Storage."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
from pathlib import Path
import time
from typing import Dict, List, Optional, Tuple

import requests

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover - optional dependency
    Client = None  # type: ignore[misc, assignment]
    create_client = None  # type: ignore[misc, assignment]


DEFAULT_BASE_URL = "http://127.0.0.1:50000"
REPORT_DIR = Path("generated_audio")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--vocab-file",
        required=True,
        help="CSV or JSON file containing rows with at least `id` and `tts_text`.",
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="CosyVoice FastAPI base URL.")
    parser.add_argument(
        "--speaker-id",
        default="BethanySpeaker",
        help="Cached zero_shot_spk_id to reuse for every request.",
    )
    parser.add_argument(
        "--instruct-text",
        default="用温柔的语气讲这句话",
        help="Fallback instruct_text when the row does not include one.",
    )
    parser.add_argument(
        "--output-dir",
        default="generated_audio/wav",
        help="Folder to store intermediate WAV files before upload.",
    )
    parser.add_argument(
        "--supabase-url",
        default=os.environ.get("SUPABASE_URL"),
        help="Supabase project URL; required to upload.",
    )
    parser.add_argument(
        "--supabase-key",
        default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY"),
        help="Supabase API key; required to upload.",
    )
    parser.add_argument("--supabase-bucket", default="tts-cache", help="Supabase Storage bucket name.")
    parser.add_argument(
        "--supabase-prefix",
        default="bethany",
        help="Static prefix inside the bucket (e.g., speaker folder).",
    )
    parser.add_argument(
        "--supabase-prefix-template",
        default="{supabase_prefix}/day{day:02d}",
        help="Template for subfolders, format with row fields (e.g., '{supabase_prefix}/day{day:02d}').",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Number of times to retry a failed TTS call (in addition to the first attempt).",
    )
    return parser.parse_args()


def load_rows(path: Path) -> List[Dict[str, str]]:
    if path.suffix.lower() == ".json":
        return json.loads(path.read_text())
    rows: List[Dict[str, str]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)
    return rows


def ensure_supabase_client(url: Optional[str], key: Optional[str]) -> Optional[Client]:
    if not url or not key:
        return None
    if create_client is None:
        raise RuntimeError("supabase-py is not installed. Run `pip install supabase`.")
    return create_client(url, key)


def sanitize_filename(value: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in value)
    return safe.strip("_") or "tts"


def call_tts(
    row: Dict[str, str],
    *,
    base_url: str,
    speaker_id: str,
    default_instruct: str,
    dest: Path,
    retries: int,
) -> Tuple[Path, float]:
    tts_text = row.get("tts_text") or row.get("text")
    if not tts_text:
        raise ValueError("Row is missing `tts_text`.")
    instruct = row.get("instruct_text") or default_instruct
    data = {
        "tts_text": tts_text,
        "instruct_text": instruct,
        "zero_shot_spk_id": row.get("speaker_id") or speaker_id,
    }
    url = f"{base_url.rstrip('/')}/inference_instruct2"
    attempt = 0
    while True:
        attempt += 1
        response = requests.post(url, data=data, timeout=600, stream=True)
        if response.status_code == 200:
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=8192):
                    handle.write(chunk)
            duration = float(response.headers.get("X-Audio-Duration", "0") or 0.0)
            return dest, duration
        if attempt > retries + 1:
            response.raise_for_status()
        # brief back-off before retrying
        time.sleep(1)


def build_prefix(row: Dict[str, str], *, template: str, base_prefix: str) -> str:
    data = dict(row)
    data.setdefault("supabase_prefix", base_prefix)
    try:
        day_int = int(row.get("day", 0))
    except (TypeError, ValueError):
        day_int = 0
    data.setdefault("day", day_int)
    return template.format(**data).strip("/ ")


def upload_supabase(
    client: Client,
    bucket: str,
    folder: str,
    file_path: Path,
    object_name: str,
) -> str:
    with file_path.open("rb") as handle:
        data = handle.read()
    storage = client.storage.from_(bucket)
    prefix_clean = folder.strip("/")
    remote_path = f"{prefix_clean}/{object_name}" if prefix_clean else object_name
    storage.upload(
        remote_path,
        data,
        {
            "content-type": "audio/wav",
            "x-upsert": "true",
        },
    )
    return storage.get_public_url(remote_path)


def main() -> None:
    args = parse_args()
    rows = load_rows(Path(args.vocab_file))
    client = ensure_supabase_client(args.supabase_url, args.supabase_key)
    output_dir = Path(args.output_dir)
    report_rows: List[Dict[str, str]] = []

    for row in rows:
        vocab_id = row.get("id") or row.get("slug") or sanitize_filename(row.get("tts_text", "tts"))
        filename = f"{sanitize_filename(vocab_id)}.wav"
        local_path = output_dir / filename
        try:
            wav_path, duration = call_tts(
                row,
                base_url=args.base_url,
                speaker_id=args.speaker_id,
                default_instruct=args.instruct_text,
                dest=local_path,
                retries=args.retries,
            )
            public_url = ""
            if client:
                folder = build_prefix(
                    row,
                    template=args.supabase_prefix_template,
                    base_prefix=args.supabase_prefix,
                )
                public_url = upload_supabase(
                    client,
                    bucket=args.supabase_bucket,
                    folder=folder,
                    file_path=wav_path,
                    object_name=filename,
                )
            report_rows.append(
                {
                    "id": vocab_id,
                    "tts_text": row.get("tts_text", ""),
                    "local_path": str(wav_path),
                    "supabase_url": public_url,
                    "duration": f"{duration:.2f}",
                }
            )
            print(f"[ok] {vocab_id} -> {wav_path}{' -> ' + public_url if public_url else ''}")
        except Exception as exc:  # pylint: disable=broad-except
            report_rows.append(
                {
                    "id": vocab_id,
                    "tts_text": row.get("tts_text", ""),
                    "local_path": "",
                    "supabase_url": "",
                    "duration": "0",
                    "error": str(exc),
                }
            )
            print(f"[fail] {vocab_id}: {exc}")

    if report_rows:
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        report_path = REPORT_DIR / f"tts_report_{timestamp}.csv"
        fieldnames = sorted({k for row in report_rows for k in row.keys()})
        with report_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(report_rows)
        print(f"\nReport written to {report_path} ({len(report_rows)} rows)")
    else:
        print("No rows processed.")


if __name__ == "__main__":
    main()
