import { describe, expect, it } from "vitest";

// Phase 1 Red: pages/api/render.ts does not exist yet. The handler is
// reached through a runtime dynamic import so the suite stays importable
// for the post-Green phase-1 sentinel while assertions fail until the
// route lands. Phase 3 flips this to a direct typed import.
import bossDragon from "../../examples/boss-dragon.json";

interface ApiRequest {
  readonly method?: string;
  readonly query: Record<string, string | string[] | undefined>;
  readonly body: unknown;
}

interface ApiResponse {
  statusCode: number;
  readonly headers: Record<string, string>;
  body: unknown;
  setHeader(name: string, value: string): ApiResponse;
  status(code: number): ApiResponse;
  json(data: unknown): void;
  send(data: unknown): void;
}

type RouteHandler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;

async function loadHandler(): Promise<RouteHandler> {
  const specifier = "../../pages/api/render";
  const module = (await import(specifier)) as { default: RouteHandler };
  return module.default;
}

function mockResponse(): ApiResponse {
  const res: ApiResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name: string, value: string) {
      res.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
    },
    send(data: unknown) {
      res.body = data;
    },
  };
  return res;
}

function postRequest(body: unknown, query: Record<string, string> = {}): ApiRequest {
  return { method: "POST", query, body };
}

describe("api: POST /api/render", () => {
  it("api: renders a valid composition spec as SVG", async () => {
    const handler = await loadHandler();
    const res = mockResponse();
    await handler(postRequest(bossDragon), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("image/svg+xml");
    expect(String(res.body)).toContain("<svg");
    expect(String(res.body)).toContain('data-part-id="body-dragon"');
  });

  it("api: renders PNG when format=png", async () => {
    const handler = await loadHandler();
    const res = mockResponse();
    await handler(postRequest(bossDragon, { format: "png" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    const bytes = res.body instanceof Uint8Array ? res.body : new TextEncoder().encode(String(res.body));
    expect([...bytes.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("api: rejects an invalid spec with 400 and the validation message", async () => {
    const handler = await loadHandler();
    const res = mockResponse();
    await handler(postRequest({ version: 2, asset_id: "bad" }), res);
    expect(res.statusCode).toBe(400);
    expect(String((res.body as { error?: string })?.error)).toMatch(/version/);
  });

  it("api: rejects an unknown part id with 400", async () => {
    const handler = await loadHandler();
    const res = mockResponse();
    const spec = {
      ...bossDragon,
      parts: [{ id: "body", part_id: "body-ghost", position: [32, 56] }],
    };
    await handler(postRequest(spec), res);
    expect(res.statusCode).toBe(400);
    expect(String((res.body as { error?: string })?.error)).toMatch(/unknown SVG part/);
  });

  it("api: rejects non-POST methods with 405", async () => {
    const handler = await loadHandler();
    const res = mockResponse();
    await handler({ method: "GET", query: {}, body: undefined }, res);
    expect(res.statusCode).toBe(405);
    expect((res.body as { error?: string })?.error).toBeTypeOf("string");
  });
});
