"""Deterministic pipeline classifier. Keyword heuristic, not a score."""

from __future__ import annotations

INDICATORS: list[tuple[str, tuple[str, ...]]] = [
    (
        "bug-fix",
        ("bug", "crash", "fix", "hotfix", "regression", "broken", "error", "fail", "exception"),
    ),
    (
        "goal-measure",
        ("lighthouse", "latency", "p95", "p99", "throughput", "score", "budget", "perf"),
    ),
    (
        "goal-evaluate",
        ("rubric", "quality bar", "lint debt", "cleanup", "clean up", "evaluate"),
    ),
    (
        "goal-research",
        ("research", "investigate", "spike", "compare options", "brief me"),
    ),
    (
        "auto-decompose",
        (
            "and also",
            "multiple",
            "all of",
            "migrate everything",
            "decompose",
            "split this",
            "whole system",
        ),
    ),
    (
        "full-feature",
        (
            "dark mode",
            "authentication",
            "payments",
            "redesign",
            "architecture",
            "full feature",
            "end to end",
        ),
    ),
]


def classify(text: str) -> dict:
    hay = (text or "").lower()
    for name, words in INDICATORS:
        matched = [w for w in words if w in hay]
        if matched:
            return {
                "pipeline": name,
                "basis": "keyword",
                "matched": matched,
                "reason": f"{name} — matched: {', '.join(matched)}",
            }
    return {
        "pipeline": "small-feature",
        "basis": "default",
        "matched": [],
        "reason": "small-feature — no keyword match",
    }
