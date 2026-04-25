# Plan: LLM Planner Provider Implementations

## Phase 1: Provider Interface Verification

- [ ] Task: Document and test existing provider interface
    - [ ] Write tests for provider interface contract (input types, output types, error handling)
    - [ ] Document expected request/response format
    - [ ] Verify interface stability with existing planner code

## Phase 2: OpenAI Provider

- [ ] Task: Implement OpenAI adapter
    - [ ] Write tests for OpenAI provider (mock HTTP responses)
    - [ ] Implement OpenAIProvider class with chat completion API
    - [ ] Add retry logic with exponential backoff
    - [ ] Add timeout handling
    - [ ] Wire environment variable configuration

## Phase 3: Anthropic Provider

- [ ] Task: Implement Anthropic adapter
    - [ ] Write tests for Anthropic provider (mock HTTP responses)
    - [ ] Implement AnthropicProvider class with messages API
    - [ ] Add retry logic with exponential backoff
    - [ ] Add timeout handling
    - [ ] Wire environment variable configuration

## Phase 4: Provider Selection and Fallback

- [ ] Task: Wire provider selection
    - [ ] Write tests for provider selection via env var
    - [ ] Implement provider factory with fallback logic
    - [ ] Verify graceful null return when no API key configured

## Phase 5: Verification

- [ ] Task: Full suite validation
    - [ ] Run `python3 -m unittest discover -s tests -v` — all tests pass
    - [ ] Run `python3 -m compileall src` — clean compilation
    - [ ] Verify provider interface compliance for both adapters
