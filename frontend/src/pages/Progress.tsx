import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ReviewStats } from '../types';
import ProgressChart from '../components/ProgressChart';

const TILES: { key: 'totalCards' | 'learnedCards' | 'matureCards' | 'dueCards'; label: string }[] = [
  { key: 'totalCards', label: 'Total' },
  { key: 'learnedCards', label: 'Learned' },
  { key: 'matureCards', label: 'Mature' },
  { key: 'dueCards', label: 'Due' },
];

/** Learning-progress dashboard: current SRS totals plus review history charts. */
export default function Progress() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .getReviewStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load progress'));
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-5 text-lg font-semibold">Progress</h2>

      {error && <p className="py-16 text-center text-red-600">{error}</p>}
      {!error && !stats && <p className="py-16 text-center text-neutral-400">Loading…</p>}

      {!error && stats && (
        <>
          <div className="mb-6 grid grid-cols-4 gap-2">
            {TILES.map((t) => (
              <div key={t.key} className="rounded-lg border border-neutral-100 bg-white p-3 text-center">
                <div className="text-xl font-semibold text-neutral-900">{stats[t.key]}</div>
                <div className="mt-0.5 text-xs text-neutral-500">{t.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-lg border border-neutral-100 bg-white p-4">
            <h3 className="text-sm font-medium text-neutral-700">Reviews</h3>
            <p className="mb-3 text-xs text-neutral-400">
              Cards reviewed per day, last {stats.days} days
            </p>
            <ProgressChart data={stats.reviews} kind="bar" label="reviews" />
          </div>

          <div className="rounded-lg border border-neutral-100 bg-white p-4">
            <h3 className="text-sm font-medium text-neutral-700">Cards learned</h3>
            <p className="mb-3 text-xs text-neutral-400">
              Distinct cards that have entered review, cumulative
            </p>
            <ProgressChart data={stats.learned} kind="line" label="learned" />
          </div>
        </>
      )}
    </div>
  );
}
