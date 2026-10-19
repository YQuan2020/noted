export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ScheduleState {
  intervalDays: number;
  ease: number;
  reps: number;
}

const MIN_EASE = 1.3;
const MAX_EASE = 2.5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Simplified SM-2 scheduling, Anki-style.
 * "again" returns the card immediately; the other grades grow the interval
 * by the card's ease factor (with a boost for "easy").
 */
export function schedule(state: ScheduleState, grade: Grade): ScheduleState & { due: Date } {
  let { intervalDays, ease, reps } = state;

  if (grade === 'again') {
    reps = 0;
    intervalDays = 0;
    ease = clamp(ease - 0.2);
    return { intervalDays, ease, reps, due: new Date() };
  }

  reps += 1;
  if (reps === 1) {
    intervalDays = grade === 'easy' ? 4 : 1;
  } else if (grade === 'hard') {
    intervalDays = Math.max(1, intervalDays * 1.2);
  } else if (grade === 'good') {
    intervalDays = intervalDays * ease;
  } else {
    intervalDays = intervalDays * ease * 1.3;
  }

  if (grade === 'easy') ease = clamp(ease + 0.15);
  else if (grade === 'hard') ease = clamp(ease - 0.15);

  const due = new Date(Date.now() + intervalDays * DAY_MS);
  return { intervalDays, ease, reps, due };
}

function clamp(v: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, v));
}
