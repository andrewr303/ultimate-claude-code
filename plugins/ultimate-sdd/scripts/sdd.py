#!/usr/bin/env python3
"""Project setup, evidence gates, and recovery for Ultimate SDD."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise ValueError(f"{message}; use --help for usage")


def build_parser() -> argparse.ArgumentParser:
    from sddlib import config, gates, recovery

    parser = ArgumentParser(description=__doc__, allow_abbrev=False)
    subparsers = parser.add_subparsers(dest="command", required=True)
    for module in (config, gates, recovery):
        module.register(subparsers)
    return parser


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    try:
        args = build_parser().parse_args(argv)
        return int(args.func(args))
    except (ValueError, OSError, RecursionError, subprocess.SubprocessError) as exc:
        payload = {"ok": False, "errors": [str(exc)]}
        if "--json" in argv:
            print(json.dumps(payload, ensure_ascii=True))
        else:
            print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
