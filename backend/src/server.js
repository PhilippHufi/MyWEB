import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Parser from 'rss-parser';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const rssParser = new Parser();
const port = process.env.PORT || 4000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function parseDate(value) {
  return value ? new Date(value) : null;
}

function crudRoutes(path, model, mapInput = (body) => body, include) {
  app.get(`/api/${path}`, auth, async (_req, res) => {
    const items = await prisma[model].findMany({ orderBy: { id: 'desc' }, include });
    res.json(items);
  });

  app.post(`/api/${path}`, auth, async (req, res) => {
    const item = await prisma[model].create({ data: mapInput(req.body), include });
    res.status(201).json(item);
  });

  app.put(`/api/${path}/:id`, auth, async (req, res) => {
    const item = await prisma[model].update({
      where: { id: Number(req.params.id) },
      data: mapInput(req.body),
      include
    });
    res.json(item);
  });

  app.delete(`/api/${path}/:id`, auth, async (req, res) => {
    await prisma[model].delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  });
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid login' });
  }
  res.json({ token: signUser(user), user: { id: user.id, email: user.email } });
});

app.get('/api/dashboard', auth, async (_req, res) => {
  const [tasks, finance, trips, gifts, favorites] = await Promise.all([
    prisma.task.findMany({ where: { completed: false }, orderBy: { dueDate: 'asc' }, take: 5 }),
    prisma.financeEntry.findMany(),
    prisma.trip.findMany({ where: { startDate: { gte: new Date() } }, orderBy: { startDate: 'asc' }, take: 3 }),
    prisma.giftIdea.count(),
    prisma.favoriteMedia.count()
  ]);
  const income = finance.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = finance.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  res.json({ tasks, trips, gifts, favorites, finance: { income, expenses, balance: income - expenses } });
});

crudRoutes('finance', 'financeEntry', (body) => ({
  type: body.type,
  category: body.category,
  amount: Number(body.amount),
  description: body.description || null,
  date: parseDate(body.date) || new Date()
}));

crudRoutes('tasks', 'task', (body) => ({
  title: body.title,
  category: body.category || 'Allgemein',
  priority: body.priority || 'mittel',
  dueDate: parseDate(body.dueDate),
  completed: Boolean(body.completed),
  notes: body.notes || null
}));

crudRoutes('gifts', 'giftIdea', (body) => ({
  name: body.name,
  person: body.person,
  price: body.price === '' || body.price == null ? null : Number(body.price),
  status: body.status || 'Idee',
  notes: body.notes || null
}));

crudRoutes('media/favorites', 'favoriteMedia', (body) => ({
  source: body.source || 'manual',
  externalId: body.externalId || null,
  mediaType: body.mediaType || 'movie',
  title: body.title,
  imageUrl: body.imageUrl || null,
  description: body.description || null
}));

crudRoutes('news/bookmarks', 'newsBookmark', (body) => ({
  title: body.title,
  url: body.url,
  source: body.source || null,
  category: body.category || null,
  description: body.description || null,
  imageUrl: body.imageUrl || null
}));

function mapTrip(body, replaceNested = false) {
  return {
    destination: body.destination,
    startDate: parseDate(body.startDate) || new Date(),
    endDate: parseDate(body.endDate) || new Date(),
    notes: body.notes || null,
    hotels: body.hotels ? (replaceNested ? { deleteMany: {}, create: body.hotels } : { create: body.hotels }) : undefined,
    attractions: body.attractions ? (replaceNested ? { deleteMany: {}, create: body.attractions } : { create: body.attractions }) : undefined
  };
}

app.get('/api/trips', auth, async (_req, res) => {
  const items = await prisma.trip.findMany({ orderBy: { id: 'desc' }, include: { hotels: true, attractions: true } });
  res.json(items);
});

app.post('/api/trips', auth, async (req, res) => {
  const item = await prisma.trip.create({ data: mapTrip(req.body), include: { hotels: true, attractions: true } });
  res.status(201).json(item);
});

app.put('/api/trips/:id', auth, async (req, res) => {
  const item = await prisma.trip.update({
    where: { id: Number(req.params.id) },
    data: mapTrip(req.body, true),
    include: { hotels: true, attractions: true }
  });
  res.json(item);
});

app.delete('/api/trips/:id', auth, async (req, res) => {
  await prisma.trip.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

app.get('/api/media/search', auth, async (req, res) => {
  const query = String(req.query.q || '').trim();
  const type = String(req.query.type || 'movie');
  if (!query) return res.json([]);

  if (type === 'movie' && process.env.TMDB_API_KEY) {
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('query', query);
    url.searchParams.set('language', 'de-DE');
    url.searchParams.set('api_key', process.env.TMDB_API_KEY);
    const response = await fetch(url);
    const data = await response.json();
    return res.json((data.results || []).map((movie) => ({
      source: 'tmdb',
      externalId: String(movie.id),
      mediaType: 'movie',
      title: movie.title,
      imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
      description: movie.overview
    })));
  }

  res.json([
    {
      source: 'manual',
      externalId: `local-${Date.now()}`,
      mediaType: type,
      title: query,
      imageUrl: null,
      description: 'Kein API-Key konfiguriert. Du kannst diesen Treffer trotzdem als Favorit speichern.'
    }
  ]);
});

app.get('/api/news', auth, async (req, res) => {
  const category = String(req.query.category || 'technology');
  if (process.env.NEWS_API_KEY) {
    const url = new URL('https://newsapi.org/v2/top-headlines');
    url.searchParams.set('country', 'de');
    url.searchParams.set('category', category);
    url.searchParams.set('apiKey', process.env.NEWS_API_KEY);
    const response = await fetch(url);
    const data = await response.json();
    return res.json((data.articles || []).map((article) => ({
      title: article.title,
      url: article.url,
      source: article.source?.name,
      category,
      description: article.description,
      imageUrl: article.urlToImage
    })));
  }
  res.json([]);
});

app.get('/api/weather', auth, async (_req, res) => {
  const lat = process.env.WEATHER_LAT || '48.3069';
  const lon = process.env.WEATHER_LON || '14.2858';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const response = await fetch(url);
  const data = await response.json();
  res.json({ label: process.env.WEATHER_LABEL || 'Linz, Oberoesterreich', daily: data.daily });
});

app.get('/api/traffic', auth, async (_req, res) => {
  if (!process.env.TRAFFIC_RSS_URL) {
    return res.json([{ title: 'A1 Oberoesterreich', content: 'Keine TRAFFIC_RSS_URL konfiguriert. RSS-Link in backend/.env eintragen.' }]);
  }
  const feed = await rssParser.parseURL(process.env.TRAFFIC_RSS_URL);
  const items = feed.items
    .filter((item) => /A1|Oberoesterreich|Upper Austria|Linz|Wels|Enns/i.test(`${item.title} ${item.contentSnippet}`))
    .slice(0, 8)
    .map((item) => ({ title: item.title, link: item.link, content: item.contentSnippet }));
  res.json(items);
});

app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://localhost:${port}`);
});
