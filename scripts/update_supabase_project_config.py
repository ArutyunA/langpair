#!/usr/bin/env python3
"""Update local Supabase project wiring after creating a replacement hosted project."""

from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-ref", required=True, help="New Supabase project ref.")
    parser.add_argument("--project-url", required=True, help="New Supabase project URL.")
    parser.add_argument("--publishable-key", required=True, help="New Supabase anon/publishable key.")
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Frontend env file to rewrite in place. Defaults to .env.",
    )
    parser.add_argument(
        "--config-file",
        default="supabase/config.toml",
        help="Supabase config.toml path. Defaults to supabase/config.toml.",
    )
    parser.add_argument(
        "--tts-bucket",
        default="TTSCanto",
        help="Bucket to persist in the env file. Defaults to TTSCanto.",
    )
    parser.add_argument(
        "--tts-prefix",
        default="bethany",
        help="Speaker prefix to persist in the env file. Defaults to bethany.",
    )
    return parser.parse_args()


def write_env_file(path: Path, project_url: str, publishable_key: str, tts_bucket: str, tts_prefix: str) -> None:
    lines = [
        f'VITE_SUPABASE_URL="{project_url}"',
        f'VITE_SUPABASE_PUBLISHABLE_KEY="{publishable_key}"',
        f'VITE_TTS_BUCKET="{tts_bucket}"',
        f'VITE_TTS_PREFIX="{tts_prefix}"',
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def write_config_file(path: Path, project_ref: str) -> None:
    path.write_text(f'project_id = "{project_ref}"\n', encoding="utf-8")


def main() -> None:
    args = parse_args()
    env_file = Path(args.env_file).expanduser().resolve()
    config_file = Path(args.config_file).expanduser().resolve()

    write_env_file(
        env_file,
        project_url=args.project_url,
        publishable_key=args.publishable_key,
        tts_bucket=args.tts_bucket,
        tts_prefix=args.tts_prefix,
    )
    write_config_file(config_file, project_ref=args.project_ref)

    print(f"Updated {env_file}")
    print(f"Updated {config_file}")


if __name__ == "__main__":
    main()
