# NexaGame 🎮

Telegram Mini App prototype: **NexaFly**, a Flappy-style original canvas game built with TypeScript, React and Vite. All artwork is drawn in code. No copied game assets are used.

## Run locally

```bash
npm ci
npm run dev
npm run build
```

The first CI run creates `package-lock.json` and attaches it as an artifact. Commit that generated file so subsequent builds can use a reproducible lockfile.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml` to type-check, build, and upload only `dist/` to the dedicated FTP account's root using encrypted FTPS. The root has been verified to map to `https://game.realmetaverse.ir/`. The workflow does not delete remote files. Keep FTP credentials in GitHub Actions Secrets only.

## Authentication and scores

The web client passes Telegram `initData` to `game-auth` on the NexaGame Supabase project for server-side verification. Without valid login the prototype remains playable in guest mode. **Scores and bests are only stored locally on the device, are not sent to Supabase, and must never be treated as ranked/verified results.** Online scoring will require a separate server-authoritative game design.
