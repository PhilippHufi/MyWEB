import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Tesseract from 'tesseract.js';
import {
  BookOpen,
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
  Sparkles,
  Sun,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { AssistantWidget } from './widgets/AssistantWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import { JokeWidget } from './widgets/JokeWidget';
import { MoviesWidget } from './widgets/MoviesWidget';
import { MusicWidget } from './widgets/MusicWidget';
import { QuoteWidget } from './widgets/QuoteWidget';
import { TrelloWidget } from './widgets/TrelloWidget';
import { WeatherWidget } from './widgets/WeatherWidget';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '/api';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'tasks', label: 'To-do', icon: CheckSquare },
  { id: 'invoices', label: 'Buchhaltung', icon: ReceiptText },
  { id: 'media', label: 'Filme', icon: Film },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'travel', label: 'Urlaub', icon: Plane },
  { id: 'stocks', label: 'Aktien', icon: TrendingUp },
  { id: 'books', label: 'Buecher', icon: BookOpen },
  { id: 'life', label: 'Life', icon: Sparkles },
  { id: 'settings', label: 'Einstellungen', icon: Settings }
];

const defaults = {
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

function useApi(token, onUnauthorized) {
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
      if (response.status === 401) {
        localStorage.removeItem('pd:token');
        localStorage.removeItem('life:token');
        onUnauthorized?.();
        throw new Error('Deine Sitzung ist abgelaufen. Bitte neu einloggen.');
      }
      if (!response.ok) throw new Error(await response.text());
      if (response.status === 204) return null;
      return response.json();
    }
    return { request, token };
  }, [token, onUnauthorized]);
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
  const [username, setUsername] = useState('Philipp');
  const [password, setPassword] = useState('');
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
      setMediaError('Filmsuche gerade nicht erreichbar. Ein manueller Eintrag wurde vorbereitet.');
      setMediaError('Filmsuche gerade nicht erreichbar. Ein manueller Eintrag wurde vorbereitet.');
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

function Stocks({ api }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMarkets() {
    setLoading(true);
    try {
      setItems(await api.request('markets'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarkets().catch(() => {
      setItems([]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Aktien & Märkte</h2>
            <p className="mt-1 text-xs text-zinc-500">Quelle: Alpha Vantage. Indizes werden teils über ETF-Proxys angezeigt.</p>
          </div>
          <Button type="button" onClick={loadMarkets} disabled={loading}>{loading ? 'Lade...' : 'Aktualisieren'}</Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{item.note || item.unit}</p>
              </div>
              <TrendingUp className={`h-5 w-5 ${Number(item.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <p className="mt-4 text-2xl font-bold">{item.value ? new Intl.NumberFormat('de-AT', { maximumFractionDigits: item.value < 1 ? 5 : 2 }).format(item.value) : '-'}</p>
            <p className="mt-1 text-sm text-zinc-500">{item.unit}</p>
            {item.changePercent != null && (
              <p className={`mt-2 text-sm font-medium ${Number(item.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(item.changePercent) >= 0 ? '+' : ''}{Number(item.changePercent).toFixed(2)}%
              </p>
            )}
            <p className="mt-3 text-xs text-zinc-500">Stand: {item.updatedAt || (item.cached ? 'Cache' : 'offen')} · Quelle: {item.source || 'Alpha Vantage'}{item.cached ? ' · Cache' : ''}</p>
            {item.status && <p className="mt-2 text-xs text-red-600">{item.status}</p>}
          </Card>
        ))}
        {!items.length && <Card><p className="text-sm text-zinc-500">Keine Marktdaten geladen. Prüfe `ALPHAVANTAGE_API_KEY` in Render.</p></Card>}
      </div>
    </div>
  );
}

function Tasks({ api }) {
  const { items, add, update, remove } = useCollection(api, 'tasks');
  const emptyForm = { title: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [trash, setTrash] = useState(() => JSON.parse(localStorage.getItem('pd:task-trash') || '[]'));

  function setTrashItems(next) {
    setTrash(next);
    localStorage.setItem('pd:task-trash', JSON.stringify(next));
  }

  async function saveTask() {
    const payload = { ...form, category: 'Allgemein', priority: 'mittel', dueDate: '', completed: editing?.completed || false };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await add(payload);
    }
    setForm(emptyForm);
    setEditing(null);
  }

  function editTask(item) {
    setEditing(item);
    setForm({ title: item.title || '', notes: item.notes || '' });
  }

  async function removeTask(item) {
    setTrashItems([{ ...item, deletedAt: new Date().toISOString() }, ...trash.filter((entry) => entry.id !== item.id)]);
    await remove(item.id);
  }

  async function restoreTask(item) {
    const { id, createdAt, deletedAt, ...restored } = item;
    await add(restored);
    setTrashItems(trash.filter((entry) => entry.id !== item.id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">{editing ? 'To-do bearbeiten' : 'To-do hinzufügen'}</h2>
        <form onSubmit={(event) => { event.preventDefault(); saveTask(); }} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Aufgabe" />
          <Button>{editing ? 'Speichern' : 'Hinzufügen'}</Button>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notiz optional" className="input min-h-24 md:col-span-2" />
        </form>
        {editing && <Button type="button" className="mt-3 bg-zinc-600" onClick={() => { setEditing(null); setForm(emptyForm); }}>Abbrechen</Button>}
      </Card>
      <Card>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={Boolean(item.completed)} onChange={(e) => update(item.id, { ...item, completed: e.target.checked })} />
                  <span className={item.completed ? 'line-through text-zinc-500' : 'font-medium'}>{item.title}</span>
                </label>
                <div className="flex gap-2">
                  <Button type="button" className="bg-zinc-700" onClick={() => editTask(item)}>Bearbeiten</Button>
                  <button type="button" className="icon-btn" onClick={() => removeTask(item)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {item.notes && <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">{item.notes}</p>}
            </div>
          ))}
          {!items.length && <p className="text-sm text-zinc-500">Noch keine To-dos.</p>}
        </div>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">To-do Papierkorb</h2>
          <Button type="button" disabled={!trash.length} onClick={() => window.confirm('To-do Papierkorb wirklich komplett leeren?') && setTrashItems([])}>Papierkorb leeren</Button>
        </div>
        <div className="space-y-2">
          {trash.map((item) => (
            <div key={`${item.id}-${item.deletedAt}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <div>
                <p className="font-medium">{item.title}</p>
                {item.notes && <p className="text-xs text-zinc-500">{item.notes}</p>}
              </div>
              <Button type="button" onClick={() => restoreTask(item)}>Wiederherstellen</Button>
            </div>
          ))}
          {!trash.length && <p className="text-sm text-zinc-500">Keine gelöschten To-dos.</p>}
        </div>
      </Card>
    </div>
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

function BookkeepingPage() {
  const [items, setItems] = useState([]);
  const [section, setSection] = useState('invoice');
  const [invoiceMode, setInvoiceMode] = useState('ocr');
  const [scanFile, setScanFile] = useState(null);
  const [manualFile, setManualFile] = useState(null);
  const [offerFile, setOfferFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [endpoint, setEndpoint] = useState(() => (
    import.meta.env.VITE_INVOICE_API_URL || localStorage.getItem('pd:invoice-api-url') || ''
  ));
  const [manualForm, setManualForm] = useState({ merchant: '', category: '', amount: '', invoiceDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [offerForm, setOfferForm] = useState({ title: '', partner: '', category: '', amount: '', offerDate: new Date().toISOString().slice(0, 10), validUntil: '', notes: '' });

  const normalizedEndpoint = endpoint.replace(/\/$/, '');
  const categories = useMemo(() => {
    const base = ['Allgemein', 'Haushalt', 'Auto', 'Arbeit', 'Versicherung', 'Gesundheit', 'Technik', 'Trading', 'Sonstiges'];
    const fromItems = items.map((item) => item.category).filter(Boolean);
    return Array.from(new Set([...base, ...fromItems]));
  }, [items]);
  const visibleItems = items.filter((item) => (item.recordType || 'invoice') === section);

  async function load() {
    if (!normalizedEndpoint) {
      setItems([]);
      return;
    }
    const response = await fetch(normalizedEndpoint + '/invoices');
    if (!response.ok) throw new Error(await response.text());
    setItems(await response.json());
  }

  useEffect(() => {
    load().catch(() => {});
  }, [normalizedEndpoint]);

  function saveEndpoint(value) {
    const clean = value.trim().replace(/\/$/, '');
    if (clean) localStorage.setItem('pd:invoice-api-url', clean);
    else localStorage.removeItem('pd:invoice-api-url');
    setEndpoint(clean);
  }

  async function saveRecord(record) {
    if (!normalizedEndpoint) throw new Error('Cloudflare Worker Endpoint fehlt.');
    const response = await fetch(normalizedEndpoint + '/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!response.ok) throw new Error(await response.text());
    setResult(record);
    setStatus(record.recordType === 'offer' ? 'Angebot gespeichert' : 'Rechnung gespeichert');
    await load();
  }

  async function scanInvoice(event) {
    event.preventDefault();
    if (!scanFile || !normalizedEndpoint) return;
    setError('');
    setStatus('OCR laeuft...');
    setOcrProgress(0);
    setResult(null);

    try {
      const imageData = await fileToDataUrl(scanFile);
      const ocr = await Tesseract.recognize(imageData, 'deu+eng', {
        logger: (message) => {
          if (message.status === 'recognizing text') setOcrProgress(Math.round(message.progress * 100));
        }
      });
      const rawText = ocr.data.text || '';
      await saveRecord({
        id: crypto.randomUUID(),
        recordType: 'invoice',
        entryMode: 'ocr',
        title: 'Gescannte Rechnung',
        merchant: extractInvoiceMerchant(rawText),
        category: 'Allgemein',
        date: extractInvoiceDate(rawText),
        total: extractInvoiceTotal(rawText),
        notes: '',
        rawText,
        imageData,
        fileData: imageData,
        fileName: scanFile.name,
        fileType: scanFile.type || 'image/jpeg',
        createdAt: new Date().toISOString()
      });
      setScanFile(null);
      setOcrProgress(100);
    } catch (err) {
      setStatus('');
      setError(err.message || 'Rechnung konnte nicht verarbeitet werden.');
    }
  }

  async function saveManualInvoice(event) {
    event.preventDefault();
    if (!normalizedEndpoint) return;
    setError('');
    setStatus('Speichere manuelle Rechnung...');
    try {
      const fileData = manualFile ? await fileToDataUrl(manualFile) : '';
      const record = {
        id: crypto.randomUUID(),
        recordType: 'invoice',
        entryMode: 'manual',
        title: manualForm.merchant || 'Manuelle Rechnung',
        merchant: manualForm.merchant,
        category: manualForm.category || 'Allgemein',
        date: manualForm.invoiceDate || null,
        total: manualForm.amount ? manualForm.amount + ' EUR' : null,
        notes: manualForm.notes,
        rawText: ['Manuelle Rechnung', manualForm.merchant, manualForm.category, manualForm.amount, manualForm.invoiceDate, manualForm.notes].filter(Boolean).join('\n'),
        imageData: manualFile?.type?.startsWith('image/') ? fileData : '',
        fileData,
        fileName: manualFile?.name || '',
        fileType: manualFile?.type || '',
        createdAt: new Date().toISOString()
      };
      await saveRecord(record);
      setManualForm({ merchant: '', category: '', amount: '', invoiceDate: new Date().toISOString().slice(0, 10), notes: '' });
      setManualFile(null);
    } catch (err) {
      setStatus('');
      setError(err.message || 'Manuelle Rechnung konnte nicht gespeichert werden.');
    }
  }

  async function saveOffer(event) {
    event.preventDefault();
    if (!normalizedEndpoint) return;
    setError('');
    setStatus('Speichere Angebot...');
    try {
      const fileData = offerFile ? await fileToDataUrl(offerFile) : '';
      const record = {
        id: crypto.randomUUID(),
        recordType: 'offer',
        entryMode: 'manual',
        title: offerForm.title || offerForm.partner || 'Angebot',
        merchant: offerForm.partner,
        category: offerForm.category || 'Allgemein',
        date: offerForm.offerDate || null,
        validUntil: offerForm.validUntil || null,
        total: offerForm.amount ? offerForm.amount + ' EUR' : null,
        notes: offerForm.notes,
        rawText: ['Angebot', offerForm.title, offerForm.partner, offerForm.category, offerForm.amount, offerForm.offerDate, offerForm.validUntil, offerForm.notes].filter(Boolean).join('\n'),
        imageData: offerFile?.type?.startsWith('image/') ? fileData : '',
        fileData,
        fileName: offerFile?.name || '',
        fileType: offerFile?.type || '',
        createdAt: new Date().toISOString()
      };
      await saveRecord(record);
      setOfferForm({ title: '', partner: '', category: '', amount: '', offerDate: new Date().toISOString().slice(0, 10), validUntil: '', notes: '' });
      setOfferFile(null);
    } catch (err) {
      setStatus('');
      setError(err.message || 'Angebot konnte nicht gespeichert werden.');
    }
  }

  async function updateCategory(item, category) {
    if (!normalizedEndpoint) return;
    const response = await fetch(normalizedEndpoint + '/invoice/' + encodeURIComponent(item.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    });
    if (!response.ok) throw new Error(await response.text());
    await load();
  }

  async function removeRecord(item) {
    if (!window.confirm((item.recordType === 'offer' ? 'Angebot' : 'Rechnung') + ' wirklich loeschen?')) return;
    const response = await fetch(normalizedEndpoint + '/invoice/' + encodeURIComponent(item.id), { method: 'DELETE' });
    if (!response.ok) throw new Error(await response.text());
    await load();
  }

  function exportOfflineHtml() {
    const html = buildBookkeepingExportHtml(items);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'buchhaltung-export-' + new Date().toISOString().slice(0, 10) + '.html';
    link.click();
    URL.revokeObjectURL(url);
  }

  function openStoredFile(item) {
    const data = item.fileData || item.imageData;
    if (!data) return;
    if ((item.fileType || '').startsWith('image/')) setSelectedFile({ data, title: item.fileName || item.title || 'Datei' });
    else window.open(data, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Buchhaltung</h2>
            <p className="mt-1 text-sm text-zinc-500">Rechnungen automatisch scannen, manuell erfassen oder Angebote mit Kategorien ablegen.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={exportOfflineHtml}><Download className="h-4 w-4" />Offline HTML</Button>
            <Button type="button" className="bg-zinc-700" onClick={() => load().catch((err) => setError(err.message))}>Aktualisieren</Button>
          </div>
        </div>

        <InvoiceEndpointSetup value={endpoint} onSave={saveEndpoint} />

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_220px_1fr]">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Bereich</span>
            <select className="input" value={section} onChange={(event) => setSection(event.target.value)}>
              <option value="invoice">Rechnungen</option>
              <option value="offer">Angebote</option>
            </select>
          </label>
          {section === 'invoice' && (
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Eingabe</span>
              <select className="input" value={invoiceMode} onChange={(event) => setInvoiceMode(event.target.value)}>
                <option value="ocr">Automatisch scannen</option>
                <option value="manual">Manuell erfassen</option>
              </select>
            </label>
          )}
        </div>
      </Card>

      {section === 'invoice' && invoiceMode === 'ocr' && (
        <Card>
          <h3 className="mb-3 font-semibold">Rechnung automatisch scannen</h3>
          <form onSubmit={scanInvoice} className="grid gap-3">
            <input className="input" type="file" accept="image/*" capture="environment" onChange={(event) => setScanFile(event.target.files?.[0] || null)} />
            <Button disabled={!scanFile || !normalizedEndpoint}><ReceiptText className="h-4 w-4" />Rechnung scannen und speichern</Button>
          </form>
        </Card>
      )}

      {section === 'invoice' && invoiceMode === 'manual' && (
        <Card>
          <h3 className="mb-3 font-semibold">Rechnung manuell erfassen</h3>
          <form onSubmit={saveManualInvoice} className="grid gap-3 md:grid-cols-2">
            <TextInput value={manualForm.merchant} onChange={(event) => setManualForm({ ...manualForm, merchant: event.target.value })} placeholder="Geschaeft / Firma" />
            <TextInput value={manualForm.category} onChange={(event) => setManualForm({ ...manualForm, category: event.target.value })} placeholder="Kategorie" />
            <TextInput value={manualForm.amount} onChange={(event) => setManualForm({ ...manualForm, amount: event.target.value })} type="number" step="0.01" placeholder="Betrag" />
            <TextInput value={manualForm.invoiceDate} onChange={(event) => setManualForm({ ...manualForm, invoiceDate: event.target.value })} type="date" />
            <TextInput value={manualForm.notes} onChange={(event) => setManualForm({ ...manualForm, notes: event.target.value })} placeholder="Notiz" />
            <input className="input" type="file" accept="image/*,application/pdf" onChange={(event) => setManualFile(event.target.files?.[0] || null)} />
            <Button className="md:col-span-2" disabled={!normalizedEndpoint || !manualForm.merchant}><Plus className="h-4 w-4" />Manuell speichern</Button>
          </form>
        </Card>
      )}

      {section === 'offer' && (
        <Card>
          <h3 className="mb-3 font-semibold">Angebot ablegen</h3>
          <form onSubmit={saveOffer} className="grid gap-3 md:grid-cols-2">
            <TextInput value={offerForm.title} onChange={(event) => setOfferForm({ ...offerForm, title: event.target.value })} placeholder="Angebotstitel" />
            <TextInput value={offerForm.partner} onChange={(event) => setOfferForm({ ...offerForm, partner: event.target.value })} placeholder="Firma / Anbieter" />
            <TextInput value={offerForm.category} onChange={(event) => setOfferForm({ ...offerForm, category: event.target.value })} placeholder="Kategorie" />
            <TextInput value={offerForm.amount} onChange={(event) => setOfferForm({ ...offerForm, amount: event.target.value })} type="number" step="0.01" placeholder="Betrag optional" />
            <TextInput value={offerForm.offerDate} onChange={(event) => setOfferForm({ ...offerForm, offerDate: event.target.value })} type="date" />
            <TextInput value={offerForm.validUntil} onChange={(event) => setOfferForm({ ...offerForm, validUntil: event.target.value })} type="date" />
            <TextInput value={offerForm.notes} onChange={(event) => setOfferForm({ ...offerForm, notes: event.target.value })} placeholder="Notiz" />
            <input className="input" type="file" accept="image/*,application/pdf" onChange={(event) => setOfferFile(event.target.files?.[0] || null)} />
            <Button className="md:col-span-2" disabled={!normalizedEndpoint || !offerForm.title}><Plus className="h-4 w-4" />Angebot speichern</Button>
          </form>
        </Card>
      )}

      {(status || error) && (
        <Card>
          {status && <div className="font-medium text-cyan-300">{status}</div>}
          {status === 'OCR laeuft...' && <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: ocrProgress + '%' }} /></div>}
          {error && <div className="text-sm text-red-300">{error}</div>}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="font-semibold">{section === 'offer' ? 'Gespeicherte Angebote' : 'Gespeicherte Rechnungen'}</h3>
          <span className="text-xs text-zinc-500">{visibleItems.length} Eintraege</span>
        </div>
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800 lg:grid-cols-[1fr_190px_auto] lg:items-center">
              <div>
                <div className="font-medium">{item.title || item.merchant || (item.recordType === 'offer' ? 'Angebot' : 'Rechnung')}</div>
                <div className="text-zinc-500">{item.date || 'Datum unbekannt'}{item.total ? ' - ' + item.total : ''}{item.merchant ? ' - ' + item.merchant : ''}</div>
                {item.validUntil && <div className="text-xs text-zinc-500">Gueltig bis: {item.validUntil}</div>}
                {item.notes && <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{item.notes}</div>}
              </div>
              <select className="input" value={item.category || 'Allgemein'} onChange={(event) => updateCategory(item, event.target.value).catch((err) => setError(err.message))}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {(item.fileData || item.imageData) && <Button type="button" onClick={() => openStoredFile(item)}>Datei oeffnen</Button>}
                <Button type="button" className="bg-zinc-700" onClick={() => setResult(item)}>JSON</Button>
                <button type="button" className="icon-btn" onClick={() => removeRecord(item).catch((err) => setError(err.message))} aria-label="Loeschen"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {!visibleItems.length && <p className="text-sm text-zinc-500">Noch keine Eintraege in diesem Bereich.</p>}
        </div>
      </Card>

      {result && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-zinc-300">Datensatz JSON</h3>
          <pre className="max-h-80 overflow-auto rounded-md bg-black/60 p-3 text-xs text-cyan-100">{JSON.stringify(stripLargeBookkeepingFile(result), null, 2)}</pre>
        </Card>
      )}

      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setSelectedFile(null)}>
          <img src={selectedFile.data} alt={selectedFile.title} className="max-h-full max-w-full rounded-md object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}

function InvoiceEndpointSetup({ value, onSave }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="rounded-md border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
      <div className="font-medium">Cloudflare Worker Endpoint</div>
      <p className="mt-1 text-amber-100/80">Trage hier die Worker-URL ein oder setze VITE_INVOICE_API_URL im Hosting. Ohne Endpoint kann nichts gespeichert werden.</p>
      <div className="mt-3 flex flex-col gap-2 md:flex-row">
        <TextInput value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="https://myweb-receipt-scanner.dein-name.workers.dev" />
        <Button type="button" onClick={() => onSave(draft)}>Speichern</Button>
      </div>
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function extractInvoiceDate(text) {
  const match = text.match(/\b(\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/);
  return match ? match[1] : null;
}

function extractInvoiceTotal(text) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const preferredLine = [...lines].reverse().find((line) => /(summe|gesamt|total|betrag|brutto|zu zahlen)/i.test(line));
  const pattern = /(?:\u20ac\s*)?(\d{1,5}(?:[.,]\d{2}))\s*(?:\u20ac|EUR)?/gi;
  const primaryMatches = [...(preferredLine || '').matchAll(pattern)].map((match) => match[0].trim());
  if (primaryMatches.length) return primaryMatches.at(-1);
  const allMatches = [...text.matchAll(pattern)].map((match) => match[0].trim());
  return allMatches.at(-1) || null;
}

function extractInvoiceMerchant(text) {
  const line = text.split(/\n+/).map((value) => value.trim()).find((value) => value && !/rechnung|kassenbon|datum|summe|total/i.test(value));
  return line || '';
}

function stripLargeBookkeepingFile(item) {
  if (!item) return item;
  return {
    ...item,
    imageData: item.imageData ? '[image data: ' + Math.round(item.imageData.length / 1024) + ' KB]' : item.imageData,
    fileData: item.fileData ? '[file data: ' + Math.round(item.fileData.length / 1024) + ' KB]' : item.fileData
  };
}

function buildBookkeepingExportHtml(items) {
  const escapedJson = JSON.stringify(items).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Buchhaltung Export</title>
  <style>
    :root { color-scheme: dark; --bg:#09090b; --panel:#18181b; --soft:#27272a; --ink:#f4f4f5; --muted:#a1a1aa; --line:#3f3f46; --cyan:#67e8f9; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial,Helvetica,sans-serif; line-height:1.5; }
    header { position:sticky; top:0; z-index:5; border-bottom:1px solid var(--line); background:rgba(9,9,11,.92); padding:16px; backdrop-filter:blur(12px); }
    main { max-width:1180px; margin:0 auto; padding:18px; }
    h1 { margin:0; font-size:24px; }
    .muted { color:var(--muted); }
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
    input,select,button { min-height:38px; border:1px solid var(--line); border-radius:6px; background:var(--panel); color:var(--ink); padding:8px 10px; }
    button { cursor:pointer; }
    .grid { display:grid; gap:12px; }
    .card { border:1px solid var(--line); border-radius:8px; background:var(--panel); padding:14px; }
    .item { display:grid; gap:12px; grid-template-columns:1fr auto; align-items:start; }
    .tag { display:inline-flex; border-radius:999px; background:var(--soft); padding:3px 8px; font-size:12px; color:var(--cyan); margin-right:6px; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
    pre { white-space:pre-wrap; overflow:auto; max-height:260px; background:#000; border-radius:6px; padding:10px; }
    img.preview { max-width:100%; max-height:76vh; object-fit:contain; border:1px solid var(--line); border-radius:8px; background:#000; }
    dialog { width:min(920px,94vw); border:1px solid var(--line); border-radius:8px; background:var(--panel); color:var(--ink); }
    @media (max-width:760px) { .item { grid-template-columns:1fr; } .actions { justify-content:flex-start; } }
  </style>
</head>
<body>
  <header>
    <h1>Buchhaltung Export</h1>
    <div class="muted">Offline-Datei erstellt am ${escapeHtml(new Date().toLocaleString('de-AT'))}. Enthalten: Rechnungen, Angebote, Kategorien und eingebettete Dateien.</div>
    <div class="toolbar">
      <select id="type"><option value="all">Alles</option><option value="invoice">Rechnungen</option><option value="offer">Angebote</option></select>
      <input id="search" placeholder="Suchen...">
      <button onclick="window.print()">Drucken / PDF</button>
      <button onclick="downloadJson()">JSON exportieren</button>
    </div>
  </header>
  <main>
    <div id="list" class="grid"></div>
  </main>
  <dialog id="viewer"><div class="actions"><button onclick="viewer.close()">Schliessen</button></div><div id="viewerBody"></div></dialog>
  <script>
    const records = ${escapedJson};
    const list = document.getElementById('list');
    const search = document.getElementById('search');
    const type = document.getElementById('type');
    const viewer = document.getElementById('viewer');
    const viewerBody = document.getElementById('viewerBody');

    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

    function render() {
      const needle = search.value.toLowerCase();
      const selectedType = type.value;
      const filtered = records.filter((record) => {
        const recordType = record.recordType || 'invoice';
        const haystack = JSON.stringify(record).toLowerCase();
        return (selectedType === 'all' || recordType === selectedType) && haystack.includes(needle);
      });
      list.innerHTML = filtered.map((record, index) => {
        const recordType = record.recordType === 'offer' ? 'Angebot' : 'Rechnung';
        return '<article class="card item">' +
          '<div><div><span class="tag">' + esc(recordType) + '</span><span class="tag">' + esc(record.category || 'Allgemein') + '</span></div>' +
          '<h2>' + esc(record.title || record.merchant || recordType) + '</h2>' +
          '<p class="muted">' + esc(record.date || 'Datum unbekannt') + (record.total ? ' - ' + esc(record.total) : '') + (record.merchant ? ' - ' + esc(record.merchant) : '') + '</p>' +
          (record.validUntil ? '<p class="muted">Gueltig bis: ' + esc(record.validUntil) + '</p>' : '') +
          (record.notes ? '<p>' + esc(record.notes) + '</p>' : '') +
          '</div><div class="actions">' +
          ((record.fileData || record.imageData) ? '<button onclick="openFile(' + index + ')">Datei oeffnen</button>' : '') +
          '<button onclick="openJson(' + index + ')">JSON</button>' +
          '</div></article>';
      }).join('') || '<p class="muted">Keine Eintraege gefunden.</p>';
    }

    function openFile(index) {
      const record = records[index];
      const data = record.fileData || record.imageData;
      if (!data) return;
      if ((record.fileType || '').startsWith('image/')) {
        viewerBody.innerHTML = '<img class="preview" src="' + data + '" alt="">';
        viewer.showModal();
      } else {
        const win = window.open('', '_blank');
        win.document.write('<iframe src="' + data + '" style="border:0;width:100vw;height:100vh"></iframe>');
      }
    }

    function openJson(index) {
      viewerBody.innerHTML = '<pre>' + esc(JSON.stringify(records[index], null, 2)) + '</pre>';
      viewer.showModal();
    }

    function downloadJson() {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'buchhaltung-export.json';
      link.click();
      URL.revokeObjectURL(url);
    }

    search.addEventListener('input', render);
    type.addEventListener('change', render);
    render();
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function Media({ api }) {
  const favs = useCollection(api, 'media/favorites');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('top');
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
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
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
    if (!query.trim()) {
      setMediaError('Gib einen Filmtitel oder Schauspieler ein.');
      return;
    }
    setMediaLoading(true);
    setMediaError('');
    try {
      setTab('search');
      setResults(await api.request(`media/search?q=${encodeURIComponent(query)}&type=movie`));
    } catch {
      setResults([{ source: 'manual', externalId: `local-${Date.now()}`, mediaType: 'movie', title: query, imageUrl: null, description: 'Suche gerade nicht erreichbar. Du kannst den Eintrag trotzdem speichern.', watched: false, audience: 'Für mich' }]);
    } finally {
      setMediaLoading(false);
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
        <div className="mb-3">
          <h2 className="font-semibold">Filmsuche</h2>
          <p className="text-sm text-zinc-500">Suche nach Filmtiteln und speichere Treffer in deinen Favoriten.</p>
        </div>
        <form onSubmit={search} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Film oder Schauspieler suchen" />
          <Button><Search className="h-4 w-4" />Suchen</Button>
        </form>
      </Card>
      )}
      {mediaError && <Card><p className="text-sm text-rose-600 dark:text-rose-300">{mediaError}</p></Card>}
      {mediaLoading && <Card><p className="text-sm text-zinc-500">Filmdaten werden geladen...</p></Card>}
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
      <>
      {!mediaLoading && (tab === 'search' ? results : tab === 'future' ? futureMovies : topMovies).length === 0 && (
        <Card>
          <h2 className="font-semibold">{tab === 'search' ? 'Keine Suchtreffer' : 'Keine Filme geladen'}</h2>
          <p className="mt-1 text-sm text-zinc-500">{tab === 'search' ? 'Starte eine Suche oder wechsle zu Toplisten.' : 'Wenn hier nichts erscheint, nutze die Suche oder pruefe die TMDB API.'}</p>
        </Card>
      )}
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
      </>
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
  const [error, setError] = useState('');
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
    setError('');
    try {
      const generated = await api.request('generate-trip', {
        method: 'POST',
        body: JSON.stringify({
          city: form.city,
          durationDays: Number(form.durationDays),
          tripType: form.tripType,
          save: false
        })
      });
      setPlan(generated);
    } catch {
      setError('Reise konnte gerade nicht generiert werden. Bitte pruefe Stadtname und Verbindung.');
    } finally {
      setLoading(false);
    }
  }

  async function saveCurrentTrip() {
    if (!plan || plan.savedTripId) return;
    const saved = await api.request('trips', {
      method: 'POST',
      body: JSON.stringify({
        destination: plan.city,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + (Number(plan.durationDays || 1) - 1) * 86400000).toISOString().slice(0, 10),
        durationDays: plan.durationDays,
        tripType: plan.tripType,
        notes: plan.cultureInfo,
        planJson: plan
      })
    });
    setPlan({ ...plan, savedTripId: saved.id });
    await loadTrips();
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
        <div className="mb-3">
          <h2 className="font-semibold">Reiseplaner</h2>
          <p className="text-sm text-zinc-500">Stadt, Dauer und Reisetyp waehlen. Danach erstellt die Webseite Tagesplan, Karte, Hotels und Tipps.</p>
        </div>
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
      {error && <Card><p className="text-sm text-rose-600 dark:text-rose-300">{error}</p></Card>}

      <Card>
          <h2 className="mb-3 font-semibold">Gespeicherte Reisen</h2>
        {!!savedTrips.length ? (
          <div className="space-y-2">
            {savedTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                <button type="button" className="font-medium" onClick={() => setPlan({ ...trip.plan, savedTripId: trip.id })}>{trip.destination}</button>
                <button type="button" className="icon-btn" onClick={() => deleteTrip(trip)} aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Noch keine gespeicherte Reise. Generiere einen Plan und klicke danach auf "Reise speichern".</p>
        )}
      </Card>

      {plan && (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-semibold">{plan.city} - {plan.durationDays} Tage - {plan.tripType}</h2>
                <Button type="button" onClick={saveCurrentTrip} disabled={Boolean(plan.savedTripId)}>{plan.savedTripId ? 'Gespeichert' : 'Reise speichern'}</Button>
              </div>
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
                      <img src={activity.imageUrl} alt="" className="h-24 w-full rounded-md object-cover" onError={(event) => { event.currentTarget.src = `https://placehold.co/440x260/386641/ffffff?text=${encodeURIComponent(activity.name)}`; }} />
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
                  <img src={hotel.imageUrl} alt="" className="aspect-video w-full object-cover" onError={(event) => { event.currentTarget.src = `https://placehold.co/640x360/2f6690/ffffff?text=${encodeURIComponent(hotel.name)}`; }} />
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

function BooksPage() {
  const books = [
    {
      id: 'scalping-preview',
      title: 'Scalping lernen: vom Chart-Chaos zum Entscheidungsbaum',
      subtitle: 'Preview-Entwurf aus transkribiertem Videomaterial',
      htmlUrl: '/books/scalping-preview-book.html',
      pdfUrl: '/books/scalping-preview-book.pdf'
    }
  ];
  const [activeBook, setActiveBook] = useState(books[0]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Buecher</h2>
            <p className="mt-1 text-sm text-zinc-500">Deine privaten HTML-Buecher direkt in der Webseite lesen.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.open(activeBook.htmlUrl, '_blank', 'noopener,noreferrer')}>
              <BookOpen className="h-4 w-4" />Separat oeffnen
            </Button>
            <Button type="button" className="bg-zinc-700" onClick={() => window.open(activeBook.pdfUrl, '_blank', 'noopener,noreferrer')}>
              <Download className="h-4 w-4" />PDF
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <h3 className="mb-3 font-semibold">Bibliothek</h3>
          <div className="space-y-2">
            {books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => setActiveBook(book)}
                className={`w-full rounded-md p-3 text-left text-sm transition ${activeBook.id === book.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'}`}
              >
                <span className="block font-medium">{book.title}</span>
                <span className="mt-1 block text-xs opacity-70">{book.subtitle}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <iframe
            title={activeBook.title}
            src={activeBook.htmlUrl}
            className="h-[78vh] min-h-[640px] w-full border-0 bg-white"
          />
        </Card>
      </div>
    </div>
  );
}

function SettingsPage({ api }) {
  const [users, setUsers] = useState([]);
  const [loginEvents, setLoginEvents] = useState([]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [editing, setEditing] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');

  async function loadUsers() {
    setUsers(await api.request('users'));
  }

  async function loadLoginEvents() {
    setLoginEvents(await api.request('login-events'));
  }

  useEffect(() => {
    loadUsers().catch(() => setUsers([]));
    loadLoginEvents().catch(() => setLoginEvents([]));
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
                <p className="text-xs text-zinc-500">Letzter Login: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'noch nie'}</p>
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
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Anmeldelogbuch</h2>
          <Button type="button" className="bg-zinc-700" onClick={loadLoginEvents}>Aktualisieren</Button>
        </div>
        <div className="space-y-2">
          {loginEvents.map((event) => (
            <div key={event.id} className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <p className="font-medium">{event.username}</p>
              <p className="text-xs text-zinc-500">{formatDateTime(event.createdAt)}{event.ip ? ` - ${event.ip}` : ''}</p>
              {event.userAgent && <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{event.userAgent}</p>}
            </div>
          ))}
          {!loginEvents.length && <p className="text-sm text-zinc-500">Noch keine Anmeldungen gespeichert.</p>}
        </div>
      </Card>
    </div>
  );
}

function LifeHub() {
  return (
    <div className="life-modern space-y-6">
      <div className="rounded-lg border border-cyan-300/20 bg-slate-950 p-5 text-white shadow-lg shadow-cyan-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Neue Zentrale</p>
        <h1 className="mt-2 text-3xl font-black">Life Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Deine alte Webseite bleibt erhalten. Dieser Bereich erweitert sie um Wetter, Kalender, Trello, Musik, Zitate, Witze und KI-Assistent.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <WeatherWidget />
        <QuoteWidget />
        <JokeWidget />
        <MoviesWidget />
        <CalendarWidget />
        <MusicWidget />
        <TrelloWidget />
      </div>
      <AssistantWidget />
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('pd:token'));
  const [page, setPage] = useState('dashboard');
  const [dark, setDark] = useState(localStorage.getItem('pd:dark') === 'true');
  const api = useApi(token, () => setToken(null));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('pd:dark', String(dark));
  }, [dark]);

  if (window.location.pathname === '/google/callback') return <GoogleCallbackPage />;
  if (!token) return <Login onLogin={(next) => { localStorage.setItem('pd:token', next); localStorage.setItem('life:token', next); setToken(next); }} />;

  const pages = {
    dashboard: <Dashboard api={api} />,
    tasks: <TrelloWidget title="To-do" intro={false} />,
    invoices: <BookkeepingPage />,
    media: <Media api={api} />,
    news: <News api={api} />,
    travel: <Travel api={api} />,
    stocks: <Stocks api={api} />,
    books: <BooksPage />,
    life: <LifeHub />,
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
