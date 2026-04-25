# Plan: Renderer Palette Refinement

## Phase 1: Diagnosis

- [x] Task: Analyze palette-limit check failures
    - [x] Write test that captures current palette check failure mode
    - [x] Profile rendered output color count vs style pack limit
    - [x] Identify which renderer paths exceed palette limits

## Phase 2: Palette Quantization

- [x] Task: Implement palette-aware rendering
    - [x] Write tests for palette quantization (input colors → limited palette)
    - [x] Implement median-cut or k-means color quantization
    - [x] Integrate quantization into renderer pipeline post-rasterization
    - [x] Verify quantized output matches style pack palette

## Phase 3: Candidate Loop Integration

- [x] Task: Wire palette refinement to candidate selection
    - [x] Write tests verifying survivor selection after palette refinement
    - [x] Ensure refined candidates pass structural check
    - [x] Measure survivor selection rate improvement

## Phase 4: Verification

- [x] Task: Full suite validation
    - [x] Run `python3 -m unittest discover -s tests -v` — all tests pass
    - [x] Run `python3 -m compileall src` — clean compilation
    - [x] Verify palette compliance on sample batch generation