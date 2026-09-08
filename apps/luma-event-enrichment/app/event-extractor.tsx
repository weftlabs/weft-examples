"use client";

import { type FormEvent, useRef, useState } from "react";
import type { ExtractEventResponse } from "@/lib/event";

const EXAMPLE_URL = "https://luma.com/builders-day-2026";

export function EventExtractor() {
  const pendingRequest = useRef<{ url: string; id: string } | null>(null);
  const [result, setResult] = useState<ExtractEventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedReceipt, setFailedReceipt] = useState<
    ExtractEventResponse["receipt"] | null
  >(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    setResult(null);
    setFailedReceipt(null);
    const url = String(formData.get("url"));
    if (pendingRequest.current?.url !== url) {
      pendingRequest.current = { url, id: crypto.randomUUID() };
    }

    try {
      const response = await fetch("/api/extract-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          requestId: pendingRequest.current.id,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        if (body.receipt) setFailedReceipt(body.receipt);
        throw new Error(body.error ?? "The extraction failed.");
      }

      setResult(body);
      pendingRequest.current = null;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The extraction failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="extractor">
      <form onSubmit={submit} className="commandBar">
        <label htmlFor="event-url">Public Luma URL</label>
        <div className="inputRow">
          <input
            id="event-url"
            name="url"
            type="url"
            defaultValue={EXAMPLE_URL}
            pattern="https://(lu\.ma|luma\.com)/.*"
            required
            spellCheck={false}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Extracting..." : "Extract event"}
          </button>
        </div>
        <p className="costNote">Maximum charge: $0.0042 per request</p>
      </form>

      <section className="output" aria-live="polite">
        <div className="outputHeader">
          <span>result.json</span>
          <span className={result ? "status live" : "status"}>
            {result ? result.receipt.paymentStatus : "WAITING"}
          </span>
        </div>

        {error ? (
          <div className="error" role="alert">
            <strong>Request failed</strong>
            <p>{error}</p>
            {failedReceipt ? (
              <code>
                {failedReceipt.paymentStatus}: ${failedReceipt.paidUsd} settled,{" "}
                ${failedReceipt.heldUsd ?? "0.00"} held
              </code>
            ) : (
              <p>
                Retry the same URL to reuse its idempotency key. Changing the
                URL starts a new request.
              </p>
            )}
          </div>
        ) : result ? (
          <div className="result">
            <div className="eventTitle">
              <span>EVENT</span>
              <h2>{result.event.title}</h2>
            </div>
            <dl>
              <div>
                <dt>Starts</dt>
                <dd>{result.event.startDate}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{result.event.location ?? "Not published"}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{result.receipt.paymentStatus}</dd>
              </div>
              <div>
                <dt>Settled</dt>
                <dd>${result.receipt.paidUsd}</dd>
              </div>
              <div>
                <dt>Held</dt>
                <dd>
                  {result.receipt.heldUsd
                    ? `$${result.receipt.heldUsd}`
                    : "none"}
                </dd>
              </div>
              <div>
                <dt>Artifact</dt>
                <dd>
                  {result.receipt.artifactId === null
                    ? "not persisted"
                    : `#${result.receipt.artifactId}`}
                </dd>
              </div>
            </dl>
            <details>
              <summary>Show description</summary>
              <p className="description">
                {result.event.description ?? "No description returned."}
              </p>
            </details>
          </div>
        ) : (
          <div className="empty">
            <p>Structured event data and payment evidence will appear here.</p>
            <code>POST /api/extract-event</code>
          </div>
        )}
      </section>
    </div>
  );
}
