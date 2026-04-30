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
const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});
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
app.use(express.json({ limit: '200mb' }));

function signUser(user) {
  return jwt.sign({ sub: user.id, username: user.email }, jwtSecret, { expiresIn: '24h' });
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

function cleanRecord(item, omit = ['id', 'createdAt']) {
  const copy = { ...item };
  for (const key of omit) delete copy[key];
  return copy;
}

function sqlitePath() {
  const url = process.env.DATABASE_URL || 'file:/data/prod.db';
  return url.startsWith('file:') ? path.resolve(url.slice('file:'.length)) : null;
}

function distanceKm(a, b) {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function orderedByDistance(start, places) {
  const remaining = [...places];
  const ordered = [];
  let current = start;
  while (remaining.length) {
    remaining.sort((a, b) => distanceKm(current, a.coordinates) - distanceKm(current, b.coordinates));
    const next = remaining.shift();
    ordered.push(next);
    current = next.coordinates;
  }
  return ordered;
}

function inferCategory(title, tripType) {
  if (/beach|strand|playa|mare|marina|port|hafen|bad|see/i.test(title)) return 'Strand';
  if (/museum|cathedral|kirche|castle|palace|galerie|theater|opera|monument|dom|basilica/i.test(title)) return 'Kultur';
  if (tripType === 'Strandurlaub') return 'Strand';
  if (tripType === 'Kultururlaub') return 'Kultur';
  return 'Gemischt';
}

function stableRating(text, min = 4.1, max = 4.9) {
  const sum = [...text].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Number((min + (sum % 80) / 100 * ((max - min) / 0.8)).toFixed(1));
}

function placeholderImage(title, subtitle = 'Reiseplan') {
  const colors = ['#386641', '#bc6c25', '#2f6690', '#8a5a44', '#6a994e'];
  const color = colors[[...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <rect width="900" height="600" fill="${color}"/>
      <circle cx="760" cy="110" r="120" fill="rgba(255,255,255,.16)"/>
      <path d="M0 430 C180 360 260 470 420 390 C570 315 650 420 900 330 L900 600 L0 600 Z" fill="rgba(255,255,255,.20)"/>
      <text x="55" y="420" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="white">${title.replace(/[<>&]/g, '')}</text>
      <text x="58" y="472" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,.86)">${subtitle.replace(/[<>&]/g, '')}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function geocodeCity(city) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', city);
  const response = await fetch(url, { headers: { 'User-Agent': 'MyWEB private trip planner' } });
  const data = await response.json();
  const first = data[0];
  if (!first) throw new Error('City not found');
  return {
    name: first.display_name.split(',')[0],
    lat: Number(first.lat),
    lng: Number(first.lon),
    displayName: first.display_name
  };
}

async function wikiSummary(title) {
  const url = `https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

async function wikiImage(title) {
  const url = new URL('https://de.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', title);
  url.searchParams.set('prop', 'pageimages');
  url.searchParams.set('pithumbsize', '900');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const page = Object.values(data.query?.pages || {})[0];
  return page?.thumbnail?.source || null;
}

async function commonsImage(query) {
  const queries = [query, `${query} landmark`, `${query} city`];
  for (const search of queries) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `filetype:bitmap ${search}`);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', '8');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime|size');
  url.searchParams.set('iiurlwidth', '900');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const response = await fetch(url);
  if (!response.ok) continue;
  const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    const image = pages
      .map((page) => page.imageinfo?.[0])
      .find((info) => info?.mime?.startsWith('image/') && !/svg|gif/i.test(info.mime));
    if (image?.thumburl || image?.url) return image.thumburl || image.url;
  }
  return null;
}

async function travelImage(city, name, category) {
  const lower = `${name} ${category || ''}`.toLowerCase();
  const cityName = city.name;
  const queries = [];
  if (/barcelona/i.test(cityName) && /museum|stadtmuseum|histor/i.test(lower)) {
    queries.push('Museu d Historia de Barcelona', 'Barcelona museum');
  }
  if (/museum|stadtmuseum|galerie|history|histor/i.test(lower)) {
    queries.push(`${cityName} museum`, `${cityName} history museum`);
  }
  if (/strand|beach|playa|wasser|hafen|marina|promenade/i.test(lower)) {
    queries.push(`${cityName} beach`, `${cityName} waterfront`, `${cityName} marina`);
  }
  if (/markt|market/i.test(lower)) queries.push(`${cityName} market`);
  if (/aussicht|view|sunset|sonnenuntergang/i.test(lower)) queries.push(`${cityName} skyline`, `${cityName} panorama`);
  queries.push(`${cityName} ${name}`, `${cityName} landmark`, `${cityName} old town`, cityName);

  for (const query of [...new Set(queries)]) {
    const image = await commonsImage(query);
    if (image) return image;
  }
  return await wikiImage(cityName);
}

async function cityPlaces(city, tripType) {
  const geoUrl = new URL('https://de.wikipedia.org/w/api.php');
  geoUrl.searchParams.set('action', 'query');
  geoUrl.searchParams.set('list', 'geosearch');
  geoUrl.searchParams.set('gscoord', `${city.lat}|${city.lng}`);
  geoUrl.searchParams.set('gsradius', '10000');
  geoUrl.searchParams.set('gslimit', '40');
  geoUrl.searchParams.set('format', 'json');
  geoUrl.searchParams.set('origin', '*');
  const response = await fetch(geoUrl);
  const data = await response.json();
  const raw = data.query?.geosearch || [];
  const summaries = await Promise.all(raw.slice(0, 24).map(async (place) => {
    const summary = await wikiSummary(place.title);
    const category = inferCategory(place.title, tripType);
    const imageUrl = summary?.originalimage?.source || summary?.thumbnail?.source || await wikiImage(place.title) || await travelImage(city, place.title, category);
    return {
      name: place.title,
      coordinates: { lat: place.lat, lng: place.lon },
      description: summary?.extract || 'Interessanter Ort in der Stadt.',
      imageUrl: imageUrl || placeholderImage(place.title, city.name),
      sourceUrl: summary?.content_urls?.desktop?.page || `https://de.wikipedia.org/wiki/${encodeURIComponent(place.title)}`,
      rating: stableRating(place.title),
      category
    };
  }));
  return summaries.filter(Boolean);
}

async function fallbackPlaces(city, tripType) {
  const names = tripType === 'Strandurlaub'
    ? ['Altstadt Spaziergang', 'Strandpromenade', 'Aussichtspunkt', 'Lokaler Markt', 'Sonnenuntergang am Wasser', 'Hafenviertel']
    : ['Historisches Zentrum', 'Stadtmuseum', 'Hauptplatz', 'Aussichtspunkt', 'Lokaler Markt', 'Kunstviertel', 'Parkanlage'];
  return Promise.all(names.map(async (name, index) => {
    const category = inferCategory(name, tripType);
    const imageUrl = await travelImage(city, name, category);
    return {
      name,
      coordinates: { lat: city.lat + index * 0.006, lng: city.lng + index * 0.005 },
      description: `${name} in ${city.name}: passend fuer einen ${tripType}.`,
      imageUrl: imageUrl || placeholderImage(name, city.name),
      sourceUrl: `https://de.wikipedia.org/w/index.php?search=${encodeURIComponent(`${city.name} ${name}`)}`,
      rating: stableRating(name),
      category
    };
  }));
}

async function buildHotels(city, tripType) {
  const suffix = tripType === 'Strandurlaub' ? ['Beach', 'Marina', 'Seaside', 'Bay', 'Sunset'] : ['Central', 'Old Town', 'Museum', 'City', 'Boutique'];
  const hotels = await Promise.all(suffix.map(async (name, index) => {
    const hotelName = `${city.name} ${name} Hotel`;
    const imageUrl = await commonsImage(`${city.name} hotel`) || await travelImage(city, 'Hotel', 'Hotel');
    return {
      name: hotelName,
      price: `${90 + index * 25}-${140 + index * 35} EUR/Nacht`,
      rating: Number((4.2 + index * 0.12).toFixed(1)),
      imageUrl: imageUrl || placeholderImage(`${name} Hotel`, city.name),
      sourceUrl: `https://www.google.com/maps/search/${encodeURIComponent(hotelName)}`,
      description: tripType === 'Strandurlaub' ? 'Strandnah oder gut ans Wasser angebunden.' : 'Zentral gelegen fuer kurze Wege zu Kultur und Altstadt.'
    };
  }));
  return hotels.slice(0, 5);
}

function countryFromDisplayName(displayName = '') {
  const raw = displayName.split(',').map((part) => part.trim()).filter(Boolean).at(-1) || '';
  return {
    Deutschland: 'Germany',
    Österreich: 'Austria',
    Oesterreich: 'Austria',
    Schweiz: 'Switzerland',
    Spanien: 'Spain',
    España: 'Spain',
    Italien: 'Italy',
    Italia: 'Italy',
    Frankreich: 'France',
    Belgique: 'Belgium',
    Belgien: 'Belgium',
    Nederland: 'Netherlands',
    Griechenland: 'Greece',
    Ελλάδα: 'Greece',
    Kroatien: 'Croatia',
    Hrvatska: 'Croatia',
    Türkei: 'Turkey',
    Türkiye: 'Turkey',
    Portugal: 'Portugal',
    Sverige: 'Sweden',
    Schweden: 'Sweden',
    Norge: 'Norway',
    Norwegen: 'Norway',
    Danmark: 'Denmark',
    Dänemark: 'Denmark',
    'United States': 'United States',
    USA: 'United States'
  }[raw] || raw;
}

async function countryProfile(countryName) {
  if (!countryName) return null;
  try {
    const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=name,translations,flags,population,area,languages,capital,region,subregion,currencies,maps`);
    if (!response.ok) return null;
    const [country] = await response.json();
    const languages = Object.values(country.languages || {});
    const currency = Object.values(country.currencies || {})[0];
    return {
      country: country.translations?.deu?.common || country.name?.common || countryName,
      officialName: country.translations?.deu?.official || country.name?.official || countryName,
      flag: country.flags?.svg || country.flags?.png || null,
      population: country.population || null,
      area: country.area || null,
      capital: (country.capital || []).join(', '),
      region: [country.region, country.subregion].filter(Boolean).join(' - '),
      languages,
      primaryLanguage: languages[0] || 'Englisch',
      currency: currency ? [currency.name, currency.symbol].filter(Boolean).join(' ') : null,
      mapsUrl: country.maps?.googleMaps || null
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

function translationGuide(language = 'Englisch', seed = '') {
  const base = [
    'Hallo',
    'Danke',
    'Bitte',
    'Ja',
    'Nein',
    'Entschuldigung',
    'Wie geht es dir?',
    'Was kostet das?',
    'Wo ist die Toilette?',
    'Ich brauche Hilfe'
  ];
  const pool = ['Bahnhof', 'Flughafen', 'Wasser', 'Essen', 'Hotel', 'Strand', 'Museum', 'Arzt', 'Apotheke', 'Rechnung', 'Taxi', 'Eingang', 'Ausgang', 'Heute', 'Morgen', 'Links', 'Rechts', 'Karte', 'Ticket', 'Notfall'];
  const start = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length;
  const randomWords = Array.from({ length: 10 }, (_, index) => pool[(start + index) % pool.length]);
  const dictionaries = {
    Englisch: {
      Hallo: 'Hello', Danke: 'Thank you', Bitte: 'Please', Ja: 'Yes', Nein: 'No', Entschuldigung: 'Sorry', 'Wie geht es dir?': 'How are you?', 'Was kostet das?': 'How much is this?', 'Wo ist die Toilette?': 'Where is the toilet?', 'Ich brauche Hilfe': 'I need help',
      Bahnhof: 'Train station', Flughafen: 'Airport', Wasser: 'Water', Essen: 'Food', Hotel: 'Hotel', Strand: 'Beach', Museum: 'Museum', Arzt: 'Doctor', Apotheke: 'Pharmacy', Rechnung: 'Bill', Taxi: 'Taxi', Eingang: 'Entrance', Ausgang: 'Exit', Heute: 'Today', Morgen: 'Tomorrow', Links: 'Left', Rechts: 'Right', Karte: 'Map', Ticket: 'Ticket', Notfall: 'Emergency'
    },
    Spanisch: {
      Hallo: 'Hola', Danke: 'Gracias', Bitte: 'Por favor', Ja: 'Sí', Nein: 'No', Entschuldigung: 'Perdón', 'Wie geht es dir?': '¿Cómo estás?', 'Was kostet das?': '¿Cuánto cuesta?', 'Wo ist die Toilette?': '¿Dónde está el baño?', 'Ich brauche Hilfe': 'Necesito ayuda',
      Bahnhof: 'Estación', Flughafen: 'Aeropuerto', Wasser: 'Agua', Essen: 'Comida', Hotel: 'Hotel', Strand: 'Playa', Museum: 'Museo', Arzt: 'Médico', Apotheke: 'Farmacia', Rechnung: 'Cuenta', Taxi: 'Taxi', Eingang: 'Entrada', Ausgang: 'Salida', Heute: 'Hoy', Morgen: 'Mañana', Links: 'Izquierda', Rechts: 'Derecha', Karte: 'Mapa', Ticket: 'Billete', Notfall: 'Emergencia'
    },
    Französisch: {
      Hallo: 'Bonjour', Danke: 'Merci', Bitte: 'S’il vous plaît', Ja: 'Oui', Nein: 'Non', Entschuldigung: 'Pardon', 'Wie geht es dir?': 'Comment ça va?', 'Was kostet das?': 'Combien ça coûte?', 'Wo ist die Toilette?': 'Où sont les toilettes?', 'Ich brauche Hilfe': 'J’ai besoin d’aide',
      Bahnhof: 'Gare', Flughafen: 'Aéroport', Wasser: 'Eau', Essen: 'Nourriture', Hotel: 'Hôtel', Strand: 'Plage', Museum: 'Musée', Arzt: 'Médecin', Apotheke: 'Pharmacie', Rechnung: 'Addition', Taxi: 'Taxi', Eingang: 'Entrée', Ausgang: 'Sortie', Heute: 'Aujourd’hui', Morgen: 'Demain', Links: 'Gauche', Rechts: 'Droite', Karte: 'Carte', Ticket: 'Billet', Notfall: 'Urgence'
    },
    Italienisch: {
      Hallo: 'Ciao', Danke: 'Grazie', Bitte: 'Per favore', Ja: 'Sì', Nein: 'No', Entschuldigung: 'Scusa', 'Wie geht es dir?': 'Come stai?', 'Was kostet das?': 'Quanto costa?', 'Wo ist die Toilette?': 'Dov’è il bagno?', 'Ich brauche Hilfe': 'Ho bisogno di aiuto',
      Bahnhof: 'Stazione', Flughafen: 'Aeroporto', Wasser: 'Acqua', Essen: 'Cibo', Hotel: 'Hotel', Strand: 'Spiaggia', Museum: 'Museo', Arzt: 'Medico', Apotheke: 'Farmacia', Rechnung: 'Conto', Taxi: 'Taxi', Eingang: 'Entrata', Ausgang: 'Uscita', Heute: 'Oggi', Morgen: 'Domani', Links: 'Sinistra', Rechts: 'Destra', Karte: 'Mappa', Ticket: 'Biglietto', Notfall: 'Emergenza'
    },
    Deutsch: {
      Hallo: 'Hallo', Danke: 'Danke', Bitte: 'Bitte', Ja: 'Ja', Nein: 'Nein', Entschuldigung: 'Entschuldigung', 'Wie geht es dir?': 'Wie geht es dir?', 'Was kostet das?': 'Was kostet das?', 'Wo ist die Toilette?': 'Wo ist die Toilette?', 'Ich brauche Hilfe': 'Ich brauche Hilfe',
      Bahnhof: 'Bahnhof', Flughafen: 'Flughafen', Wasser: 'Wasser', Essen: 'Essen', Hotel: 'Hotel', Strand: 'Strand', Museum: 'Museum', Arzt: 'Arzt', Apotheke: 'Apotheke', Rechnung: 'Rechnung', Taxi: 'Taxi', Eingang: 'Eingang', Ausgang: 'Ausgang', Heute: 'Heute', Morgen: 'Morgen', Links: 'Links', Rechts: 'Rechts', Karte: 'Karte', Ticket: 'Ticket', Notfall: 'Notfall'
    }
  };
  const normalized = /spanisch|spanish/i.test(language) ? 'Spanisch'
    : /franz|french/i.test(language) ? 'Französisch'
    : /ital|italian/i.test(language) ? 'Italienisch'
    : /deutsch|german/i.test(language) ? 'Deutsch'
    : 'Englisch';
  const dict = dictionaries[normalized];
  return {
    language: normalized,
    items: [...base, ...randomWords].map((german) => ({ german, translated: dict[german] || german }))
  };
}

async function generateCityInfo(city, tripType, durationDays, profile) {
  const fallback = {
    cultureInfo: `${city.name} eignet sich fuer ${tripType}. Plane vormittags die wichtigsten Sehenswuerdigkeiten und nachmittags entspannte Viertel, Maerkte oder Aussichtspunkte. ${profile?.country ? `${city.name} liegt in ${profile.country}. Dort sind Sprache, Essen, Alltag und Architektur stark von der regionalen Geschichte geprägt.` : ''}`,
    behaviorTips: ['Wertsachen nah am Koerper tragen.', 'Tickets fuer beliebte Orte frueh buchen.', 'Oeffentliche Verkehrsmittel vorab pruefen.', 'In touristischen Bereichen auf Taschendiebe achten.'],
    funFacts: [`${city.name} laesst sich gut in ${durationDays} Tagen erkunden.`, 'Lokale Maerkte sind oft die beste Quelle fuer Essen und Alltagskultur.', 'Fruehe Startzeiten vermeiden Warteschlangen.'],
    destinationDetails: {
      culture: `${city.name} verbindet Alltagsleben, Geschichte und lokale Küche. Besonders spannend sind Märkte, Altstadtbereiche und Viertel abseits der Hauptstraßen.`,
      religion: 'Je nach Land und Region unterschiedlich; vor Ort lohnt sich ein respektvoller Umgang mit Kirchen, Moscheen, Synagogen, Tempeln und religiösen Feiertagen.',
      travelNote: `${durationDays} Tage reichen gut, um die wichtigsten Orte zu sehen und trotzdem Pausen einzuplanen.`
    }
  };
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: `Erstelle Reise-Zusatzinfos fuer ${city.name}, ${durationDays} Tage, Typ ${tripType}. Landinfos: ${JSON.stringify(profile || {})}. Antworte nur als JSON mit cultureInfo string, behaviorTips array, funFacts array und destinationDetails object mit culture, religion, travelNote.`
      })
    });
    if (!response.ok) throw new Error('AI request failed');
    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text).join('\n');
    return JSON.parse(text);
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

async function buildTripPlan({ city, durationDays, tripType }) {
  const place = await geocodeCity(city);
  const profile = await countryProfile(countryFromDisplayName(place.displayName));
  const fetched = await cityPlaces(place, tripType).catch(() => []);
  const places = fetched.length >= 6 ? fetched : await fallbackPlaces(place, tripType);
  const ordered = orderedByDistance({ lat: place.lat, lng: place.lng }, places);
  const days = Array.from({ length: durationDays }, (_, index) => ({
    day: index + 1,
    title: `Tag ${index + 1}`,
    activities: ordered.slice(index * 4, index * 4 + 4)
  }));
  for (let index = 0; index < days.length; index += 1) {
    if (days[index].activities.length < 3) {
      days[index].activities = ordered.slice(0, 4).map((activity, offset) => ({
        ...activity,
        name: offset === 0 ? `${activity.name} erneut vertiefen` : activity.name
      })).slice(0, 3);
    }
  }
  const info = await generateCityInfo(place, tripType, durationDays, profile);
  return {
    city: place.name,
    displayName: place.displayName,
    durationDays,
    tripType,
    coordinates: { lat: place.lat, lng: place.lng },
    days,
    hotels: await buildHotels(place, tripType),
    countryProfile: profile,
    translations: translationGuide(profile?.primaryLanguage, place.name),
    ...info
  };
}

function newsCategoryLabel(category = 'all') {
  return {
    all: 'Alle',
    inland: 'Inland',
    ausland: 'Ausland',
    sport: 'Sport',
    aktien: 'Aktien',
    wirtschaft: 'Wirtschaft',
    politik: 'Politik',
    kultur: 'Kultur',
    technik: 'Technik'
  }[category] || 'Alle';
}

function fallbackNews(scope = 'at', type = 'articles', category = 'all') {
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
    category: newsCategoryLabel(category),
    type,
    description,
    imageUrl,
    publishedAt: new Date().toISOString()
  }));
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function newsImage(scope, title) {
  const label = scope === 'at' ? 'Österreich' : scope === 'de' ? 'Deutschland' : scope === 'us' ? 'Amerika' : 'Weltweit';
  return placeholderImage(label, title || 'Nachrichten');
}

function imageFromFeedItem(item, scope) {
  return item.enclosure?.url
    || item.mediaContent?.$?.url
    || item.mediaThumbnail?.$?.url
    || newsImage(scope, item.title);
}

function newsSearchQuery(scope, category, query = '') {
  const places = { at: 'Österreich', de: 'Deutschland', us: 'USA', world: 'Welt' };
  const place = places[scope] || 'Österreich';
  if (query.trim()) return `${query.trim()} ${place} Nachrichten`;
  const queries = {
    inland: `${place} Inland aktuelle Nachrichten`,
    ausland: `${place} Ausland internationale Nachrichten`,
    sport: `${place} Sport Nachrichten`,
    aktien: `${place} Aktien Börse Finanzen`,
    wirtschaft: `${place} Wirtschaft Nachrichten`,
    politik: `${place} Politik Nachrichten`,
    kultur: `${place} Kultur Nachrichten`,
    technik: `${place} Technik Nachrichten`
  };
  return queries[category] || `${place} Nachrichten`;
}

function periodStart(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'yesterday') {
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(now.getDate() - 7);
  if (period === 'month') start.setMonth(now.getMonth() - 1);
  return { start, end: now };
}

function filterNewsPeriod(items, period) {
  const { start, end } = periodStart(period);
  return items.filter((item) => {
    if (!item.publishedAt) return period !== 'today' && period !== 'yesterday';
    const published = new Date(item.publishedAt);
    return published >= start && published <= end;
  });
}

async function rssNews(scope, category = 'all', period = 'today', query = '') {
  const sources = {
    at: [
      { source: 'ORF', url: 'https://rss.orf.at/news.xml' },
      { source: 'ORF Österreich', url: 'https://rss.orf.at/oesterreich.xml' }
    ],
    de: [
      { source: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/' }
    ],
    us: [
      { source: 'Google News DE/USA', url: 'https://news.google.com/rss/search?q=USA&hl=de&gl=DE&ceid=DE:de' }
    ],
    world: [
      { source: 'Tagesschau Welt', url: 'https://www.tagesschau.de/xml/rss2/' },
      { source: 'Google News Welt', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=de&gl=DE&ceid=DE:de' }
    ]
  };
  if (category !== 'all' || query.trim()) {
    sources[scope] = [
      { source: 'Google News', url: `https://news.google.com/rss/search?q=${encodeURIComponent(newsSearchQuery(scope, category, query))}&hl=de&gl=DE&ceid=DE:de` }
    ];
  }

  const feeds = await Promise.allSettled((sources[scope] || sources.de).map(async (source) => {
    const feed = await rssParser.parseURL(source.url);
    return (feed.items || []).slice(0, 12).map((item) => ({
      title: item.title || 'Nachricht',
      url: item.link,
      source: source.source,
      category: newsCategoryLabel(category),
      type: 'articles',
      description: stripHtml(item.contentSnippet || item.summary || item.content || item.contentEncoded || 'Keine Kurzbeschreibung vorhanden.'),
      imageUrl: imageFromFeedItem(item, scope),
      publishedAt: item.isoDate || item.pubDate || null
    }));
  }));

  return feeds
    .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((item, index, all) => item.url && all.findIndex((other) => other.url === item.url) === index)
    .filter((item) => category === 'all' || item.title || item.description)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .filter((item) => filterNewsPeriod([item], period).length)
    .slice(0, 20);
}

async function audioNews(scope, category = 'all', period = 'today', query = '') {
  const feeds = [
    { source: 'tagesschau Audio', category: 'Alle', url: 'https://www.tagesschau.de/multimedia/sendung/tagesschau_20_uhr/podcast-ts2000-audio-100~podcast.xml' },
    { source: 'Deutschlandfunk Nachrichten', category: 'Alle', url: 'https://www.deutschlandfunk.de/nachrichten-108.xml' },
    { source: 'Deutschlandfunk Sport', category: 'Sport', url: 'https://www.deutschlandfunk.de/sport-aktuell-podcast-100.xml' },
    { source: 'Deutschlandfunk Technik', category: 'Technik', url: 'https://www.deutschlandfunk.de/computer-und-kommunikation-102.xml' },
    { source: 'Deutschlandfunk Kultur', category: 'Kultur', url: 'https://www.deutschlandfunk.de/kultur-heute-104.xml' },
    { source: 'Deutschlandfunk Wirtschaft', category: 'Wirtschaft', url: 'https://www.deutschlandfunk.de/wirtschaft-und-gesellschaft-104.xml' }
  ];
  const selectedFeeds = feeds.filter((feed) => category === 'all' || feed.category === newsCategoryLabel(category) || feed.category === 'Alle');
  const parsed = await Promise.allSettled(selectedFeeds.map(async (feedSource) => {
    const feed = await rssParser.parseURL(feedSource.url);
    return (feed.items || []).slice(0, 12).map((item) => {
      const audioUrl = item.enclosure?.url || item.enclosure?.link || null;
      return {
        title: item.title || 'Audio-Nachricht',
        url: audioUrl || item.link || feedSource.url,
        audioUrl,
        source: feedSource.source,
        category: feedSource.category,
        type: 'audio',
        description: stripHtml(item.contentSnippet || item.summary || item.content || 'Keine Kurzbeschreibung vorhanden.'),
        imageUrl: imageFromFeedItem(item, scope),
        publishedAt: item.isoDate || item.pubDate || null
      };
    });
  }));
  const normalizedQuery = query.trim().toLowerCase();
  return parsed
    .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((item) => item.audioUrl)
    .filter((item) => !normalizedQuery || `${item.title} ${item.description}`.toLowerCase().includes(normalizedQuery))
    .filter((item) => filterNewsPeriod([item], period).length)
    .filter((item, index, all) => all.findIndex((other) => other.audioUrl === item.audioUrl) === index)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 20);
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

async function tmdbKeywordId(keyword) {
  if (!keyword || !process.env.TMDB_API_KEY) return null;
  const url = new URL('https://api.themoviedb.org/3/search/keyword');
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  url.searchParams.set('query', keyword);
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  return data.results?.[0]?.id || null;
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

async function tmdbMovieDetails(movie) {
  const detailsUrl = new URL(`https://api.themoviedb.org/3/movie/${movie.id}`);
  detailsUrl.searchParams.set('language', 'de-DE');
  detailsUrl.searchParams.set('api_key', process.env.TMDB_API_KEY);
  detailsUrl.searchParams.set('append_to_response', 'credits,videos');
  const response = await fetch(detailsUrl);
  if (!response.ok) return null;
  const details = await response.json();
  const trailer = (details.videos?.results || []).find((video) => video.site === 'YouTube' && /Trailer/i.test(video.type));
  const directors = (details.credits?.crew || []).filter((person) => person.job === 'Director').map((person) => person.name);
  return {
    source: 'tmdb',
    externalId: String(details.id || movie.id),
    mediaType: 'movie',
    title: details.title || movie.title,
    imageUrl: details.poster_path ? `https://image.tmdb.org/t/p/w342${details.poster_path}` : movie.imageUrl || null,
    description: details.overview || movie.overview || movie.description,
    releaseYear: (details.release_date || movie.release_date || '').slice(0, 4) || null,
    releaseDate: details.release_date || movie.releaseDate || null,
    genres: (details.genres || []).map((genre) => genre.name).join(', ') || movie.genres || '',
    actors: (details.credits?.cast || []).slice(0, 10).map((actor) => actor.name).join(', '),
    director: directors.join(', '),
    countries: (details.production_countries || []).map((country) => country.name).join(', '),
    runtime: details.runtime || null,
    originalLanguage: details.original_language || null,
    budget: details.budget || null,
    revenue: details.revenue || null,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    rating: typeof details.vote_average === 'number' ? details.vote_average : movie.rating || null,
    popularity: typeof details.popularity === 'number' ? details.popularity : movie.popularity || null,
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

app.get('/api/backups', auth, (_req, res) => {
  const dbPath = sqlitePath();
  if (!dbPath) return res.json([]);
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  if (!fs.existsSync(backupDir)) return res.json([]);
  const items = fs.readdirSync(backupDir)
    .filter((name) => name.endsWith('.bak') || name.includes('.db-'))
    .map((name) => {
      const file = path.join(backupDir, name);
      const stat = fs.statSync(file);
      return { name, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

app.get('/api/backups/:name/download', auth, (req, res) => {
  const dbPath = sqlitePath();
  if (!dbPath) return res.status(404).json({ error: 'No sqlite database configured' });
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  const safeName = path.basename(req.params.name);
  const file = path.join(backupDir, safeName);
  if (!file.startsWith(backupDir) || !fs.existsSync(file)) return res.status(404).json({ error: 'Backup not found' });
  res.download(file, safeName);
});

app.post('/api/auth/login', async (req, res) => {
  const { username, email, password } = req.body;
  const login = username || email;
  const user = await prisma.user.findUnique({ where: { email: login } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid login' });
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
    prisma.loginEvent.create({
      data: {
        userId: user.id,
        username: user.email,
        ip: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        createdAt: now
      }
    })
  ]);
  res.json({ token: signUser(user), user: { id: user.id, username: user.email } });
});

app.get('/api/users', auth, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, email: true, createdAt: true, lastLoginAt: true }
  });
  res.json(users);
});

app.get('/api/login-events', auth, async (_req, res) => {
  const events = await prisma.loginEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, username: true, ip: true, userAgent: true, createdAt: true }
  });
  res.json(events);
});

app.post('/api/users', auth, async (req, res) => {
  const username = String(req.body.username || req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (!username || password.length < 4) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = await prisma.user.create({
    data: {
      email: username,
      passwordHash: await bcrypt.hash(password, 10)
    },
    select: { id: true, email: true, createdAt: true, lastLoginAt: true }
  });
  res.status(201).json(user);
});

app.put('/api/users/:id', auth, async (req, res) => {
  const data = {};
  const username = String(req.body.username || req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (username) data.email = username;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data,
    select: { id: true, email: true, createdAt: true, lastLoginAt: true }
  });
  res.json(user);
});

app.delete('/api/users/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (id === Number(req.user.sub)) return res.status(400).json({ error: 'Cannot delete current user' });
  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

app.get('/api/export', auth, async (_req, res) => {
  const [finance, tasks, gifts, shopping, mediaFavorites, newsBookmarks, trips, invoices] = await Promise.all([
    prisma.financeEntry.findMany({ orderBy: { id: 'asc' } }),
    prisma.task.findMany({ orderBy: { id: 'asc' } }),
    prisma.giftIdea.findMany({ orderBy: { id: 'asc' } }),
    prisma.shoppingItem.findMany({ orderBy: { id: 'asc' } }),
    prisma.favoriteMedia.findMany({ orderBy: { id: 'asc' } }),
    prisma.newsBookmark.findMany({ orderBy: { id: 'asc' } }),
    prisma.trip.findMany({ orderBy: { id: 'asc' }, include: { hotels: true, attractions: true } }),
    prisma.invoice.findMany({ orderBy: { id: 'asc' } })
  ]);
  const invoicesWithFiles = invoices.map((invoice) => {
    const filePath = path.join(uploadDir, invoice.fileName);
    return {
      ...invoice,
      fileData: fs.existsSync(filePath) ? fs.readFileSync(filePath).toString('base64') : null
    };
  });
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { finance, tasks, gifts, shopping, mediaFavorites, newsBookmarks, trips, invoices: invoicesWithFiles }
  });
});

app.post('/api/import', auth, async (req, res) => {
  const payload = req.body?.data || req.body;
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid import file' });
  const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];

  await prisma.$transaction(async (tx) => {
    await tx.invoice.deleteMany();
    await tx.tripAttraction.deleteMany();
    await tx.tripHotel.deleteMany();
    await tx.trip.deleteMany();
    await tx.newsBookmark.deleteMany();
    await tx.favoriteMedia.deleteMany();
    await tx.shoppingItem.deleteMany();
    await tx.giftIdea.deleteMany();
    await tx.task.deleteMany();
    await tx.financeEntry.deleteMany();

    for (const item of payload.finance || []) await tx.financeEntry.create({ data: { ...cleanRecord(item), date: parseDate(item.date) || new Date() } });
    for (const item of payload.tasks || []) await tx.task.create({ data: { ...cleanRecord(item), dueDate: parseDate(item.dueDate) } });
    for (const item of payload.gifts || []) await tx.giftIdea.create({ data: cleanRecord(item) });
    for (const item of payload.shopping || []) await tx.shoppingItem.create({ data: cleanRecord(item) });
    for (const item of payload.mediaFavorites || []) await tx.favoriteMedia.create({ data: cleanRecord(item) });
    for (const item of payload.newsBookmarks || []) await tx.newsBookmark.create({ data: { ...cleanRecord(item), publishedAt: parseDate(item.publishedAt) } });
    for (const trip of payload.trips || []) {
      await tx.trip.create({
        data: {
          ...cleanRecord(trip, ['id', 'createdAt', 'hotels', 'attractions', 'plan']),
          startDate: parseDate(trip.startDate) || new Date(),
          endDate: parseDate(trip.endDate) || new Date(),
          hotels: { create: (trip.hotels || []).map((hotel) => cleanRecord(hotel, ['id', 'tripId'])) },
          attractions: { create: (trip.attractions || []).map((attraction) => cleanRecord(attraction, ['id', 'tripId'])) }
        }
      });
    }
    for (const invoice of invoices) {
      await tx.invoice.create({
        data: {
          ...cleanRecord(invoice, ['id', 'createdAt', 'fileData']),
          invoiceDate: parseDate(invoice.invoiceDate) || new Date()
        }
      });
    }
  });

  fs.mkdirSync(uploadDir, { recursive: true });
  for (const invoice of invoices) {
    if (!invoice.fileData || !invoice.fileName) continue;
    fs.writeFileSync(path.join(uploadDir, invoice.fileName), Buffer.from(invoice.fileData, 'base64'));
  }

  res.json({ ok: true });
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

const marketCacheFile = path.join(uploadDir, 'market-cache.json');
const marketFallbackValues = {
  gold: 2320,
  silver: 29,
  oil: 78,
  copper: 4.4,
  btc: 65000,
  eth: 3200,
  hbar: 0.08,
  nasdaq: 74,
  us100: 430,
  dax: 31,
  sp500: 510
};
const marketCache = { at: 0, data: null };
const marketAssets = [
  { id: 'gold', name: 'Gold', type: 'fx', from: 'XAU', to: 'USD', unit: 'USD/oz' },
  { id: 'silver', name: 'Silver', type: 'fx', from: 'XAG', to: 'USD', unit: 'USD/oz' },
  { id: 'oil', name: 'Oil', type: 'commodity', function: 'WTI', unit: 'USD/Barrel' },
  { id: 'copper', name: 'Kupfer', type: 'commodity', function: 'COPPER', unit: 'USD/lb' },
  { id: 'btc', name: 'BTC', type: 'fx', from: 'BTC', to: 'USD', unit: 'USD' },
  { id: 'eth', name: 'ETH', type: 'fx', from: 'ETH', to: 'USD', unit: 'USD' },
  { id: 'hbar', name: 'HBAR', type: 'fx', from: 'HBAR', to: 'USD', unit: 'USD' },
  { id: 'nasdaq', name: 'NASDAQ', type: 'quote', symbol: 'ONEQ', unit: 'USD', note: 'Proxy: ONEQ ETF' },
  { id: 'us100', name: 'US100', type: 'quote', symbol: 'QQQ', unit: 'USD', note: 'Proxy: QQQ ETF' },
  { id: 'dax', name: 'DAX', type: 'quote', symbol: 'DAX', unit: 'USD', note: 'Proxy: DAX ETF' },
  { id: 'sp500', name: 'S&P500', type: 'quote', symbol: 'SPY', unit: 'USD', note: 'Proxy: SPY ETF' }
];

function readMarketCache() {
  if (marketCache.data) return marketCache;
  try {
    if (!fs.existsSync(marketCacheFile)) return marketCache;
    const saved = JSON.parse(fs.readFileSync(marketCacheFile, 'utf8'));
    marketCache.at = saved.at || 0;
    marketCache.data = saved.data || null;
  } catch {
    marketCache.at = 0;
    marketCache.data = null;
  }
  return marketCache;
}

function writeMarketCache(data) {
  marketCache.at = Date.now();
  marketCache.data = data;
  fs.mkdirSync(path.dirname(marketCacheFile), { recursive: true });
  fs.writeFileSync(marketCacheFile, JSON.stringify({ at: marketCache.at, data }, null, 2));
}

function fallbackMarketData(status = 'Alpha Vantage Tageslimit erreicht oder noch kein Cache vorhanden.') {
  return marketAssets.map((asset) => ({
    ...asset,
    value: marketFallbackValues[asset.id] || null,
    changePercent: null,
    updatedAt: null,
    source: 'Fallback',
    status
  }));
}

async function alphaRequest(params) {
  const url = new URL('https://www.alphavantage.co/query');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('apikey', process.env.ALPHAVANTAGE_API_KEY || '');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Alpha Vantage request failed');
  const data = await response.json();
  if (data.Note || data.Information) throw new Error(data.Note || data.Information);
  return data;
}

async function marketAsset(asset) {
  if (!process.env.ALPHAVANTAGE_API_KEY) return { ...asset, value: null, changePercent: null, status: 'ALPHAVANTAGE_API_KEY fehlt' };
  try {
    if (asset.type === 'fx') {
      const data = await alphaRequest({ function: 'CURRENCY_EXCHANGE_RATE', from_currency: asset.from, to_currency: asset.to });
      const rate = data['Realtime Currency Exchange Rate'] || {};
      return {
        ...asset,
        value: Number(rate['5. Exchange Rate']),
        changePercent: null,
        updatedAt: rate['6. Last Refreshed'] || null,
        source: 'Alpha Vantage'
      };
    }
    if (asset.type === 'commodity') {
      const data = await alphaRequest({ function: asset.function, interval: 'daily' });
      const latest = (data.data || []).find((entry) => entry.value && entry.value !== '.');
      const previous = (data.data || []).filter((entry) => entry.value && entry.value !== '.')[1];
      const value = latest ? Number(latest.value) : null;
      const previousValue = previous ? Number(previous.value) : null;
      return {
        ...asset,
        value,
        changePercent: value != null && previousValue ? ((value - previousValue) / previousValue) * 100 : null,
        updatedAt: latest?.date || null,
        source: 'Alpha Vantage'
      };
    }
    const data = await alphaRequest({ function: 'GLOBAL_QUOTE', symbol: asset.symbol });
    const quote = data['Global Quote'] || {};
    return {
      ...asset,
      value: Number(quote['05. price']),
      changePercent: quote['10. change percent'] ? Number(String(quote['10. change percent']).replace('%', '')) : null,
      updatedAt: quote['07. latest trading day'] || null,
      source: 'Alpha Vantage'
    };
  } catch (error) {
    return { ...asset, value: null, changePercent: null, status: error.message, source: 'Alpha Vantage' };
  }
}

app.get('/api/markets', auth, async (_req, res) => {
  const now = Date.now();
  const saved = readMarketCache();
  if (saved.data && now - saved.at < 24 * 60 * 60 * 1000) {
    return res.json(saved.data.map((item) => ({ ...item, cached: true })));
  }
  if (!process.env.ALPHAVANTAGE_API_KEY) return res.json(saved.data || fallbackMarketData('ALPHAVANTAGE_API_KEY fehlt'));

  const data = [];
  for (const asset of marketAssets) {
    const item = await marketAsset(asset);
    if (/rate limit|premium|25 requests|Thank you for using Alpha Vantage/i.test(item.status || '')) {
      return res.json(saved.data || fallbackMarketData(item.status));
    }
    data.push(item);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  writeMarketCache(data);
  res.json(data);
});

crudRoutes('tasks', 'task', (body) => ({
  title: body.title,
  category: body.category || 'Allgemein',
  priority: body.priority || 'mittel',
  dueDate: body.dueDate ? parseDate(body.dueDate) : null,
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
  director: body.director || null,
  countries: Array.isArray(body.countries) ? body.countries.join(', ') : body.countries || null,
  runtime: body.runtime === '' || body.runtime == null ? null : Number(body.runtime),
  originalLanguage: body.originalLanguage || null,
  budget: body.budget === '' || body.budget == null ? null : Number(body.budget),
  revenue: body.revenue === '' || body.revenue == null ? null : Number(body.revenue),
  trailerUrl: body.trailerUrl || null,
  rating: body.rating === '' || body.rating == null ? null : Number(body.rating),
  popularity: body.popularity === '' || body.popularity == null ? null : Number(body.popularity),
  releaseDate: body.releaseDate || null,
  watched: Boolean(body.watched),
  audience: body.audience || 'Für mich',
  personalRating: body.personalRating || null
}));

crudRoutes('news/bookmarks', 'newsBookmark', (body) => ({
  title: body.title,
  url: body.url,
  source: body.source || null,
  category: body.category || null,
  type: body.type || 'articles',
  description: body.description || null,
  imageUrl: body.imageUrl || null,
  audioUrl: body.audioUrl || null,
  publishedAt: parseDate(body.publishedAt)
}));

function mapTrip(body, replaceNested = false) {
  return {
    destination: body.destination,
    startDate: parseDate(body.startDate) || new Date(),
    endDate: parseDate(body.endDate) || new Date(),
    durationDays: body.durationDays == null ? null : Number(body.durationDays),
    tripType: body.tripType || null,
    notes: body.notes || null,
    planJson: body.planJson ? JSON.stringify(body.planJson) : undefined,
    hotels: body.hotels ? (replaceNested ? { deleteMany: {}, create: body.hotels } : { create: body.hotels }) : undefined,
    attractions: body.attractions ? (replaceNested ? { deleteMany: {}, create: body.attractions } : { create: body.attractions }) : undefined
  };
}

app.get('/api/trips', auth, async (_req, res) => {
  const items = await prisma.trip.findMany({ orderBy: { id: 'desc' }, include: { hotels: true, attractions: true } });
  res.json(items.map((item) => ({ ...item, plan: item.planJson ? JSON.parse(item.planJson) : null })));
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

async function handleGenerateTrip(req, res) {
  const city = String(req.body.city || '').trim();
  const durationDays = Math.max(1, Math.min(21, Number(req.body.durationDays || 7)));
  const tripType = req.body.tripType || 'Gemischt';
  if (!city) return res.status(400).json({ error: 'Missing city' });

  const plan = await buildTripPlan({ city, durationDays, tripType });
  if (req.body.save !== false) {
    const startDate = parseDate(req.body.startDate) || new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays - 1);
    const saved = await prisma.trip.create({
      data: {
        destination: plan.city,
        startDate,
        endDate,
        durationDays,
        tripType,
        notes: plan.cultureInfo,
        planJson: JSON.stringify(plan)
      }
    });
    return res.status(201).json({ ...plan, savedTripId: saved.id });
  }
  res.json(plan);
}

app.post('/api/generate-trip', auth, handleGenerateTrip);
app.post('/generate-trip', auth, handleGenerateTrip);

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
          const directors = (details.credits?.crew || []).filter((person) => person.job === 'Director').map((person) => person.name);
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
            director: directors.join(', '),
            countries: (details.production_countries || []).map((country) => country.name).join(', '),
            runtime: details.runtime || null,
            originalLanguage: details.original_language || null,
            budget: details.budget || null,
            revenue: details.revenue || null,
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
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 30)));
    const genreId = String(req.query.genreId || '');
    const keyword = String(req.query.keyword || '');
    const keywordId = await tmdbKeywordId(keyword);
    const year = mode === 'previous' ? now.getFullYear() - 1 : now.getFullYear();
    const genres = await tmdbGenres();
    const results = [];
    const pages = Math.ceil(limit / 20);

    for (let page = 1; page <= pages; page += 1) {
      const url = new URL('https://api.themoviedb.org/3/discover/movie');
      url.searchParams.set('language', 'de-DE');
      url.searchParams.set('api_key', process.env.TMDB_API_KEY);
      url.searchParams.set('include_adult', 'false');
      url.searchParams.set('page', String(page));
      url.searchParams.set('vote_count.gte', sort === 'rating' ? '50' : '10');
      url.searchParams.set('sort_by', mode === 'future' ? 'primary_release_date.asc' : movieSort(sort));
      if (genreId) url.searchParams.set('with_genres', genreId);
      if (keywordId) url.searchParams.set('with_keywords', String(keywordId));

      if (mode === 'future') {
        const start = now.toISOString().slice(0, 10);
        const end = new Date(now);
        end.setMonth(end.getMonth() + 12);
        url.searchParams.set('primary_release_date.gte', start);
        url.searchParams.set('primary_release_date.lte', end.toISOString().slice(0, 10));
      } else {
        url.searchParams.set('primary_release_year', String(year));
      }

      if (region === 'AT' || region === 'US') {
        url.searchParams.set('region', region);
        url.searchParams.set('with_release_type', '2|3');
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('TMDB discover failed');
      const data = await response.json();
      const mapped = (data.results || []).map((movie) => mapMovie(movie, genres));
      const detailed = await Promise.all(mapped.map(async (movie) => {
        const detail = await tmdbMovieDetails({ id: movie.externalId, ...movie }).catch(() => null);
        return detail || movie;
      }));
      results.push(...detailed);
    }

    res.json(results.slice(0, limit));
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

app.get('/api/news', auth, async (req, res) => {
  const scope = String(req.query.scope || 'at');
  const type = String(req.query.type || 'articles');
  const category = String(req.query.category || 'all');
  const period = String(req.query.period || 'today');
  const query = String(req.query.q || '').trim();
  const countries = { at: 'at', de: 'de', us: 'us' };
  if (type === 'audio') {
    try {
      const audioItems = await audioNews(scope, category, period, query);
      if (audioItems.length) return res.json(audioItems);
    } catch (error) {
      console.error(error);
    }
    return res.json(fallbackNews(scope, type, category));
  }

  try {
    const rssItems = await rssNews(scope, category, period, query);
    if (rssItems.length) return res.json(rssItems);
  } catch (error) {
    console.error(error);
  }

  if (process.env.NEWS_API_KEY) {
    try {
      const url = new URL('https://newsapi.org/v2/top-headlines');
      if (scope === 'world') {
        url.searchParams.set('language', 'de');
      } else {
        url.searchParams.set('country', countries[scope] || 'at');
      }
      if (category === 'sport') url.searchParams.set('category', 'sports');
      if (category === 'wirtschaft' || category === 'aktien') url.searchParams.set('category', 'business');
      if (query) url.searchParams.set('q', query);
      url.searchParams.set('apiKey', process.env.NEWS_API_KEY);
      const response = await fetch(url);
      if (!response.ok) throw new Error('NewsAPI request failed');
      const data = await response.json();
      const articles = (data.articles || []).map((article) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name,
        category: newsCategoryLabel(category),
        type: 'articles',
        description: article.description,
        imageUrl: article.urlToImage,
        publishedAt: article.publishedAt || null
      }));
      const filtered = filterNewsPeriod(articles, period);
      if (filtered.length) return res.json(filtered);
    } catch (error) {
      console.error(error);
    }
  }
  res.json(fallbackNews(scope, type, category));
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
    res.json({ label: process.env.WEATHER_LABEL || 'Linz, Oberoesterreich', source: 'Open-Meteo', daily: data.daily });
  } catch (error) {
    console.error(error);
    res.json({ label: `${process.env.WEATHER_LABEL || 'Linz, Oberoesterreich'} (Fallback)`, daily: fallbackWeatherDaily() });
  }
});

app.get('/api/traffic', auth, async (_req, res) => {
  const feedUrl = process.env.TRAFFIC_RSS_URL || 'https://www.oeamtc.at/feeds/verkehr/';
  try {
    const feed = await rssParser.parseURL(feedUrl);
    const items = feed.items
      .filter((item) => /A1|Oberoesterreich|Oberösterreich|Upper Austria|Linz|Wels|Enns|St\.? Florian|Sattledt/i.test(`${item.title} ${item.contentSnippet}`))
      .slice(0, 8)
      .map((item) => ({ title: item.title, link: item.link, content: item.contentSnippet }));
    res.json(items.length ? items : [{ title: 'A1 Oberösterreich', link: 'https://www.asfinag.at/verkehr-sicherheit/', content: 'Aktuell keine passenden A1-Meldungen im Feed.' }]);
  } catch (error) {
    console.error(error);
    res.json([{ title: 'A1 Oberösterreich', link: 'https://www.asfinag.at/verkehr-sicherheit/', content: 'Verkehrsfeed konnte gerade nicht geladen werden.' }]);
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
