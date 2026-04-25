# Orchestrator Consolidation

## Problem
BatchRunner and BatchOrchestrator duplicate state machine logic, increasing maintenance burden.

## Solution
Merge BatchRunner and BatchOrchestrator into a single state machine.

## Acceptance Criteria
- [ ] Single orchestrator class handles all batch operations
- [ ] No duplicate state machine logic
- [ ] All existing batch functionality preserved
- [ ] Tests pass with new consolidated orchestrator
