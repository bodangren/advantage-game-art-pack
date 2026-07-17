// Phase 1 non-vacuity sentinel (§4.4 of the test strategy), now a
// post-Green regression guard (final form, Phase 3).
//
// Phase history: in Phase 1 the sentinel asserted the targeted
// `-t "timeline|atlas"` run was non-vacuously Red (≥3 failing tests,
// every failure named timeline|atlas, no module-not-found) and ended
// in an §4.7 `expect.fail` tripwire. Phase 2 removed the tripwire
// once the timeline compiler shipped (the atlas stub kept the run
// Red). Phase 3 shipped the atlas packer, so the targeted run is now
// fully Green and the invariants flipped:
//
//   1. The targeted run exits 0 — both production modules satisfy
//      their contracts.
//   2. No suite-level "Cannot find module" failures (A11).
//   3. Non-vacuity: a meaningful number of timeline|atlas tests
//      actually executed and passed — a "green because the filter
//      matched nothing" reading is rejected.
//
// The sentinel spawns a child `vitest run` process with
// `-t "timeline|atlas"` so it only inspects the timeline/atlas
// modules. The sentinel itself is excluded by that filter (its name
// is `phase1: non-vacuity sentinel`), so the inner vitest does not
// recurse into the sentinel.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// MIN_TARGETED_PASSING_TESTS — post-Green non-vacuity floor. The
// targeted timeline|atlas run must execute and pass at least this
// many tests, so a "green because nothing ran" reading is rejected
// (A4). The current suite has 20 timeline + 14 atlas tests.
const MIN_TARGETED_PASSING_TESTS = 20;
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
  // The sentinel spawns a full child `vitest run`, which takes several
  // seconds (transform + import of every test file). The 30s timeout
  // keeps the default 5s testTimeout from killing it on slower runs.
  it("phase1: non-vacuity sentinel", () => {
    const { stdout, exitCode } = runTargetedVitest();
    const report = parseVitestJson(stdout);

    // Invariant 1 (post-Green): the targeted timeline|atlas run is
    // fully green now that both production modules have shipped.
    expect(
      exitCode,
      `expected vitest to exit 0 for the targeted timeline|atlas run (got exit=${exitCode}). ` +
        "A non-zero exit means the timeline or atlas contract regressed.",
    ).toBe(0);

    // Invariant 2: no suite-level "Cannot find module" failures
    // (A11). Suite-level failures mean tests fail at import time,
    // not at the assertion level.
    const moduleNotFoundSuites = (report.testResults ?? []).filter(
      (file) =>
        file.status === "failed" &&
        typeof file.message === "string" &&
        file.message.includes("Cannot find module"),
    );
    expect(
      moduleNotFoundSuites.length,
      `expected 0 suite-level "Cannot find module" failures. Got ${moduleNotFoundSuites.length}.`,
    ).toBe(0);

    // Invariant 3: collect every passing timeline|atlas test — the
    // non-vacuity floor proves the targeted run actually exercised
    // the contracts instead of matching nothing.
    const passingTargetedNames: string[] = [];
    const failedTestNames: string[] = [];
    for (const file of report.testResults ?? []) {
      for (const test of file.assertionResults ?? []) {
        const name = test.fullName ?? test.title ?? test.name ?? "<unnamed>";
        if (test.status === "passed" && /timeline|atlas/i.test(name)) {
          passingTargetedNames.push(name);
        }
        if (test.status === "failed") {
          failedTestNames.push(name);
        }
      }
    }
    expect(
      failedTestNames,
      `expected 0 failing targeted tests. Got: ${failedTestNames.join(", ")}`,
    ).toEqual([]);
    expect(
      passingTargetedNames.length,
      `expected ≥${MIN_TARGETED_PASSING_TESTS} passing timeline|atlas tests (non-vacuity). ` +
        `Got ${passingTargetedNames.length}: ${passingTargetedNames.join(", ")}`,
    ).toBeGreaterThanOrEqual(MIN_TARGETED_PASSING_TESTS);
  }, 90_000);
});