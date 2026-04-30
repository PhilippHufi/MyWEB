import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  CheckSquare,
  CloudSun,
  Download,
  Film,
  Gift,
  Home,
  Moon,
  Newspaper,
  Plane,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Sun,
  Trash2,
  Wallet
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '/api';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'tasks', label: 'To-do', icon: CheckSquare },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'gifts', label: 'Geschenke', icon: Gift },
  { id: 'invoices', label: 'Rechnungen', icon: ReceiptText },
  { id: 'media', label: 'Filme & Musik', icon: Film },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'travel', label: 'Urlaub', icon: Plane },
  { id: 'finance', label: 'Finanzen', icon: Wallet }
];

const defaults = {
  finance: [],
  tasks: [],
  gifts: [],
  'media/favorites': [],
  'news/bookmarks': [],
  trips: []
};

function fallbackWeather() {
  const today = new Date();
  return {
    label: 'Linz, Oberoesterreich (Fallback)',
    daily: {
      time: Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() + index);
        return date.toISOString().slice(0, 10);
      }),
      temperature_2m_min: [8, 9, 7, 10, 11, 9, 8],
      temperature_2m_max: [17, 18, 16, 20, 21, 19, 17],
      precipitation_probability_max: [20, 35, 45, 15, 10, 25, 30]
    }
  };
}

function fallbackNewsItems(category) {
  const items = {
    technology: [
      ['Tagesschau Technik', 'https://www.tagesschau.de/wirtschaft/technologie/', 'Technik- und Digitalthemen oeffnen.'],
      ['Heise News', 'https://www.heise.de/news/', 'IT, Software, Hardware und Netzpolitik.']
    ],
    business: [
      ['Tagesschau Wirtschaft', 'https://www.tagesschau.de/wirtschaft/', 'Wirtschaftsnachrichten oeffnen.'],
      ['Finanzen.net', 'https://www.finanzen.net/', 'Boerse, Wirtschaft und Finanznachrichten.']
    ],
    health: [
      ['Tagesschau Gesundheit', 'https://www.tagesschau.de/thema/gesundheit/', 'Gesundheitsthemen oeffnen.'],
      ['Robert Koch-Institut', 'https://www.rki.de/', 'Offizielle Gesundheitsinformationen.']
    ]
  };
  return (items[category] || items.technology).map(([title, url, description]) => ({ title, url, description, source: 'Fallback', category }));
}

function getLocal(key) {
  return JSON.parse(localStorage.getItem(`pd:${key}`) || JSON.stringify(defaults[key] || []));
}

function setLocal(key, value) {
  localStorage.setItem(`pd:${key}`, JSON.stringify(value));
}

function useApi(token) {
  return useMemo(() => {
    async function request(path, options = {}) {
      const response = await fetch(`${API}/${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
      if (!response.ok) throw new Error(await response.text());
      if (response.status === 204) return null;
      return response.json();
    }
    return { request, token };
  }, [token]);
}

function Card({ children, className = '' }) {
  return <section className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>{children}</section>;
}

function TextInput(props) {
  return <input {...props} className={`input ${props.className || ''}`} />;
}

function Select(props) {
  return <select {...props} className={`input ${props.className || ''}`} />;
}

function Button({ children, className = '', ...props }) {
  return <button {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-ink dark:hover:bg-zinc-200 ${className}`}>{children}</button>;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('dashboard123');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error('Login fehlgeschlagen');
      const data = await response.json();
      onLogin(data.token);
    } catch (err) {
      setError('Backend nicht erreichbar oder Login falsch. Starte Backend und Prisma-Seed.');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold">Personal Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Melde dich lokal an.</p>
        <div className="mt-5 space-y-3">
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Benutzer" />
          <TextInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" type="password" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full">Einloggen</Button>
        </div>
      </form>
    </main>
  );
}

function useCollection(api, name) {
  const [items, setItems] = useState(() => getLocal(name));
  const [offline, setOffline] = useState(false);

  async function load() {
    try {
      const data = await api.request(name);
      setItems(data);
      setLocal(name, data);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }

  useEffect(() => {
    load();
  }, [name]);

  async function add(item) {
    try {
      const created = await api.request(name, { method: 'POST', body: JSON.stringify(item) });
      setItems((current) => [created, ...current]);
    } catch {
      const created = { ...item, id: Date.now() };
      const next = [created, ...items];
      setItems(next);
      setLocal(name, next);
      setOffline(true);
    }
  }

  async function update(id, patch) {
    const currentItem = items.find((item) => item.id === id);
    const updated = { ...currentItem, ...patch };
    try {
      await api.request(`${name}/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
    } catch {
      setOffline(true);
    }
    const next = items.map((item) => (item.id === id ? updated : item));
    setItems(next);
    setLocal(name, next);
  }

  async function remove(id) {
    try {
      await api.request(`${name}/${id}`, { method: 'DELETE' });
    } catch {
      setOffline(true);
    }
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    setLocal(name, next);
  }

  return { items, add, update, remove, offline, reload: load };
}

function Dashboard({ api }) {
  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [traffic, setTraffic] = useState([]);

  useEffect(() => {
    api.request('dashboard').then(setData).catch(() => {});
    api.request('weather').then(setWeather).catch(() => setWeather(fallbackWeather()));
    api.request('traffic').then(setTraffic).catch(() => setTraffic([{ title: 'A1 Oberoesterreich', link: 'https://www.asfinag.at/verkehr-sicherheit/', content: 'Verkehrsdaten gerade nicht erreichbar.' }]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Kontostand" value={`${(data?.finance?.balance || 0).toFixed(2)} EUR`} />
        <Metric label="Offene Aufgaben" value={data?.tasks?.length || 0} />
        <Metric label="Reisen" value={data?.trips?.length || 0} />
        <Metric label="Favoriten" value={data?.favorites || 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Diese Woche{weather?.label ? ` - ${weather.label}` : ''}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {(weather?.daily?.time || []).map((day, index) => (
              <div key={day} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                <CloudSun className="mb-2 h-5 w-5 text-sea" />
                <div className="font-medium">{new Date(day).toLocaleDateString('de-AT', { weekday: 'short' })}</div>
                <div>{Math.round(weather.daily.temperature_2m_min[index])} - {Math.round(weather.daily.temperature_2m_max[index])} C</div>
                <div className="text-zinc-500">{weather.daily.precipitation_probability_max[index] || 0}% Regen</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">A1 Oberoesterreich</h2>
          <div className="mt-3 space-y-2">
            {traffic.map((item, index) => (
              <p key={index} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                {item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="font-medium underline">{item.title}</a> : <span className="font-medium">{item.title}</span>}: {item.content}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <Card><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>;
}

function Finance({ api }) {
  const { items, add, remove } = useCollection(api, 'finance');
  const [form, setForm] = useState({ type: 'expense', category: 'Lebensmittel', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const byCategory = Object.values(items.reduce((acc, item) => {
    acc[item.category] ||= { category: item.category, income: 0, expense: 0 };
    acc[item.category][item.type] += Number(item.amount);
    return acc;
  }, {}));

  return (
    <Module title="Finanzen" onSubmit={() => add(form)} form={form} setForm={setForm}>
      <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Ausgabe</option><option value="income">Einnahme</option></Select>
      <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategorie" />
      <TextInput value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" step="0.01" placeholder="Betrag" />
      <TextInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} type="date" />
      <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Beschreibung" />
      <Card className="md:col-span-2"><ResponsiveContainer width="100%" height={260}><BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="income" fill="#386641" /><Bar dataKey="expense" fill="#bc6c25" /></BarChart></ResponsiveContainer></Card>
      <List items={items} remove={remove} render={(item) => `${item.type === 'income' ? '+' : '-'} ${item.amount} EUR - ${item.category}`} />
    </Module>
  );
}

function Tasks({ api }) {
  const { items, add, update, remove } = useCollection(api, 'tasks');
  const [form, setForm] = useState({ title: '', category: 'Privat', priority: 'mittel', dueDate: '', notes: '' });
  return (
    <Module title="To-do Liste" onSubmit={() => add(form)} form={form} setForm={setForm}>
      <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Aufgabe" />
      <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategorie" />
      <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>niedrig</option><option>mittel</option><option>hoch</option></Select>
      <TextInput value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} type="date" />
      <List items={items} remove={remove} render={(item) => <label className="flex items-center gap-2"><input type="checkbox" checked={item.completed} onChange={(e) => update(item.id, { completed: e.target.checked })} /> <span className={item.completed ? 'line-through text-zinc-500' : ''}>{item.title} - {item.category} - {item.priority}</span></label>} />
    </Module>
  );
}

function Gifts({ api }) {
  const { items, add, remove } = useCollection(api, 'gifts');
  const [form, setForm] = useState({ name: '', person: '', price: '', status: 'Idee', notes: '' });
  const [search, setSearch] = useState('');
  const filtered = items.filter((item) => `${item.person} ${item.name} ${item.status} ${item.notes || ''}`.toLowerCase().includes(search.toLowerCase()));
  const grouped = filtered.reduce((acc, item) => {
    const person = item.person || 'Ohne Person';
    acc[person] ||= [];
    acc[person].push(item);
    return acc;
  }, {});

  function removeGift(item) {
    if (window.confirm(`${item.name} fuer ${item.person} wirklich loeschen?`)) {
      remove(item.id);
    }
  }

  return (
    <div className="space-y-4">
      <Module title="Geschenkliste" onSubmit={() => add(form)} form={form} setForm={setForm}>
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Geschenk" />
        <TextInput value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} placeholder="Person" />
        <TextInput value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" placeholder="Preis" />
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Idee</option><option>Gekauft</option><option>Verpackt</option></Select>
      </Module>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nach Person oder Geschenk suchen" />
        </div>
        <div className="space-y-4">
          {Object.entries(grouped).map(([person, gifts]) => (
            <section key={person}>
              <h3 className="mb-2 font-semibold">{person}</h3>
              <div className="space-y-2">
                {gifts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-zinc-500">{item.status}{item.price ? ` - ${item.price} EUR` : ''}{item.notes ? ` - ${item.notes}` : ''}</div>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => removeGift(item)} aria-label="Loeschen"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!filtered.length && <p className="text-sm text-zinc-500">Keine passenden Geschenke gefunden.</p>}
        </div>
      </Card>
    </div>
  );
}

function Shopping({ api }) {
  const { items, add, update, remove } = useCollection(api, 'shopping');
  const [form, setForm] = useState({ name: '', category: 'Lebensmittel', quantity: '' });
  const grouped = items.reduce((acc, item) => {
    acc[item.category] ||= [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Module title="Shoppingliste" onSubmit={() => add(form)}>
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Artikel" />
        <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategorie" />
        <TextInput value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Menge" />
      </Module>
      <Card>
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, products]) => (
            <section key={category}>
              <h3 className="mb-2 font-semibold">{category}</h3>
              <div className="space-y-2">
                {products.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                    <label className="flex min-w-0 items-center gap-2">
                      <input type="checkbox" checked={item.completed} onChange={(e) => update(item.id, { completed: e.target.checked })} />
                      <span className={item.completed ? 'line-through text-zinc-500' : ''}>{item.name}{item.quantity ? ` - ${item.quantity}` : ''}</span>
                    </label>
                    <button type="button" className="icon-btn" onClick={() => remove(item.id)} aria-label="Loeschen"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!items.length && <p className="text-sm text-zinc-500">Noch keine Artikel.</p>}
        </div>
      </Card>
    </div>
  );
}

function Invoices({ api }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ merchant: '', category: '', amount: '', invoiceDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [file, setFile] = useState(null);

  async function load() {
    setItems(await api.request('invoices'));
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function uploadInvoice(event) {
    event.preventDefault();
    if (!file) return;
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append('file', file);
    const response = await fetch(`${API}/invoices`, {
      method: 'POST',
      headers: api.token ? { Authorization: `Bearer ${api.token}` } : {},
      body
    });
    if (!response.ok) throw new Error(await response.text());
    setFile(null);
    setForm({ merchant: '', category: '', amount: '', invoiceDate: new Date().toISOString().slice(0, 10), notes: '' });
    await load();
  }

  async function downloadFile(path, name) {
    const response = await fetch(`${API}/${path}`, { headers: api.token ? { Authorization: `Bearer ${api.token}` } : {} });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function removeInvoice(item) {
    if (!window.confirm(`Rechnung von ${item.merchant} wirklich loeschen?`)) return;
    await api.request(`invoices/${item.id}`, { method: 'DELETE' });
    await load();
  }

  const grouped = items.reduce((acc, item) => {
    acc[item.month] ||= [];
    acc[item.month].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Rechnung speichern</h2>
        <form onSubmit={uploadInvoice} className="grid gap-3 md:grid-cols-2">
          <TextInput value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="Geschaeft / Firma" />
          <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategorie" />
          <TextInput value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" step="0.01" placeholder="Betrag" />
          <TextInput value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} type="date" />
          <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notiz" />
          <input className="input" type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button className="md:col-span-2" disabled={!file}><Plus className="h-4 w-4" />Speichern</Button>
        </form>
      </Card>
      <div className="space-y-4">
        {Object.entries(grouped).map(([month, invoices]) => (
          <Card key={month}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{new Date(`${month}-01T00:00:00`).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })}</h3>
              <Button type="button" onClick={() => downloadFile(`invoices/month/${month}/download`, `rechnungen-${month}.zip`)}><Download className="h-4 w-4" />Monat downloaden</Button>
            </div>
            <div className="space-y-2">
              {invoices.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{item.merchant}</div>
                    <div className="text-zinc-500">
                      {new Date(item.invoiceDate).toLocaleDateString('de-AT')}{item.amount != null ? ` - ${item.amount.toFixed(2)} EUR` : ''}{item.category ? ` - ${item.category}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="icon-btn" onClick={() => downloadFile(`invoices/${item.id}/download`, item.originalName)} aria-label="Download"><Download className="h-4 w-4" /></button>
                    <button type="button" className="icon-btn" onClick={() => removeInvoice(item)} aria-label="Loeschen"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {!items.length && <Card><p className="text-sm text-zinc-500">Noch keine Rechnungen gespeichert.</p></Card>}
      </div>
    </div>
  );
}

function Media({ api }) {
  const favs = useCollection(api, 'media/favorites');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('movie');
  const [genre, setGenre] = useState('Alle');
  const [results, setResults] = useState([]);

  async function search(event) {
    event.preventDefault();
    try {
      setResults(await api.request(`media/search?q=${encodeURIComponent(query)}&type=${type}`));
    } catch {
      setResults([{ source: 'manual', externalId: `local-${Date.now()}`, mediaType: type, title: query, imageUrl: null, description: 'Suche gerade nicht erreichbar. Du kannst den Eintrag trotzdem speichern.', watched: false, audience: 'Fuer mich' }]);
    }
  }

  const genres = ['Alle', ...Array.from(new Set(favs.items.flatMap((item) => (item.genres || '').split(',').map((name) => name.trim()).filter(Boolean))))];
  const filteredFavorites = genre === 'Alle' ? favs.items : favs.items.filter((item) => (item.genres || '').split(',').map((name) => name.trim()).includes(genre));

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={search} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Film oder Musik suchen" />
          <Select value={type} onChange={(e) => setType(e.target.value)}><option value="movie">Film</option><option value="music">Musik</option></Select>
          <Button><Search className="h-4 w-4" />Suchen</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {results.map((item) => <MediaCard key={item.externalId} item={item} onSave={() => favs.add(item)} />)}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Favoriten</h2>
        <Select value={genre} onChange={(e) => setGenre(e.target.value)} className="sm:max-w-xs">{genres.map((name) => <option key={name}>{name}</option>)}</Select>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {filteredFavorites.map((item) => <MediaCard key={item.id} item={item} onDelete={() => favs.remove(item.id)} onUpdate={(patch) => favs.update(item.id, patch)} />)}
      </div>
    </div>
  );
}

function MediaCard({ item, onSave, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button type="button" onClick={() => setOpen(!open)} className="block w-full text-left">
        {item.imageUrl && <img src={item.imageUrl} alt="" className="mb-3 aspect-[2/3] w-full rounded-md object-cover" />}
        <h3 className="font-semibold">{item.title}</h3>
        <p className="mt-1 text-sm text-zinc-500">
          {[item.releaseYear, item.audience, item.watched ? 'gesehen' : item.id ? 'nicht gesehen' : null].filter(Boolean).join(' - ')}
        </p>
      </button>
      <p className="mt-2 line-clamp-4 text-sm text-zinc-500">{item.description}</p>
      {open && (
        <div className="mt-3 space-y-2 text-sm">
          {item.genres && <p><span className="font-medium">Genre:</span> {item.genres}</p>}
          {item.actors && <p><span className="font-medium">Schauspieler:</span> {item.actors}</p>}
          {item.trailerUrl && <a href={item.trailerUrl} target="_blank" rel="noreferrer" className="inline-flex text-sea underline">Trailer oeffnen</a>}
          {onUpdate && (
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(item.watched)} onChange={(e) => onUpdate({ watched: e.target.checked })} /> Bereits gesehen</label>
              <Select value={item.audience || 'Fuer mich'} onChange={(e) => onUpdate({ audience: e.target.value })}>
                <option>Fuer mich</option>
                <option>Fuer Freundin</option>
                <option>Fuer Familie</option>
                <option>Fuer Brueder</option>
                <option>Fuer Kinder</option>
              </Select>
            </div>
          )}
        </div>
      )}
      <Button onClick={onSave || onDelete} className="mt-4">{onSave ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}{onSave ? 'Speichern' : 'Entfernen'}</Button>
    </Card>
  );
}

function News({ api }) {
  const bookmarks = useCollection(api, 'news/bookmarks');
  const [category, setCategory] = useState('technology');
  const [items, setItems] = useState([]);
  useEffect(() => { api.request(`news?category=${category}`).then(setItems).catch(() => setItems(fallbackNewsItems(category))); }, [category]);
  return (
    <div className="space-y-4">
      <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-xs"><option value="technology">Tech</option><option value="business">Business</option><option value="health">Gesundheit</option></Select>
      <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.url}><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm text-zinc-500">{item.description}</p><Button className="mt-4" onClick={() => bookmarks.add(item)}><Plus className="h-4 w-4" />Merken</Button></Card>)}</div>
      <h2 className="font-semibold">Gemerkte News</h2>
      <List items={bookmarks.items} remove={bookmarks.remove} render={(item) => <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>} />
    </div>
  );
}

function Travel({ api }) {
  const { items, add, remove } = useCollection(api, 'trips');
  const [form, setForm] = useState({ destination: '', startDate: '', endDate: '', notes: '', hotelsText: '', attractionsText: '' });
  function submit() {
    add({
      destination: form.destination,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes,
      hotels: form.hotelsText.split('\n').filter(Boolean).map((name) => ({ name })),
      attractions: form.attractionsText.split('\n').filter(Boolean).map((name) => ({ name }))
    });
  }
  return (
    <Module title="Urlaubsplaner" onSubmit={submit} form={form} setForm={setForm}>
      <TextInput value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Reiseziel" />
      <TextInput value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" />
      <TextInput value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} type="date" />
      <textarea className="input md:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notizen" />
      <textarea className="input" value={form.hotelsText} onChange={(e) => setForm({ ...form, hotelsText: e.target.value })} placeholder="Hotels, je Zeile eins" />
      <textarea className="input" value={form.attractionsText} onChange={(e) => setForm({ ...form, attractionsText: e.target.value })} placeholder="Sehenswuerdigkeiten, je Zeile eine" />
      <List items={items} remove={remove} render={(item) => `${item.destination} - ${new Date(item.startDate).toLocaleDateString('de-AT')} bis ${new Date(item.endDate).toLocaleDateString('de-AT')}`} />
    </Module>
  );
}

function Module({ title, children, onSubmit }) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="grid gap-3 md:grid-cols-2">
          {children}
          <Button className="md:col-span-2"><Plus className="h-4 w-4" />Hinzufuegen</Button>
        </form>
      </Card>
    </div>
  );
}

function List({ items, remove, render }) {
  return (
    <Card className="md:col-span-2">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
            <div>{render(item)}</div>
            <button type="button" className="icon-btn" onClick={() => remove(item.id)} aria-label="Loeschen"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!items.length && <p className="text-sm text-zinc-500">Noch keine Eintraege.</p>}
      </div>
    </Card>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('pd:token'));
  const [page, setPage] = useState('dashboard');
  const [dark, setDark] = useState(localStorage.getItem('pd:dark') === 'true');
  const api = useApi(token);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('pd:dark', String(dark));
  }, [dark]);

  if (!token) return <Login onLogin={(next) => { localStorage.setItem('pd:token', next); setToken(next); }} />;

  const pages = {
    dashboard: <Dashboard api={api} />,
    tasks: <Tasks api={api} />,
    shopping: <Shopping api={api} />,
    gifts: <Gifts api={api} />,
    invoices: <Invoices api={api} />,
    media: <Media api={api} />,
    news: <News api={api} />,
    travel: <Travel api={api} />,
    finance: <Finance api={api} />
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-ink dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-semibold">Mein Dashboard</h1>
          <button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        </div>
        <nav className="space-y-1">{nav.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)} />)}</nav>
      </aside>
      <main className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:hidden">
          <div className="flex gap-2 overflow-x-auto">{nav.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)} compact />)}</div>
        </header>
        <section className="p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{nav.find((item) => item.id === page)?.label}</h2>
            <button className="icon-btn md:hidden" onClick={() => setDark(!dark)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          </div>
          {pages[page]}
        </section>
      </main>
    </div>
  );
}

function NavButton({ item, active, onClick, compact }) {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm ${compact ? 'shrink-0' : 'w-full'} ${active ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
      <Icon className="h-4 w-4" />
      {item.label}
    </button>
  );
}

createRoot(document.getElementById('root')).render(<App />);
