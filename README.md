# Weft Examples

Runnable applications that show how to build with
[@weft-labs/sdk](https://www.npmjs.com/package/@weft-labs/sdk).

| Example | What it proves |
|---|---|
| [`luma-event-enrichment`](apps/luma-event-enrichment) | Turn a public Luma event page into structured data with one bounded paid request. |

## Run locally

```sh
mise trust
mise install
mise exec -- pnpm install --frozen-lockfile
cp apps/luma-event-enrichment/.env.example apps/luma-event-enrichment/.env.local
mise exec -- pnpm dev
```

Each app is self-contained. The workspace shares quality tooling, not product
runtime code.

## Quality checks

```sh
mise exec -- pnpm check
```

## License

[MIT](LICENSE)
Runnable applications that show how to build with Weft
