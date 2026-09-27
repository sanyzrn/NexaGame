/**
 * The surprise director: at each wave start it decides whether weather rolls in and/or a
 * historical event fires during that wave, and when. The first wave stays clean (learn the enemy),
 * surprises are capped per run and never stack on the same moment, so they stay surprises.
 */
export interface DirectorState {
  weathers: number;
  events: number;
  /** Wave index of the last weather (no weather two waves in a row). */
  lastWeatherWave: number;
}

export interface WavePlan {
  /** ms into the wave when weather begins, or -1. */
  weatherAt: number;
  /** ms into the wave when an event fires, or -1. */
  eventAt: number;
}

export const DIRECTOR = {
  weatherChance: 0.5,
  eventChance: 0.55,
  maxWeathers: 2,
  maxEvents: 3,
};

export function newDirector(): DirectorState {
  return { weathers: 0, events: 0, lastWeatherWave: -9 };
}

export function planWave(d: DirectorState, waveIndex: number, rand: () => number = Math.random): WavePlan {
  const plan: WavePlan = { weatherAt: -1, eventAt: -1 };
  if (waveIndex < 1) return plan;
  if (d.weathers < DIRECTOR.maxWeathers && waveIndex - d.lastWeatherWave > 1 && rand() < DIRECTOR.weatherChance) {
    plan.weatherAt = 1500 + rand() * 4000;
    d.weathers++;
    d.lastWeatherWave = waveIndex;
  }
  if (d.events < DIRECTOR.maxEvents && rand() < DIRECTOR.eventChance) {
    plan.eventAt = 3500 + rand() * 6000;
    // Keep a clear 3 s between the two headlines.
    if (plan.weatherAt >= 0 && Math.abs(plan.eventAt - plan.weatherAt) < 3000) plan.eventAt = plan.weatherAt + 3000 + rand() * 2000;
    d.events++;
  }
  return plan;
}
