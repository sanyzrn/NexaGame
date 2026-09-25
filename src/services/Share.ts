import { services } from '.';
import type { ShareTicket } from './GameService';

/** How a share went, so the UI can say something fitting («لینک کپی شد»…). */
export type ShareOutcome = 'telegram' | 'native' | 'copied' | 'failed';

/**
 * Sends a ShareTicket wherever this device can: a prepared Telegram message (backend), Telegram's
 * share sheet (text + link), the browser's native share sheet (with the card image when files are
 * supported), or the clipboard as the last resort.
 */
export async function shareTicket(ticket: ShareTicket, image?: { dataUrl: string; name: string }): Promise<ShareOutcome> {
  const tg = services.telegram;
  if (ticket.kind === 'preparedMessage') return tg.shareMessage(ticket.id) ? 'telegram' : 'failed';
  if (tg.shareLink(ticket.url, ticket.text)) return 'telegram';

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function') {
    try {
      const data: ShareData = { text: ticket.text, url: ticket.url };
      if (image) {
        const file = await dataUrlToFile(image.dataUrl, image.name);
        if (file && nav.canShare?.({ files: [file] })) data.files = [file];
      }
      await nav.share(data);
      return 'native';
    } catch (err) {
      // The user closed the sheet: that is not a failure worth a fallback.
      if ((err as DOMException)?.name === 'AbortError') return 'native';
    }
  }
  try {
    await navigator.clipboard.writeText(`${ticket.text}\n${ticket.url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Saves a PNG data URL as a file (normal browsers; Telegram's webview ignores downloads). */
export function downloadPng(dataUrl: string, name: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], name, { type: blob.type || 'image/png' });
  } catch {
    return null;
  }
}
