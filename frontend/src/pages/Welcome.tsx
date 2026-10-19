import { useState, type FormEvent } from 'react';
import { api, setStoredUser } from '../api';
import type { User } from '../types';

export default function Welcome({ onReady }: { onReady: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createUser(username.trim());
      setStoredUser(res.user);
      onReady(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Noted</h1>
          <p className="mt-2 text-neutral-500">Remember more, one card at a time.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">Choose a username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="e.g. alex"
              maxLength={100}
              className="rounded-lg border border-neutral-200 px-3 py-2.5 text-base focus:border-neutral-400 focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username.trim()}
            className="rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
          >
            {busy ? 'Starting…' : 'Start learning'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          No password needed — your username is your identity.
        </p>
      </div>
    </div>
  );
}
