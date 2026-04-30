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
  Settings,
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
  { id: 'finance', label: 'Finanzen', icon: Wallet },
  { id: 'settings', label: 'Einstellungen', icon: Settings }
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
    source: 'Fallback',
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
  return (type === 'audio' ? audio[scope] || audio.world : items[scope] || items.at).map(([title, url, description, imageUrl]) => ({ title, url, description, imageUrl, source: 'Fallback', category: scope, type, publishedAt: new Date().toISOString() }));
}

function formatDateTime(value) {
  if (!value) return 'Datum offen';
  return new Date(value).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' });
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
  const [latestNews, setLatestNews] = useState([]);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekNumber = Math.ceil((((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / 86400000) + new Date(weekStart.getFullYear(), 0, 1).getDay() + 1) / 7);

  useEffect(() => {
    api.request('weather').then(setWeather).catch(() => setWeather(fallbackWeather()));
    api.request('traffic').then(setTraffic).catch(() => setTraffic([{ title: 'A1 Oberoesterreich', link: 'https://www.asfinag.at/verkehr-sicherheit/', content: 'Verkehrsdaten gerade nicht erreichbar.' }]));
    api.request('news?scope=at&type=articles&category=all&period=week').then((data) => setLatestNews(data.slice(0, 3))).catch(() => setLatestNews(fallbackNewsItems('at').slice(0, 3)));
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Diese Woche{weather?.label ? ` - ${weather.label}` : ''}</h2>
              <p className="mt-1 text-xs text-zinc-500">Quelle: {weather?.source || 'Open-Meteo'}</p>
            </div>
            <CloudSun className="h-8 w-8 text-sea" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {(weather?.daily?.time || []).map((day, index) => (
              <div key={day} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{new Date(day).toLocaleDateString('de-AT', { weekday: 'short' })}</div>
                  <CloudSun className="h-4 w-4 text-sea" />
                </div>
                <div className="mt-2 text-lg font-semibold">{Math.round(weather.daily.temperature_2m_max[index])}°C</div>
                <div className="text-xs text-zinc-500">Min {Math.round(weather.daily.temperature_2m_min[index])}°C</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-zinc-900">
                  <div className="h-full rounded-full bg-sea" style={{ width: `${Math.min(100, weather.daily.precipitation_probability_max[index] || 0)}%` }} />
                </div>
                <div className="mt-1 text-xs text-zinc-500">{weather.daily.precipitation_probability_max[index] || 0}% Regen</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">A1 Oberoesterreich</h2>
          <p className="mt-1 text-xs text-zinc-500">Quelle: ASFINAG / Fallback</p>
          <div className="mt-3 space-y-2">
            {traffic.map((item, index) => (
              <p key={index} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                {item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="font-medium underline">{item.title}</a> : <span className="font-medium">{item.title}</span>}: {item.content}
              </p>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="font-semibold">Neueste News</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {latestNews.map((item) => (
            <button key={item.url} type="button" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} className="rounded-md bg-zinc-100 p-3 text-left text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
              <p className="text-xs uppercase text-zinc-500">Quelle: {item.source || 'News'} - {formatDateTime(item.publishedAt)}</p>
              <p className="mt-1 font-medium">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-zinc-500">{item.description || 'Keine Zusammenfassung vorhanden.'}</p>
            </button>
          ))}
          {!latestNews.length && <p className="text-sm text-zinc-500">Keine aktuellen News geladen.</p>}
        </div>
      </Card>
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
  const [discoverGenre, setDiscoverGenre] = useState('Alle Genres');
  const [topMovies, setTopMovies] = useState([]);
  const [futureMovies, setFutureMovies] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [trash, setTrash] = useState(() => JSON.parse(localStorage.getItem('pd:media-trash') || '[]'));
  const tmdbGenres = [
    { label: 'Alle Genres', genreId: '', keyword: '' },
    { label: 'Action', genreId: '28', keyword: '' },
    { label: 'Abenteuer', genreId: '12', keyword: '' },
    { label: 'Animation', genreId: '16', keyword: '' },
    { label: 'Komödie', genreId: '35', keyword: '' },
    { label: 'Krimi', genreId: '80', keyword: '' },
    { label: 'Drama', genreId: '18', keyword: '' },
    { label: 'Erotik', genreId: '', keyword: 'erotic' },
    { label: 'Familie', genreId: '10751', keyword: '' },
    { label: 'Fantasy', genreId: '14', keyword: '' },
    { label: 'Horror', genreId: '27', keyword: '' },
    { label: 'Romanze', genreId: '10749', keyword: '' },
    { label: 'Science Fiction', genreId: '878', keyword: '' },
    { label: 'Sport', genreId: '', keyword: 'sport' },
    { label: 'Thriller', genreId: '53', keyword: '' }
  ];

  async function saveFavorite(item) {
    await favs.add({ ...item, audience: item.audience || 'Für mich' });
    setTab('favorites');
  }

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
  const people = [
    { value: 'Für mich', label: 'Meine Filme' },
    { value: 'Freundin', label: 'Freundin' },
    { value: 'Familie', label: 'Familie' },
    { value: 'Brüder', label: 'Brüder' },
    { value: 'Kinder', label: 'Kinder' }
  ];
  const audienceFilter = [{ value: 'Alle', label: 'Alle' }, ...people];
  const filteredFavorites = favs.items.filter((item) => {
    const genreMatch = genre === 'Alle' || (item.genres || '').split(',').map((name) => name.trim()).includes(genre);
    const actorMatch = !actor.trim() || (item.actors || '').toLowerCase().includes(actor.trim().toLowerCase());
    const audienceMatch = audience === 'Alle' || item.audience === audience;
    return genreMatch && actorMatch && audienceMatch;
  });
  const favoritesByPerson = people.reduce((acc, person) => {
    acc[person.value] = filteredFavorites
      .filter((item) => (item.audience || 'Für mich') === person.value)
      .sort((a, b) => Number(Boolean(a.watched)) - Number(Boolean(b.watched)));
    return acc;
  }, {});

  useEffect(() => {
    const selected = tmdbGenres.find((entry) => entry.label === discoverGenre) || tmdbGenres[0];
    api.request(`media/discover?mode=${listMode}&region=${region}&sort=${sort}&limit=${limit}&genreId=${selected.genreId}&keyword=${encodeURIComponent(selected.keyword)}`).then(setTopMovies).catch(() => setTopMovies([]));
  }, [listMode, region, sort, limit, discoverGenre]);

  useEffect(() => {
    const selected = tmdbGenres.find((entry) => entry.label === discoverGenre) || tmdbGenres[0];
    api.request(`media/discover?mode=future&region=world&sort=release_date&limit=100&genreId=${selected.genreId}&keyword=${encodeURIComponent(selected.keyword)}`).then(setFutureMovies).catch(() => setFutureMovies([]));
  }, [discoverGenre]);

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid gap-2 sm:grid-cols-5">
          <Button type="button" className={tab === 'search' ? '' : 'bg-zinc-600'} onClick={() => setTab('search')}>Suche</Button>
          <Button type="button" className={tab === 'top' ? '' : 'bg-zinc-600'} onClick={() => setTab('top')}>Toplisten</Button>
          <Button type="button" className={tab === 'favorites' ? '' : 'bg-zinc-600'} onClick={() => setTab('favorites')}>Meine Favoriten</Button>
          <Button type="button" className={tab === 'future' ? '' : 'bg-zinc-600'} onClick={() => setTab('future')}>Zukunft</Button>
          <Button type="button" className={tab === 'details' ? '' : 'bg-zinc-600'} onClick={() => setTab('details')} disabled={!selectedMovie}>Details</Button>
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
            {tmdbGenres.map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}
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
              {tmdbGenres.map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}
            </Select>
          </div>
        </Card>
      )}
      {(tab === 'search' || tab === 'top' || tab === 'future') && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(tab === 'search' ? results : tab === 'future' ? futureMovies : topMovies).map((item) => (
          <MediaCard
            key={`${tab}-${item.externalId}`}
            item={item}
            onSave={() => saveFavorite(item)}
            onDetails={() => {
              setSelectedMovie(item);
              setTab('details');
            }}
          />
        ))}
      </div>
      )}
      {tab === 'favorites' && (
        <>
      <div className="grid gap-3 border-t border-zinc-200 pt-4 md:grid-cols-[1fr_1fr_1fr] dark:border-zinc-800">
        <h2 className="font-semibold">Meine Favoriten</h2>
        <Select value={genre} onChange={(e) => setGenre(e.target.value)}>{genres.map((name) => <option key={name}>{name}</option>)}</Select>
        <TextInput value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Nach Schauspieler filtern" />
        <Select value={audience} onChange={(e) => setAudience(e.target.value)}>{audienceFilter.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</Select>
      </div>
      <div className="space-y-4">
        {people.map((person) => (
          <Card key={person.value} className="p-3">
            <h3 className="mb-3 font-semibold">{person.label}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {favoritesByPerson[person.value].map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onDelete={() => removeFavorite(item)}
                  onUpdate={(patch) => favs.update(item.id, patch)}
                  onDetails={() => {
                    setSelectedMovie(item);
                    setTab('details');
                  }}
                  compact
                />
              ))}
              {!favoritesByPerson[person.value].length && <p className="text-sm text-zinc-500">Keine Filme.</p>}
            </div>
          </Card>
        ))}
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
      {tab === 'details' && selectedMovie && <MovieDetails item={selectedMovie} onSave={() => saveFavorite(selectedMovie)} />}
    </div>
  );
}

function MediaCard({ item, onSave, onDelete, onUpdate, onDetails, compact = false }) {
  const [open, setOpen] = useState(false);
  const rating = item.rating == null ? null : Math.round(Number(item.rating) / 2);
  const personalRatings = ['Weltklasse', 'Gut', 'Mittel', 'Schlecht', 'Katastrophe'];
  const audienceLabel = (item.audience || 'Für mich') === 'Für mich' ? 'Meine Filme' : item.audience;
  return (
    <Card className={`overflow-hidden border-zinc-300 p-0 ${item.watched ? 'opacity-55 grayscale' : ''}`}>
      <div className="flex gap-3 p-3">
        {item.imageUrl && <img src={item.imageUrl} alt="" className={`${compact ? 'h-28 w-20' : 'h-36 w-24'} shrink-0 rounded-md object-cover`} />}
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <h3 className="font-semibold leading-tight">{item.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">
          {[item.releaseYear, audienceLabel, item.watched ? 'gesehen' : item.id ? 'nicht gesehen' : null].filter(Boolean).join(' - ')}
          </p>
          <div className="mt-2 text-sm">
            <span className="text-zinc-500">Bewertung: </span>
            <span className="text-amber-500">{item.personalRating || (rating == null ? 'offen' : '★★★★★'.split('').map((star, index) => <span key={index} className={index < rating ? '' : 'text-zinc-300'}>{star}</span>))}</span>
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
              <label className="block text-xs font-medium text-zinc-500">Für:</label>
              <Select value={item.audience || 'Für mich'} onChange={(e) => onUpdate({ audience: e.target.value })}>
                <option value="Für mich">Meine Filme</option>
                <option value="Freundin">Freundin</option>
                <option value="Familie">Familie</option>
                <option value="Brüder">Brüder</option>
                <option value="Kinder">Kinder</option>
              </Select>
              <label className="block text-xs font-medium text-zinc-500">Eigene Bewertung:</label>
              <Select value={item.personalRating || ''} onChange={(e) => onUpdate({ personalRating: e.target.value })}>
                <option value="">Keine</option>
                {personalRatings.map((value) => <option key={value}>{value}</option>)}
              </Select>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        {item.trailerUrl && <Button type="button" onClick={() => window.open(item.trailerUrl, '_blank', 'noopener,noreferrer')} className="bg-red-600 hover:bg-red-700" title="Trailer auf YouTube öffnen"><Play className="h-4 w-4 fill-white" />YouTube</Button>}
        {onDetails && <Button type="button" onClick={onDetails} className="bg-zinc-700 hover:bg-zinc-800">Details öffnen</Button>}
        <Button onClick={onSave || onDelete}>{onSave ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}{onSave ? 'Speichern' : 'Entfernen'}</Button>
      </div>
    </Card>
  );
}

function MovieDetails({ item, onSave }) {
  const money = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const detailRows = [
    ['Erscheinungsdatum', item.releaseDate ? new Date(`${item.releaseDate}T00:00:00`).toLocaleDateString('de-AT') : item.releaseYear],
    ['Bewertung', item.rating == null ? null : `${Number(item.rating).toFixed(1)} / 10`],
    ['Popularität', item.popularity == null ? null : Math.round(Number(item.popularity))],
    ['Genre', item.genres],
    ['Schauspieler', item.actors],
    ['Regisseur', item.director],
    ['Herkunftsland', item.countries],
    ['Laufzeit', item.runtime ? `${item.runtime} Minuten` : null],
    ['Originalsprache', item.originalLanguage],
    ['Budget', item.budget ? money.format(item.budget) : null],
    ['Einspielergebnis', item.revenue ? money.format(item.revenue) : null]
  ];

  return (
    <Card className="border-zinc-300">
      <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
        {item.imageUrl && <img src={item.imageUrl} alt="" className="w-40 rounded-md object-cover lg:w-full" />}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{item.description || 'Keine Beschreibung vorhanden.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.trailerUrl && (
              <Button type="button" onClick={() => window.open(item.trailerUrl, '_blank', 'noopener,noreferrer')} className="bg-red-600 hover:bg-red-700">
                <Play className="h-4 w-4 fill-white" />YouTube
              </Button>
            )}
            <Button type="button" onClick={onSave}><Plus className="h-4 w-4" />Speichern</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div key={label} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
                <p className="mt-1 text-zinc-900 dark:text-zinc-100">{value || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function News({ api }) {
  const bookmarks = useCollection(api, 'news/bookmarks');
  const [scope, setScope] = useState('at');
  const [type, setType] = useState('articles');
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState('today');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [openSaved, setOpenSaved] = useState(null);
  const categories = [
    ['all', 'Alle'],
    ['inland', 'Inland'],
    ['ausland', 'Ausland'],
    ['sport', 'Sport'],
    ['aktien', 'Aktien'],
    ['wirtschaft', 'Wirtschaft'],
    ['politik', 'Politik'],
    ['kultur', 'Kultur'],
    ['technik', 'Technik']
  ];
  const periods = [
    ['today', 'Heute'],
    ['yesterday', 'Gestern'],
    ['week', 'Letzte Woche'],
    ['month', 'Letzter Monat']
  ];

  useEffect(() => {
    api.request(`news?scope=${scope}&type=${type}&category=${category}&period=${period}&q=${encodeURIComponent(query)}`).then(setItems).catch(() => setItems(fallbackNewsItems(scope, type)));
  }, [scope, type, category, period, query]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="grid gap-3 md:grid-cols-4">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="News suchen" />
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
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 xl:w-[520px]">
            {periods.map(([value, label]) => (
              <Button key={value} type="button" className={period === value ? '' : 'bg-zinc-600'} onClick={() => setPeriod(value)}>{label}</Button>
            ))}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.url} className="overflow-hidden p-0">
            {item.imageUrl && <img src={item.imageUrl} alt="" className="aspect-video w-full object-cover" />}
            <div className="p-4">
              <p className="text-xs uppercase text-zinc-500">Quelle: {item.source || 'News'} - {item.category || 'News'} - {item.type === 'audio' ? 'Audio' : 'Artikel'}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDateTime(item.publishedAt)}</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm text-zinc-600 dark:text-zinc-300">{item.description || 'Keine Zusammenfassung vorhanden.'}</p>
              {item.audioUrl && <audio controls src={item.audioUrl} className="mt-3 w-full" />}
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
                  <p className="text-xs uppercase text-zinc-500">{item.category || 'News'} - {formatDateTime(item.publishedAt)}</p>
                  <p>{item.description || 'Keine Beschreibung gespeichert.'}</p>
                  {item.audioUrl && <audio controls src={item.audioUrl} className="w-full" />}
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
  const [tripTrash, setTripTrash] = useState(() => JSON.parse(localStorage.getItem('pd:trip-trash') || '[]'));
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(null);

  function setTripTrashItems(next) {
    setTripTrash(next);
    localStorage.setItem('pd:trip-trash', JSON.stringify(next));
  }

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

  async function deleteTrip(trip) {
    if (!window.confirm(`Reise nach ${trip.destination} wirklich löschen?`)) return;
    setTripTrashItems([{ ...trip, deletedAt: new Date().toISOString() }, ...tripTrash.filter((item) => item.id !== trip.id)]);
    await api.request(`trips/${trip.id}`, { method: 'DELETE' });
    if (plan?.savedTripId === trip.id) setPlan(null);
    await loadTrips();
  }

  async function restoreTrip(trip) {
    const restoredPlan = trip.plan;
    const saved = await api.request('trips', {
      method: 'POST',
      body: JSON.stringify({
        destination: restoredPlan?.city || trip.destination,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + (Number(restoredPlan?.durationDays || 1) - 1) * 86400000).toISOString().slice(0, 10),
        durationDays: restoredPlan?.durationDays,
        tripType: restoredPlan?.tripType,
        notes: restoredPlan?.cultureInfo || trip.notes,
        planJson: restoredPlan
      })
    });
    setPlan({ ...restoredPlan, savedTripId: saved.id });
    setTripTrashItems(tripTrash.filter((item) => item.id !== trip.id));
    await loadTrips();
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
          <div className="space-y-2">
            {savedTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                <button type="button" className="font-medium" onClick={() => setPlan({ ...trip.plan, savedTripId: trip.id })}>{trip.destination}</button>
                <button type="button" className="icon-btn" onClick={() => deleteTrip(trip)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
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
                      <img src={activity.imageUrl} alt="" className="h-24 w-full rounded-md object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold">{activity.name}</h4>
                          <span className="rounded bg-white px-2 py-1 text-xs dark:bg-zinc-900">{activity.rating}/5</span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-zinc-600 dark:text-zinc-300">{activity.description}</p>
                        <p className="mt-2 text-xs text-zinc-500">{activity.category} - {activity.coordinates.lat.toFixed(4)}, {activity.coordinates.lng.toFixed(4)}</p>
                        {activity.sourceUrl && <Button type="button" className="mt-3 h-9 bg-zinc-700" onClick={() => window.open(activity.sourceUrl, '_blank', 'noopener,noreferrer')}>Mehr erfahren</Button>}
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
                  <img src={hotel.imageUrl} alt="" className="aspect-video w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  <div className="p-3 text-sm">
                    <h3 className="font-semibold">{hotel.name}</h3>
                    <p className="mt-1 text-zinc-500">{hotel.price} - {hotel.rating}/5</p>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-300">{hotel.description}</p>
                    {hotel.sourceUrl && <Button type="button" className="mt-3 h-9 bg-zinc-700" onClick={() => window.open(hotel.sourceUrl, '_blank', 'noopener,noreferrer')}>Mehr erfahren</Button>}
                  </div>
                </article>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
            <Card>
              <h2 className="mb-3 font-semibold">Mehr über das Reiseziel</h2>
              {plan.countryProfile?.flag && <img src={plan.countryProfile.flag} alt="" className="mb-3 h-20 rounded-md object-cover" />}
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="font-medium">Land:</span> {plan.countryProfile?.country || '-'}</p>
                <p><span className="font-medium">Hauptstadt:</span> {plan.countryProfile?.capital || '-'}</p>
                <p><span className="font-medium">Einwohner:</span> {plan.countryProfile?.population ? new Intl.NumberFormat('de-AT').format(plan.countryProfile.population) : '-'}</p>
                <p><span className="font-medium">Fläche:</span> {plan.countryProfile?.area ? `${new Intl.NumberFormat('de-AT').format(plan.countryProfile.area)} km²` : '-'}</p>
                <p><span className="font-medium">Amtssprache:</span> {(plan.countryProfile?.languages || []).join(', ') || '-'}</p>
                <p><span className="font-medium">Währung:</span> {plan.countryProfile?.currency || '-'}</p>
                <p className="sm:col-span-2"><span className="font-medium">Region:</span> {plan.countryProfile?.region || '-'}</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                <p><span className="font-medium text-zinc-900 dark:text-zinc-100">Kultur:</span> {plan.destinationDetails?.culture || plan.cultureInfo}</p>
                <p><span className="font-medium text-zinc-900 dark:text-zinc-100">Glaube:</span> {plan.destinationDetails?.religion || 'Regional unterschiedlich. Bei religiösen Orten und Feiertagen respektvoll auftreten.'}</p>
                <p><span className="font-medium text-zinc-900 dark:text-zinc-100">Reisehinweis:</span> {plan.destinationDetails?.travelNote || 'Plane Pausen ein und prüfe Öffnungszeiten vorab.'}</p>
              </div>
              {plan.countryProfile?.mapsUrl && <Button type="button" className="mt-4 bg-zinc-700" onClick={() => window.open(plan.countryProfile.mapsUrl, '_blank', 'noopener,noreferrer')}>Land auf Karte öffnen</Button>}
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Übersetzung</h2>
              <p className="mb-3 text-sm text-zinc-500">Sprache: {plan.translations?.language || plan.countryProfile?.primaryLanguage || 'Englisch'}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {(plan.translations?.items || []).map((item) => (
                  <div key={item.german} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                    <p className="text-xs uppercase text-zinc-500">Deutsch</p>
                    <p className="font-medium">{item.german}</p>
                    <p className="mt-2 text-xs uppercase text-zinc-500">Übersetzt</p>
                    <p>{item.translated}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Reise-Papierkorb</h2>
          <Button type="button" disabled={!tripTrash.length} onClick={() => window.confirm('Papierkorb wirklich komplett leeren?') && setTripTrashItems([])}>Papierkorb leeren</Button>
        </div>
        <div className="space-y-2">
          {tripTrash.map((trip) => (
            <div key={`${trip.id}-${trip.deletedAt}`} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <span>{trip.destination}</span>
              <Button type="button" onClick={() => restoreTrip(trip)}>Wiederherstellen</Button>
            </div>
          ))}
          {!tripTrash.length && <p className="text-sm text-zinc-500">Keine gelöschten Reisen.</p>}
        </div>
      </Card>
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

function SettingsPage({ api }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [editing, setEditing] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');

  async function loadUsers() {
    setUsers(await api.request('users'));
  }

  useEffect(() => {
    loadUsers().catch(() => setUsers([]));
  }, []);

  async function saveUser(event) {
    event.preventDefault();
    if (editing) {
      await api.request(`users/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await api.request('users', { method: 'POST', body: JSON.stringify(form) });
    }
    setForm({ username: '', password: '' });
    setEditing(null);
    await loadUsers();
  }

  async function removeUser(user) {
    if (!window.confirm(`${user.email} wirklich löschen?`)) return;
    await api.request(`users/${user.id}`, { method: 'DELETE' });
    await loadUsers();
  }

  async function exportData() {
    setBackupStatus('Export wird erstellt...');
    const backup = await api.request('export');
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `myweb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupStatus('Export fertig.');
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Import ersetzt Filme, Rechnungen, Reisen, Geschenke, Shopping, Aufgaben, Finanzen und gespeicherte News. Fortfahren?')) {
      event.target.value = '';
      return;
    }
    setBackupStatus('Import läuft...');
    const text = await file.text();
    await api.request('import', { method: 'POST', body: text });
    event.target.value = '';
    setBackupStatus('Import fertig. Lade die Seite neu, falls du die Daten nicht sofort siehst.');
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-semibold">Daten sichern</h2>
        <div className="grid gap-3 md:grid-cols-[auto_1fr]">
          <Button type="button" onClick={exportData}><Download className="h-4 w-4" />Alles exportieren</Button>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-zinc-700 px-3 text-sm font-medium text-white hover:bg-zinc-800">
            Importieren
            <input type="file" accept="application/json,.json" onChange={importData} className="hidden" />
          </label>
        </div>
        <p className="mt-3 text-sm text-zinc-500">Export enthält Filme, Rechnungen inklusive Dateien, Reisen, Geschenke, Shopping, Aufgaben, Finanzen und gespeicherte News. Benutzer werden beim Import nicht ersetzt.</p>
        {backupStatus && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{backupStatus}</p>}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">{editing ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}</h2>
        <form onSubmit={saveUser} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <TextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Benutzername" />
          <TextInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder={editing ? 'Neues Passwort optional' : 'Passwort'} />
          <Button>{editing ? 'Speichern' : 'Anlegen'}</Button>
        </form>
        {editing && <Button type="button" className="mt-3 bg-zinc-600" onClick={() => { setEditing(null); setForm({ username: '', password: '' }); }}>Abbrechen</Button>}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Benutzer verwalten</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-zinc-500">Angelegt: {formatDateTime(user.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" className="bg-zinc-700" onClick={() => { setEditing(user); setForm({ username: user.email, password: '' }); }}>Bearbeiten</Button>
                <Button type="button" onClick={() => removeUser(user)}><Trash2 className="h-4 w-4" />Löschen</Button>
              </div>
            </div>
          ))}
          {!users.length && <p className="text-sm text-zinc-500">Keine Benutzer geladen.</p>}
        </div>
      </Card>
    </div>
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
    finance: <Finance api={api} />,
    settings: <SettingsPage api={api} />
  };
  const mainNav = nav.filter((item) => item.id !== 'settings');
  const settingsNav = nav.find((item) => item.id === 'settings');

  return (
    <div className="min-h-screen bg-zinc-100 text-ink dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-semibold">Mein Dashboard</h1>
          <button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        </div>
        <nav className="flex-1 space-y-1">{mainNav.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)} />)}</nav>
        {settingsNav && <nav className="border-t border-zinc-200 pt-3 dark:border-zinc-800"><NavButton item={settingsNav} active={page === settingsNav.id} onClick={() => setPage(settingsNav.id)} /></nav>}
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
