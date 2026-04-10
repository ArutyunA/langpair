#!/usr/bin/env python3
"""Restore a downloaded Supabase dashboard backup into a hosted project with psql."""

from __future__ import annotations

import argparse
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path


def infer_default_backup() -> str:
    backup_root = (Path(__file__).resolve().parents[1] / ".." / "backups").resolve()
    matches = sorted(backup_root.glob("*/db_cluster-*.backup"))
    if not matches:
        return str((backup_root / "<source-project-ref>" / "db_cluster-<timestamp>.backup").resolve())
    return str(matches[0].resolve())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--connection-string",
        default=os.environ.get("SUPABASE_DB_URL"),
        help="Hosted Postgres connection string. Defaults to SUPABASE_DB_URL.",
    )
    parser.add_argument(
        "--backup-file",
        default=infer_default_backup(),
        help="Path to the downloaded backup file. Defaults to the first matching backups/*/db_cluster-*.backup.",
    )
    parser.add_argument(
        "--psql-path",
        default=os.environ.get("PSQL_PATH"),
        help="Explicit path to psql. Defaults to PATH or Homebrew libpq.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the command that would run without restoring anything.",
    )
    return parser.parse_args()


def find_psql(explicit_path: str | None) -> Path:
    candidates = []
    if explicit_path:
        candidates.append(Path(explicit_path).expanduser())

    path_hit = shutil.which("psql")
    if path_hit:
        candidates.append(Path(path_hit))

    candidates.extend(
        [
            Path("/opt/homebrew/opt/libpq/bin/psql"),
            Path("/usr/local/opt/libpq/bin/psql"),
        ]
    )

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    raise SystemExit("psql not found. Install libpq or set --psql-path / PSQL_PATH.")


def sanitize_connection_string(connection_string: str) -> str:
    return re.sub(r":[^:@/]+@", ":********@", connection_string, count=1)


def main() -> None:
    args = parse_args()
    if not args.connection_string:
        raise SystemExit("Connection string required. Pass --connection-string or set SUPABASE_DB_URL.")

    backup_file = Path(args.backup_file).expanduser().resolve()
    if not backup_file.exists():
        raise SystemExit(f"Backup file not found: {backup_file}")
    if backup_file.suffix == ".gz":
        raise SystemExit("This helper expects an uncompressed .backup file, not a .gz archive.")

    psql = find_psql(args.psql_path)

    version = subprocess.run(
        [str(psql), "--version"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()

    command = [str(psql), "-d", args.connection_string, "-f", str(backup_file)]
    print(f"Using {version}")
    print(f"Backup file: {backup_file}")
    print(f"Connection: {sanitize_connection_string(args.connection_string)}")
    print("Restore command:")
    printable_command = [
        str(psql),
        "-d",
        sanitize_connection_string(args.connection_string),
        "-f",
        str(backup_file),
    ]
    print("  " + " ".join(shlex.quote(part) for part in printable_command))
    print("Note: duplicate-object errors are expected for Supabase full dashboard dumps.")

    if args.dry_run:
        return

    process = subprocess.run(command)
    if process.returncode != 0:
        raise SystemExit(process.returncode)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
