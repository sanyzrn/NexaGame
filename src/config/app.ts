/**
 * Where the game lives in Telegram, for share and invite links: the bot's username and, if it has
 * one, the Mini App's short name. Set them at build time:
 *   VITE_TG_BOT=YourBot VITE_TG_APP=darafsh npm run build
 * With a bot, links become Telegram Mini App deep links
 * (https://t.me/<bot>/<app>?startapp=… or https://t.me/<bot>?startapp=…) that open the game
 * straight inside Telegram, carrying the start parameter (who invited you / what to beat).
 * Without them links point at the page itself with ?startapp=… — that is the default, so local
 * development, previews and browser builds keep working exactly as before.
 *
 * The values are cleaned up before use: `@YourBot`, `YourBot`, `https://t.me/YourBot` and even a
 * full `https://t.me/YourBot/darafsh` link are accepted. A value that is not a valid bot username
 * or app short name is ignored (keeping the plain web links) instead of baking a dead t.me link
 * into the build.
 */

/** Telegram bot usernames: 4–32 chars, letters/digits/underscore, starting with a letter. */
const BOT_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
/** Mini App short names set in BotFather: letters, digits and underscores. */
const APP_RE = /^[A-Za-z0-9_]{1,64}$/;

/**
 * Reads a bot setting the way people actually paste it and returns the parts it contains:
 * `@YourBot`, `t.me/YourBot`, `https://t.me/YourBot/darafsh` → `{ bot: 'YourBot', app: 'darafsh' }`.
 * Anything that does not validate is dropped.
 */
export function parseTelegramTarget(raw: unknown): { bot: string; app: string } {
  const cleaned = stripSettings(raw);
  if (!cleaned) return { bot: '', app: '' };
  const [bot, app = ''] = cleaned.split(/[/?#\s]+/);
  return {
    bot: BOT_RE.test(bot) ? bot : '',
    app: APP_RE.test(app) ? app : '',
  };
}

function stripSettings(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.)?(?:t|telegram)\.me\//i, '')
    .replace(/^@/, '');
}

const fromBotVar = parseTelegramTarget(import.meta.env.VITE_TG_BOT);
/** `VITE_TG_APP` is normally just the short name, but a full t.me link is accepted too. */
const appRaw = stripSettings(import.meta.env.VITE_TG_APP);
const fromAppVar = parseTelegramTarget(appRaw);

/** An empty `botUsername` means this build has no bot settings: links stay plain web links. */
export const APP = {
  botUsername: fromBotVar.bot || fromAppVar.bot,
  appName: (APP_RE.test(appRaw) ? appRaw : '') || fromBotVar.app || fromAppVar.app,
} as const;
