import { createContext, useContext } from 'react';

interface CardSearchState {
  query: string;
  activeMatchIndex: number;
  totalMatches: number;
  setTotalMatches: (count: number) => void;
}

export const CardSearchContext = createContext<CardSearchState>({
  query: '',
  activeMatchIndex: 0,
  totalMatches: 0,
  setTotalMatches: () => {},
});

export function useCardSearch() {
  return useContext(CardSearchContext);
}
