import { SVG_PARTS } from "../../src/lib/catalog";
import { renderSpecToPng } from "../../src/lib/render";
import { type SvgCompositionSpec, composeSvgAsset } from "../../src/lib/svg-assets";

interface ApiRequest {
  readonly method?: string;
  readonly query: Record<string, string | string[] | undefined>;
  readonly body: unknown;
}

interface ApiResponse {
  setHeader(name: string, value: string): ApiResponse;
  status(code: number): ApiResponse;
  json(data: unknown): void;
  send(data: unknown): void;
}

function requestedFormat(req: ApiRequest): string {
  const fromQuery = req.query.format;
  const queryValue = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (queryValue !== undefined) return queryValue;
  const body = req.body as { format?: unknown } | null;
  return typeof body?.format === "string" ? body.format : "svg";
}

// POST /api/render — validate a composition spec and return the rendered
// asset. ?format=png (or a "format" body field) rasterizes server-side;
// anything else returns the composed SVG.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed: use POST with a composition spec" });
    return;
  }
  try {
    if (requestedFormat(req) === "png") {
      const { png } = await renderSpecToPng(req.body, SVG_PARTS);
      res.setHeader("content-type", "image/png").status(200).send(Buffer.from(png));
      return;
    }
    const asset = await composeSvgAsset(req.body as SvgCompositionSpec, SVG_PARTS);
    res.setHeader("content-type", "image/svg+xml").status(200).send(asset.svg);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
