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
  Play,
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
  { id: 'media', label: 'Filme', icon: Film },
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

function fallbackNewsItems(scope = 'at', type = 'articles') {
  const audio = {
    at: [['ORF OE1 Journale', 'https://oe1.orf.at/player', 'Aktuelle Audio-Journale aus Österreich.', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=80']],
    de: [['Deutschlandfunk Nachrichten', 'https://www.deutschlandfunk.de/nachrichten-100.html', 'Nachrichten aus Deutschland als Audio.']],
    us: [['NPR News Now', 'https://www.npr.org/podcasts/500005/npr-news-now', 'US-Nachrichten als Audio.']],
    world: [['BBC Global News Podcast', 'https://www.bbc.co.uk/programmes/p02nq0gn/episodes/downloads', 'Weltweite Nachrichten als Audio.']]
  };
  const items = {
    at: [['ORF News', 'https://orf.at/', 'Aktuelle Nachrichten aus Österreich.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80']],
    de: [['Tagesschau', 'https://www.tagesschau.de/', 'Aktuelle Nachrichten aus Deutschland.']],
    us: [['NPR', 'https://www.npr.org/sections/news/', 'Aktuelle Nachrichten aus Amerika.']],
    world: [['BBC News', 'https://www.bbc.com/news', 'Weltweite Nachrichten.']]
  };
  return (type === 'audio' ? audio[scope] || audio.world : items[scope] || items.at).map(([title, url, description, imageUrl]) => ({ title, url, description, imageUrl, source: 'Fallback', category: scope, type }));
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
  const [weather, setWeather] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekNumber = Math.ceil((((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / 86400000) + new Date(weekStart.getFullYear(), 0, 1).getDay() + 1) / 7);

  useEffect(() => {
    api.request('weather').then(setWeather).catch(() => setWeather(fallbackWeather()));
    api.request('traffic').then(setTraffic).catch(() => setTraffic([{ title: 'A1 Oberoesterreich', link: 'https://www.asfinag.at/verkehr-sicherheit/', content: 'Verkehrsdaten gerade nicht erreichbar.' }]));
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-zinc-500">Kalenderwoche</p>
        <h2 className="mt-1 text-2xl font-semibold">KW {weekNumber}</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">
          {weekStart.toLocaleDateString('de-AT')} bis {weekEnd.toLocaleDateString('de-AT')}
        </p>
      </Card>
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
                    <button type="button" className="icon-btn" onClick={() => removeGift(item)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
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
                    <button type="button" className="icon-btn" onClick={() => remove(item.id)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
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
                    <button type="button" className="icon-btn" onClick={() => removeInvoice(item)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
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
  const [tab, setTab] = useState('search');
  const [genre, setGenre] = useState('Alle');
  const [actor, setActor] = useState('');
  const [audience, setAudience] = useState('Alle');
  const [listMode, setListMode] = useState('current');
  const [region, setRegion] = useState('AT');
  const [sort, setSort] = useState('popularity');
  const [limit, setLimit] = useState(50);
  const [discoverGenre, setDiscoverGenre] = useState('');
  const [topMovies, setTopMovies] = useState([]);
  const [futureMovies, setFutureMovies] = useState([]);
  const [results, setResults] = useState([]);
  const [trash, setTrash] = useState(() => JSON.parse(localStorage.getItem('pd:media-trash') || '[]'));
  const tmdbGenres = [
    ['Alle Genres', ''],
    ['Action', '28'],
    ['Abenteuer', '12'],
    ['Animation', '16'],
    ['Komödie', '35'],
    ['Krimi', '80'],
    ['Drama', '18'],
    ['Familie', '10751'],
    ['Fantasy', '14'],
    ['Horror', '27'],
    ['Romanze', '10749'],
    ['Science Fiction', '878'],
    ['Thriller', '53']
  ];

  function setTrashItems(next) {
    setTrash(next);
    localStorage.setItem('pd:media-trash', JSON.stringify(next));
  }

  async function removeFavorite(item) {
    setTrashItems([{ ...item, deletedAt: new Date().toISOString() }, ...trash.filter((entry) => entry.id !== item.id)]);
    await favs.remove(item.id);
  }

  async function restoreFavorite(item) {
    const { id, createdAt, deletedAt, ...restored } = item;
    await favs.add(restored);
    setTrashItems(trash.filter((entry) => entry.id !== item.id));
  }

  async function search(event) {
    event.preventDefault();
    try {
      setTab('search');
      setResults(await api.request(`media/search?q=${encodeURIComponent(query)}&type=movie`));
    } catch {
      setResults([{ source: 'manual', externalId: `local-${Date.now()}`, mediaType: 'movie', title: query, imageUrl: null, description: 'Suche gerade nicht erreichbar. Du kannst den Eintrag trotzdem speichern.', watched: false, audience: 'Für mich' }]);
    }
  }

  const genres = ['Alle', ...Array.from(new Set(favs.items.flatMap((item) => (item.genres || '').split(',').map((name) => name.trim()).filter(Boolean))))];
  const audiences = ['Alle', 'Für mich', 'Für Freundin', 'Für Familie', 'Für Brüder', 'Für Kinder'];
  const filteredFavorites = favs.items.filter((item) => {
    const genreMatch = genre === 'Alle' || (item.genres || '').split(',').map((name) => name.trim()).includes(genre);
    const actorMatch = !actor.trim() || (item.actors || '').toLowerCase().includes(actor.trim().toLowerCase());
    const audienceMatch = audience === 'Alle' || item.audience === audience;
    return genreMatch && actorMatch && audienceMatch;
  });

  useEffect(() => {
    api.request(`media/discover?mode=${listMode}&region=${region}&sort=${sort}&limit=${limit}&genreId=${discoverGenre}`).then(setTopMovies).catch(() => setTopMovies([]));
  }, [listMode, region, sort, limit, discoverGenre]);

  useEffect(() => {
    api.request(`media/discover?mode=future&region=world&sort=release_date&limit=100&genreId=${discoverGenre}`).then(setFutureMovies).catch(() => setFutureMovies([]));
  }, [discoverGenre]);

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid gap-2 sm:grid-cols-4">
          <Button type="button" className={tab === 'search' ? '' : 'bg-zinc-600'} onClick={() => setTab('search')}>Suche</Button>
          <Button type="button" className={tab === 'top' ? '' : 'bg-zinc-600'} onClick={() => setTab('top')}>Toplisten</Button>
          <Button type="button" className={tab === 'favorites' ? '' : 'bg-zinc-600'} onClick={() => setTab('favorites')}>Meine Favoriten</Button>
          <Button type="button" className={tab === 'future' ? '' : 'bg-zinc-600'} onClick={() => setTab('future')}>Zukunft</Button>
        </div>
      </Card>
      {tab === 'search' && (
      <Card className="border-zinc-300">
        <form onSubmit={search} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Film oder Schauspieler suchen" />
          <Button><Search className="h-4 w-4" />Suchen</Button>
        </form>
      </Card>
      )}
      {tab === 'top' && (
      <Card className="border-zinc-300">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
            <option value={200}>Top 200</option>
          </Select>
          <Select value={discoverGenre} onChange={(e) => setDiscoverGenre(e.target.value)}>
            {tmdbGenres.map(([label, id]) => <option key={id || 'all'} value={id}>{label}</option>)}
          </Select>
          <Select value={listMode} onChange={(e) => setListMode(e.target.value)}>
            <option value="current">Aktuell</option>
            <option value="previous">Vorjahr</option>
          </Select>
          <Select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="AT">Österreich</option>
            <option value="world">Weltweit</option>
            <option value="US">Amerika</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popularity">Views / Popularität</option>
            <option value="release_date">Erscheinungsdatum</option>
            <option value="rating">Bewertung</option>
          </Select>
        </div>
      </Card>
      )}
      {tab === 'future' && (
        <Card className="border-zinc-300">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div>
              <h2 className="font-semibold">Filme der nächsten 12 Monate</h2>
              <p className="text-sm text-zinc-500">Geplante Veröffentlichungen, nach Erscheinungsdatum sortiert.</p>
            </div>
            <Select value={discoverGenre} onChange={(e) => setDiscoverGenre(e.target.value)}>
              {tmdbGenres.map(([label, id]) => <option key={id || 'all'} value={id}>{label}</option>)}
            </Select>
          </div>
        </Card>
      )}
      {(tab === 'search' || tab === 'top' || tab === 'future') && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(tab === 'search' ? results : tab === 'future' ? futureMovies : topMovies).map((item) => <MediaCard key={`${tab}-${item.externalId}`} item={item} onSave={() => favs.add(item)} />)}
      </div>
      )}
      {tab === 'favorites' && (
        <>
      <div className="grid gap-3 border-t border-zinc-200 pt-4 md:grid-cols-[1fr_1fr_1fr] dark:border-zinc-800">
        <h2 className="font-semibold">Meine Favoriten</h2>
        <Select value={genre} onChange={(e) => setGenre(e.target.value)}>{genres.map((name) => <option key={name}>{name}</option>)}</Select>
        <TextInput value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Nach Schauspieler filtern" />
        <Select value={audience} onChange={(e) => setAudience(e.target.value)}>{audiences.map((name) => <option key={name}>{name}</option>)}</Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredFavorites.map((item) => <MediaCard key={item.id} item={item} onDelete={() => removeFavorite(item)} onUpdate={(patch) => favs.update(item.id, patch)} />)}
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Papierkorb</h2>
        <div className="space-y-2">
          {trash.map((item) => (
            <div key={`${item.id}-${item.deletedAt}`} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <span>{item.title}</span>
              <Button type="button" onClick={() => restoreFavorite(item)}>Wieder hinzufügen</Button>
            </div>
          ))}
          {!trash.length && <p className="text-sm text-zinc-500">Keine entfernten Filme.</p>}
        </div>
      </Card>
        </>
      )}
    </div>
  );
}

function MediaCard({ item, onSave, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  const rating = item.rating == null ? null : Math.round(Number(item.rating) / 2);
  return (
    <Card className="overflow-hidden border-zinc-300 p-0">
      <div className="flex gap-3 p-3">
        {item.imageUrl && <img src={item.imageUrl} alt="" className="h-36 w-24 shrink-0 rounded-md object-cover" />}
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <h3 className="font-semibold leading-tight">{item.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">
          {[item.releaseYear, item.audience, item.watched ? 'gesehen' : item.id ? 'nicht gesehen' : null].filter(Boolean).join(' - ')}
          </p>
          <div className="mt-2 text-sm">
            <span className="text-zinc-500">Bewertung: </span>
            <span className="text-amber-500">{rating == null ? 'offen' : '★★★★★'.split('').map((star, index) => <span key={index} className={index < rating ? '' : 'text-zinc-300'}>{star}</span>)}</span>
          </div>
          {item.popularity != null && <p className="mt-1 text-sm text-zinc-500">Popularität: {Math.round(Number(item.popularity))}</p>}
        </button>
      </div>
      <div className="px-3 pb-3">
        <p className={`${open ? '' : 'line-clamp-3'} text-sm text-zinc-500`}>{item.description}</p>
        <button type="button" onClick={() => setOpen(!open)} className="mt-1 text-sm font-medium text-sea">{open ? 'Vorschau schließen' : 'Vorschau aufklappen'}</button>
      </div>
      {open && (
        <div className="space-y-2 px-3 pb-3 text-sm">
          {item.releaseDate && <p><span className="font-medium">Erscheinungsdatum:</span> {new Date(`${item.releaseDate}T00:00:00`).toLocaleDateString('de-AT')}</p>}
          {item.genres && <p><span className="font-medium">Genre:</span> {item.genres}</p>}
          {item.actors && <p><span className="font-medium">Schauspieler:</span> {item.actors}</p>}
          {onUpdate && (
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(item.watched)} onChange={(e) => onUpdate({ watched: e.target.checked })} /> Bereits gesehen</label>
              <Select value={item.audience || 'Für mich'} onChange={(e) => onUpdate({ audience: e.target.value })}>
                <option>Für mich</option>
                <option>Für Freundin</option>
                <option>Für Familie</option>
                <option>Für Brüder</option>
                <option>Für Kinder</option>
              </Select>
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 px-3 pb-3">
        {item.trailerUrl && <Button type="button" onClick={() => window.open(item.trailerUrl, '_blank', 'noopener,noreferrer')} className="bg-red-600 hover:bg-red-700" title="Trailer auf YouTube öffnen"><Play className="h-4 w-4 fill-white" />YouTube</Button>}
        <Button onClick={onSave || onDelete}>{onSave ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}{onSave ? 'Speichern' : 'Entfernen'}</Button>
      </div>
    </Card>
  );
}

function News({ api }) {
  const bookmarks = useCollection(api, 'news/bookmarks');
  const [scope, setScope] = useState('at');
  const [type, setType] = useState('articles');
  const [items, setItems] = useState([]);
  const [openSaved, setOpenSaved] = useState(null);

  useEffect(() => {
    api.request(`news?scope=${scope}&type=${type}`).then(setItems).catch(() => setItems(fallbackNewsItems(scope, type)));
  }, [scope, type]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="at">Österreich</option>
            <option value="de">Deutschland</option>
            <option value="us">Amerika</option>
            <option value="world">Weltweit</option>
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="articles">Leseartikel</option>
            <option value="audio">Audio</option>
          </Select>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.url} className="overflow-hidden p-0">
            {item.imageUrl && <img src={item.imageUrl} alt="" className="aspect-video w-full object-cover" />}
            <div className="p-4">
              <p className="text-xs uppercase text-zinc-500">{item.source || 'News'} - {item.type === 'audio' ? 'Audio' : 'Artikel'}</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm text-zinc-600 dark:text-zinc-300">{item.description || 'Keine Zusammenfassung vorhanden.'}</p>
              <div className="mt-4 flex gap-2">
                <Button type="button" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>{item.type === 'audio' ? 'Anhören' : 'Weiterlesen'}</Button>
                <Button type="button" onClick={() => bookmarks.add(item)}><Plus className="h-4 w-4" />Merken</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <h2 className="font-semibold">Gemerkte News</h2>
      <Card>
        <div className="space-y-2">
          {bookmarks.items.map((item) => (
            <div key={item.id} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <button type="button" className="min-w-0 text-left font-medium" onClick={() => setOpenSaved(openSaved === item.id ? null : item.id)}>{item.title}</button>
                <button type="button" className="icon-btn" onClick={() => bookmarks.remove(item.id)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
              </div>
              {openSaved === item.id && (
                <div className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-300">
                  <p>{item.description || 'Keine Beschreibung gespeichert.'}</p>
                  <a href={item.url} target="_blank" rel="noreferrer" className="underline">{item.type === 'audio' ? 'Audio öffnen' : 'Artikel öffnen'}</a>
                </div>
              )}
            </div>
          ))}
          {!bookmarks.items.length && <p className="text-sm text-zinc-500">Noch keine News gespeichert.</p>}
        </div>
      </Card>
    </div>
  );
}

function Travel({ api }) {
  const [form, setForm] = useState({ city: 'Barcelona', durationDays: 7, tripType: 'Gemischt' });
  const [plan, setPlan] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(null);

  async function loadTrips() {
    const data = await api.request('trips');
    setSavedTrips(data.filter((trip) => trip.plan));
  }

  useEffect(() => {
    loadTrips().catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const generated = await api.request('generate-trip', {
        method: 'POST',
        body: JSON.stringify({
          city: form.city,
          durationDays: Number(form.durationDays),
          tripType: form.tripType,
          save: true
        })
      });
      setPlan(generated);
      await loadTrips();
    } finally {
      setLoading(false);
    }
  }

  function moveActivity(fromDay, fromIndex, toDay, toIndex = null) {
    setPlan((current) => {
      if (!current) return current;
      const days = current.days.map((day) => ({ ...day, activities: [...day.activities] }));
      const [activity] = days[fromDay].activities.splice(fromIndex, 1);
      const insertAt = toIndex == null ? days[toDay].activities.length : toIndex;
      days[toDay].activities.splice(insertAt, 0, activity);
      return { ...current, days };
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_120px_180px_auto]">
          <TextInput value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Stadt, z. B. Barcelona" />
          <TextInput value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} type="number" min="1" max="21" placeholder="Tage" />
          <Select value={form.tripType} onChange={(e) => setForm({ ...form, tripType: e.target.value })}>
            <option>Kultururlaub</option>
            <option>Strandurlaub</option>
            <option>Gemischt</option>
          </Select>
          <Button disabled={loading}>{loading ? 'Plane...' : 'Reise generieren'}</Button>
        </form>
      </Card>

      {!!savedTrips.length && (
        <Card>
          <h2 className="mb-3 font-semibold">Gespeicherte Reisen</h2>
          <div className="flex flex-wrap gap-2">
            {savedTrips.map((trip) => <Button key={trip.id} type="button" onClick={() => setPlan(trip.plan)}>{trip.destination}</Button>)}
          </div>
        </Card>
      )}

      {plan && (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <Card>
              <h2 className="text-xl font-semibold">{plan.city} - {plan.durationDays} Tage - {plan.tripType}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{plan.cultureInfo}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Verhaltenstipps</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">{(plan.behaviorTips || []).map((tip) => <li key={tip}>{tip}</li>)}</ul>
                </div>
                <div>
                  <h3 className="font-semibold">Fun Facts</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">{(plan.funFacts || []).map((fact) => <li key={fact}>{fact}</li>)}</ul>
                </div>
              </div>
            </Card>
            <Card className="overflow-hidden p-0">
              <iframe
                title="Karte"
                className="h-full min-h-[320px] w-full"
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(plan.city)}&z=13&output=embed`}
              />
            </Card>
          </div>

          <section className="grid gap-4 xl:grid-cols-2">
            {plan.days.map((day, dayIndex) => (
              <Card
                key={day.day}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => drag && moveActivity(drag.dayIndex, drag.activityIndex, dayIndex)}
              >
                <h3 className="mb-3 font-semibold">Tag {day.day}</h3>
                <div className="space-y-3">
                  {day.activities.map((activity, activityIndex) => (
                    <article
                      key={`${activity.name}-${activityIndex}`}
                      draggable
                      onDragStart={() => setDrag({ dayIndex, activityIndex })}
                      onDragEnd={() => setDrag(null)}
                      className="grid gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800 md:grid-cols-[110px_1fr]"
                    >
                      {activity.imageUrl && <img src={activity.imageUrl} alt="" className="h-24 w-full rounded-md object-cover" />}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold">{activity.name}</h4>
                          <span className="rounded bg-white px-2 py-1 text-xs dark:bg-zinc-900">{activity.rating}/5</span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-zinc-600 dark:text-zinc-300">{activity.description}</p>
                        <p className="mt-2 text-xs text-zinc-500">{activity.category} - {activity.coordinates.lat.toFixed(4)}, {activity.coordinates.lng.toFixed(4)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            ))}
          </section>

          <Card>
            <h2 className="mb-3 font-semibold">Hotelvorschläge</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plan.hotels.map((hotel) => (
                <article key={hotel.name} className="overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  {hotel.imageUrl && <img src={hotel.imageUrl} alt="" className="aspect-video w-full object-cover" />}
                  <div className="p-3 text-sm">
                    <h3 className="font-semibold">{hotel.name}</h3>
                    <p className="mt-1 text-zinc-500">{hotel.price} - {hotel.rating}/5</p>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-300">{hotel.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Module({ title, children, onSubmit }) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="grid gap-3 md:grid-cols-2">
          {children}
          <Button className="md:col-span-2"><Plus className="h-4 w-4" />Hinzufügen</Button>
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
            <button type="button" className="icon-btn" onClick={() => remove(item.id)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
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
