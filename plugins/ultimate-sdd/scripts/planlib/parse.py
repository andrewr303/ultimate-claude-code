from __future__ import annotations

import re
from pathlib import Path

from .constants import TRUTHY

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
LIST_RE = re.compile(r"\[(.*)\]")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DELTA_SECTION_RE = re.compile(
    r"^##\s+(ADDED|MODIFIED|REMOVED)\s+Requirements\s*$", re.M
)
REQ_HEADING_RE = re.compile(r"^### Requirement:\s+\S", re.M)
NON_ALNUM = re.compile(r"[^a-z0-9]+")


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


def type_of(fid: str) -> str:
    if fid.startswith("VERIFY-REQ"):
        return "REQ"
    return fid.split("-", 1)[0]


def is_true(raw: str | None) -> bool:
    return (raw or "").strip().lower() in TRUTHY


def is_archived_change(path: Path) -> bool:
    return "archive" in [p.lower() for p in path.parts]


def delta_file(change_dir: Path, domain: str) -> Path | None:
    candidates = [
        change_dir / "deltas" / f"{domain}.md",
        change_dir / "deltas" / Path(*domain.split("/")),
        change_dir / "deltas" / Path(*domain.split("/")) / "spec.md",
    ]
    for cand in candidates:
        if cand.is_file():
            return cand
    return None


def collect(root: Path) -> list[tuple[Path, dict[str, str]]]:
    files: list[tuple[Path, dict[str, str]]] = []
    for path in root.rglob("*.md"):
        if path.name == "INDEX.md":
            continue
        text = path.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if not fm.get("id"):
            continue
        files.append((path, fm))
    return files


def artifact_id(fm: dict[str, str]) -> str:
    """Graph/registry identity; keep a TASK's frontmatter ID local to its REQ."""
    fid = fm["id"]
    return f"{fm.get('req', '')}/{fid}" if type_of(fid) == "TASK" else fid


def dependency_id(fm: dict[str, str], other: str) -> str | None:
    """Resolve local TASK links; reject links outside the TASK's parent REQ."""
    if type_of(fm["id"]) != "TASK":
        return other
    req = fm.get("req", "")
    if not req:
        return None
    if type_of(other) == "TASK":
        return f"{req}/{other}"
    if other.startswith(f"{req}/TASK-"):
        return other
    return None


def by_id_map(
    artifacts: list[tuple[Path, dict[str, str]]],
) -> dict[str, tuple[Path, dict[str, str]]]:
    out: dict[str, tuple[Path, dict[str, str]]] = {}
    for path, fm in artifacts:
        out[artifact_id(fm)] = (path, fm)
    return out


def of_kind(
    artifacts: list[tuple[Path, dict[str, str]]], kind: str
) -> list[tuple[Path, dict[str, str]]]:
    return [(p, fm) for p, fm in artifacts if type_of(fm["id"]) == kind]


def readiness_int(fm: dict[str, str]) -> int:
    raw = fm.get("readiness", "")
    try:
        return int(raw)
    except ValueError:
        return 0


def readiness_label(score: int) -> str:
    if score <= 2:
        return "rough"
    if score == 3:
        return "shaping"
    return "ready"


def slugify(text: str) -> str:
    s = NON_ALNUM.sub("-", text.lower()).strip("-")
    return s or "untitled"


def next_id(artifacts: list[tuple[Path, dict[str, str]]], prefix: str) -> str:
    nums: list[int] = []
    for _path, fm in artifacts:
        fid = fm.get("id", "")
        if not fid.startswith(prefix + "-"):
            continue
        tail = fid[len(prefix) + 1 :]
        if tail.isdigit():
            nums.append(int(tail))
    return f"{prefix}-{max(nums, default=0) + 1}"


def repo_root(plan_root: Path) -> Path:
    if plan_root.name == "plan" and plan_root.parent.name in {"docs", ".plan"}:
        return plan_root.parent.parent
    if plan_root.name == ".plan":
        return plan_root.parent
    return plan_root.parent


def codebase_exists(plan_root: Path) -> bool:
    from .constants import CODEBASE_MARKERS

    root = repo_root(plan_root)
    return any((root / name).exists() for name in CODEBASE_MARKERS)
