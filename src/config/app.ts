/**
 * Where the game lives in Telegram, for share and invite links. Set these at build time:
 *   VITE_TG_BOT=YourBot VITE_TG_APP=darafsh npm run build
 * With a bot (and optionally a Mini App short name) links become Telegram deep links
 * (https://t.me/<bot>/<app>?startapp=… or https://t.me/<bot>?startapp=…) that open the game
 * directly inside Telegram with a start parameter. Without them the page's own URL is used
 * (with ?startapp=… so the same parsing works in a browser).
 */
export const APP = {
  botUsername: (import.meta.env.VITE_TG_BOT as string | undefined) ?? '',
  appName: (import.meta.env.VITE_TG_APP as string | undefined) ?? '',
} as const;
