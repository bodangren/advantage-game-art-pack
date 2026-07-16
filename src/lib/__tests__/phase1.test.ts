// Phase 1 non-vacuity sentinel (§4.4 of the test strategy), now a
// post-Green regression guard.
//
// This sentinel guards against three vacuity patterns that would
// otherwise let a "Red" commit pass without exercising the new
// timeline/atlas contract:
//
//   1. Aggregate "all green at P1" reading — rejected by
//      asserting `exitCode !== 0`.
//   2. Module-not-found masquerading as Red (A11) — rejected by
//      asserting no suite-level "Cannot find module" failures.
//   3. Vacuous "≥3 failures" claim that comes from unrelated
//      breakage — rejected by asserting every failing test name
//      matches /timeline|atlas/ AND the count is at least
//      PRE_FLIGHT_MIN_EXECUTABLE_FAILURES (= 3).
//
// The sentinel spawns a child `vitest run` process with
// `-t "timeline|atlas"` so it only inspects failures from the
// new modules. The sentinel itself is excluded by that filter
// (its name is `phase1: non-vacuity sentinel`), so the inner
// vitest does not recurse into the sentinel.
//
// Phase 2 removed the §4.7 `expect.fail` tripwire: while the atlas
// packer remains Red (Phase 3 stub), the invariants above still
// hold and the sentinel now passes as a regression guard over the
// remaining Red surface. Phase 3 flips the invariants to assert a
// fully Green targeted run once `packAtlas` ships.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// PRE_FLIGHT_MIN_EXECUTABLE_FAILURES — mirrors §4.1 #4 of the
// test strategy. Must stay >= 3 to keep the A4 (vacuous pass)
// and A11 (module-not-found masquerading as Red) defenses live.
const PRE_FLIGHT_MIN_EXECUTABLE_FAILURES = 3;
const TARGETED_FILTER = "timeline|atlas";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const vitestBin = resolve(repoRoot, "node_modules", ".bin", "vitest");

interface VitestTestResult {
  fullName?: string;
  name?: string;
  title?: string;
  status?: string;
}

interface VitestFileResult {
  name?: string;
  status?: string;
  message?: string;
  assertionResults?: VitestTestResult[];
}

interface VitestReport {
  numTotalTests?: number;
  numFailedTests?: number;
  numFailedTestSuites?: number;
  success?: boolean;
  testResults?: VitestFileResult[];
}

function runTargetedVitest(): { stdout: string; exitCode: number } {
  if (!existsSync(vitestBin)) {
    throw new Error(`vitest binary not found at ${vitestBin}`);
  }
  try {
    const stdout = execFileSync(
      vitestBin,
      ["run", "--reporter=json", "-t", TARGETED_FILTER],
      { encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    return { stdout, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; status?: number };
    const stdout =
      typeof e.stdout === "string"
        ? e.stdout
        : (e.stdout?.toString("utf8") ?? "");
    return { stdout, exitCode: e.status ?? 1 };
  }
}

function parseVitestJson(stdout: string): VitestReport {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) {
    throw new Error(
      `No JSON object in vitest stdout. First 500 chars:\n${stdout.slice(0, 500)}`,
    );
  }
  return JSON.parse(stdout.slice(start, end + 1)) as VitestReport;
}

describe("phase1: non-vacuity sentinel", () => {
  it("phase1: non-vacuity sentinel", () => {
    const { stdout, exitCode } = runTargetedVitest();
    const report = parseVitestJson(stdout);

    // Invariant 1: vitest exits non-zero when targeted tests fail.
    // A vacuous green-on-P1 commit would exit 0; reject that here.
    expect(
      exitCode,
      `expected vitest to exit non-zero when timeline/atlas tests fail (got exit=${exitCode}). ` +
        "An exit-0 means the Phase 1 Red is vacuous and must be revised.",
    ).not.toBe(0);

    // Invariant 2: no suite-level "Cannot find module" failures
    // (pre-flight check #2 / A11). Suite-level failures inflate
    // the failing-count without contributing real assertions.
    const moduleNotFoundSuites = (report.testResults ?? []).filter(
      (file) =>
        file.status === "failed" &&
        typeof file.message === "string" &&
        file.message.includes("Cannot find module"),
    );
    expect(
      moduleNotFoundSuites.length,
      `expected 0 suite-level "Cannot find module" failures. Got ${moduleNotFoundSuites.length}. ` +
        "This means tests are failing at import time, not at the assertion level. " +
        "Remediate by resolving imports through the __tests__/ stubs.",
    ).toBe(0);

    // Invariant 3: collect every test-level failure.
    const failedTestNames: string[] = [];
    for (const file of report.testResults ?? []) {
      for (const test of file.assertionResults ?? []) {
        if (test.status === "failed") {
          failedTestNames.push(
            test.fullName ?? test.title ?? test.name ?? "<unnamed>",
          );
        }
      }
    }

    // Invariant 4: ≥ PRE_FLIGHT_MIN_EXECUTABLE_FAILURES failures.
    expect(
      failedTestNames.length,
      `expected ≥${PRE_FLIGHT_MIN_EXECUTABLE_FAILURES} failing timeline/atlas tests. ` +
        `Got ${failedTestNames.length}: ${failedTestNames.join(", ")}`,
    ).toBeGreaterThanOrEqual(PRE_FLIGHT_MIN_EXECUTABLE_FAILURES);

    // Invariant 5: every failing name is from the new modules, not
    // unrelated breakage (e.g. svg-assets.test.ts).
    for (const name of failedTestNames) {
      expect(
        name,
        `failing test "${name}" must match /${TARGETED_FILTER}/ (Phase 1 Red scope)`,
      ).toMatch(/timeline|atlas/i);
    }
  });
});