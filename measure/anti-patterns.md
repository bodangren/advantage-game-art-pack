# Anti-Patterns Registry

This catalogs orchestrator anti-patterns for this project (A1–AN scheme), seeded 2026-07-16 from the measure-orchestrator starter catalog; measure-orchestrator-audit appends new entries.

## A1 — Substring-as-structured-signal in supervisor

**Class:** orchestrator heuristic bypass
**Caught:** 2026-06-24 review of last-72h commits vs. measure phase state
**Detection:**
```bash
# Use Python to strip docstrings before matching (the false-positive on docstring
# mentions is itself a known failure mode of grep-based detection).
python3 -c '
import ast
import re
src = open("measure/automation-supervisor.py").read()
code = re.sub(r"\"\"\".*?\"\"\"", "", src, flags=re.DOTALL)
code = re.sub(r"'"'"'.*?'"'"'", "", code, flags=re.DOTALL)
tree = ast.parse(src)
matches = []
for node in ast.walk(tree):
    if not (isinstance(node, ast.Compare) and len(node.ops) == 1 and isinstance(node.ops[0], ast.In)):
        continue
    right = node.comparators[0]
    if (
        isinstance(node.left, ast.Constant)
        and node.left.value == "deferred"
        and isinstance(right, ast.Call)
        and isinstance(right.func, ast.Attribute)
        and right.func.attr == "lower"
        and isinstance(right.func.value, ast.Name)
        and right.func.value.id == "task"
    ):
        matches.append(node)
print(len(matches), "substring-match occurrences")
'
```

**Symptoms:** A `[~]` task with the substring "deferred" in its prose is silently dropped
from the incomplete-task count. Tracks can mark a task `[~]` *without* doing the work
and the supervisor still reports "complete."

**Fix:** Replace the substring check with a structured-signal helper
(`is_task_structurally_blocked(task)` in `measure/automation-supervisor.py`) that
recognizes:
- `[b]` (blocked / human-gated) checkbox state
- trailing `(deferred:<owner>)` field

A free-text occurrence of "deferred" no longer drops a task from the incomplete count.

**Guard:** `tests/mir_p1.sh` A1 in the `measure_integrity_remediation_20260624` track.

---

## A2 — Consent-blind publish gate

**Class:** orchestrator missing requirement
**Caught:** 2026-06-24 review
**Detection:**
```bash
for t in tests/*p4.sh tests/*_closeout.sh tests/cs_p*.sh; do
  if [ -f "$t" ]; then
    n=$(grep -Eic 'consent|anonym' "$t" 2>/dev/null || true)
    n=${n:-0}
    echo "$t: $n consent/anonymization references"
    [ "$n" = "0" ] && echo "  WARN: publish gate has no consent or anonymization check"
  fi
done
```

**Symptoms:** A test that flips a draft → published status does not check for consent
artifacts or anonymization. A named case study can be published without consent
verification.

**Fix:** For any "publish" gate in `tests/*p4.sh` or `tests/*_closeout.sh`, the gate must
require EITHER (a) explicit anonymization marker on the artifact, OR (b) a non-empty
`consent-<subject>.{md,pdf}` artifact with signatory + date.

**Guard:** `tests/cs_p4.sh` P4.1.

---

## A3 — Digit-only as a "labeled count"

**Class:** test fragility / vacuous assertion
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -n -e "rg -q ['\"]\[0-9\]\+['\"]" tests/*.sh
```

**Symptoms:** A test asserts a "count" or "baseline" with a regex that matches any digit
(`rg -q '[0-9]+'`). The test passes on a date, a year, or any digit anywhere in the
section.

**Fix:** Require a labeled integer — `rg 'Baseline relationship count:[[:space:]]*[0-9]+'`
and parse the integer.

**Guard:** `tests/mir_p1.sh` A3.

---

## A4 — Vacuous-pass on nothing-done

**Class:** test fragility / vacuous assertion
**Caught:** 2026-06-24 review
**Detection:**
```bash
for t in tests/mr_p1.sh tests/mr_p2.sh tests/mr_p3.sh tests/mr_p4.sh; do
  if [ -f "$t" ]; then
    if rg -n -e '\$TILDES.*-eq 0.*\|\|.*\$XES.*-eq 0|\$XES.*-eq 0.*\|\|.*\$TILDES.*-eq 0' "$t"; then
      echo "  $t: vacuous 'markers consistent' PASS"
    fi
  fi
done
```

Also run the check against an all-`[~]` fixture; it must report `INCOMPLETE` or fail.

**Symptoms:** A "markers consistent" check passes when a phase has zero completed tasks
(all-`[~]`) AND when a phase has zero in-progress tasks (all-`[x]`). A phase reporting
"Green" with no `[x]` is inflated to a passing check.

**Fix:** Reclassify the all-`[~]` state as `INCOMPLETE` (and `FAIL` the test), reserve
`PASS` for "all-`[x]`" (with `>= 1 [x]`).

**Guard:** `tests/mir_p1.sh` A4.

---

## A5 — False-claim text vs test reality

**Class:** plan truthfulness
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -n -e "PASS=[0-9]+.*FAIL=0|all checks pass" measure/tracks/*/plan.md
# For each hit, run the test the plan cites; if exit != 0, the claim is false.
```

**Symptoms:** A plan task claims "all checks pass" or "PASS=6, FAIL=0" while the test
the plan cites actually exits 1.

**Fix:** When a test invariant is incompatible with a spec requirement, either retire
the test in favor of a new one or update the test. Do not write "all checks pass" in
plan text unless the test actually exits 0.

**Guard:** `tests/mir_p1.sh` A5.

---

## A6 — Registry-note overstatement

**Class:** marketing copy outrunning implementation
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -n -e "API-key encryption (was )?resolved|encryption.*resolved|completely fixed|fully solved|all (checks |tests )?pass" measure/tracks.md
# For each hit, check the corresponding adversarial test or contract test is green.
```

**Symptoms:** A registry note or `measure/tracks.md` entry claims a security/quality
state is "resolved" while the adversarial test for that state is still failing.

**Fix:** When an adversarial test is red, the registry note must say so. A claim of
"resolved" is only valid when the adversarial test passes.

**Guard:** `tests/mir_p1.sh` A6.

---

## A7 — Over-broad filter swallowing real hits

**Class:** test filter too coarse
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -n \
  -e 'rg -v "[^"]*(never|do not|do NOT|don.t|cannot say|forbidden|prohibited)[^"]*"' \
  -e "rg -v '[^']*(never|do not|do NOT|don.t|cannot say|forbidden|prohibited)[^']*'" \
  tests/*.sh
```

**Symptoms:** A test's exclusion filter uses bare English words ("never", "do not",
"don't") as filter tokens. A real banned-term line that happens to contain "never"
gets silently dropped.

**Fix:** Exclude only file path contexts and policy-disclaimer markers
(`outcome-claims-policy.md`, `❌`, `BANNED`), not bare English words.

**Guard:** `tests/mir_p1.sh` A7.

---

## A8 — `[ ]` (space) marker ambiguity (legacy)

**Class:** supervisor regex accepts too many markers
**Caught:** 2026-06-24 review (post-supervisor fix)
**Detection:**
```bash
rg -n -e '\(\[[^]]* [^]]*\]\)' measure/automation-supervisor.py
```

**Symptoms:** The supervisor's task regex `r"^- \[([ ~x])\] (.+)"` accepts a space
character. A `[ ]` (space) marker is counted as in-progress.

**Fix:** Standardize on `r"^- \[([~xb])\] (.+)"`; the supervisor's incomplete-count
predicate should be `status in ("~", "b") and not is_task_structurally_blocked(task)`.

**Guard:** Static check in `measure-orchestrator-audit`.

---

## A9 — Pre-existing test references archived track paths

**Class:** test not updated on archive move
**Caught:** Multiple occurrences after archive moves
**Detection:**
```bash
rg -n -e 'measure/tracks/([a-z_0-9-]+)/plan\.md' tests/*.sh
# Cross-check: for each track id, if measure/archive/<id>/ exists and measure/tracks/<id>/ doesn't, the test is broken.
```

**Symptoms:** A test references `measure/tracks/<id>/plan.md` but the track was moved
to `measure/archive/<id>/plan.md` on closeout. The test fails forever.

**Fix:** Add a `track_dir_resolve()` helper at the top of every test that prefers
`measure/archive/<id>` if it exists. Codify in `tests/_lib/track_dir.sh` (deferred).

**Guard:** Static check in `measure-orchestrator-audit`.

---

## A10 — Generated-facts drift after structural change

**Class:** CI gate that fights developers
**Caught:** Every `measure/doctor.sh` Check 5 failure
**Detection:**
```bash
ls -la .git/hooks/pre-commit 2>/dev/null
```

**Symptoms:** `measure/doctor.sh` Check 5 fails after every structural change because
no pre-commit hook regenerates `measure/generated/`.

**Fix:** Add a pre-commit hook that runs `bash measure/generate.sh` and stages the
result.

**Guard:** Static check in `measure-orchestrator-audit`.
