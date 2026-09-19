# Founders Directory

Public site: [foundersdirectory.app](https://foundersdirectory.app).
Paste an X handle and get a public founder card and a vibe check. One Weft
Account. No X developer app. The package folder is still `solo-founders`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/weftlabs/weft-examples&env=WEFT_API_KEY,WEFT_PUBLIC&envDescription=Weft%20buyer%20API%20key%20(wk_*)%20plus%20WEFT_PUBLIC=1%20to%20allow%20hosted%20spend&project-name=solo-founders&repository-name=solo-founders)

## Setup

1. Sign in at [weft.network](https://weft.network).
2. Create a buyer key in [Dashboard → API keys](https://weft.network/dashboard/buyer/api_keys).
3. On Vercel, set `WEFT_API_KEY` to the `wk_*` value and `WEFT_PUBLIC=1` only
   if this deployment should spend that key on public traffic. Never commit it.

## Local

From the `weft-examples` repository root:

```sh
mise exec -- pnpm install --frozen-lockfile
cp apps/solo-founders/.env.example apps/solo-founders/.env.local
mise exec -- pnpm --filter solo-founders dev
```

Open http://127.0.0.1:3000 and paste an X handle.

The funded routes stay local-only unless `WEFT_PUBLIC=1`. The development
server binds to `127.0.0.1`. Cross-origin and non-JSON requests are rejected
before the wallet key is read.

## Cost

Indexed price for the profile job: `$0.005` per request (live Weft search,
trace `297d328f-2b64-4423-84c6-e0461d3659bd`, operation
`bazaar-x402-atlas-183`). The app refuses any run above `$0.01`.
A receipt id is shown on every paid result.

Optional trend scan (`I'm a solo founder`) is a second `$0.005` search
(`bazaar-x402-atlas-177`), also capped at `$0.01`.

A pending hold is not settled spend.

## Not this app

- It will not log anyone into X
- It will not create a second vendor account
- It will not send email or LinkedIn messages
- It will not scrape gated guest lists or store sample PII
- It will not claim the person is a founder; the score is a vibe check
  on public profile fields
