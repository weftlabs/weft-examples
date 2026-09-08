# weft-examples

Public, runnable applications for developers building with Weft.

## Rules

- Use pnpm through Mise.
- Keep each app independently runnable from its folder.
- Do not add shared runtime packages until two shipped apps need the same code.
- Keep `WEFT_API_KEY` server-only and require a cost ceiling plus idempotency key
  for every paid fetch.
- Use public or synthetic inputs. Never commit keys, cookies, attendee exports,
  or other private source data.
- Keep claims and receipt language exact: a hold is not settled spend.

## Commands

```sh
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm check
mise exec -- pnpm dev
```

Changes land through a pull request to `main`. Do not merge the pull request.
