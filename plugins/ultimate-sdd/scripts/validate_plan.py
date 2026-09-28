#!/usr/bin/env python3
"""Validate a docs/plan tree: IDs, statuses, blocker symmetry, cycles. Stdlib only."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from planlib.constants import (  # noqa: E402,F401
    CTX_KINDS,
    CTX_LEVELS,
    CTX_TYPES,
    EFFORTS,
    STATUSES,
)
from planlib.graph import has_cycle  # noqa: E402
from planlib.parse import (  # noqa: E402
    collect,
    delta_file,
    is_archived_change,
    is_true,
    parse_frontmatter,
    parse_list,
    type_of,
)
from planlib.validate import validate_tree  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a local plan tree")
    parser.add_argument("--root", default="docs/plan")
    args = parser.parse_args()
    result = validate_tree(Path(args.root))
    for line in result.errors:
        print(f"ERROR: {line}")
    for line in result.warnings:
        print(f"WARN:  {line}")
    print(
        f"{result.artifacts} artifacts, {len(result.errors)} error(s), {len(result.warnings)} warning(s)"
    )
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
