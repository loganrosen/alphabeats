import type { Restaurant } from '../api.js';
import RestaurantCard from './RestaurantCard.js';

interface SearchResult {
  status: 'idle' | 'loading' | 'done' | 'error';
  restaurants: Restaurant[];
  hitLimit: boolean;
  totalRows: number;
  error: string | null;
}

export default function ResultsGrid({ result }: { result: SearchResult }) {
  const { status, restaurants, hitLimit, totalRows, error } = result;

  if (status === 'idle') return (
    <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
      <div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">EAT</div>
      ENTER A RESTAURANT NAME, ADDRESS, OR BOROUGH TO BEGIN
    </div>
  );
  if (status === 'loading') return (
    <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
      <div className="w-7 h-7 border-2 border-zinc-400 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4 dark:border-zinc-800 dark:border-t-yellow-400" />
      SEARCHING…
    </div>
  );
  if (status === 'error') return (
    <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
      <div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">!</div>
      {error}
    </div>
  );

  return (
    <>
      <div className="px-8 py-3 border-b border-zinc-200 flex items-center gap-4 font-mono text-sm text-zinc-500 tracking-wide flex-wrap dark:border-zinc-800 dark:text-zinc-300">
        <span className="text-zinc-800 font-medium dark:text-zinc-100">
          {restaurants.length.toLocaleString()} restaurant{restaurants.length !== 1 ? 's' : ''}
        </span>
        {hitLimit && <span className="text-amber-500">⚠ Result limit reached — refine your search</span>}
        <span className="ml-auto">{totalRows.toLocaleString()} inspection records</span>
      </div>

      {restaurants.length === 0
        ? <div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
            <div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">0</div>
            NO RESULTS — TRY BROADER TERMS
          </div>
        : <div className="grid [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))] gap-px bg-zinc-200 dark:bg-zinc-800">
            {restaurants.map(r => <RestaurantCard key={r.camis} restaurant={r} />)}
          </div>
      }
    </>
  );
}
