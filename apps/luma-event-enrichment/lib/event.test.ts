import type { FetchResponse } from "@weft-labs/sdk";
import { describe, expect, it, vi } from "vitest";
import { extractEvent, parseLumaUrl } from "./event";

const providerBody = {
  data: {
    objects: [
      {
        title: "Builder's Day",
        startDate: "Mon, 26 Oct 2026 16:00:00 GMT",
        endDate: "Tue, 27 Oct 2026 00:00:00 GMT",
        pageUrl: "https://luma.com/builders-day-2026",
        location: {
          address: "690 Folsom St #100",
          city: { name: "San Francisco" },
          region: { name: "California" },
        },
      },
    ],
  },
};

const response: FetchResponse = {
  status: 200,
  headers: {},
  bodyBase64: Buffer.from(JSON.stringify(providerBody)).toString("base64"),
  paidUsd: "0.00",
  heldUsd: "0.0042",
  paymentStatus: "pending",
  txHash: "0xabc",
  artifactId: 356,
  merchant: {} as FetchResponse["merchant"],
};

describe("parseLumaUrl", () => {
  it("accepts only public Luma event URLs", () => {
    expect(parseLumaUrl("https://luma.com/builders-day-2026")).toBe(
      "https://luma.com/builders-day-2026",
    );
    expect(() => parseLumaUrl("http://luma.com/event")).toThrow("public https");
    expect(() => parseLumaUrl("https://example.com/event")).toThrow(
      "public https",
    );
  });
});

describe("extractEvent", () => {
  it("sends a bounded idempotent request and returns the receipt", async () => {
    const fetch = vi.fn().mockResolvedValue(response);

    const result = await extractEvent(
      "https://luma.com/builders-day-2026",
      "c80b4933-697d-45e4-b348-2fbd456a58c7",
      { fetch },
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        maxCostUsd: "0.0042",
        method: "POST",
        body: JSON.stringify({ url: "https://luma.com/builders-day-2026" }),
      }),
      { idempotencyKey: "c80b4933-697d-45e4-b348-2fbd456a58c7" },
    );
    expect(result.event.title).toBe("Builder's Day");
    expect(result.receipt).toEqual({
      paymentStatus: "pending",
      paidUsd: "0.00",
      heldUsd: "0.0042",
      artifactId: 356,
      txHash: "0xabc",
    });
  });

  it("rejects incomplete provider output", async () => {
    const incomplete = {
      ...response,
      bodyBase64: Buffer.from('{"data":{"objects":[{}]}}').toString("base64"),
    };

    const promise = extractEvent("https://luma.com/event", "request-id", {
      fetch: vi.fn().mockResolvedValue(incomplete),
    });

    await expect(promise).rejects.toThrow("complete event");
    await expect(promise).rejects.toMatchObject({
      receipt: { paymentStatus: "pending", heldUsd: "0.0042" },
    });
  });

  it("normalizes nullable fields on a settled receipt", async () => {
    const settled = {
      ...response,
      paidUsd: "0.0042",
      heldUsd: null,
      paymentStatus: "settled",
      artifactId: null,
    } as unknown as FetchResponse;

    const result = await extractEvent("https://luma.com/event", "request-id", {
      fetch: vi.fn().mockResolvedValue(settled),
    });

    expect(result.receipt).toMatchObject({
      paidUsd: "0.0042",
      heldUsd: null,
      artifactId: null,
    });
  });
});
