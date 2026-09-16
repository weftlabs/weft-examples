import type { FetchResponse } from "@weft-labs/sdk";

export const X_USER_DETAILS_URL =
  "https://twitter.use.x402atlas.com/user-details";
export const X_SEARCH_URL = "https://twitter.use.x402atlas.com/search";
export const MAX_COST_USD = "0.01";
export const TREND_PHRASE = "I'm a solo founder";

export const X_PROFILE_OPERATION = {
  operationId: "bazaar-x402-atlas-183",
  accessMethodId: "bazaar-x402-atlas-183-x402",
} as const;

export const X_SEARCH_OPERATION = {
  operationId: "bazaar-x402-atlas-177",
  accessMethodId: "bazaar-x402-atlas-177-x402",
} as const;

interface PaidFetcher {
  fetch(
    request: {
      url: string;
      method: "GET";
      headers: Record<string, string>;
      maxCostUsd: string;
      operationId: string;
      accessMethodId: string;
    },
    options: { idempotencyKey: string },
  ): Promise<FetchResponse>;
}

export interface Receipt {
  paymentStatus: string;
  paidUsd: string;
  heldUsd: string | null;
  artifactId: number | null;
  txHash: string | null;
}

export interface VibeSignal {
  id: string;
  hit: boolean;
  text: string;
}

export interface VibeCheck {
  score: number;
  label: string;
  signals: VibeSignal[];
}

export interface FounderCard {
  handle: string;
  name: string;
  bio: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  location: string | null;
  avatarUrl: string | null;
  followers: number | null;
  following: number | null;
  tweets: number | null;
  createdAt: string | null;
  blueVerified: boolean;
  protected: boolean;
  professional: string | null;
  vibe: VibeCheck;
}

export interface AnalyzeFounderResponse {
  founder: FounderCard;
  receipt: Receipt;
}

export interface TrendHit {
  handle: string;
  name: string;
  text: string;
}

export interface ScanTrendResponse {
  phrase: string;
  founders: TrendHit[];
  receipt: Receipt;
}

export class PaidFetchError extends Error {
  constructor(
    message: string,
    readonly receipt: Receipt,
  ) {
    super(message);
    this.name = "PaidFetchError";
  }
}

export function parseHandle(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("handle must be a string.");
  }

  const trimmed = value.trim();
  if (!trimmed) throw new TypeError("Paste an X handle.");

  let candidate = trimmed.replace(/^@/, "");
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./, "");
      if (host !== "x.com" && host !== "twitter.com") {
        throw new TypeError("Use an X handle or an x.com profile URL.");
      }
      const segment = url.pathname.split("/").filter(Boolean)[0];
      if (!segment) throw new TypeError("Paste an X handle.");
      candidate = segment;
    }
  } catch (cause) {
    if (cause instanceof TypeError) throw cause;
    throw new TypeError("Use an X handle or an x.com profile URL.");
  }

  if (!/^[A-Za-z0-9_]{1,15}$/.test(candidate)) {
    throw new TypeError("X handles are 1–15 letters, numbers, or underscores.");
  }
  return candidate;
}

export function extractGithub(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/i,
  );
  return match?.[1] ?? null;
}

export function extractLinkedin(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_-]+)/i,
  );
  return match ? `https://www.linkedin.com/in/${match[1]}` : null;
}

export function scoreVibe(input: {
  bio: string | null;
  website: string | null;
  github: string | null;
  professional: string | null;
  protected: boolean;
  tweets: number | null;
}): VibeCheck {
  const bio = input.bio ?? "";
  const founderLanguage =
    /\b(solo founder|co-?founder|founder|building|indie hacker|stealth|shipping)\b/i.test(
      bio,
    );
  const signals: VibeSignal[] = [
    {
      id: "language",
      hit: founderLanguage,
      text: founderLanguage
        ? "Bio talks like a founder"
        : "Bio does not say founder / building",
    },
    {
      id: "website",
      hit: Boolean(input.website),
      text: input.website
        ? "Has a public website"
        : "No website on the profile",
    },
    {
      id: "github",
      hit: Boolean(input.github),
      text: input.github
        ? `GitHub in the open: ${input.github}`
        : "No GitHub URL in the bio",
    },
    {
      id: "professional",
      hit: Boolean(input.professional),
      text: input.professional
        ? `X professional: ${input.professional}`
        : "No professional category",
    },
    {
      id: "open",
      hit: !input.protected,
      text: input.protected ? "Protected account" : "Public account",
    },
    {
      id: "posts",
      hit: (input.tweets ?? 0) >= 20,
      text:
        (input.tweets ?? 0) >= 20
          ? "Has a posting history"
          : "Thin posting history",
    },
  ];

  const score = Math.min(
    100,
    signals.reduce((sum, signal) => {
      if (!signal.hit) return sum;
      if (signal.id === "language") return sum + 40;
      if (signal.id === "website" || signal.id === "professional") {
        return sum + 15;
      }
      return sum + 10;
    }, 0),
  );

  const label =
    score >= 70
      ? "Founder energy"
      : score >= 40
        ? "Builder"
        : "Weak founder signal";

  return { score, label, signals };
}

export function shareCopy(founder: FounderCard, origin: string): string {
  return `I'm ${founder.name}, I'm a founder\n${origin}/u/${founder.handle}`;
}

export async function analyzeFounder(
  handle: string,
  idempotencyKey: string,
  weft: PaidFetcher,
): Promise<AnalyzeFounderResponse> {
  const url = `${X_USER_DETAILS_URL}?username=${encodeURIComponent(handle)}`;
  const response = await weft.fetch(
    {
      url,
      method: "GET",
      headers: {},
      maxCostUsd: MAX_COST_USD,
      ...X_PROFILE_OPERATION,
    },
    { idempotencyKey },
  );
  const receipt = toReceipt(response);
  if (response.status < 200 || response.status >= 300) {
    throw new PaidFetchError(
      `Provider returned HTTP ${response.status}.`,
      receipt,
    );
  }

  const payload = decodeJson(response, receipt);
  const founder = normalizeFounder(payload, handle);
  if (!founder) {
    throw new PaidFetchError(
      "Provider response did not contain a complete public profile.",
      receipt,
    );
  }
  return { founder, receipt };
}

export async function scanTrend(
  idempotencyKey: string,
  weft: PaidFetcher,
): Promise<ScanTrendResponse> {
  const params = new URLSearchParams({
    phrase: TREND_PHRASE,
    type: "latest",
  });
  const response = await weft.fetch(
    {
      url: `${X_SEARCH_URL}?${params.toString()}`,
      method: "GET",
      headers: {},
      maxCostUsd: MAX_COST_USD,
      ...X_SEARCH_OPERATION,
    },
    { idempotencyKey },
  );
  const receipt = toReceipt(response);
  if (response.status < 200 || response.status >= 300) {
    throw new PaidFetchError(
      `Provider returned HTTP ${response.status}.`,
      receipt,
    );
  }
  const payload = decodeJson(response, receipt);
  return {
    phrase: TREND_PHRASE,
    founders: uniqueAuthors(payload),
    receipt,
  };
}

export function toReceipt(response: FetchResponse): Receipt {
  return {
    paymentStatus: response.paymentStatus,
    paidUsd: response.paidUsd,
    heldUsd: response.heldUsd || null,
    artifactId: response.artifactId ?? null,
    txHash: response.txHash || null,
  };
}

function decodeJson(
  response: FetchResponse,
  receipt: Receipt,
): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(response.bodyBase64, "base64").toString("utf8"),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new PaidFetchError("Provider returned invalid JSON.", receipt);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeFounder(
  payload: Record<string, unknown>,
  fallbackHandle: string,
): FounderCard | null {
  const data = asRecord(payload.data);
  if (!data) return null;
  const core = asRecord(data.core);
  const name = asString(core?.name);
  const handle = asString(core?.screen_name) ?? fallbackHandle;
  if (!name) return null;

  const bioBlock = asRecord(data.profile_bio);
  const bio = asString(bioBlock?.description);
  const websiteFromEntities = firstExpandedUrl(bioBlock);
  const website =
    websiteFromEntities ??
    asString(asRecord(data.website)?.url) ??
    asString(asRecord(asRecord(data.legacy)?.entities)?.url);
  const blob = [bio, website].filter(Boolean).join("\n");
  const github = extractGithub(blob);
  const linkedin = extractLinkedin(blob);
  const professional = firstProfessional(data);
  const counts = asRecord(data.relationship_counts);
  const tweets = asRecord(data.tweet_counts);
  const location = asString(asRecord(data.location)?.location);
  const protectedAccount = Boolean(asRecord(data.privacy)?.protected);
  const avatar = enlargeAvatar(asString(asRecord(data.avatar)?.image_url));

  const founder = {
    handle,
    name,
    bio,
    website,
    github,
    linkedin,
    location,
    avatarUrl: avatar,
    followers: asNumber(counts?.followers),
    following: asNumber(counts?.following),
    tweets: asNumber(tweets?.tweets),
    createdAt: asString(core?.created_at),
    blueVerified: Boolean(data.is_blue_verified),
    protected: protectedAccount,
    professional,
    vibe: scoreVibe({
      bio,
      website,
      github,
      professional,
      protected: protectedAccount,
      tweets: asNumber(tweets?.tweets),
    }),
  };
  return founder;
}

function firstExpandedUrl(
  bioBlock: Record<string, unknown> | null,
): string | null {
  const entities = asRecord(bioBlock?.entities);
  const urlBlock = asRecord(entities?.url);
  const urls = urlBlock?.urls;
  if (!Array.isArray(urls)) return null;
  for (const item of urls) {
    const row = asRecord(item);
    const expanded = asString(row?.expanded_url);
    if (expanded) return expanded;
  }
  return null;
}

function firstProfessional(data: Record<string, unknown>): string | null {
  const professional = asRecord(data.professional);
  const category = professional?.category;
  if (!Array.isArray(category))
    return asString(professional?.professional_type);
  for (const item of category) {
    const name = asString(asRecord(item)?.name);
    if (name) return name;
  }
  return asString(professional?.professional_type);
}

function enlargeAvatar(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/_normal(\.[a-z0-9]+)$/i, "_400x400$1");
}

function uniqueAuthors(payload: Record<string, unknown>): TrendHit[] {
  const tweets = Array.isArray(payload.tweets)
    ? payload.tweets
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  const seen = new Set<string>();
  const out: TrendHit[] = [];
  for (const item of tweets) {
    const row = asRecord(item);
    if (!row) continue;
    const author = asRecord(row.author) ?? asRecord(row.user);
    const handle = asString(author?.screen_name) ?? asString(author?.username);
    const name = asString(author?.name) ?? handle;
    const text = asString(row.text) ?? asString(row.full_text);
    if (!handle || !name || !text) continue;
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ handle, name, text });
  }
  return out;
}
