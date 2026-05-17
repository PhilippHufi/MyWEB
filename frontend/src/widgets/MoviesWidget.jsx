import { Film, Search } from 'lucide-react';
import { useState } from 'react';
import { request } from '../services/api';
import { WidgetShell } from '../components/WidgetShell';
import { Button } from '../components/Button';
import { ErrorState } from '../components/ErrorState';

export function MoviesWidget(props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  async function search(event) {
    event.preventDefault();
    setError('');
    try {
      setItems(await request(`/media/search?q=${encodeURIComponent(query)}&type=movie`));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <WidgetShell title="Filme" icon={Film} {...props}>
      <form className="mb-4 flex gap-2" onSubmit={search}>
        <input className="life-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Film suchen..." />
        <Button><Search className="h-4 w-4" /></Button>
      </form>
      <ErrorState message={error} />
      <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto md:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.source}-${item.externalId || item.title}`} className="rounded-md bg-white/5 p-2">
            {item.imageUrl && <img className="mb-2 aspect-[2/3] w-full rounded-md object-cover" src={item.imageUrl} alt="" />}
            <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
            <p className="text-xs text-slate-400">{item.releaseYear || item.rating || ''}</p>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
