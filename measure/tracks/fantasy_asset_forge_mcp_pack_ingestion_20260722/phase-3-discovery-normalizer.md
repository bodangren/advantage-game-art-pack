# Phase 3 Raw MCP Discovery Normalizer

## Scope

`src/lib/forge-mcp-discovery.ts` is a package-owned validation and
normalization boundary for raw MCP `tools/list` output. It is not an MCP client,
does not invoke a provider SDK, does not retrieve an artifact, and does not
itself authorize ingestion. Forge `engine_interop_evidence_20260719` is now
accepted for the bounded static transport only through an exact code-owned
Pixel digest binding.

## Raw and normalized shapes

Forge's actual MCP SDK result contains standard raw tool objects with `name`,
`description`, `inputSchema`, and `execution`. It does not contain Pixel's
`visibility`, `capability`, `contract_ids`, `revision_pinned`, `transfer`, or
`record_kinds` fields.

The normalizer accepts either the direct SDK result or an exact successful
JSON-RPC 2.0 response. It validates the two named public interchange tools and
their current closed input schemas before deriving Pixel's existing normalized
discovery contract. The synthetic capability fields are therefore explicit
Pixel-owned conclusions from validated names and schemas; they are never
claimed to be fields returned by Forge.

## Fail-closed checks

- missing or duplicate selected tool names;
- incomplete pagination;
- malformed/error JSON-RPC responses;
- injected normalized-only fields in raw selected tools;
- missing exact revision pins;
- semantic/revision identity-pattern drift;
- unknown required arguments or permissive `additionalProperties`;
- loss of artifact/evidence record-kind support; and
- chunk length above 32,768 bytes.

Focused tests also prove deterministic normalized ordering and confirm that a
valid normalized result still fails the separate live-ingestion acceptance
gate.

## Live caller and remaining gate

`src/lib/forge-mcp-transport.ts` now supplies the package-owned live stdio
caller without a provider SDK or new dependency. It performs the exact MCP
initialize/initialized handshake, validates and normalizes raw `tools/list`,
retrieves the revision-pinned manifest and every bounded allowlisted artifact
and evidence chunk, then delegates to the existing validators and
replay-admission staging.

The caller fails closed on protocol, pagination, response-correlation, envelope,
process-exit, timeout, byte/call-budget, digest, and malformed-notification
drift. Valid bounded server notifications are ignored; benign stderr is capped
and discarded rather than returned or persisted. Static staging is available
as `validated_pending_review`; final registry admission remains disabled until
an accepted Pixel delivery-resolution review matches the exact staged source
and code-owned binding.
