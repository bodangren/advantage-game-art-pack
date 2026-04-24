# Spec: LLM Planner Provider Implementations

## Overview

The prompt-to-asset-program planner has a defined provider interface but no concrete implementations. This track implements OpenAI and Anthropic provider adapters, enabling the planner to generate asset specifications from natural language prompts.

## Functional Requirements

1. Implement OpenAI provider adapter (GPT-4o or similar)
2. Implement Anthropic provider adapter (Claude)
3. Both adapters must conform to the existing provider interface
4. Add environment variable configuration for API keys
5. Implement graceful fallback: if no API key configured, return null (existing pattern)
6. Add retry logic with exponential backoff for API failures

## Non-Functional Requirements

- API calls must have configurable timeouts (default: 30s)
- Must not hardcode API keys in source code
- Provider selection must be configurable via environment variable
- Must handle rate limiting from API providers gracefully

## Acceptance Criteria

- [ ] OpenAI provider implements the provider interface
- [ ] Anthropic provider implements the provider interface
- [ ] Provider selection is configurable via env var
- [ ] Missing API key returns null gracefully
- [ ] Retry logic handles transient failures
- [ ] Tests verify provider interface compliance
- [ ] Tests verify fallback behavior

## Out of Scope

- Local LLM provider implementation
- Prompt optimization or fine-tuning
- Cost tracking or usage monitoring
- Multi-provider load balancing
