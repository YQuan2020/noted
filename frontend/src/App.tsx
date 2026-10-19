import { useEffect, useState } from 'react';
import { api, clearStoredUser, getStoredUser } from './api';
import CardEditor from './components/CardEditor';
import ReviewSession from './components/ReviewSession';
import Cards from './pages/Cards';
import CardView from './pages/CardView';
import Decks from './pages/Decks';
import Graph from './pages/Graph';
import Welcome from './pages/Welcome';
import type { User } from './types';

type View =
  | { name: 'review'; deckId?: string | null }
  | { name: 'cards'; deckId?: string | null }
  | { name: 'decks' }
  | { name: 'graph' }
  | { name: 'card'; cardId: string }
  | { name: 'editor'; cardId: string | null };

const NAV: { key: 'review' | 'decks' | 'cards' | 'graph'; label: string; icon: string }[] = [
  { key: 'review', label: 'Review', icon: '▣' },
  { key: 'decks', label: 'Decks', icon: '▤' },
  { key: 'cards', label: 'Cards', icon: '☰' },
  { key: 'graph', label: 'Graph', icon: '⑃' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [view, setView] = useState<View>({ name: 'review' });
  const [checking, setChecking] = useState(Boolean(user));

  // Validate a stored user id against the API so stale ids fall back to Welcome.
  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    api
      .getMe()
      .then((r) => setUser(r.user))
      .catch(() => {
        clearStoredUser();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="flex min-h-dvh items-center justify-center text-neutral-400">Loading…</div>;
  }

  if (!user) {
    return (
      <Welcome
        onReady={(u) => {
          setUser(u);
          setView({ name: 'review' });
        }}
      />
    );
  }

  const signOut = () => {
    clearStoredUser();
    setUser(null);
  };

  const handleEditorDone = (createdId?: string) => {
    if (createdId) setView({ name: 'editor', cardId: createdId });
    else setView({ name: 'cards' });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-5">
          <button
            onClick={() => setView({ name: 'review' })}
            className="text-lg font-semibold tracking-tight"
          >
            Noted
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">@{user.username}</span>
            <button onClick={signOut} className="text-sm text-neutral-400 hover:text-neutral-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-6 pb-24">
        {view.name === 'review' && (
          <ReviewSession
            key={`review:${view.deckId ?? 'all'}`}
            initialDeckId={view.deckId}
            onEdit={(id) => setView({ name: 'editor', cardId: id })}
          />
        )}
        {view.name === 'decks' && (
          <Decks
            onOpen={(deckId) => setView({ name: 'cards', deckId })}
            onStudy={(deckId) => setView({ name: 'review', deckId })}
          />
        )}
        {view.name === 'graph' && (
          <Graph onOpenCard={(id) => setView({ name: 'card', cardId: id })} />
        )}
        {view.name === 'card' && (
          <CardView
            cardId={view.cardId}
            onEdit={(id) => setView({ name: 'editor', cardId: id })}
            onDone={() => setView({ name: 'cards' })}
          />
        )}
        {view.name === 'cards' && (
          <Cards
            key={`cards:${view.deckId ?? 'all'}`}
            initialDeckId={view.deckId}
            onEdit={(id) => setView({ name: 'editor', cardId: id })}
            onNew={() => setView({ name: 'editor', cardId: null })}
          />
        )}
        {view.name === 'editor' && (
          <CardEditor
            cardId={view.cardId}
            onDone={handleEditorDone}
            onOpenCard={(id) => setView({ name: 'card', cardId: id })}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                const next: View =
                  item.key === 'review'
                    ? { name: 'review' }
                    : item.key === 'cards'
                      ? { name: 'cards' }
                      : item.key === 'decks'
                        ? { name: 'decks' }
                        : { name: 'graph' };
                setView(next);
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                view.name === item.key ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
