from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from .pipelines import load_pipeline

RUN_NAME = "current.json"


def run_path(root: Path) -> Path:
    return root / "runs" / RUN_NAME


def load_run(root: Path) -> dict | None:
    path = run_path(root)
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_run(root: Path, data: dict) -> Path:
    path = run_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return path


def start_run(
    root: Path,
    pipeline: str,
    *,
    change: str = "",
    gates: str = "on",
    selection: str = "manual",
    intent: str = "",
) -> dict:
    spec = load_pipeline(pipeline)
    first = spec["stages"][0]["id"] if spec.get("stages") else ""
    data = {
        "pipeline": pipeline,
        "change": change,
        "intent": intent,
        "stage": first,
        "status": "running",
        "completed": [],
        "gates": [],
        "policy": {"gates": gates, "selection": selection},
        "started": dt.date.today().isoformat(),
        "updated": dt.date.today().isoformat(),
    }
    save_run(root, data)
    return data


def advance_run(root: Path, *, approve_gate: bool = False) -> dict:
    data = load_run(root)
    if not data:
        raise FileNotFoundError("no current run")
    spec = load_pipeline(data["pipeline"])
    stages = spec.get("stages") or []
    ids = [s["id"] for s in stages]
    current = data.get("stage")
    if current not in ids:
        raise ValueError(f"run stage {current!r} is not in {data['pipeline']}")
    stage = next(s for s in stages if s["id"] == current)
    if stage.get("gate") is True and data.get("policy", {}).get("gates") == "on":
        if not approve_gate:
            data["status"] = "paused"
            data["gates"].append(
                {
                    "stage": current,
                    "decision": "waiting",
                    "source": "gate:on",
                }
            )
            save_run(root, data)
            return data
        data["gates"].append(
            {"stage": current, "decision": "approved", "source": "human"}
        )
    elif stage.get("gate") == "vet":
        if not approve_gate:
            data["status"] = "paused"
            data["gates"].append(
                {"stage": current, "decision": "vet-waiting", "source": "gate:vet"}
            )
            save_run(root, data)
            return data
        data["gates"].append({"stage": current, "decision": "vetted", "source": "human"})
    elif stage.get("gate") is True:
        data["gates"].append(
            {
                "stage": current,
                "decision": "auto-approved",
                "source": f"gates:{data.get('policy', {}).get('gates')}",
            }
        )
    done = list(data.get("completed") or [])
    if current not in done:
        done.append(current)
    data["completed"] = done
    idx = ids.index(current)
    if idx + 1 >= len(ids):
        data["status"] = "done"
        data["stage"] = current
    else:
        data["stage"] = ids[idx + 1]
        data["status"] = "running"
    data["updated"] = dt.date.today().isoformat()
    save_run(root, data)
    return data
