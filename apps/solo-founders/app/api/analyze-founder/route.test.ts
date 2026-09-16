import { describe, expect, it } from "vitest";
import { httpErrorStatus, isAllowedOrigin, POST } from "./route";

describe("httpErrorStatus", () => {
  it("maps SDK network status zero to a valid gateway error", () => {
    expect(httpErrorStatus(0)).toBe(502);
    expect(httpErrorStatus(undefined)).toBe(502);
    expect(httpErrorStatus(429)).toBe(429);
  });
});

describe("isAllowedOrigin", () => {
  it("accepts the local app and rejects cross-site or non-JSON requests", () => {
    const local = new Request("http://127.0.0.1:3000/api/analyze-founder", {
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
    const loopbackAlias = new Request(
      "http://localhost:3000/api/analyze-founder",
      {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:3000",
          "content-type": "application/json",
        },
      },
    );
    expect(isAllowedOrigin(local)).toBe(true);
    expect(isAllowedOrigin(loopbackAlias)).toBe(true);
    expect(isAllowedOrigin(crossSite)).toBe(false);
  });
});

describe("POST", () => {
  it("rejects an invalid handle before it requires a wallet key", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/analyze-founder", {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          handle: "https://example.com/x",
          requestId: "c80b4933-697d-45e4-b348-2fbd456a58c7",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Use an X handle or an x.com profile URL.",
    });
  });

  it("refuses a missing key without calling Weft", async () => {
    const previous = process.env.WEFT_API_KEY;
    delete process.env.WEFT_API_KEY;
    try {
      const response = await POST(
        new Request("http://127.0.0.1:3000/api/analyze-founder", {
          method: "POST",
          headers: {
            origin: "http://127.0.0.1:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            handle: "nittarab",
            requestId: "c80b4933-697d-45e4-b348-2fbd456a58c7",
          }),
        }),
      );
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({
        error: expect.stringContaining("WEFT_API_KEY"),
      });
    } finally {
      if (previous === undefined) delete process.env.WEFT_API_KEY;
      else process.env.WEFT_API_KEY = previous;
    }
  });
});
