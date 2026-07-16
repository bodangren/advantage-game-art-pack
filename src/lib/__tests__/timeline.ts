// Phase 1 stub for the timeline compiler.
//
// This module exists solely so Phase 1 Red tests have a typed
// import surface that resolves cleanly under `tsc --noEmit` and
// under vitest's import-time checks. Runtime calls throw a
// deterministic "Phase 1 stub" Error, which is exactly what the
// Phase 1 Red tests assert against.
//
// Phase 2 (Timeline Compiler) Green REPLACES this file by
// introducing `src/lib/timeline.ts` with the real `compileTimeline`
// implementation and DELETES this stub. The error class names
// (`TimelineValidationError`) survive into Phase 2 — they are part
// of the validation contract, not the stub contract.

export class TimelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineValidationError";
  }
}

export interface TimelineFrame {
  readonly id: string;
  readonly duration_ms: number;
  readonly composition: unknown;
}

export interface TimelineSpec {
  readonly version: 1;
  readonly frames: readonly TimelineFrame[];
}

export interface TimelineCompiledFrame {
  readonly id: string;
  readonly svg: string;
  readonly digest: string;
}

export interface TimelineCompilation {
  readonly frames: ReadonlyArray<TimelineCompiledFrame>;
}

export function validateTimelineSpec(_spec: unknown): TimelineSpec {
  throw new Error("Phase 1 stub — implement in Phase 2");
}

export async function compileTimeline(
  _spec: TimelineSpec,
  _parts: readonly unknown[],
): Promise<TimelineCompilation> {
  throw new Error("Phase 1 stub — implement in Phase 2");
}