import { describe, expect, it } from "vitest";
import { httpErrorStatus, isLocalSameOriginRequest, POST } from "./route";

describe("httpErrorStatus", () => {
  it("maps SDK network status zero to a valid gateway error", () => {
    expect(httpErrorStatus(0)).toBe(502);
    expect(httpErrorStatus(undefined)).toBe(502);
    expect(httpErrorStatus(429)).toBe(429);
  });
});

describe("isLocalSameOriginRequest", () => {
  it("accepts the local app and rejects cross-site or non-JSON requests", () => {
    const local = new Request("http://127.0.0.1:3000/api/extract-event", {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
      },
    });
    const crossSite = new Request(local, {
      headers: {
        origin: "https://attacker.example",
        "content-type": "application/json",
      },
    });
    const simpleRequest = new Request(local, {
      headers: {
        origin: "http://127.0.0.1:3000",
        "content-type": "text/plain",
      },
    });

    expect(isLocalSameOriginRequest(local)).toBe(true);
    expect(isLocalSameOriginRequest(crossSite)).toBe(false);
    expect(isLocalSameOriginRequest(simpleRequest)).toBe(false);
  });
});

describe("POST", () => {
  it("rejects an invalid URL before it requires a wallet key", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/extract-event", {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: "https://example.com/event",
          requestId: "c80b4933-697d-45e4-b348-2fbd456a58c7",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Use a public https://luma.com or https://lu.ma event URL.",
    });
  });
});
