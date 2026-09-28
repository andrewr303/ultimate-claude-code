#!/usr/bin/env python3
"""Merge a CHANGE's delta specs into docs/plan/truth/. Stdlib only."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


H2_RE = re.compile(r"^##\s+(.+?)\s*$", re.M)
REQ_RE = re.compile(r"^### Requirement:\s+(.+?)\s*$", re.M)
FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
LIST_RE = re.compile(r"\[(.*)\]")
TRUTHY = {"true", "yes", "1"}


class MergeError(Exception):
    pass


def parse_frontmatter(text: str) -> dict[str, str]:
    m = FM_RE.match(text)
    if not m:
        return {}
    data: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.strip().startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        data[key.strip()] = val.strip()
    return data


def parse_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    m = LIST_RE.search(raw)
    if not m:
        return []
    return [p.strip() for p in m.group(1).split(",") if p.strip()]


def is_true(raw: str | None) -> bool:
    return (raw or "").strip().lower() in TRUTHY


def split_h2(text: str) -> list[tuple[str, str]]:
    matches = list(H2_RE.finditer(text))
    if not matches:
        return [("", text)]
    parts: list[tuple[str, str]] = []
    preamble = text[: matches[0].start()]
    if preamble.strip():
        parts.append(("", preamble))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        parts.append((m.group(1).strip(), text[m.end() : end]))
    return parts


def parse_requirements(body: str) -> list[tuple[str, str]]:
    matches = list(REQ_RE.finditer(body))
    reqs: list[tuple[str, str]] = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        block = body[m.start() : end].strip()
        reqs.append((m.group(1).strip(), block))
    return reqs


def parse_delta(text: str) -> dict:
    purpose = None
    added: list[tuple[str, str]] = []
    modified: list[tuple[str, str]] = []
    removed: list[tuple[str, str]] = []
    for heading, body in split_h2(text):
        key = heading.upper()
        if key == "PURPOSE":
            purpose = body.strip() or None
        elif key == "ADDED REQUIREMENTS":
            added = parse_requirements(body)
        elif key == "MODIFIED REQUIREMENTS":
            modified = parse_requirements(body)
        elif key == "REMOVED REQUIREMENTS":
            removed = parse_requirements(body)
    return {
        "purpose": purpose,
        "added": added,
        "modified": modified,
        "removed": removed,
    }


def parse_main(text: str) -> dict:
    title = None
    for line in text.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break
    purpose = None
    reqs: list[tuple[str, str]] = []
    for heading, body in split_h2(text):
        key = heading.upper()
        if key == "PURPOSE":
            purpose = body.strip() or None
        elif key == "REQUIREMENTS":
            reqs = parse_requirements(body)
    return {"title": title, "purpose": purpose, "requirements": reqs}


def render_main(title: str, purpose: str | None, reqs: list[tuple[str, str]]) -> str:
    lines = [f"# {title}", "", "## Purpose", "", purpose or "TBD", "", "## Requirements", ""]
    if reqs:
        lines.append("\n\n".join(block for _, block in reqs))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def apply_delta(
    main_text: str | None,
    delta_text: str,
    *,
    domain: str,
    retire: bool = False,
) -> tuple[str | None, list[str]]:
    """Return (new_text_or_None_if_deleted, log lines). Raises MergeError."""
    delta = parse_delta(delta_text)
    log: list[str] = []
    if not (delta["added"] or delta["modified"] or delta["removed"]):
        raise MergeError(f"{domain}: delta has no ADDED/MODIFIED/REMOVED requirements")

    if main_text is None:
        if delta["modified"] or delta["removed"]:
            raise MergeError(
                f"{domain}: truth spec does not exist; only ADDED (plus Purpose) is allowed"
            )
        names = [n for n, _ in delta["added"]]
        if len(names) != len(set(names)):
            raise MergeError(f"{domain}: duplicate ADDED requirement names")
        title = f"{domain.replace('-', ' ').replace('/', ' ').title()} Specification"
        text = render_main(title, delta["purpose"], delta["added"])
        log.append(f"{domain}: created truth spec with {len(delta['added'])} ADDED")
        return text, log

    main = parse_main(main_text)
    by_name = {name: block for name, block in main["requirements"]}
    order = [name for name, _ in main["requirements"]]

    for name, block in delta["added"]:
        if name in by_name:
            raise MergeError(f"{domain}: ADDED '{name}' already exists (use MODIFIED)")
        by_name[name] = block
        order.append(name)
        log.append(f"{domain}: ADDED {name}")

    for name, block in delta["modified"]:
        if name not in by_name:
            raise MergeError(f"{domain}: MODIFIED '{name}' not in truth (use ADDED)")
        by_name[name] = block
        log.append(f"{domain}: MODIFIED {name}")

    for name, _block in delta["removed"]:
        if name not in by_name:
            raise MergeError(f"{domain}: REMOVED '{name}' not in truth")
        del by_name[name]
        order = [n for n in order if n != name]
        log.append(f"{domain}: REMOVED {name}")

    remaining = [(n, by_name[n]) for n in order if n in by_name]
    if not remaining:
        if not retire:
            raise MergeError(
                f"{domain}: last requirement removed; set retire_capabilities: true to delete the truth spec"
            )
        log.append(f"{domain}: retired (no requirements left)")
        return None, log

    title = main["title"] or f"{domain.title()} Specification"
    purpose = main["purpose"]
    text = render_main(title, purpose, remaining)
    return text, log


def find_change(root: Path, selector: str) -> tuple[Path, dict[str, str]]:
    active = root / "changes"
    if not active.is_dir():
        raise MergeError(f"no changes directory under {root}")
    matches: list[tuple[Path, dict[str, str]]] = []
    for path in active.rglob("CHANGE.md"):
        if "archive" in path.parts:
            continue
        fm = parse_frontmatter(path.read_text(encoding="utf-8"))
        if fm.get("id") == selector or fm.get("slug") == selector or path.parent.name == selector:
            matches.append((path, fm))
    if not matches:
        raise MergeError(f"no active change matching {selector!r}")
    if len(matches) > 1:
        names = ", ".join(str(p.parent.name) for p, _ in matches)
        raise MergeError(f"ambiguous change {selector!r}: {names}")
    return matches[0]


def delta_path(change_dir: Path, domain: str) -> Path:
    flat = change_dir / "deltas" / f"{domain}.md"
    if flat.exists():
        return flat
    nested = change_dir / "deltas" / Path(*domain.split("/"))
    if nested.is_file():
        return nested
    spec = change_dir / "deltas" / Path(*domain.split("/")) / "spec.md"
    return spec if spec.exists() else flat


def truth_path(root: Path, domain: str) -> Path:
    return root / "truth" / Path(*domain.split("/")) / "spec.md"


def merge_change(root: Path, selector: str, *, dry_run: bool = False) -> list[str]:
    change_path, fm = find_change(root, selector)
    if is_true(fm.get("skip_specs")):
        return [f"{fm.get('id', selector)}: skip_specs — nothing to merge"]
    domains = parse_list(fm.get("deltas"))
    if not domains:
        raise MergeError(f"{fm.get('id')}: deltas: [] but skip_specs is not true")
    retire = is_true(fm.get("retire_capabilities"))
    logs: list[str] = []
    planned: list[tuple[Path, str | None]] = []
    for domain in domains:
        dpath = delta_path(change_path.parent, domain)
        if not dpath.exists():
            raise MergeError(f"{fm.get('id')}: missing delta {dpath}")
        tpath = truth_path(root, domain)
        main = tpath.read_text(encoding="utf-8") if tpath.exists() else None
        new_text, log = apply_delta(
            main, dpath.read_text(encoding="utf-8"), domain=domain, retire=retire
        )
        logs.extend(log)
        planned.append((tpath, new_text))
    if dry_run:
        logs.append("dry-run: no files written")
        return logs
    for tpath, new_text in planned:
        if new_text is None:
            if tpath.exists():
                tpath.unlink()
            continue
        tpath.parent.mkdir(parents=True, exist_ok=True)
        tpath.write_text(new_text, encoding="utf-8")
    logs.append(f"merged {len(planned)} domain(s) into {root / 'truth'}")
    return logs


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge CHANGE deltas into truth specs")
    parser.add_argument("--root", default="docs/plan")
    parser.add_argument("--change", required=True, help="CHANGE-n or slug")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = Path(args.root)
    if not root.is_dir():
        print(f"ERROR: {root} is not a directory", file=sys.stderr)
        return 2
    try:
        logs = merge_change(root, args.change, dry_run=args.dry_run)
    except MergeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    for line in logs:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
