import { useEffect, useRef, useState } from 'react';
import { FlappyGame, type GameSnapshot } from './game';

const AUTH_URL = 'https://ygritvnannbrklplecdo.supabase.co/functions/v1/game-auth';
const formatNumber = (value: number) => value.toLocaleString('fa-IR');

type WebApp = { initData: string; ready: () => void; expand: () => void };
type AuthResponse = { ok?: boolean; player?: { firstName?: string }; error?: string };
type Login = { state: 'loading' | 'verified' | 'guest'; name: string; message: string };

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FlappyGame | null>(null);
  const [game, setGame] = useState<GameSnapshot>({ phase: 'ready', score: 0, best: 0 });
  const [login, setLogin] = useState<Login>({ state: 'loading', name: '', message: 'در حال بررسی ورود امن…' });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const engine = new FlappyGame(setGame);
    gameRef.current = engine;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(360 * ratio);
      canvas.height = Math.round(600 * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      engine.draw(context);
    };
    resize();
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      if (!document.hidden) engine.update(delta);
      engine.draw(context);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
      event.preventDefault();
      engine.tap();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    try {
      app?.ready();
      app?.expand();
    } catch {
      // An ordinary browser can still play the offline prototype.
    }
    if (!app?.initData) {
      setLogin({ state: 'guest', name: '', message: 'حالت مهمان؛ برای ورود از داخل بات باز کن.' });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    const loginPlayer = async () => {
      try {
        const response = await fetch(AUTH_URL, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: app.initData }),
          signal: controller.signal,
        });
        const result: AuthResponse = await response.json();
        if (!response.ok || !result.ok || !result.player) throw new Error('Telegram verification failed');
        setLogin({ state: 'verified', name: (result.player.firstName || 'بازیکن').slice(0, 48), message: 'ورود تلگرام تأیید شد' });
      } catch {
        if (!controller.signal.aborted) setLogin({ state: 'guest', name: '', message: 'ورود تأیید نشد؛ فقط بازی آزمایشی در دسترس است.' });
      } finally {
        window.clearTimeout(timer);
      }
    };
    void loginPlayer();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  const trigger = () => gameRef.current?.tap();
  return (
    <main className="app">
      <header className="header">
        <div className="brand"><span className="brand-icon" aria-hidden="true">✳</span><div><strong>NexaGame</strong><small>آزمایشگاه بازی‌های کوچک</small></div></div>
        <span className={'connection ' + (login.state === 'verified' ? 'connected' : '')} title={login.message}>
          <span className="connection-dot" />{login.state === 'verified' ? 'متصل' : login.state === 'loading' ? 'در حال اتصال' : 'مهمان'}
        </span>
      </header>

      <section className="intro" aria-label="معرفی بازی">
        <div><span className="eyebrow">نسخه آزمایشی ۰.۱</span><h1>NexaFly <span aria-hidden="true">🐤</span></h1><p>{login.state === 'verified' ? `خوش اومدی، ${login.name}!` : login.message}</p></div>
        <span className="prototype">PROTOTYPE</span>
      </section>

      <section className="scores" aria-label="امتیازها">
        <div className="score"><span>امتیاز این دور</span><strong aria-live="polite">{formatNumber(game.score)}</strong></div>
        <div className="score"><span>رکورد این دستگاه</span><strong>{formatNumber(game.best)}</strong></div>
      </section>

      <section className="stage" aria-label="بازی پرنده">
        <canvas ref={canvasRef} width="360" height="600" onPointerDown={trigger} aria-label="برای پریدن روی صفحه بزن" />
        {game.phase !== 'playing' && (
          <div className="overlay">
            <div className="overlay-panel">
              <span className="overlay-symbol" aria-hidden="true">{game.phase === 'over' ? '💥' : '✦'}</span>
              <h2>{game.phase === 'over' ? 'اوه! دوباره بپر' : 'فقط یه دست دیگه!'}</h2>
              <p>{game.phase === 'over' ? `امتیازت: ${formatNumber(game.score)} · رکورد: ${formatNumber(game.best)}` : 'از بین لوله‌ها رد شو و رکورد خودت رو بشکن.'}</p>
              <button type="button" className="play-button" onClick={trigger}>{game.phase === 'over' ? 'دوباره بازی کن ↺' : 'شروع بازی ←'}</button>
            </div>
          </div>
        )}
        {game.phase === 'playing' && <div className="tap-hint" aria-hidden="true">برای پرش لمس کن ↑</div>}
      </section>

      <footer className="footer">
        <span>👆 لمس صفحه یا Space برای پرش</span>
        <span>رکورد فعلاً محلی است؛ جدول رقابت هنوز فعال نیست.</span>
      </footer>
    </main>
  );
}
