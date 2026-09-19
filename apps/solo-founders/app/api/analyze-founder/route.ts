import { WeftClient, WeftError } from "@weft-labs/sdk";
import {
  analyzeFounder,
  PaidFetchError,
  parseHandle,
} from "../../../lib/founder";

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.WEFT_PUBLIC !== "1"
  ) {
    return Response.json(
      { error: "This funded example is local-only by default." },
      { status: 403 },
    );
  }

  if (!isAllowedOrigin(request)) {
    return Response.json(
      { error: "Paid requests must come from this application." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const handle = parseHandle(body.handle);
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

    const result = await analyzeFounder(
      handle,
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
      { error: cause instanceof Error ? cause.message : "Analysis failed." },
      { status: 502 },
    );
  }
}

export function httpErrorStatus(status: number | undefined) {
  return status && status >= 400 && status <= 599 ? status : 502;
}

export function isAllowedOrigin(request: Request) {
  const url = new URL(request.url);
  const originHeader = request.headers.get("origin");
  const json =
    request.headers.get("content-type")?.split(";", 1)[0] ===
    "application/json";
  if (!originHeader || !json) return false;
  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return false;
  }
  if (!sameLocalHost(url.hostname, origin.hostname)) return false;
  if (
    (origin.port || defaultPort(origin.protocol)) !==
    (url.port || defaultPort(url.protocol))
  ) {
    return false;
  }
  if (process.env.WEFT_PUBLIC === "1") return origin.origin === url.origin;
  return isLoopback(url.hostname);
}

function isLoopback(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function sameLocalHost(left: string, right: string) {
  return left === right || (isLoopback(left) && isLoopback(right));
}

function defaultPort(protocol: string) {
  return protocol === "https:" ? "443" : "80";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
