from __future__ import annotations

import json
from pathlib import Path


def plugin_root() -> Path:
    return Path(__file__).resolve().parents[2]


def pipelines_dir() -> Path:
    return plugin_root() / "pipelines"


def list_pipelines() -> list[dict]:
    out: list[dict] = []
    folder = pipelines_dir()
    if not folder.is_dir():
        return out
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["_file"] = str(path)
        out.append(data)
    return out


def load_pipeline(name: str) -> dict:
    path = pipelines_dir() / f"{name}.json"
    if not path.is_file():
        raise FileNotFoundError(f"unknown pipeline: {name}")
    data = json.loads(path.read_text(encoding="utf-8"))
    stages = data.get("stages") or []
    ids = [s.get("id") for s in stages]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{name}: duplicate stage ids")
    by_id = {s["id"]: s for s in stages}
    for stage in stages:
        for req in stage.get("requires") or []:
            if req not in by_id:
                raise ValueError(f"{name}: stage {stage['id']} requires unknown {req}")
    if data.get("origin") == "composed":
        roles = {s.get("role") for s in stages}
        loops = [s for s in stages if (s.get("loop") or {}).get("kind") == "review-cycle"]
        if "reviewer" not in roles or not loops:
            raise ValueError(
                f"{name}: composed pipelines need a reviewer stage and a review-cycle loop"
            )
    return data
