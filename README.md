# RiffRelay

![RiffRelay banner](https://raw.githubusercontent.com/RiffRelay/Branding/main/assets/riffrelay-banner.png)

RiffRelay is an independent, unofficial Discord companion for music-listening history on ListenBrainz. Every command works as both a **slash command** and a **prefix command** (`!` by default). `login` never accepts a token argument; it collects the secret through a private modal so it never appears in chat history. All output is delivered as Discord embeds, composed with small React-style display components rendered to Components V2 payloads.

The bot ships as a **single compiled artifact** (`dist/bot.js`) produced by its own compiler (`scripts/compiler.ts`): bundled, minified and string-obfuscated. It does not run from the raw source tree in production.

## Features

- **Always embeds** — messages are built with typed React components and rendered to Discord Components V2 displays via a tiny custom reconciler (`src/display/`). No plain-text replies.
- **Dual input** — every command is defined once (name, options, aliases) and exposed as both a slash command and a prefix command with `--flag`/positional argument support.
- **Scrobbling** — `scrobble`, `love`/`unlove`, `loved`, `pin`/`unpin`/`pins` straight from Discord.
- **Statistics** — daily/weekly/monthly/yearly/all-time stats for artists, albums, tracks and recordings.
- **Exploration** — artist/album/track pages with MusicBrainz metadata and cover art, `mood`, `fresh` (new releases), `search`.
- **Social** — `similar` users and compare your taste with someone else.
- **Support** — the `bot` command occasionally features a GitHub Sponsors link and developer profile.
- **Encrypted storage** — user ListenBrainz tokens encrypted with AES-256-GCM (see Security below).
- **Presence** — stays in Do Not Disturb and rotates through music-listening activities.

## Requirements

- [Bun](https://bun.sh) ≥ 1.3
- A Discord application + bot token (`Client ID`, `Client Secret` optional)
- ListenBrainz accounts for your users (they log in with a User Token)

## Setup

```bash
bun install
cp .env.example .env   # fill in DISCORD_TOKEN + CLIENT_ID
bun run register       # push slash commands to your guild(s)
bun run build          # compile dist/bot.js (minified + obfuscated)
bun run start          # run the compiled artifact
```

`listenbrainz-api` is installed as a package dependency from
[`RiffRelay/listenbrainz-api`](https://github.com/RiffRelay/listenbrainz-api)
and bundled straight into `dist/bot.js`.

The bot invite requests only View Channels, Send Messages, Send Messages in Threads, Embed Links,
and Use Application Commands. It does not request Administrator, Manage Messages, or Read Message
History.

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run start` | Run the compiled bot (`dist/bot.js`) |
| `bun run dev` | Run the source tree with watch mode |
| `bun run build` | Compile production `dist/bot.js` (bundle → minify → obfuscate) |
| `bun run build:dev` | Compile `dist/bot.dev.js` (minified bundle with an inline sourcemap, no obfuscation) |
| `bun run register` | Register/refresh slash commands (`--global` for global scope) |
| `bun run typecheck` | TypeScript check |
| `bun run lint` | Biome lint + import sorting |
| `bun run format` | Prettier formatting |
| `bun test` | Run tests (display renderer, crypto round-trips, obfuscator) |

Pull requests and pushes to `main` run the CI workflow: dependency installation, linting,
typechecking, tests, and a production build.

## The compiler

`bun run build` invokes `scripts/compiler.ts`:

1. **Bundle** — Bun's compiler walks the whole module graph (including the `listenbrainz-api` git dependency, discord.js and react) and emits a single ESM file; only `bun` / node builtins stay external.
2. **Minify** — dead-code elimination, constant folding, identifier renaming.
3. **Obfuscate** — `scripts/obfuscate.ts` is a small custom lexer that rewrites string literals into hex/unicode escapes. It never touches module specifiers, regex literals, template literals, comments or directives, and the result is re-parsed to guarantee it stays valid (falling back to minified-only if it ever fails).
4. **Seal** — prepends a `#!/usr/bin/env bun` shebang and reports the final size.

## Configuration

See `.env.example`. `SLASH_GUILD_IDS` (comma-separated) limits slash registration to specific guilds; when empty the bot registers in every guild it joins. `BRAINZBOT_ENC_KEY` must be 64 hex characters; if unset, a key is generated once and stored in `./data/.enc_key` (permissions 0600).

## Security

User ListenBrainz tokens are encrypted with **AES-256-GCM** before they touch disk. The master key is your `BRAINZBOT_ENC_KEY` (32 random bytes, 64 hex chars); if it is ever lost, stored tokens cannot be recovered — users must re-link with `/login` or `!login`. The compiled artifact's string obfuscation is a deterrent against casual reading, not a cryptographic boundary — keep the Discord token and encryption key out of any public build.

## Repository layout

```
RiffRelay
├── src/          → bot source (commands, display renderer, db, handlers)
├── scripts/      → compiler.ts + obfuscate.ts
├── test/         → bun test suites
├── dist/         → compiled output (gitignored)
└── data/         → runtime SQLite DB + .enc_key (gitignored)
```

## License

[MPL-2.0](LICENSE)

## Sponsorship

RiffRelay is free to use. If you'd like to support ongoing development, the `bot` command
occasionally features the developer profile and a GitHub Sponsors link. You can also visit
[GitHub Sponsors](https://github.com/sponsors/kmmiio99o) directly.
