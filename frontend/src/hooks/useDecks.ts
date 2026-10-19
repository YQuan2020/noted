import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Deck, DecksResponse } from '../types';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [stats, setStats] = useState<DecksResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listDecks();
      setDecks(res.decks);
      setStats(res.stats);
    } catch {
      /* non-fatal — deck lists are a convenience */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { decks, stats, loading, refresh };
}
