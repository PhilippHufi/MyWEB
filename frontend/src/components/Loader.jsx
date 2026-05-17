import React from 'react';
export function Loader({ label = 'Lade Daten...' }) {
  return (
    <div className="flex min-h-24 items-center justify-center gap-3 text-sm text-slate-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      {label}
    </div>
  );
}
