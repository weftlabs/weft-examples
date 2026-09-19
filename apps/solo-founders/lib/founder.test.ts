import type { FetchResponse } from "@weft-labs/sdk";
import { describe, expect, it, vi } from "vitest";
import {
  analyzeFounder,
  extractGithub,
  parseHandle,
  scoreVibe,
  shareCopy,
} from "./founder";

const providerBody = {
  data: {
    avatar: {
      image_url: "https://pbs.twimg.com/profile_images/example_normal.jpg",
    },
    core: {
      created_at: "Tue Jul 17 16:21:42 +0000 2012",
      name: "Patrick Barattin",
      screen_name: "nittarab",
    },
    is_blue_verified: true,
    location: { location: "Zurich, Switzerland" },
    privacy: { protected: false },
    professional: {
      category: [{ name: "Software developer/Programmer/Software engineer" }],
    },
    profile_bio: {
      description: "Building infrastructure for agent to agent economy",
      entities: {
        url: {
          urls: [{ expanded_url: "http://weftlabs.com" }],
        },
      },
    },
    relationship_counts: { followers: 253, following: 959 },
    tweet_counts: { tweets: 1708 },
    website: { url: "https://t.co/example" },
  },
};

const response: FetchResponse = {
  status: 200,
  headers: {},
  bodyBase64: Buffer.from(JSON.stringify(providerBody)).toString("base64"),
  paidUsd: "0.00",
  heldUsd: "0.005",
  paymentStatus: "pending",
  txHash: "0xabc",
  artifactId: 1106,
  merchant: {} as FetchResponse["merchant"],
};

describe("parseHandle", () => {
  it("accepts handles and x.com URLs", () => {
    expect(parseHandle("nittarab")).toBe("nittarab");
    expect(parseHandle("@nittarab")).toBe("nittarab");
    expect(parseHandle("https://x.com/nittarab")).toBe("nittarab");
    expect(() => parseHandle("https://example.com/x")).toThrow("x.com");
    expect(() => parseHandle("this-handle-is-way-too-long")).toThrow("1–15");
  });
});

describe("extractGithub", () => {
  it("reads a github.com URL out of a bio", () => {
    expect(extractGithub("code: github.com/weft-labs/sdk")).toBe("weft-labs");
    expect(extractGithub("no links here")).toBeNull();
  });
});

describe("scoreVibe", () => {
  it("scores founder language higher than an empty bio", () => {
    const hot = scoreVibe({
      bio: "Building Weft. solo founder.",
      website: "https://weftlabs.com",
      github: "weft-labs",
      professional: "Software developer",
      protected: false,
      tweets: 100,
    });
    const cold = scoreVibe({
      bio: "dog photos",
      website: null,
      github: null,
      professional: null,
      protected: true,
      tweets: 2,
    });
    expect(hot.label).toBe("Founder energy");
    expect(hot.score).toBeGreaterThan(cold.score);
    expect(cold.label).toBe("Weak founder signal");
  });
});

describe("analyzeFounder", () => {
  it("sends a bounded GET and returns the card plus receipt", async () => {
    const fetch = vi.fn().mockResolvedValue(response);
    const result = await analyzeFounder("nittarab", "request-id", { fetch });

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        maxCostUsd: "0.01",
        url: "https://twitter.use.x402atlas.com/user-details?username=nittarab",
      }),
      { idempotencyKey: "request-id" },
    );
    expect(result.founder.name).toBe("Patrick Barattin");
    expect(result.founder.website).toBe("http://weftlabs.com");
    expect(result.founder.vibe.label).toBe("Founder energy");
    expect(result.receipt).toEqual({
      paymentStatus: "pending",
      paidUsd: "0.00",
      heldUsd: "0.005",
      artifactId: 1106,
      txHash: "0xabc",
    });
    expect(shareCopy(result.founder, "http://127.0.0.1:3000")).toContain(
      "I'm Patrick Barattin, I'm a founder",
    );
  });

  it("rejects incomplete provider output and keeps the receipt", async () => {
    const incomplete = {
      ...response,
      bodyBase64: Buffer.from('{"data":{}}').toString("base64"),
    };
    const promise = analyzeFounder("x", "request-id", {
      fetch: vi.fn().mockResolvedValue(incomplete),
    });
    await expect(promise).rejects.toThrow("complete public profile");
    await expect(promise).rejects.toMatchObject({
      receipt: { paymentStatus: "pending", heldUsd: "0.005" },
    });
  });
});
