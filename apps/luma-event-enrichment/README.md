# Luma Event Enrichment

Paste a public Luma event URL. The Next.js server route sends one bounded paid
request through `@weft-labs/sdk`, decodes the provider response, and returns
normalized event data with Weft's receipt fields.

You need one `WEFT_API_KEY`. You do not need a Diffbot account, provider key, or
separate provider billing setup.

## Run it

From the repository root:

```sh
mise exec -- pnpm install --frozen-lockfile
cp apps/luma-event-enrichment/.env.example apps/luma-event-enrichment/.env.local
# Replace wk_replace_me with a buyer key.
mise exec -- pnpm dev
```

Open http://localhost:3000 and submit a public `https://luma.com/...` or
`https://lu.ma/...` event URL.

The funded route is disabled when `NODE_ENV=production`. This prevents a public
deployment from spending the example owner's wallet. Add application auth and a
caller budget before adapting this route for a hosted product.
The development server also binds to `127.0.0.1`, not the local network.
The route rejects cross-origin and non-JSON browser requests before it reads the
wallet key.

## Request path

1. The browser sends the event URL and one request UUID to
   `POST /api/extract-event`.
2. The server validates the host before money can move.
3. `WeftClient.fetch` calls the indexed Diffbot Event operation with a hard
   `$0.0042` ceiling and the request UUID as its idempotency key.
4. The server validates the provider output and returns normalized fields plus
   `paymentStatus`, `paidUsd`, `heldUsd`, `artifactId`, and `txHash`.

The browser never receives `WEFT_API_KEY`.

## Live proof

Observed on 2026-08-29 with `https://luma.com/builders-day-2026`:

- Operation: `mpp-operation-65-6`
- Access method: `mpp-access-65-6-0-x402`
- Provider response: HTTP 200
- Payment status: `pending`
- Settled: `$0.00`
- Held: `$0.0042`
- Artifact: `356`

The normalized event and receipt are archived in
[`evidence/2026-08-29-builders-day.json`](evidence/2026-08-29-builders-day.json).

A pending hold is not settled spend. The UI preserves both values so an app can
say what happened without guessing.
