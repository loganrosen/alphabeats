import { useState, useEffect, useCallback, useRef } from 'react';
import SearchForm from './components/SearchForm.js';
import ResultsGrid from './components/ResultsGrid.js';
import { searchRestaurants, groupRows, fetchCuisines, fetchCommunityBoards, type SearchParams, type Restaurant, type CommunityBoard } from './api.js';
import { useTheme, type Theme } from './useTheme.js';

interface SearchResult {
  status: 'idle' | 'loading' | 'done' | 'error';
  restaurants: Restaurant[];
  hitLimit: boolean;
  totalRows: number;
  error: string | null;
}

const EMPTY: SearchParams = { name: '', boro: [], address: '', zip: '', cuisine: '', grade: [], cb: '' };
const IDLE: SearchResult = { status: 'idle', restaurants: [], hitLimit: false, totalRows: 0, error: null };

function readParams(): SearchParams {
  const p = new URLSearchParams(window.location.search);
  return {
    name:    p.get('name')    ?? '',
    boro:    p.get('boro') ? p.get('boro')!.split(',') : [],
    address: p.get('address') ?? '',
    zip:     p.get('zip')     ?? '',
    cuisine: p.get('cuisine') ?? '',
    grade:   p.get('grade') ? p.get('grade')!.split(',') : [],
    cb:      p.get('cb')      ?? '',
  };
}

function writeParams(values: SearchParams): void {
  const url = new URL(window.location.href);
  (Object.entries(values) as [string, string | string[]][]).forEach(([k, v]) => {
    const s = Array.isArray(v) ? v.join(',') : v;
    s ? url.searchParams.set(k, s) : url.searchParams.delete(k);
  });
  window.history.pushState({}, '', url);
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light',  label: '☀' },
  { value: 'dark',   label: '☾' },
];

export default function App() {
  const [form, setForm] = useState<SearchParams>(readParams);
  const [result, setResult] = useState<SearchResult>(IDLE);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [communityBoards, setCommunityBoards] = useState<CommunityBoard[]>([]);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetchCuisines().then(setCuisines);
    fetchCommunityBoards().then(setCommunityBoards);
  }, []);

  const hasQuery = (values: SearchParams) =>
    values.name !== '' || values.address !== '' || values.zip !== '' ||
    values.cuisine !== '' || values.cb !== '' ||
    values.boro.length > 0 || values.grade.length > 0;

  const doSearch = useCallback(async (values: SearchParams) => {
    if (!hasQuery(values)) { setResult(IDLE); writeParams(values); return; }
    writeParams(values);
    setResult({ status: 'loading', restaurants: [], hitLimit: false, totalRows: 0, error: null });
    try {
      const rows = await searchRestaurants(values);
      setResult({ status: 'done', restaurants: groupRows(rows), hitLimit: rows.length >= 5000, totalRows: rows.length, error: null });
    } catch (e) {
      setResult({ status: 'error', restaurants: [], hitLimit: false, totalRows: 0, error: (e as Error).message });
    }
  }, []);

  // Debounce: fire search 500ms after form stops changing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFormChange = useCallback((fn: (prev: SearchParams) => SearchParams) => {
    setForm(prev => {
      const next = fn(prev);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(next), 500);
      return next;
    });
  }, [doSearch]);

  useEffect(() => {
    const params = readParams();
    if (Object.values(params).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v))) { setForm(params); doSearch(params); }
  }, [doSearch]);

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setForm(EMPTY); writeParams(EMPTY); setResult(IDLE);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 dark:bg-zinc-950 dark:border-zinc-800">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-sans font-bold text-3xl sm:text-4xl tracking-wide leading-none shrink-0"><span className="text-zinc-800 dark:text-zinc-100">alphab</span><span className="text-yellow-500 dark:text-yellow-400">eats</span></span>
          <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase dark:text-zinc-300 hidden sm:inline">NYC Restaurant Inspection Search</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme toggle */}
          <div className="flex rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-700 font-mono text-xs">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`px-3 py-1.5 cursor-pointer transition-colors
                  ${theme === opt.value
                    ? 'bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-500 hover:text-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="font-mono text-xs text-zinc-500 leading-relaxed text-right dark:text-zinc-300 hidden sm:block">
            NYC Open Data ·{' '}
            <a
              href="https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j"
              target="_blank" rel="noopener noreferrer"
              className="text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              DOHMH Inspections
            </a>
          </div>
        </div>
      </header>

      <SearchForm values={form} onChange={handleFormChange} onSearch={() => doSearch(form)} onClear={handleClear} loading={result.status === 'loading'} cuisines={cuisines} communityBoards={communityBoards} />
      <ResultsGrid result={result} />
    </div>
  );
}
