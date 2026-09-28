from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .constants import CTX_KINDS, CTX_LEVELS, CTX_TYPES, EFFORTS, STATUSES
from .graph import blocker_edges, has_cycle
from .parse import (
    DELTA_SECTION_RE,
    REQ_HEADING_RE,
    SLUG_RE,
    artifact_id,
    collect,
    delta_file,
    dependency_id,
    is_archived_change,
    is_true,
    parse_list,
    type_of,
)


@dataclass
class ValidationResult:
    artifacts: int
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def validate_tree(root: Path) -> ValidationResult:
    result = ValidationResult(artifacts=0)
    if not root.is_dir():
        result.errors.append(f"{root} is not a directory")
        return result

    artifacts = collect(root)
    result.artifacts = len(artifacts)
    by_id: dict[str, tuple[Path, dict[str, str]]] = {}
    for path, fm in artifacts:
        fid = artifact_id(fm)
        if fid in by_id:
            result.errors.append(f"duplicate id {fid}: {path} and {by_id[fid][0]}")
        by_id[fid] = (path, fm)

    for path, fm in artifacts:
        fid = artifact_id(fm)
        kind = type_of(fm["id"])
        status = fm.get("status", "")
        if kind in STATUSES and status and status not in STATUSES[kind]:
            result.errors.append(f"{fid}: illegal status '{status}'")

        if kind == "REQ":
            readiness = fm.get("readiness", "")
            if readiness and readiness not in {str(i) for i in range(1, 6)}:
                result.errors.append(f"{fid}: readiness must be 1–5, got '{readiness}'")
            epic = fm.get("epic", "")
            if epic and epic not in by_id:
                result.errors.append(f"{fid}: epic {epic} does not exist")
            effort = fm.get("effort", "")
            if effort and effort not in EFFORTS:
                result.errors.append(f"{fid}: effort must be low|med|high, got '{effort}'")
            change = fm.get("change", "").strip()
            if change:
                if change not in by_id:
                    result.errors.append(f"{fid}: change {change} does not exist")
                else:
                    listed = parse_list(by_id[change][1].get("reqs"))
                    if fid not in listed:
                        result.warnings.append(
                            f"{fid} lists change {change}, but {change} does not list reqs: [{fid}]"
                        )

        if kind == "CTX":
            level = fm.get("level", "")
            if level and level not in CTX_LEVELS:
                result.errors.append(f"{fid}: level must be company|project|plan, got '{level}'")
            kind_v = fm.get("kind", "")
            if kind_v and kind_v not in CTX_KINDS:
                result.errors.append(f"{fid}: kind must be code|business, got '{kind_v}'")
            typ = fm.get("type", "")
            if typ and typ not in CTX_TYPES:
                result.errors.append(f"{fid}: type must be a known source type, got '{typ}'")

        if kind == "TASK":
            req = fm.get("req", "")
            if not req:
                result.errors.append(f"{fid} in {path}: req is required")
            elif req not in by_id:
                result.errors.append(f"{fid} in {path}: req {req} does not exist")
            elif type_of(by_id[req][1]["id"]) != "REQ":
                result.errors.append(f"{fid} in {path}: req {req} is not a REQ")

        if kind == "CHANGE":
            slug = fm.get("slug", "")
            if slug and not SLUG_RE.match(slug):
                result.errors.append(f"{fid}: slug must be kebab-case, got '{slug}'")
            skip = is_true(fm.get("skip_specs"))
            domains = parse_list(fm.get("deltas"))
            if not skip and not domains:
                result.errors.append(
                    f"{fid}: deltas must list at least one domain unless skip_specs: true"
                )
            for domain in domains:
                found = delta_file(path.parent, domain)
                if not found:
                    result.errors.append(f"{fid}: missing delta file for domain '{domain}'")
                else:
                    dtext = found.read_text(encoding="utf-8")
                    if not DELTA_SECTION_RE.search(dtext):
                        result.errors.append(
                            f"{fid}: {found.name} needs ## ADDED|MODIFIED|REMOVED Requirements"
                        )
                    elif not REQ_HEADING_RE.search(dtext):
                        result.errors.append(
                            f"{fid}: {found.name} needs at least one ### Requirement:"
                        )
            for req_id in parse_list(fm.get("reqs")):
                if req_id not in by_id:
                    result.errors.append(f"{fid}: reqs lists {req_id} which does not exist")
                else:
                    linked = by_id[req_id][1].get("change", "").strip()
                    if linked and linked != fid:
                        result.errors.append(
                            f"{fid}: {req_id} points at change {linked}, not {fid}"
                        )
                    elif not linked:
                        result.warnings.append(
                            f"{fid} lists {req_id} but {req_id} has no change: {fid}"
                        )

        for relation, reverse in (("blocked_by", "blocks"), ("blocks", "blocked_by")):
            for other in parse_list(fm.get(relation)):
                target = dependency_id(fm, other)
                if target is None:
                    result.errors.append(
                        f"{fid}: {relation} {other} must reference TASKs in the same REQ; parent readiness is checked separately"
                    )
                elif target not in by_id:
                    result.errors.append(f"{fid}: {relation} {other} does not exist")
                else:
                    other_fm = by_id[target][1]
                    reverse_ids = [
                        dependency_id(other_fm, value)
                        for value in parse_list(other_fm.get(reverse))
                    ]
                    if fid not in reverse_ids:
                        local = fm["id"] if kind == "TASK" and type_of(other_fm["id"]) == "TASK" else fid
                        result.warnings.append(
                            f"{fid} lists {relation} {other}, but {target} does not list {reverse}: [{local}]"
                        )

    cycle = has_cycle(blocker_edges(artifacts))
    if cycle:
        result.errors.append("dependency cycle: " + " → ".join(cycle))

    index = root / "INDEX.md"
    if not index.exists():
        result.errors.append("missing INDEX.md")
    else:
        index_text = index.read_text(encoding="utf-8")
        for fid, (path, _fm) in by_id.items():
            if fid in {"PROJECT", "PLATFORM"} or fid.startswith("CTX-"):
                continue
            if fid.startswith("VERIFY-REQ"):
                continue
            if type_of(fid) == "CHANGE" and is_archived_change(path):
                continue
            if fid not in index_text:
                result.warnings.append(f"{fid} not mentioned in INDEX.md")
    return result
