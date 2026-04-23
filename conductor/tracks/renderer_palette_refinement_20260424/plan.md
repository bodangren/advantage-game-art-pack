# Plan: Renderer Palette Refinement

## Phase 1: Diagnosis

- [ ] Task: Analyze palette-limit check failures
    - [ ] Write test that captures current palette check failure mode
    - [ ] Profile rendered output color count vs style pack limit
    - [ ] Identify which renderer paths exceed palette limits

## Phase 2: Palette Quantization

- [ ] Task: Implement palette-aware rendering
    - [ ] Write tests for palette quantization (input colors → limited palette)
    - [ ] Implement median-cut or k-means color quantization
    - [ ] Integrate quantization into renderer pipeline post-rasterization
    - [ ] Verify quantized output matches style pack palette

## Phase 3: Candidate Loop Integration

- [ ] Task: Wire palette refinement to candidate selection
    - [ ] Write tests verifying survivor selection after palette refinement
    - [ ] Ensure refined candidates pass structural check
    - [ ] Measure survivor selection rate improvement

## Phase 4: Verification

- [ ] Task: Full suite validation
    - [ ] Run `python3 -m unittest discover -s tests -v` — all tests pass
    - [ ] Run `python3 -m compileall src` — clean compilation
    - [ ] Verify palette compliance on sample batch generation
