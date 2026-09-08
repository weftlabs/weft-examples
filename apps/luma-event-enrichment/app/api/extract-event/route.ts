import { WeftClient, WeftError } from "@weft-labs/sdk";
import { extractEvent, PaidFetchError, parseLumaUrl } from "../../../lib/event";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "This funded example is local-only by default." },
      { status: 403 },
    );
  }

  if (!isLocalSameOriginRequest(request)) {
    return Response.json(
      { error: "Paid requests must come from this local application." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const url = parseLumaUrl(body.url);
    if (typeof body.requestId !== "string" || !isUuid(body.requestId)) {
      return Response.json(
        { error: "requestId must be a UUID." },
        { status: 400 },
      );
    }

    const apiKey = process.env.WEFT_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: "Set WEFT_API_KEY in .env.local before making a paid request.",
        },
        { status: 503 },
      );
    }

    const result = await extractEvent(
      url,
      body.requestId,
      new WeftClient({ apiKey }),
    );
    return Response.json(result);
  } catch (cause) {
    if (cause instanceof SyntaxError || cause instanceof TypeError) {
      return Response.json({ error: cause.message }, { status: 400 });
    }
    if (cause instanceof WeftError) {
      return Response.json(
        {
          error: cause.message,
          code: cause.code,
          requestId: cause.requestId,
        },
        { status: httpErrorStatus(cause.status) },
      );
    }
    if (cause instanceof PaidFetchError) {
      return Response.json(
        { error: cause.message, receipt: cause.receipt },
        { status: 502 },
      );
    }
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Extraction failed." },
      { status: 502 },
    );
  }
}

export function httpErrorStatus(status: number | undefined) {
  return status && status >= 400 && status <= 599 ? status : 502;
}

export function isLocalSameOriginRequest(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  return (
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    origin === url.origin &&
    request.headers.get("content-type")?.split(";", 1)[0] === "application/json"
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
