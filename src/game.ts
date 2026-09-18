export type Phase = 'ready' | 'playing' | 'over';
export type GameSnapshot = { phase: Phase; score: number; best: number };

type Pipe = { x: number; opening: number; scored: boolean };

const WIDTH = 360;
const HEIGHT = 600;
const GROUND = 540;
const BIRD_X = 95;
const BIRD_RADIUS = 17;
const PIPE_WIDTH = 62;
const PIPE_GAP = 165;
const BEST_KEY = 'nexagame:fly:device-best:v1';

function readBest(): number {
  try {
    const value = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export class FlappyGame {
  private phase: Phase = 'ready';
  private score = 0;
  private best = readBest();
  private y = 262;
  private velocity = 0;
  private pipes: Pipe[] = [];
  private spawnClock = 0;
  private elapsed = 0;

  constructor(private readonly onChange: (snapshot: GameSnapshot) => void) {
    this.notify();
  }

  getSnapshot(): GameSnapshot {
    return { phase: this.phase, score: this.score, best: this.best };
  }

  tap(): void {
    if (this.phase !== 'playing') {
      this.phase = 'playing';
      this.score = 0;
      this.y = 262;
      this.velocity = 0;
      this.pipes = [];
      this.spawnClock = 0;
      this.elapsed = 0;
      this.notify();
    }
    this.velocity = -315;
  }

  update(rawDelta: number): void {
    const dt = Math.min(Math.max(rawDelta, 0), 0.034);
    if (this.phase === 'ready') {
      this.elapsed += dt;
      return;
    }
    if (this.phase !== 'playing') return;
    this.elapsed += dt;
    this.velocity += 900 * dt;
    this.y += this.velocity * dt;
    this.spawnClock += dt;
    if (this.spawnClock >= 1.6) {
      this.spawnClock -= 1.6;
      this.pipes.push({ x: WIDTH + 10, opening: 166 + Math.random() * 215, scored: false });
    }
    const speed = Math.min(146 + this.score * 3.5, 224);
    for (const pipe of this.pipes) {
      pipe.x -= speed * dt;
      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
        pipe.scored = true;
        this.score += 1;
        this.notify();
      }
      const gapTop = pipe.opening - PIPE_GAP / 2;
      const gapBottom = pipe.opening + PIPE_GAP / 2;
      if (BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH) {
        if (this.y - BIRD_RADIUS < gapTop || this.y + BIRD_RADIUS > gapBottom) {
          this.end();
          break;
        }
      }
    }
    this.pipes = this.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -10);
    if (this.y - BIRD_RADIUS < 0 || this.y + BIRD_RADIUS >= GROUND) this.end();
  }

  private end(): void {
    if (this.phase === 'over') return;
    this.phase = 'over';
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Private browsing or disabled storage: gameplay still works.
      }
    }
    this.notify();
  }

  private notify(): void {
    this.onChange(this.getSnapshot());
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#cceaf7';
    ctx.fillRect(0, 0, WIDTH, GROUND);

    // Gently moving clouds and rolling hills; all artwork is drawn here.
    ctx.fillStyle = '#ffffff';
    for (const [i, cloudY] of [98, 164, 72].entries()) {
      const x = ((i * 147 + 50 - this.elapsed * (7 + i * 2)) % 480 + 480) % 480 - 50;
      ctx.beginPath();
      ctx.ellipse(x, cloudY, 36, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 19, cloudY - 8, 24, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#b0dfd3';
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    ctx.lineTo(0, 458);
    ctx.quadraticCurveTo(88, 409, 181, 465);
    ctx.quadraticCurveTo(280, 400, WIDTH, 453);
    ctx.lineTo(WIDTH, GROUND);
    ctx.fill();
    ctx.fillStyle = '#75c7b9';
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    ctx.lineTo(0, 503);
    ctx.quadraticCurveTo(100, 440, 189, 501);
    ctx.quadraticCurveTo(300, 445, WIDTH, 490);
    ctx.lineTo(WIDTH, GROUND);
    ctx.fill();

    for (const pipe of this.pipes) {
      const top = pipe.opening - PIPE_GAP / 2;
      const bottom = pipe.opening + PIPE_GAP / 2;
      ctx.fillStyle = '#138d7e';
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, top);
      ctx.fillRect(pipe.x, bottom, PIPE_WIDTH, GROUND - bottom);
      ctx.fillStyle = '#0d6e67';
      ctx.fillRect(pipe.x + PIPE_WIDTH - 9, 0, 9, top);
      ctx.fillRect(pipe.x + PIPE_WIDTH - 9, bottom, 9, GROUND - bottom);
      ctx.fillStyle = '#20a796';
      ctx.fillRect(pipe.x - 4, top - 18, PIPE_WIDTH + 8, 18);
      ctx.fillRect(pipe.x - 4, bottom, PIPE_WIDTH + 8, 18);
      ctx.fillStyle = '#75d2bc';
      ctx.fillRect(pipe.x + 8, 0, 5, Math.max(0, top - 18));
      ctx.fillRect(pipe.x + 8, bottom + 18, 5, Math.max(0, GROUND - bottom - 18));
    }

    ctx.fillStyle = '#f4e8c9';
    ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
    ctx.fillStyle = '#dbbe8e';
    ctx.fillRect(0, GROUND, WIDTH, 7);
    ctx.fillStyle = '#e9d5b2';
    for (let i = 0; i < 8; i += 1) {
      const x = (i * 57 - this.elapsed * 24) % (WIDTH + 57);
      ctx.fillRect(x, GROUND + 31, 21, 4);
    }

    const birdY = this.phase === 'ready' ? this.y + Math.sin(this.elapsed * 3.5) * 6 : this.y;
    const angle = this.phase === 'ready' ? -0.08 : Math.max(-0.5, Math.min(this.velocity / 600, 0.95));
    ctx.save();
    ctx.translate(BIRD_X, birdY);
    ctx.rotate(angle);
    ctx.fillStyle = '#fbbf45';
    ctx.strokeStyle = '#8d531e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe49c';
    ctx.beginPath();
    ctx.ellipse(-7, 6 + Math.sin(this.elapsed * 19) * 2, 11, 7, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f07c51';
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(27, 8);
    ctx.lineTo(11, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#253246';
    ctx.beginPath();
    ctx.arc(9, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
