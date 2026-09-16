"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type {
  AnalyzeFounderResponse,
  FounderCard,
  Receipt,
  TrendHit,
} from "@/lib/founder";
import { shareCopy } from "@/lib/founder";

const DIRECTORY_KEY = "solo-founders-directory";

interface DirectoryEntry {
  handle: string;
  name: string;
  label: string;
  score: number;
}

export function FounderStudio({
  initialHandle = "nittarab",
}: {
  initialHandle?: string;
}) {
  const pendingAnalyze = useRef<{ handle: string; id: string } | null>(null);
  const pendingScan = useRef<string | null>(null);
  const [result, setResult] = useState<AnalyzeFounderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedReceipt, setFailedReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [trend, setTrend] = useState<TrendHit[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DIRECTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DirectoryEntry[];
      if (Array.isArray(parsed)) setDirectory(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  function remember(founder: FounderCard) {
    setDirectory((current) => {
      const next = [
        {
          handle: founder.handle,
          name: founder.name,
          label: founder.vibe.label,
          score: founder.vibe.score,
        },
        ...current.filter(
          (entry) =>
            entry.handle.toLowerCase() !== founder.handle.toLowerCase(),
        ),
      ].slice(0, 24);
      localStorage.setItem(DIRECTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function runAnalyze(handle: string) {
    setLoading(true);
    setError(null);
    setFailedReceipt(null);
    if (pendingAnalyze.current?.handle !== handle) {
      pendingAnalyze.current = { handle, id: crypto.randomUUID() };
    }
    try {
      const response = await fetch("/api/analyze-founder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          requestId: pendingAnalyze.current.id,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.receipt) setFailedReceipt(body.receipt);
        throw new Error(body.error ?? "The analysis failed.");
      }
      setResult(body);
      remember(body.founder);
      pendingAnalyze.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await runAnalyze(String(formData.get("handle")));
  }

  async function scan() {
    setScanning(true);
    setError(null);
    pendingScan.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/scan-trend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: pendingScan.current }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "The scan failed.");
      }
      setTrend(body.founders ?? []);
      pendingScan.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function copyCard(founder: FounderCard) {
    const text = shareCopy(founder, window.location.origin);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const founder = result?.founder;

  return (
    <section className="workspace">
      <div className="intro">
        <p className="kicker">The trend, as a card</p>
        <h1>
          I'm <em>Name</em>, I'm a solo founder
        </h1>
        <p>
          Paste an X handle. This server pays x402 Atlas through Weft for the
          public profile, then scores a vibe check. No X app. No LinkedIn
          scrape.
        </p>
      </div>

      <form onSubmit={submit} className="commandBar">
        <label htmlFor="handle">X handle</label>
        <div className="inputRow">
          <input
            id="handle"
            name="handle"
            defaultValue={initialHandle}
            required
            spellCheck={false}
            placeholder="@handle"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Reading..." : "Vibe check"}
          </button>
        </div>
        <p className="costNote">Maximum charge: $0.01 per profile</p>
      </form>

      {error ? (
        <div className="error" role="alert">
          <strong>Request failed</strong>
          <p>{error}</p>
          {failedReceipt ? (
            <code>
              {failedReceipt.paymentStatus}: ${failedReceipt.paidUsd} settled, $
              {failedReceipt.heldUsd ?? "0.00"} held
            </code>
          ) : null}
        </div>
      ) : null}

      {founder ? (
        <article className="card">
          <div className="cardTop">
            {founder.avatarUrl ? (
              // biome-ignore lint/performance/noImgElement: remote avatars
              <img src={founder.avatarUrl} alt="" width={88} height={88} />
            ) : (
              <div className="avatarFallback">{founder.name.slice(0, 1)}</div>
            )}
            <div>
              <p className="vibe">{founder.vibe.label}</p>
              <h2>{founder.name}</h2>
              <p className="handle">@{founder.handle}</p>
            </div>
            <p className="score">{founder.vibe.score}</p>
          </div>
          {founder.bio ? <p className="bio">{founder.bio}</p> : null}
          <dl>
            <div>
              <dt>Followers</dt>
              <dd>{founder.followers ?? "—"}</dd>
            </div>
            <div>
              <dt>Following</dt>
              <dd>{founder.following ?? "—"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{founder.location ?? "Not listed"}</dd>
            </div>
            <div>
              <dt>Site</dt>
              <dd>
                {founder.website ? (
                  <a href={founder.website}>{founder.website}</a>
                ) : (
                  "None"
                )}
              </dd>
            </div>
          </dl>
          <ul className="signals">
            {founder.vibe.signals.map((signal) => (
              <li key={signal.id} data-hit={signal.hit}>
                {signal.text}
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" onClick={() => copyCard(founder)}>
              {copied ? "Copied" : "Copy the tweet"}
            </button>
            <a href={`https://x.com/${founder.handle}`}>Open on X</a>
            {founder.github ? (
              <a href={`https://github.com/${founder.github}`}>GitHub</a>
            ) : null}
          </div>
          {result ? (
            <p className="receipt">
              {result.receipt.paymentStatus}: ${result.receipt.paidUsd} settled
              {result.receipt.heldUsd
                ? `, $${result.receipt.heldUsd} held`
                : ""}
              {result.receipt.artifactId
                ? ` · artifact #${result.receipt.artifactId}`
                : ""}
            </p>
          ) : null}
        </article>
      ) : (
        <div className="empty">
          <p>A founder card and payment evidence will land here.</p>
          <code>POST /api/analyze-founder</code>
        </div>
      )}

      <section className="directory">
        <div className="directoryHead">
          <h2>Directory</h2>
          <button type="button" onClick={scan} disabled={scanning}>
            {scanning ? "Scanning..." : "Scan the trend · $0.01"}
          </button>
        </div>
        {trend.length > 0 ? (
          <ul className="trend">
            {trend.map((hit) => (
              <li key={hit.handle}>
                <button type="button" onClick={() => runAnalyze(hit.handle)}>
                  @{hit.handle}
                </button>
                <span>{hit.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {directory.length > 0 ? (
          <ul className="chips">
            {directory.map((entry) => (
              <li key={entry.handle}>
                <a href={`/u/${entry.handle}`}>
                  @{entry.handle}
                  <small>
                    {entry.score} · {entry.label}
                  </small>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Cards you analyze stay in this browser. That is the directory until
            someone hosts it with a budget.
          </p>
        )}
      </section>
    </section>
  );
}
