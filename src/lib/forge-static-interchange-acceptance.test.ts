import { describe, expect, it } from "vitest";

const MODULE_PATH = "./forge-static-interchange-acceptance";

async function loadAcceptanceApi(): Promise<Record<string, any>> {
  try {
    return await import(/* @vite-ignore */ MODULE_PATH);
  } catch {
    return {};
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

describe("code-owned Forge static interchange acceptance", () => {
  it("pins the delegated static-only decision with an independent digest", async () => {
    const api = await loadAcceptanceApi();
    expect(api.validateForgeStaticInterchangeAcceptance).toBeTypeOf("function");
    expect(api.canonicalizeForgeStaticInterchangeAcceptance).toBeTypeOf("function");
    expect(api.CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE).toBeTypeOf("object");
    const binding = await api.validateForgeStaticInterchangeAcceptance(
      api.CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE,
    );
    expect(binding).toMatchObject({
      contract_id: "pixel-forge-static-interchange-acceptance/v1",
      prerequisite_track: "engine_interop_evidence_20260719",
      decision: {
        status: "accepted",
        authority: "delegated_final",
        scope: "static_png_glb_interchange",
      },
      forge_contract_id: "forge-asset-interchange-manifest/v1",
      delivery_claim_sha256:
        "dacab165e0ad370136a3ac67abca4f086c21dabb8b45dcd225372b615b416ab4",
      owner_verification_sha256:
        "868123a2dd2981de879f28b5b5a27941ff70271f938a2766cb7ef7887efce942",
      exclusions: [
        "final_art",
        "animation",
        "atlas",
        "complete_pack",
        "game_engine",
      ],
    });
    expect(binding.binding_sha256).toBe(
      await sha256(api.canonicalizeForgeStaticInterchangeAcceptance(binding)),
    );
  });

  it("rejects decision, claim, exclusion-order, and unknown-field drift", async () => {
    const api = await loadAcceptanceApi();
    expect(api.validateForgeStaticInterchangeAcceptance).toBeTypeOf("function");
    expect(api.ForgeStaticInterchangeAcceptanceError).toBeTypeOf("function");
    const mutate = (
      change: (binding: Record<string, unknown>) => void,
    ): unknown => {
      const binding = structuredClone(
        api.CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE,
      ) as unknown as Record<string, unknown>;
      change(binding);
      return binding;
    };
    await expect(
      api.validateForgeStaticInterchangeAcceptance(
        mutate((binding) => {
          (binding.decision as Record<string, unknown>).status = "pending";
        }),
      ),
    ).rejects.toThrow(api.ForgeStaticInterchangeAcceptanceError);
    await expect(
      api.validateForgeStaticInterchangeAcceptance(
        mutate((binding) => {
          binding.delivery_claim_sha256 = "0".repeat(64);
        }),
      ),
    ).rejects.toThrow(/delivery claim|digest|binding_sha256/i);
    await expect(
      api.validateForgeStaticInterchangeAcceptance(
        mutate((binding) => {
          (binding.exclusions as string[]).reverse();
        }),
      ),
    ).rejects.toThrow(/exclusions|binding_sha256/i);
    await expect(
      api.validateForgeStaticInterchangeAcceptance(
        mutate((binding) => {
          binding.runtime_root = "/tmp/forge";
        }),
      ),
    ).rejects.toThrow(/unexpected.*runtime_root/i);
  });
});
