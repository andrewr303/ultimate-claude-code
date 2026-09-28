"""Planning template/graph contracts, not model obedience or host integration tests."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from planlib.board import write_index  # noqa: E402
from planlib.graph import next_action  # noqa: E402
from planlib.parse import collect, parse_frontmatter, parse_list  # noqa: E402
from planlib.validate import validate_tree  # noqa: E402

SKILLS = {
    "plan-frame": "frame",
    "plan-propose": "propose",
    "req-specify": "specify",
    "req-scope": "scope",
    "plan-design": "design",
}
REQ_KEYS = {
    "id", "title", "epic", "spec", "status", "readiness", "effort",
    "readiness_gaps", "blocked_by", "blocks", "priority", "source", "change",
    "stack", "linear", "created", "updated",
}
TASK_KEYS = {
    "id", "req", "title", "status", "blocked_by", "blocks", "ac", "created", "updated",
}
AC_RE = re.compile(r"^- \*\*(AC-\d+)\*\* (Given .+)$", re.M)
SCENARIO_KINDS = ("positive", "negative", "edge")
OUTCOMES = (
    (
        "Save an owned note",
        (
            'Given an authenticated owner, When they save title "Alpha", Then a 201 response returns their stored note.',
            'Given another owner\'s notebook, When a user tries to save to it, Then a 403 response leaves it unchanged.',
            'Given an authenticated owner, When they save an empty title, Then a 422 response creates no note.',
        ),
    ),
    (
        "List owned notes",
        (
            'Given an owner with one note titled "Alpha", When they list notes, Then a 200 response contains only that note.',
            'Given an anonymous caller, When they list notes, Then a 401 response contains no note data.',
            'Given an owner with no notes, When they list notes, Then a 200 response contains an empty notes array.',
        ),
    ),
)


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def section(text: str, heading: str) -> str:
    match = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    if match is None:
        raise AssertionError(f"missing section: {heading}")
    return match.group(1).strip()


def headings(text: str) -> set[str]:
    return set(re.findall(r"^## (.+)$", text, re.M))


def render(name: str, fields: dict[str, str], sections: dict[str, str]) -> str:
    """Fill real templates without replacing or adding their machine keys."""
    text = read(f"templates/{name}.md")
    if fields:
        match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if match is None:
            raise AssertionError(f"{name} has no frontmatter")
        frontmatter = match.group(1)
        for key, value in fields.items():
            frontmatter, count = re.subn(
                rf"^{re.escape(key)}:.*$", lambda _: f"{key}: {value}", frontmatter, flags=re.M
            )
            if count != 1:
                raise AssertionError(f"{name}: expected existing key {key}, got {count}")
        text = f"---\n{frontmatter}\n---\n" + text[match.end():]
    for heading, body in sections.items():
        pattern = rf"(^## {re.escape(heading)}\n).*?(?=^## |\Z)"
        text, count = re.subn(
            pattern, lambda m: m.group(1) + "\n" + body.strip() + "\n\n", text, flags=re.M | re.S
        )
        if count != 1:
            raise AssertionError(f"{name}: expected existing section {heading}, got {count}")
    return text.replace("YYYY-MM-DD", "2026-01-01")


def ownership_errors(parent: str, tasks: list[tuple[str, dict[str, str], str]]) -> list[str]:
    """Test-only prose check: planlib validation does not enforce AC ownership."""
    parent_ac = dict(AC_RE.findall(section(parent, "Acceptance Criteria")))
    owners: Counter[str] = Counter()
    errors = []
    for label, fm, text in tasks:
        if fm.get("status") == "cancelled":
            continue
        owned = parse_list(fm.get("ac"))
        copied = AC_RE.findall(section(text, "Acceptance criteria owned"))
        if Counter(owned) != Counter(ac for ac, _ in copied):
            errors.append(f"body-ownership: {label}")
        for ac in owned:
            owners[ac] += 1
            if ac not in parent_ac:
                errors.append(f"unknown: {label}/{ac}")
            elif dict(copied).get(ac) != parent_ac[ac]:
                errors.append(f"not-verbatim: {label}/{ac}")
    for ac in parent_ac:
        if owners[ac] != 1:
            errors.append(f"owner-count: {ac} has {owners[ac]}")
    return errors


class TemplateContracts(unittest.TestCase):
    def test_skill_names_namespaces_and_referenced_resources(self) -> None:
        for name, command in SKILLS.items():
            with self.subTest(skill=name):
                text = read(f"skills/{name}/SKILL.md")
                self.assertEqual(parse_frontmatter(text)["name"], name)
                self.assertIn(f"/ultimate-sdd:{command}", text)
                self.assertNotRegex(text, r"/(?:prd|opsx|rasen):")
                for required in ("references/spec-quality.md", "templates/artifact-review.md"):
                    self.assertIn(required, text)
                resources = re.findall(r"`((?:references|templates)/[\w/-]+\.md)`", text)
                self.assertTrue(resources)
                for resource in resources:
                    self.assertTrue((ROOT / resource).is_file(), resource)
        self.assertIn("templates/change-design.md", read("skills/plan-design/SKILL.md"))
        self.assertIn("plan-design", read("skills/req-specify/SKILL.md"))
        self.assertIn("plan-design", read("skills/plan-propose/SKILL.md"))

    def test_shared_context_and_cli_contract_paths(self) -> None:
        text = read("references/spec-quality.md")
        self.assertIn("docs/plan/config.json", text)
        self.assertIn("docs/plan/workflow.md", text)
        self.assertRegex(text, r"scripts/sdd\.py config --repo \S+ --root docs/plan --json")
        for option in ("schema_version", "execution_mode", "parallelism", "tdd",
                       "max_review_rounds", "test_commands", "hooks.enabled"):
            self.assertIn(option, text)
        for command in ("board --root docs/plan --write", "validate --root docs/plan",
                        "next --root docs/plan --json"):
            self.assertIn(f"scripts/plan.py {command}", text)
        self.assertIn("verify/artifacts/", text)

    def test_req_preserves_machine_keys_and_quality_sections(self) -> None:
        text = read("templates/req-template.md")
        fm = parse_frontmatter(text)
        self.assertEqual(set(fm), REQ_KEYS)
        self.assertEqual(fm["id"], "REQ-1")
        self.assertEqual(fm["readiness"], "1")
        self.assertTrue({
            "Overview", "Problem Statement", "Solution", "UI Layout",
            "Functional Requirements", "Constraints from platform", "Env & config",
            "Out of scope", "Acceptance Criteria", "Readiness", "Changelog",
            "Planning inputs", "Source and decision trace", "Coverage", "Non-functional requirements",
        }.issubset(headings(text)))
        inputs = section(text, "Planning inputs")
        for field in ("Config:", "Workflow:", "Design:"):
            self.assertIn(field, inputs)
        trace = section(text, "Source and decision trace")
        for field in ("D-1", "Source / evidence", "Affected FR / AC", "Rationale", "agreed|assumed|unresolved"):
            self.assertIn(field, trace)
        coverage = section(text, "Coverage")
        for field in ("FR", "Decision / source", "Scenario kinds", "AC IDs", "Verification method"):
            self.assertIn(field, coverage)
        for field in ("Build-blockers:", "Artifact review:", "Separate load gates:"):
            self.assertIn(field, section(text, "Readiness"))

    def test_req_scenarios_have_all_three_kinds_and_gwt(self) -> None:
        functional = section(read("templates/req-template.md"), "Functional Requirements")
        scenarios = re.findall(
            r"^#### Scenario: (\w+)[^\n]*\n(.*?)(?=^#### |\Z)", functional, re.M | re.S
        )
        self.assertEqual({kind for kind, _ in scenarios}, set(SCENARIO_KINDS))
        for kind, body in scenarios:
            with self.subTest(kind=kind):
                for keyword in ("GIVEN", "WHEN", "THEN"):
                    self.assertRegex(body, rf"(?m)^- {keyword} \S")
        for _, criterion in AC_RE.findall(section(read("templates/req-template.md"), "Acceptance Criteria")):
            self.assertRegex(criterion, r"^Given .+, When .+, Then .+")

    def test_task_outcome_metadata_and_verification_fields(self) -> None:
        text = read("templates/task-template.md")
        fm = parse_frontmatter(text)
        self.assertEqual(set(fm), TASK_KEYS)
        self.assertEqual(parse_list(fm["ac"]), ["AC-1"])
        self.assertTrue({
            "Goal", "Slice", "Context", "File scope and integration", "Steps",
            "Acceptance criteria owned", "Verify", "Evidence", "Send-back",
        }.issubset(headings(text)))
        for field in ("vertical|enabling", "Enabling rationale:", "Consumer:"):
            self.assertIn(field, section(text, "Slice"))
        for field in ("Config:", "Workflow:", "Design:"):
            self.assertIn(field, section(text, "Context"))
        steps = section(text, "Steps")
        self.assertRegex(steps, r"(?i)tests?/")
        self.assertRegex(steps, r"(?i)documentation")
        verify = section(text, "Verify")
        for field in ("Owned AC", "Method", "Source / cwd", "Prerequisites", "Expected result"):
            self.assertIn(field, verify)
        self.assertRegex(section(text, "Evidence"), r"(?m)^\| AC-n \|\s*\|\s*\|$")

    def test_design_is_no_id_sidecar_with_architecture_concerns(self) -> None:
        text = read("templates/change-design.md")
        self.assertEqual(parse_frontmatter(text), {})
        self.assertTrue({
            "Target and sources", "Context", "Goals / Non-Goals", "Options", "Selected architecture",
            "Decisions", "Failure behavior", "Security and privacy", "Migration and compatibility",
            "Rollout and rollback", "Testing strategy", "Risks / Trade-offs", "File changes",
            "Open questions and assumptions", "Artifact review",
        }.issubset(headings(text)))
        self.assertIn("Affected FR / AC / delta", section(text, "Decisions"))
        self.assertIn("Data flow / ownership:", section(text, "Selected architecture"))
        # UI applicability and architecture are independently represented, not one shared skip field.
        req = read("templates/req-template.md")
        self.assertIn("Design:", section(req, "Planning inputs"))
        self.assertIn("UI Layout", headings(req))
        self.assertNotRegex(req, r"(?i)Design\s*/\s*UI Layout|Design skipped")

    def test_review_template_has_bounded_readonly_input_output_contract(self) -> None:
        text = read("templates/artifact-review.md")
        self.assertEqual(parse_frontmatter(text), {})
        self.assertTrue({
            "Writer / parent inputs", "Read-only reviewer prompt", "Structured report",
            "Writer / parent handling",
        }.issubset(headings(text)))
        for field in ("Artifact paths:", "Author:", "Reviewer:", "Independence / availability:",
                      "Upstream paths:", "Source / decision paths:", "Template / quality inputs:",
                      "Config / workflow inputs:", "Round / limit:"):
            self.assertIn(field, section(text, "Writer / parent inputs"))
        report = section(text, "Structured report")
        for field in ("pass|needs-work|pending", "Overflow:", "Category", "Location", "Source",
                      "Impact", "Concrete fix", "Recheck evidence needed", "Dispositions and follow-up"):
            self.assertIn(field, report)
        limit = re.search(r"^### Findings \(maximum (\d+)\)$", report, re.M)
        self.assertIsNotNone(limit)
        self.assertEqual(int(limit.group(1)), 5)
        self.assertIn("max_review_rounds", section(text, "Writer / parent handling"))


class RenderedPlanningGraph(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="planning-contract-", dir=ROOT)
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.root = self.repo / "docs" / "plan"
        self.root.mkdir(parents=True)
        self.write("project.md", "---\nid: PROJECT\ntitle: Notes fixture\nstatus: active\n---\n")
        self.write("briefs/BRIEF-1-notes.md", "---\nid: BRIEF-1\ntitle: Notes\nstatus: aligned\n---\n\nSynthetic fixture: owners save and list their own notes.\n")
        self.write("epics/EPIC-1-notes.md", "---\nid: EPIC-1\ntitle: Notes\nstatus: ready\nspec: SPEC-1\nreqs: [REQ-1]\n---\n")
        self.write("context/platform.md", "# Fixture platform\n\nSynthetic note service and owner-scoped store; no application checks run.\n")
        self.write("workflow.md", "# Fixture verification\n\nFor each AC, observe response status/payload and stored records using isolated owners. These are planned observations, not test results.\n")
        self.req_path = self.root / "reqs" / "REQ-1-notes.md"

    def write(self, relative: str, text: str) -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def make_req(self, readiness: int = 4, change: bool = False) -> str:
        criteria = [criterion for _, group in OUTCOMES for criterion in group]
        ac_text = "\n".join(f"- **AC-{i}** {criterion}" for i, criterion in enumerate(criteria, 1))
        functional = []
        for i, (name, group) in enumerate(OUTCOMES, 1):
            functional.append(f"### FR-{i}: {name}\n\nThe system SHALL {name.lower()}.\n\n- Decision/source: D-{i} / BRIEF-1\n")
            for kind, criterion in zip(SCENARIO_KINDS, group):
                given, when, then = re.fullmatch(r"Given (.*), When (.*), Then (.*)", criterion).groups()
                functional.append(f"#### Scenario: {kind} — {name}\n- GIVEN {given}\n- WHEN {when}\n- THEN {then}\n")
        text = render("req-template", {
            "title": "Owned notes", "readiness": str(readiness),
            "status": "ready" if readiness >= 4 else "specified",
            "readiness_gaps": "[]" if readiness >= 4 else "[Resolve owner-store contract]",
            "source": "BRIEF-1", "change": "CHANGE-1" if change else "", "stack": "fixture",
        }, {
            "Overview": "Owners save and list notes through an owner-scoped service.",
            "Problem Statement": "Owners need durable notes without exposing other owners' records.",
            "Solution": "Extend the existing synthetic note service and store within the same access boundary.",
            "Planning inputs": "- Upstream: BRIEF-1 / EPIC-1\n- Context: context/platform.md\n- Config: runtime validation is not exercised by this structural fixture\n- Workflow: workflow.md\n- Design: reqs/REQ-1-design.md when present",
            "Source and decision trace": "| Decision | Source / evidence | Status | Affected FR / AC | Rationale |\n|---|---|---|---|---|\n| D-1: Save owned notes | BRIEF-1 (synthetic) | agreed | FR-1 / AC-1, AC-2, AC-3 | Owner isolation |\n| D-2: List owned notes | BRIEF-1 (synthetic) | agreed | FR-2 / AC-4, AC-5, AC-6 | Same access boundary |",
            "UI Layout": "Infrastructure-only — no UI screens. Owner-store architecture is defined separately.",
            "Functional Requirements": "\n".join(functional),
            "Non-functional requirements": "No cross-owner data exposure: observe zero foreign records in every AC response and store inspection under workflow.md.",
            "Constraints from platform": "Use the existing note service and owner-scoped store. No new dependencies. Migration: N/A, existing store unchanged.",
            "Env & config": "No secret keys required by this synthetic fixture.",
            "Out of scope": "Public sharing and note deletion.",
            "Acceptance Criteria": ac_text,
            "Coverage": "| FR | Decision / source | Scenario kinds | AC IDs | Verification method |\n|---|---|---|---|---|\n| FR-1 | D-1 / BRIEF-1 | positive / negative / edge | AC-1, AC-2, AC-3 | workflow.md observations |\n| FR-2 | D-2 / BRIEF-1 | positive / negative / edge | AC-4, AC-5, AC-6 | workflow.md observations |",
            "Readiness": f"**Score: {readiness}/5**\n\nBuild-blockers: {'none in the graph fixture' if readiness >= 4 else 'owner-store contract unresolved'}\nArtifact review: pending; structural fixture is not a model review.",
            "Changelog": "| Date | Change |\n|---|---|\n| 2026-01-01 | Synthetic planning fixture |",
        }).replace("<Name>", "Owned notes")
        self.write("reqs/REQ-1-notes.md", text)
        return text

    def make_tasks(self) -> list[Path]:
        paths = []
        for i, (goal, criteria) in enumerate(OUTCOMES, 1):
            ids = [f"AC-{(i - 1) * 3 + j}" for j in range(1, 4)]
            text = render("task-template", {
                "id": f"TASK-{i}", "title": goal, "status": "ready" if i == 1 else "blocked",
                "ac": f"[{', '.join(ids)}]", "blocked_by": "[]" if i == 1 else "[TASK-1]",
                "blocks": "[TASK-2]" if i == 1 else "[]",
            }, {
                "Goal": f"{goal}; response and persisted state meet this slice's three owned AC.",
                "Slice": "- Kind: vertical\n- Enabling rationale: N/A\n- Consumer: N/A",
                "Context": f"- Parent: REQ-1 / FR-{i} / D-{i}\n- Config: structural fixture, no runtime config validation\n- Workflow: workflow.md\n- Design: reqs/REQ-1-design.md when present\n- Reuse: note service and store\n- Do not: add sharing or deletion",
                "File scope and integration": f"| Owned file / surface | Change | Integration seam |\n|---|---|---|\n| src/notes.py | {goal} | owner-scoped store |\n| tests/test_notes_{i}.py | owned checks | isolated owners |\n| docs/notes-{i}.md | outcome documentation | consumers |\n\n- Parallelism: serial; both slices extend src/notes.py, and listing consumes saved records.",
                "Steps": f"1. Add this outcome's positive/negative/edge checks with isolated owners during implementation.\n2. Implement {goal.lower()} in the existing service/store.\n3. Update docs/notes-{i}.md for this outcome.\n4. Observe status/payload and stored records using workflow.md; do not run during planning.",
                "Acceptance criteria owned": "\n".join(f"- **{ac}** {criterion}" for ac, criterion in zip(ids, criteria)),
                "Verify": "| Owned AC | Method | Source / cwd | Prerequisites | Expected result |\n|---|---|---|---|---|\n" + "\n".join(f"| {ac} | Observe response and stored records | workflow.md / target repo | isolated owners and authorized implementation | {criterion.split(', Then ')[1]} |" for ac, criterion in zip(ids, criteria)),
                "Evidence": "Planning only — not run.\n\n| Owned AC | Actual result | Proof |\n|---|---|---|\n" + "\n".join(f"| {ac} | | |" for ac in ids),
            }).replace("# REQ-1 / TASK-1", f"# REQ-1 / TASK-{i}").replace("<Name>", goal)
            paths.append(self.write(f"tasks/REQ-1/TASK-{i}-notes.md", text))
        return paths

    def make_change(self) -> None:
        text = render("change-template", {
            "title": "Owned notes", "slug": "owned-notes", "reqs": "[REQ-1]", "deltas": "[notes]",
        }, {
            "Why": "Owners need private notes.", "What Changes": "Save and list owned notes.",
            "Capabilities": "### New Capabilities\n\n- notes: private notes\n\n### Modified Capabilities\n\nNone.",
            "Impact": "Note owners.", "Out of scope": "Sharing and deletion.",
            "Approach": "Behavior only; see REQ-1 and design.md for technical choices.",
        }).replace("<Title>", "Owned notes")
        self.write("changes/owned-notes/CHANGE.md", text)
        self.write("changes/owned-notes/deltas/notes.md", "## Purpose\n\nOwners keep private notes.\n\n## ADDED Requirements\n\n### Requirement: Owned notes\nThe system SHALL let owners save and list only their own notes.\n\n#### Scenario: Read owned note\n- GIVEN an owner with a saved note\n- WHEN they list notes\n- THEN only their own note is returned\n\n#### Scenario: Other owner denied\n- GIVEN another owner's notebook\n- WHEN a user attempts to save to it\n- THEN no note is saved\n\n#### Scenario: Empty notebook\n- GIVEN an owner without notes\n- WHEN they list notes\n- THEN the list is empty\n")

    def make_sidecars(self) -> list[Path]:
        design = render("change-design", {}, {
            "Target and sources": "- Target: REQ-1 / reqs/REQ-1-notes.md\n- Upstream: CHANGE-1 / BRIEF-1\n- Evidence: context/platform.md\n- Config / workflow: workflow.md; config runtime not part of this test",
            "Context": "Reuse the synthetic owner-scoped note store.",
            "Goals / Non-Goals": "Goals: isolated save/list. Non-goals: sharing or deletion.",
            "Options": "One existing store pattern satisfies the contract; no artificial alternative.",
            "Selected architecture": "The note service owns validation; the store owns owner-scoped records. No new dependencies.",
            "Decisions": "D-1 / BRIEF-1 / FR-1, FR-2 / AC-1 through AC-6: reuse owner scope; synthetic agreed decision, avoids duplicate stores.",
            "Failure behavior": "403 forbidden writes, 401 anonymous reads, 422 empty titles; no writes on failure.",
            "Security and privacy": "Access is owner-scoped on every operation; no shared cache.",
            "Migration and compatibility": "N/A — existing store format is unchanged.",
            "Rollout and rollback": "Preserve existing records when reverting the service implementation; no destructive migration.",
            "Testing strategy": "workflow.md observations with isolated owners cover positive, negative, and empty boundaries; not executed.",
            "Risks / Trade-offs": "Shared file scope requires serial tasks; no concurrent edits to src/notes.py.",
            "File changes": "src/notes.py, owned test files, and per-outcome docs; TASK-2 consumes saved records from TASK-1.",
            "Open questions and assumptions": "No architecture question in this synthetic fixture; not evidence of product readiness.",
            "Artifact review": "pending — no independent reviewer ran in this structural test.",
        }).replace("<REQ or CHANGE title>", "Owned notes")
        review = render("artifact-review", {}, {
            "Writer / parent inputs": "- Target / artifact kind / stage: REQ-1 / TASK set + parent / scope\n- Artifact paths: reqs/REQ-1-notes.md; tasks/REQ-1/\n- Author: synthetic fixture\n- Reviewer: none\n- Independence / availability: unavailable\n- Upstream paths: BRIEF-1; CHANGE-1\n- Source / decision paths: context/platform.md\n- Template / quality inputs: task-template.md; spec-quality.md\n- Config / workflow inputs: workflow.md; runtime config not exercised\n- Round / limit: unavailable",
            "Structured report": "- Target: REQ-1 scope\n- Reviewer: none\n- Independence: unavailable\n- Verdict: pending\n- Overflow: false\n\n### Findings (maximum 5)\n\nNone assessed; this is not an independent pass.\n\n### Dispositions and follow-up\n\nIndependent review pending. No runtime implementation evidence.",
        }).replace("<target / stage>", "REQ-1 / scope")
        return [
            self.write("reqs/REQ-1-design.md", design),
            self.write("changes/owned-notes/design.md", design.replace("Target: REQ-1 / reqs/REQ-1-notes.md", "Target: CHANGE-1 / changes/owned-notes/CHANGE.md")),
            self.write("verify/artifacts/REQ-1-scope-review.md", review),
        ]

    def parsed_tasks(self) -> list[tuple[str, dict[str, str], str]]:
        return [
            (fm["id"], fm, path.read_text(encoding="utf-8"))
            for path, fm in collect(self.root) if fm["id"].startswith("TASK-")
        ]

    def assert_valid(self) -> None:
        write_index(self.root)
        result = validate_tree(self.root)
        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.warnings, [], result.warnings)

    def test_filled_two_slice_graph_validates_and_derives_load(self) -> None:
        self.make_req()
        self.make_tasks()
        self.assert_valid()
        self.assertEqual(next_action(self.root, collect(self.root))["target"], "REQ-1/TASK-1")
        self.assertEqual(next_action(self.root, collect(self.root))["action"], "load")
        for _, fm, _ in self.parsed_tasks():
            self.assertEqual(set(fm), TASK_KEYS)

    def test_enabling_migration_slice_validates_and_precedes_consumer(self) -> None:
        parent = self.make_req()
        task_paths = self.make_tasks()
        criteria = {
            "AC-7": "Given a version 1 store with owned notes, When the forward migration runs, Then the store is version 2 and every id, owner and title is unchanged.",
            "AC-8": "Given a migrated version 2 store, When rollback runs, Then the store is version 1 and every id, owner and title matches the pre-migration snapshot.",
            "AC-9": "Given a store with unsupported version 99, When the forward migration is requested, Then it refuses without changing the version or any record.",
            "AC-10": "Given an empty version 1 store, When forward migration and rollback run, Then the store returns to version 1 with zero records.",
        }
        methods = {
            "AC-7": "Snapshot owned records; migrate forward; compare version and all record tuples",
            "AC-8": "Roll back a migrated copy; compare version and record tuples to the original snapshot",
            "AC-9": "Request migration on a version 99 copy; compare the entire store before and after refusal",
            "AC-10": "Migrate and roll back an empty store; inspect final version and record count",
        }
        workflow = (self.root / "workflow.md").read_text(encoding="utf-8")
        self.write("workflow.md", workflow + (
            "\n## Store migration\n\nSynthetic release prerequisite: rehearse forward migration and rollback "
            "in the maintenance window while the legacy service remains deployed, before TASK-1 writes to version 2. "
            "Version 2 adds a store-format marker; existing note id, owner and title values must survive both directions.\n\n"
            "Use isolated populated, unsupported-version and empty store copies. Snapshot all record tuples and "
            "store version before each observation. These methods are planned, not executed:\n\n"
            + "\n".join(f"- {ac}: {method}." for ac, method in methods.items()) + "\n"
        ))
        migration_fr = (
            "### FR-3: Reversible note-store migration\n\n"
            "The system SHALL migrate the note store from version 1 to version 2 and back without changing "
            "existing note id, owner or title values, rejecting unsupported versions without mutation.\n\n"
            "- Decision/source: D-3 / workflow.md#store-migration\n"
        )
        for kind, (ac, criterion) in zip(("positive", "positive", "negative", "edge"), criteria.items()):
            given, when, then = re.fullmatch(r"Given (.*), When (.*), Then (.*)", criterion).groups()
            migration_fr += f"\n#### Scenario: {kind} — {ac}\n- GIVEN {given}\n- WHEN {when}\n- THEN {then}\n"
        owned_ac = "\n".join(f"- **{ac}** {criterion}" for ac, criterion in criteria.items())
        ac_ids = ", ".join(criteria)
        updates = {
            "Functional Requirements": section(parent, "Functional Requirements") + "\n\n" + migration_fr,
            "Acceptance Criteria": section(parent, "Acceptance Criteria") + "\n" + owned_ac,
            "Source and decision trace": section(parent, "Source and decision trace") + f"\n| D-3: Reversible store migration | workflow.md#store-migration (synthetic) | agreed | FR-3 / {ac_ids} | Separate maintenance rehearsal before new writes |",
            "Coverage": section(parent, "Coverage") + f"\n| FR-3 | D-3 / workflow.md#store-migration | positive / negative / edge | {ac_ids} | Snapshot/version comparisons in workflow.md |",
            "Constraints from platform": "Use the existing owner-scoped note service. No new dependencies. Rehearse reversible version 1 to version 2 migration before TASK-1; preserve every note's id, owner and title in both directions.",
        }
        for heading, body in updates.items():
            parent = parent.replace(
                f"## {heading}\n\n{section(parent, heading)}",
                f"## {heading}\n\n{body.rstrip()}", 1,
            )
        self.write("reqs/REQ-1-notes.md", parent)

        prerequisite = render("task-template", {
            "id": "TASK-3", "title": "Reversible note-store migration", "status": "ready",
            "blocked_by": "[]", "blocks": "[TASK-1]", "ac": f"[{ac_ids}]",
        }, {
            "Goal": "Make the version 2 note store available with an independently verifiable round-trip preservation check before the save-note rollout.",
            "Slice": "- Kind: enabling\n- Enabling rationale: the forward/rollback rehearsal must finish in a separate maintenance window while the legacy service is still deployed, so it cannot be bundled with new writes. Store version and record snapshots prove the prerequisite independently.\n- Consumer: REQ-1/TASK-1 saves notes using the version 2 store.",
            "Context": "- Parent: REQ-1 / FR-3 / D-3\n- Config: structural fixture; runtime validation not exercised\n- Workflow: workflow.md#store-migration\n- Reuse: existing owner-scoped store\n- Do not: implement save/list behavior or claim another task's AC",
            "File scope and integration": "| Owned file / surface | Change | Integration seam |\n|---|---|---|\n| src/note_migration.py | reversible store-format migration | TASK-1 consumes version 2 |\n| tests/test_note_migration.py | snapshot preservation checks | isolated store copies |\n| docs/note-migration.md | maintenance and rollback procedure | rollout operator |\n\n- Parallelism: serial; TASK-1 requires this migration, and TASK-2 remains blocked by TASK-1.",
            "Steps": "1. Add forward, rollback, unsupported-version and empty-store checks using isolated snapshots during authorized implementation.\n2. Implement the version transition and no-mutation refusal in the migration module.\n3. Document the maintenance rehearsal, snapshot comparisons and rollback procedure in docs/note-migration.md.\n4. Observe the owned AC using workflow.md methods; do not run them during planning.",
            "Acceptance criteria owned": owned_ac,
            "Verify": "| Owned AC | Method | Source / cwd | Prerequisites | Expected result |\n|---|---|---|---|---|\n" + "\n".join(
                f"| {ac} | {methods[ac]} | workflow.md#store-migration / target repo | isolated store copies, baseline snapshots and authorized implementation | {criterion.split(', Then ')[1]} |"
                for ac, criterion in criteria.items()
            ),
            "Evidence": "Planning only — not run.\n\n| Owned AC | Actual result | Proof |\n|---|---|---|\n" + "\n".join(f"| {ac} | | |" for ac in criteria),
        }).replace("# REQ-1 / TASK-1", "# REQ-1 / TASK-3").replace("<Name>", "Reversible note-store migration")
        self.write("tasks/REQ-1/TASK-3-migration.md", prerequisite)
        consumer = task_paths[0].read_text(encoding="utf-8")
        consumer = consumer.replace("status: ready", "status: blocked", 1).replace(
            "blocked_by: []", "blocked_by: [TASK-3]", 1
        )
        integration = section(consumer, "File scope and integration")
        consumer = consumer.replace(integration, integration + "\n- Prerequisite: REQ-1/TASK-3 provides the verified version 2 store before this task enables new writes.", 1)
        self.write(task_paths[0].relative_to(self.root).as_posix(), consumer)

        self.assert_valid()
        tasks = self.parsed_tasks()
        metadata = {label: fm for label, fm, _ in tasks}
        self.assertEqual(set(metadata["TASK-3"]), TASK_KEYS)
        self.assertEqual(parse_list(metadata["TASK-3"]["ac"]), list(criteria))
        self.assertEqual(parse_list(metadata["TASK-3"]["blocks"]), ["TASK-1"])
        self.assertEqual(parse_list(metadata["TASK-1"]["blocked_by"]), ["TASK-3"])
        self.assertEqual(ownership_errors(parent, tasks), [])
        action = next_action(self.root, collect(self.root))
        self.assertEqual((action["action"], action["target"]), ("load", "REQ-1/TASK-3"))

    def test_ready_parent_without_tasks_derives_scope(self) -> None:
        self.make_req()
        self.assert_valid()
        action = next_action(self.root, collect(self.root))
        self.assertEqual((action["action"], action["target"]), ("scope", "REQ-1"))

    def test_parent_below_four_derives_specify_not_scope(self) -> None:
        for score in (1, 2, 3):
            with self.subTest(readiness=score):
                self.make_req(score)
                self.assert_valid()
                action = next_action(self.root, collect(self.root))
                self.assertEqual((action["action"], action["target"]), ("specify", "REQ-1"))

    def test_parent_below_four_derives_specify_not_load_with_ready_task(self) -> None:
        self.make_tasks()
        for score in (1, 2, 3):
            with self.subTest(readiness=score):
                self.make_req(score)
                self.assert_valid()
                action = next_action(self.root, collect(self.root))
                self.assertEqual((action["action"], action["target"]), ("specify", "REQ-1"))

    def test_design_and_review_sidecars_do_not_add_or_duplicate_graph_ids(self) -> None:
        self.make_req(change=True)
        self.make_tasks()
        self.make_change()
        before = {(path, fm["id"]) for path, fm in collect(self.root)}
        sidecars = self.make_sidecars()
        self.assertEqual({(path, fm["id"]) for path, fm in collect(self.root)}, before)
        for path in sidecars:
            self.assertEqual(parse_frontmatter(path.read_text(encoding="utf-8")), {})
        self.assertEqual(len(before), 7)  # PROJECT, BRIEF, EPIC, REQ, CHANGE and two TASKs.
        self.assert_valid()
        self.assertFalse(list((self.root / "verify").glob("*.reviews.json")))

    def test_each_owned_ac_resolves_verbatim_once_into_parent(self) -> None:
        parent = self.make_req()
        self.make_tasks()
        self.assertEqual(len(AC_RE.findall(section(parent, "Acceptance Criteria"))), 6)
        self.assertEqual(ownership_errors(parent, self.parsed_tasks()), [])
        for _, _, text in self.parsed_tasks():
            self.assertIn("Kind: vertical", section(text, "Slice"))
            self.assertIn("checks", section(text, "Steps"))
            self.assertIn("docs/", section(text, "Steps"))
            self.assertNotIn("passed", section(text, "Evidence").lower())

    def test_prose_ownership_check_detects_unknown_duplicate_and_changed_ac(self) -> None:
        parent = self.make_req()
        self.make_tasks()
        original = self.parsed_tasks()
        index = next(i for i, (label, _, _) in enumerate(original) if label == "TASK-2")
        label, fm, text = original[index]
        cases = (
            ("unknown", {**fm, "ac": "[AC-404, AC-5, AC-6]"}, text.replace("**AC-4**", "**AC-404**")),
            ("owner-count", {**fm, "ac": "[AC-1, AC-5, AC-6]"}, text.replace("**AC-4**", "**AC-1**")),
            ("not-verbatim", fm, text.replace("Then a 401 response contains no note data.", "Then access works.")),
        )
        for expected, changed_fm, changed_text in cases:
            with self.subTest(fault=expected):
                mutated = list(original)
                mutated[index] = (label, changed_fm, changed_text)
                self.assertTrue(any(error.startswith(expected + ":") for error in ownership_errors(parent, mutated)))

    def test_cli_index_validation_and_next_agree_with_planlib(self) -> None:
        self.make_req(change=True)
        self.make_tasks()
        self.make_change()
        self.make_sidecars()
        env = os.environ.copy()
        env.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTHONUTF8": "1"})
        env.update({key: str(self.repo) for key in ("TMP", "TEMP", "TMPDIR")})

        def cli(command: str, *args: str) -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                [sys.executable, str(SCRIPTS / "plan.py"), command, "--root", str(self.root), *args],
                cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8", timeout=30,
            )

        board = cli("board", "--write")
        self.assertEqual(board.returncode, 0, board.stdout + board.stderr)
        validation = cli("validate")
        self.assertEqual(validation.returncode, 0, validation.stdout + validation.stderr)
        nxt = cli("next", "--json")
        self.assertEqual(nxt.returncode, 0, nxt.stdout + nxt.stderr)
        expected = next_action(self.root, collect(self.root))
        self.assertEqual(json.loads(nxt.stdout), expected)
        self.assertIn(expected["command"], (self.root / "INDEX.md").read_text(encoding="utf-8"))
        self.assertTrue(validate_tree(self.root).ok)


if __name__ == "__main__":
    unittest.main()
