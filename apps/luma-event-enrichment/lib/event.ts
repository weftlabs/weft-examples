import type { FetchResponse } from "@weft-labs/sdk";

const DIFFBOT_EVENT_URL = "https://diffbot.x402.paywithlocus.com/diffbot/event";
const MAX_COST_USD = "0.0042";

interface PaidFetcher {
  fetch(
    request: {
      url: string;
      method: "POST";
      body: string;
      headers: Record<string, string>;
      maxCostUsd: string;
      operationId: string;
      accessMethodId: string;
    },
    options: { idempotencyKey: string },
  ): Promise<FetchResponse>;
}

interface DiffbotEvent {
  title?: unknown;
  description?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  pageUrl?: unknown;
  location?: {
    address?: unknown;
    city?: { name?: unknown };
    region?: { name?: unknown };
  };
}

export interface ExtractEventResponse {
  event: {
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    location: string | null;
    sourceUrl: string;
  };
  receipt: {
    paymentStatus: string;
    paidUsd: string;
    heldUsd: string | null;
    artifactId: number | null;
    txHash: string | null;
  };
}

type Receipt = ExtractEventResponse["receipt"];

export class PaidFetchError extends Error {
  constructor(
    message: string,
    readonly receipt: Receipt,
  ) {
    super(message);
    this.name = "PaidFetchError";
  }
}

export function parseLumaUrl(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("url must be a string.");

  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "luma.com" && url.hostname !== "lu.ma") ||
    url.pathname === "/"
  ) {
    throw new TypeError(
      "Use a public https://luma.com or https://lu.ma event URL.",
    );
  }
  return url.toString();
}

export async function extractEvent(
  sourceUrl: string,
  idempotencyKey: string,
  weft: PaidFetcher,
): Promise<ExtractEventResponse> {
  const response = await weft.fetch(
    {
      url: DIFFBOT_EVENT_URL,
      method: "POST",
      body: JSON.stringify({ url: sourceUrl }),
      headers: { "content-type": "application/json" },
      maxCostUsd: MAX_COST_USD,
      operationId: "mpp-operation-65-6",
      accessMethodId: "mpp-access-65-6-0-x402",
    },
    { idempotencyKey },
  );

  const receipt = {
    paymentStatus: response.paymentStatus,
    paidUsd: response.paidUsd,
    heldUsd: response.heldUsd || null,
    artifactId: response.artifactId ?? null,
    txHash: response.txHash || null,
  };

  if (response.status < 200 || response.status >= 300) {
    throw new PaidFetchError(
      `Provider returned HTTP ${response.status}.`,
      receipt,
    );
  }

  let payload: { data?: { objects?: unknown[] } };
  try {
    payload = JSON.parse(
      Buffer.from(response.bodyBase64, "base64").toString("utf8"),
    ) as { data?: { objects?: unknown[] } };
  } catch {
    throw new PaidFetchError("Provider returned invalid JSON.", receipt);
  }
  const event = payload?.data?.objects?.[0] as DiffbotEvent | undefined;
  if (
    !event ||
    typeof event.title !== "string" ||
    typeof event.startDate !== "string"
  ) {
    throw new PaidFetchError(
      "Provider response did not contain a complete event.",
      receipt,
    );
  }

  return {
    event: {
      title: event.title,
      description:
        typeof event.description === "string" ? event.description : null,
      startDate: event.startDate,
      endDate: typeof event.endDate === "string" ? event.endDate : null,
      location: formatLocation(event.location),
      sourceUrl: typeof event.pageUrl === "string" ? event.pageUrl : sourceUrl,
    },
    receipt,
  };
}

function formatLocation(location: DiffbotEvent["location"]): string | null {
  if (!location) return null;
  const values = [
    location.address,
    location.city?.name,
    location.region?.name,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return [...new Set(values)].join(", ") || null;
}
