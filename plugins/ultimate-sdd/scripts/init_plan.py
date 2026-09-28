#!/usr/bin/env python3
"""Create docs/plan/ skeleton in the target repo. Stdlib only."""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path


DIRS = (
    "context",
    "context/company",
    "context/project",
    "context/plan",
    "briefs",
    "epics",
    "reqs",
    "tasks",
    "verify",
    "truth",
    "changes",
    "changes/archive",
    "runs",
    "lessons",
    "goals",
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Initialize a local plan tree")
    parser.add_argument(
        "--root",
        default="docs/plan",
        help="plan root relative to cwd (default: docs/plan)",
    )
    parser.add_argument("--title", default="Untitled project")
    parser.add_argument("--force", action="store_true", help="overwrite INDEX/project if present")
    args = parser.parse_args()

    root = Path(args.root)
    today = dt.date.today().isoformat()
    root.mkdir(parents=True, exist_ok=True)
    for name in DIRS:
        (root / name).mkdir(parents=True, exist_ok=True)
        gitkeep = root / name / ".gitkeep"
        if not gitkeep.exists():
            gitkeep.write_text("", encoding="utf-8")

    project = root / "project.md"
    index = root / "INDEX.md"
    if project.exists() and not args.force:
        print(f"exists: {project} (use --force to overwrite)")
    else:
        project.write_text(
            (
                "---\n"
                "id: PROJECT\n"
                f"title: {args.title}\n"
                "status: draft\n"
                f"root: {args.root}\n"
                "prd:\n"
                f"created: {today}\n"
                f"updated: {today}\n"
                "---\n\n"
                f"# {args.title}\n\n"
                "One paragraph: what this project is, who it is for, and what v1 done means.\n"
            ),
            encoding="utf-8",
        )
        print(f"wrote {project}")

    catalog = root / "context" / "CATALOG.md"
    if not catalog.exists() or args.force:
        catalog.write_text(
            (
                "# Context catalog\n\n"
                "Two kinds (code / business). Three levels (company / project / plan).\n\n"
                "| ID | Level | Kind | Type | Title | Source |\n"
                "|---|---|---|---|---|---|\n"
                "| — | — | — | — | empty | — |\n"
            ),
            encoding="utf-8",
        )
        print(f"wrote {catalog}")

    if index.exists() and not args.force:
        print(f"exists: {index} (use --force to overwrite)")
    else:
        index.write_text(
            (
                f"# Project Plan — {args.title}\n\n"
                f"| Field | Value |\n|---|---|\n"
                f"| Status | draft |\n"
                f"| Brief | — |\n"
                f"| PRD | — |\n"
                f"| Platform context | missing |\n"
                f"| Updated | {today} |\n\n"
                "## Next\n\n"
                "Write platform context if a codebase exists; otherwise frame the idea.\n\n"
                "## Board\n\n"
                "### Changes\n\n"
                "| ID | Slug | Status | Deltas | REQs |\n|---|---|---|---|---|\n"
                "| — | — | — | — | — |\n\n"
                "### Plan\n\n"
                "| ID | Title | Status | Ready | Notes |\n|---|---|---|---|---|\n"
                "| — | — | — | — | empty |\n\n"
                "### Build\n\n"
                "| ID | Title | Tasks | Progress |\n|---|---|---|---|\n"
                "| — | — | — | — |\n\n"
                "### Published\n\n"
                "| ID | Title | Verified | Evidence |\n|---|---|---|---|\n"
                "| — | — | — | — |\n\n"
                "## Graph\n\n```\n(empty)\n```\n\n"
                "## Registry\n\n"
                f"| ID | File | Status |\n|---|---|---|\n| PROJECT | {args.root}/project.md | draft |\n"
            ),
            encoding="utf-8",
        )
        print(f"wrote {index}")

    print(f"initialized {root.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
