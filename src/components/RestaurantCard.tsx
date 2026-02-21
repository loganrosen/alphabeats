import { useState } from 'react';
import type { Restaurant } from '../api.js';
import { norm, fmtDate } from '../utils.js';

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-700',
  B: 'bg-amber-600',
  C: 'bg-red-600',
};

const GRADE_LABEL: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  N: 'N',
  Z: 'P',  // Grade Pending
  P: 'P',
};

function violationEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('mice') || d.includes('mouse') || d.includes('rodent') || d.includes('rat') || d.includes('droppings')) return '🐀';
  if (d.includes('roach') || d.includes('cockroach')) return '🪳';
  if (d.includes('fly') || d.includes('flies') || d.includes('insect') || d.includes('pest')) return '🪰';
  if (d.includes('temperature') || d.includes('cold') || d.includes('hot holding') || d.includes('thaw') || d.includes('refrigerat')) return '🌡️';
  if (d.includes('hand wash') || d.includes('handwash') || d.includes('hand-wash') || d.includes('hygiene') || d.includes('bare hand')) return '🧼';
  if (d.includes('sewage') || d.includes('plumbing') || d.includes('drain') || d.includes('water supply') || d.includes('toilet')) return '🚰';
  if (d.includes('food contact') || d.includes('sanitiz') || d.includes('clean') || d.includes('wash') || d.includes('utensil')) return '🧹';
  if (d.includes('raw') || d.includes('cross-contam') || d.includes('contamina')) return '⚠️';
  if (d.includes('smoke') || d.includes('smoking') || d.includes('cigarette')) return '🚬';
  if (d.includes('garbage') || d.includes('waste') || d.includes('refuse') || d.includes('trash')) return '🗑️';
  if (d.includes('permit') || d.includes('license') || d.includes('sign') || d.includes('posted') || d.includes('notice')) return '📋';
  return '📌';
}

export default function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  const [open, setOpen] = useState(false);

  const insp = r.latest;
  const neverInspected = !insp;
  const grade = insp?.grade ?? null;
  const streetPart = [r.building, norm(r.street)].filter(Boolean).join(' ');
  const addr = [streetPart, r.zipcode, r.boro].filter(Boolean).join(' · ');
  const violations = [...(insp?.violations ?? [])].sort((a, b) => Number(b.critical) - Number(a.critical));
  const critCount = violations.filter(v => v.critical).length;

  return (
    <div className="bg-white hover:bg-zinc-50 transition-colors p-5 flex flex-col gap-3 dark:bg-zinc-950 dark:hover:bg-zinc-900">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold text-lg leading-snug text-zinc-900 dark:text-zinc-100">{r.dba}</div>
          <div className="font-mono text-sm text-zinc-500 mt-1 tracking-tight dark:text-zinc-300">{addr}</div>
        </div>
        {neverInspected
          ? <div className="w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">
              <span className="font-mono text-xs text-center leading-tight tracking-tight px-0.5">NOT YET</span>
            </div>
          : <div className={`${GRADE_STYLES[grade ?? ''] ?? 'bg-zinc-400 dark:bg-zinc-700'} w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative text-white`}>
              <span className="font-display text-3xl leading-none">{GRADE_LABEL[grade ?? ''] ?? grade ?? '?'}</span>
              <span className="font-mono text-[0.45rem] tracking-widest absolute bottom-1.5 opacity-75">
                {grade === 'Z' || grade === 'P' ? 'PENDING' : grade === 'N' ? 'UNGRADED' : 'GRADE'}
              </span>
            </div>
        }
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        {r.cuisine && <span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-300 dark:border-zinc-700">{r.cuisine}</span>}
        {insp?.score != null && <span className="font-mono text-xs text-zinc-700 tracking-wide border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-100 dark:border-zinc-700">Score {insp.score}</span>}
        {critCount > 0 && <span className="font-mono text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 dark:text-red-300 dark:border-red-800">{critCount} critical</span>}
      </div>

      {violations.length > 0 && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="font-mono text-sm text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5 text-left cursor-pointer dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
            {violations.length} VIOLATION{violations.length !== 1 ? 'S' : ''}
            <span className="ml-1">{[...new Set(violations.map(v => violationEmoji(v.desc)))].join('')}</span>
          </button>
          {open && (
            <div className="flex flex-col gap-2">
              {violations.map((v, i) => (
                <div key={i} className={`text-sm pl-3 border-l-2 leading-relaxed ${v.critical ? 'border-red-500 text-zinc-800 dark:text-zinc-100' : 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'}`}>
                  <div className="font-mono text-xs text-yellow-600 mb-0.5 dark:text-yellow-400">{violationEmoji(v.desc)} {v.code}{v.critical ? ' · CRITICAL' : ''}</div>
                  {v.desc}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-zinc-200 mt-auto dark:border-zinc-800">
        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          {neverInspected ? 'No inspection on record' : `Inspected ${fmtDate(insp?.date)}`}
        </span>
        <a
          href={`https://a816-health.nyc.gov/ABCEatsRestaurants/#!/Search/${r.camis}`}
          target="_blank" rel="noopener noreferrer"
          className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
        >
          NYC Health ↗
        </a>
      </div>
    </div>
  );
}
