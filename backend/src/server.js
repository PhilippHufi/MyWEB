import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import archiver from 'archiver';
import multer from 'multer';
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
const uploadDir = process.env.UPLOAD_DIR || '/data/uploads';

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/|application\/pdf/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images and PDFs are allowed'));
  }
});

app.use(cors());
app.use(express.json());

function signUser(user) {
  return jwt.sign({ sub: user.id, username: user.email }, jwtSecret, { expiresIn: '7d' });
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

function fallbackNews(scope = 'at', type = 'articles') {
  const audio = {
    at: [
      ['ORF OE1 Journale', 'https://oe1.orf.at/player', 'Aktuelle Audio-Journale aus Österreich.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'],
      ['ORF Sound', 'https://sound.orf.at/', 'Nachrichten, Podcasts und Sendungen zum Anhören.', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=80']
    ],
    de: [
      ['Deutschlandfunk Nachrichten', 'https://www.deutschlandfunk.de/nachrichten-100.html', 'Aktuelle Nachrichten aus Deutschland als Audio und Text.', 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=900&q=80'],
      ['Tagesschau in 100 Sekunden', 'https://www.tagesschau.de/multimedia/sendung/tagesschau_in_100_sekunden/', 'Kurzer Nachrichtenüberblick zum Ansehen und Anhören.', 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80']
    ],
    us: [
      ['NPR News Now', 'https://www.npr.org/podcasts/500005/npr-news-now', 'Aktuelle US-Nachrichten als Audio.', 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?auto=format&fit=crop&w=900&q=80'],
      ['PBS NewsHour', 'https://www.pbs.org/newshour/podcasts', 'US- und Weltpolitik als Podcast.', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80']
    ],
    world: [
      ['BBC Global News Podcast', 'https://www.bbc.co.uk/programmes/p02nq0gn/episodes/downloads', 'Weltweite Nachrichten als Audio.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80'],
      ['DW News', 'https://www.dw.com/de/media-center/s-100824', 'Internationale Nachrichten der Deutschen Welle.', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80']
    ]
  };

  const items = {
    at: [
      ['ORF News', 'https://orf.at/', 'Aktuelle Nachrichten aus Österreich.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'],
      ['Der Standard', 'https://www.derstandard.at/', 'Nachrichten und Hintergründe aus Österreich.', 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=900&q=80']
    ],
    de: [
      ['Tagesschau', 'https://www.tagesschau.de/', 'Aktuelle Nachrichten aus Deutschland.', 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80'],
      ['ZDFheute', 'https://www.zdf.de/nachrichten', 'Nachrichten und Videos aus Deutschland.', 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=900&q=80']
    ],
    us: [
      ['NPR', 'https://www.npr.org/sections/news/', 'Aktuelle Nachrichten aus Amerika.', 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?auto=format&fit=crop&w=900&q=80'],
      ['PBS NewsHour', 'https://www.pbs.org/newshour/', 'US-Nachrichten und Hintergründe.', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80']
    ],
    world: [
      ['BBC News', 'https://www.bbc.com/news', 'Weltweite Nachrichten.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80'],
      ['Deutsche Welle', 'https://www.dw.com/de/themen/s-9077', 'Internationale Nachrichten auf Deutsch.', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80']
    ]
  };
  return (type === 'audio' ? audio[scope] || audio.world : items[scope] || items.at).map(([title, url, description, imageUrl]) => ({
    title,
    url,
    source: 'Fallback',
    category: scope,
    type,
    description,
    imageUrl
  }));
}

function fallbackWeatherDaily() {
  const today = new Date();
  const time = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
  return {
    time,
    temperature_2m_min: [8, 9, 7, 10, 11, 9, 8],
    temperature_2m_max: [17, 18, 16, 20, 21, 19, 17],
    precipitation_probability_max: [20, 35, 45, 15, 10, 25, 30]
  };
}

function movieSort(value) {
  if (value === 'release_date') return 'primary_release_date.desc';
  if (value === 'rating') return 'vote_average.desc';
  return 'popularity.desc';
}

async function tmdbGenres() {
  if (!process.env.TMDB_API_KEY) return new Map();
  const url = new URL('https://api.themoviedb.org/3/genre/movie/list');
  url.searchParams.set('language', 'de-DE');
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  const response = await fetch(url);
  if (!response.ok) return new Map();
  const data = await response.json();
  return new Map((data.genres || []).map((genre) => [genre.id, genre.name]));
}

function mapMovie(movie, genres = new Map()) {
  return {
    source: 'tmdb',
    externalId: String(movie.id),
    mediaType: 'movie',
    title: movie.title,
    imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
    description: movie.overview,
    releaseYear: (movie.release_date || '').slice(0, 4) || null,
    releaseDate: movie.release_date || null,
    genres: (movie.genre_ids || []).map((id) => genres.get(id)).filter(Boolean).join(', '),
    actors: '',
    trailerUrl: null,
    rating: typeof movie.vote_average === 'number' ? movie.vote_average : null,
    popularity: typeof movie.popularity === 'number' ? movie.popularity : null,
    watched: false,
    audience: 'Für mich'
  };
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
  const { username, email, password } = req.body;
  const login = username || email;
  const user = await prisma.user.findUnique({ where: { email: login } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid login' });
  }
  res.json({ token: signUser(user), user: { id: user.id, username: user.email } });
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

crudRoutes('shopping', 'shoppingItem', (body) => ({
  name: body.name,
  category: body.category || 'Allgemein',
  quantity: body.quantity || null,
  completed: Boolean(body.completed)
}));

crudRoutes('media/favorites', 'favoriteMedia', (body) => ({
  source: body.source || 'manual',
  externalId: body.externalId || null,
  mediaType: body.mediaType || 'movie',
  title: body.title,
  imageUrl: body.imageUrl || null,
  description: body.description || null,
  releaseYear: body.releaseYear || null,
  genres: Array.isArray(body.genres) ? body.genres.join(', ') : body.genres || null,
  actors: Array.isArray(body.actors) ? body.actors.join(', ') : body.actors || null,
  trailerUrl: body.trailerUrl || null,
  rating: body.rating === '' || body.rating == null ? null : Number(body.rating),
  popularity: body.popularity === '' || body.popularity == null ? null : Number(body.popularity),
  releaseDate: body.releaseDate || null,
  watched: Boolean(body.watched),
  audience: body.audience || 'Für mich'
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

app.get('/api/invoices', auth, async (_req, res) => {
  const items = await prisma.invoice.findMany({ orderBy: [{ month: 'desc' }, { invoiceDate: 'desc' }, { id: 'desc' }] });
  res.json(items);
});

app.post('/api/invoices', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const invoiceDate = parseDate(req.body.invoiceDate) || new Date();
  const month = invoiceDate.toISOString().slice(0, 7);
  const item = await prisma.invoice.create({
    data: {
      merchant: req.body.merchant || 'Unbekannt',
      category: req.body.category || null,
      amount: req.body.amount === '' || req.body.amount == null ? null : Number(req.body.amount),
      invoiceDate,
      month,
      notes: req.body.notes || null,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    }
  });
  res.status(201).json(item);
});

app.get('/api/invoices/:id/download', auth, async (req, res) => {
  const item = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.download(path.join(uploadDir, item.fileName), item.originalName);
});

app.get('/api/invoices/month/:month/download', auth, async (req, res) => {
  const month = String(req.params.month || '');
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Invalid month' });
  const items = await prisma.invoice.findMany({ where: { month }, orderBy: { invoiceDate: 'asc' } });
  res.attachment(`rechnungen-${month}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    throw error;
  });
  archive.pipe(res);
  for (const item of items) {
    const safeMerchant = item.merchant.replace(/[^a-z0-9_-]+/gi, '_');
    archive.file(path.join(uploadDir, item.fileName), { name: `${item.invoiceDate.toISOString().slice(0, 10)}-${safeMerchant}-${item.originalName}` });
  }
  archive.finalize();
});

app.delete('/api/invoices/:id', auth, async (req, res) => {
  const item = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  await prisma.invoice.delete({ where: { id: item.id } });
  const filePath = path.join(uploadDir, item.fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.status(204).end();
});

app.get('/api/media/search', auth, async (req, res) => {
  const query = String(req.query.q || '').trim();
  const type = String(req.query.type || 'movie');
  if (!query) return res.json([]);

  if (type === 'movie' && process.env.TMDB_API_KEY) {
    try {
      const url = new URL('https://api.themoviedb.org/3/search/movie');
      url.searchParams.set('query', query);
      url.searchParams.set('language', 'de-DE');
      url.searchParams.set('api_key', process.env.TMDB_API_KEY);
      const response = await fetch(url);
      if (!response.ok) throw new Error('TMDB request failed');
      const data = await response.json();
      const results = await Promise.all((data.results || []).slice(0, 9).map(async (movie) => {
        try {
          const detailsUrl = new URL(`https://api.themoviedb.org/3/movie/${movie.id}`);
          detailsUrl.searchParams.set('language', 'de-DE');
          detailsUrl.searchParams.set('api_key', process.env.TMDB_API_KEY);
          detailsUrl.searchParams.set('append_to_response', 'credits,videos');
          const detailsResponse = await fetch(detailsUrl);
          if (!detailsResponse.ok) throw new Error('TMDB details failed');
          const details = await detailsResponse.json();
          const trailer = (details.videos?.results || []).find((video) => video.site === 'YouTube' && /Trailer/i.test(video.type));
          return {
            source: 'tmdb',
            externalId: String(movie.id),
            mediaType: 'movie',
            title: details.title || movie.title,
            imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
            description: details.overview || movie.overview,
            releaseYear: (details.release_date || movie.release_date || '').slice(0, 4) || null,
            genres: (details.genres || []).map((genre) => genre.name).join(', '),
            actors: (details.credits?.cast || []).slice(0, 6).map((actor) => actor.name).join(', '),
            trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
            rating: typeof details.vote_average === 'number' ? details.vote_average : null,
            popularity: typeof details.popularity === 'number' ? details.popularity : null,
            releaseDate: details.release_date || movie.release_date || null,
            watched: false,
            audience: 'Für mich'
          };
        } catch (error) {
          console.error(error);
          return {
            source: 'tmdb',
            externalId: String(movie.id),
            mediaType: 'movie',
            title: movie.title,
            imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
            description: movie.overview,
            releaseYear: (movie.release_date || '').slice(0, 4) || null,
            genres: '',
            actors: '',
            trailerUrl: null,
            rating: typeof movie.vote_average === 'number' ? movie.vote_average : null,
            popularity: typeof movie.popularity === 'number' ? movie.popularity : null,
            releaseDate: movie.release_date || null,
            watched: false,
            audience: 'Für mich'
          };
        }
      }));
      return res.json(results);
    } catch (error) {
      console.error(error);
    }
  }

  res.json([
    {
      source: 'manual',
      externalId: `local-${Date.now()}`,
      mediaType: type,
      title: query,
      imageUrl: null,
      description: type === 'movie'
        ? 'Film-Treffer manuell speichern. Für echte Filmsuche TMDB_API_KEY in Render setzen.'
        : 'Musik-Treffer manuell speichern. Eine Musik-API ist noch nicht konfiguriert.'
    }
  ]);
});

app.get('/api/media/discover', auth, async (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.json([]);
  }

  try {
    const now = new Date();
    const mode = String(req.query.mode || 'current');
    const region = String(req.query.region || 'world');
    const sort = String(req.query.sort || 'popularity');
    const year = mode === 'previous' ? now.getFullYear() - 1 : now.getFullYear();
    const url = new URL('https://api.themoviedb.org/3/discover/movie');
    url.searchParams.set('language', 'de-DE');
    url.searchParams.set('api_key', process.env.TMDB_API_KEY);
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('page', '1');
    url.searchParams.set('vote_count.gte', sort === 'rating' ? '50' : '10');
    url.searchParams.set('sort_by', mode === 'next_year' ? 'primary_release_date.asc' : movieSort(sort));

    if (mode === 'next_year') {
      const nextYear = now.getFullYear() + 1;
      url.searchParams.set('primary_release_date.gte', `${nextYear}-01-01`);
      url.searchParams.set('primary_release_date.lte', `${nextYear}-12-31`);
    } else {
      url.searchParams.set('primary_release_year', String(year));
    }

    if (region === 'AT' || region === 'US') {
      url.searchParams.set('region', region);
      url.searchParams.set('with_release_type', '2|3');
    }

    const [response, genres] = await Promise.all([fetch(url), tmdbGenres()]);
    if (!response.ok) throw new Error('TMDB discover failed');
    const data = await response.json();
    res.json((data.results || []).slice(0, 30).map((movie) => mapMovie(movie, genres)));
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

app.get('/api/news', auth, async (req, res) => {
  const scope = String(req.query.scope || 'at');
  const type = String(req.query.type || 'articles');
  const countries = { at: 'at', de: 'de', us: 'us' };
  if (type === 'audio') {
    return res.json(fallbackNews(scope, type));
  }

  if (process.env.NEWS_API_KEY) {
    try {
      const url = new URL('https://newsapi.org/v2/top-headlines');
      if (scope === 'world') {
        url.searchParams.set('language', 'de');
      } else {
        url.searchParams.set('country', countries[scope] || 'at');
      }
      url.searchParams.set('apiKey', process.env.NEWS_API_KEY);
      const response = await fetch(url);
      if (!response.ok) throw new Error('NewsAPI request failed');
      const data = await response.json();
      const articles = (data.articles || []).map((article) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name,
        category: scope,
        type: 'articles',
        description: article.description,
        imageUrl: article.urlToImage
      }));
      if (articles.length) return res.json(articles);
    } catch (error) {
      console.error(error);
    }
  }
  res.json(fallbackNews(scope, type));
});

app.get('/api/weather', auth, async (_req, res) => {
  const lat = process.env.WEATHER_LAT || '48.3069';
  const lon = process.env.WEATHER_LON || '14.2858';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather request failed');
    const data = await response.json();
    if (!data.daily?.time?.length) throw new Error('Weather response missing daily data');
    res.json({ label: process.env.WEATHER_LABEL || 'Linz, Oberoesterreich', daily: data.daily });
  } catch (error) {
    console.error(error);
    res.json({ label: `${process.env.WEATHER_LABEL || 'Linz, Oberoesterreich'} (Fallback)`, daily: fallbackWeatherDaily() });
  }
});

app.get('/api/traffic', auth, async (_req, res) => {
  if (!process.env.TRAFFIC_RSS_URL) {
    return res.json([
      {
        title: 'A1 Oberoesterreich',
        link: 'https://www.asfinag.at/verkehr-sicherheit/',
        content: 'Live-Verkehr ist noch nicht verbunden. Oeffne ASFINAG Verkehr oder setze TRAFFIC_RSS_URL in Render.'
      }
    ]);
  }
  try {
    const feed = await rssParser.parseURL(process.env.TRAFFIC_RSS_URL);
    const items = feed.items
      .filter((item) => /A1|Oberoesterreich|Upper Austria|Linz|Wels|Enns/i.test(`${item.title} ${item.contentSnippet}`))
      .slice(0, 8)
      .map((item) => ({ title: item.title, link: item.link, content: item.contentSnippet }));
    res.json(items.length ? items : [{ title: 'A1 Oberoesterreich', content: 'Aktuell keine passenden A1-Meldungen im Feed.' }]);
  } catch (error) {
    console.error(error);
    res.json([{ title: 'A1 Oberoesterreich', content: 'Verkehrsfeed konnte gerade nicht geladen werden.' }]);
  }
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
