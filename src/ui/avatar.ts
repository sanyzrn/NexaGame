import type Phaser from 'phaser';
import { FONT_FAMILY } from '../config/display';
import { SCHOOLS, type School } from '../config/team';

/** Anything with a name and a school (or an explicit colour, e.g. the player). */
export interface AvatarSubject {
  id?: string;
  name: string;
  school?: School;
  color?: number;
  photoUrl?: string;
}

const SIZE = 128;
const loading = new Set<string>();

const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export function avatarColor(m: AvatarSubject): number {
  return m.color ?? (m.school ? SCHOOLS[m.school].color : 0xffd24a);
}

/**
 * A member's round avatar (128 px, cached per member): a school-coloured disc with their initial and
 * a gold rim. With a `photoUrl` (a Telegram profile photo) the same texture is repainted with the
 * photo once it loads, so everything already showing it updates in place.
 */
export function avatarTex(scene: Phaser.Scene, m: AvatarSubject): string {
  const key = `avatar_${m.id ?? m.name}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, SIZE, SIZE);
    if (!tex) return key;
    paint(tex.getContext(), m, null);
    tex.refresh();
  }
  if (m.photoUrl && !loading.has(key)) {
    loading.add(key);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
      if (!tex || !('getContext' in tex)) return;
      paint(tex.getContext(), m, img);
      tex.refresh();
    };
    img.src = m.photoUrl;
  }
  return key;
}

function paint(ctx: CanvasRenderingContext2D, m: AvatarSubject, photo: HTMLImageElement | null): void {
  const c = SIZE / 2;
  const r = c - 6;
  const col = avatarColor(m);
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  if (photo) {
    const s = Math.max(SIZE / photo.width, SIZE / photo.height);
    ctx.drawImage(photo, c - (photo.width * s) / 2, c - (photo.height * s) / 2, photo.width * s, photo.height * s);
  } else {
    const g = ctx.createRadialGradient(c - 14, c - 18, 6, c, c, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.22, css(col));
    g.addColorStop(1, '#141030');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.font = `900 60px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.name.charAt(0), c, c + 4);
  }
  ctx.restore();
  // School-coloured inner ring, gold outer rim.
  ctx.lineWidth = 5;
  ctx.strokeStyle = css(col);
  ctx.beginPath();
  ctx.arc(c, c, r - 3, 0, Math.PI * 2);
  ctx.stroke();
  const rim = ctx.createLinearGradient(0, 0, 0, SIZE);
  rim.addColorStop(0, '#fff0b8');
  rim.addColorStop(0.5, '#f3c65a');
  rim.addColorStop(1, '#9a6418');
  ctx.lineWidth = 6;
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.arc(c, c, r + 1, 0, Math.PI * 2);
  ctx.stroke();
}
