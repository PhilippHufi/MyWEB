# MyWEB Life Dashboard

Modernes privates Life-Dashboard mit React, Vite, TailwindCSS, Express, Prisma/SQLite und Railway Deployment.

## Features

- Wetter via OpenWeatherMap mit Auto-Refresh-fähigem Backend-Proxy
- Google Calendar OAuth, Terminliste und Termin-Erstellung
- Trello Boards, Listen und offene Tasks
- Musik-Suche und Player via Audius oder Jamendo
- Film-Suche via TMDB
- Tageszitat via Quotable
- Zufallswitz via Official Joke API
- KI-Assistent über OpenAI Responses API
- Optionaler KI-Assistent-Fallback über DeepSeek-kompatible Chat API
- Dark Mode, Glassmorphism/Cyberpunk UI, Framer Motion Animationen
- Verschiebbare Widgets mit lokaler Speicherung

## Setup

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
cp backend/.env.example backend/.env
```

Trage deine echten Keys in `backend/.env` ein. Sensible Keys gehören nicht ins Frontend und nicht ins Repository.

## Entwicklung

```bash
npm run dev
```

## Produktion

```bash
npm run build --prefix frontend
npm run start:prod --prefix backend
```

Für Railway:

- Volume auf `/data` mounten
- `DATABASE_URL=file:/data/prod.db`
- `APP_BASE_URL=https://deine-domain`
- alle API-Keys als Railway Variables setzen

## Receipt Scanner / Rechnungen

Der Rechnungsbereich nutzt jetzt Browser-OCR mit Tesseract.js und speichert gescannte Rechnungen ueber einen Cloudflare Worker in Cloudflare KV. Das Foto wird als Data-URL zusammen mit Datum, Betrag, Rohtext und Zeitstempel gespeichert, damit es spaeter wieder in der Webseite geoeffnet werden kann.

Cloudflare Worker einrichten:

```bash
cd cloudflare-worker
npx wrangler kv namespace create INVOICES
npx wrangler kv namespace create INVOICES --preview
```

Die beiden IDs in `cloudflare-worker/wrangler.toml` eintragen und deployen:

```bash
npx wrangler deploy
```

Danach die Worker-URL im Frontend als `VITE_INVOICE_API_URL` setzen oder direkt im Rechnungsbereich der Webseite speichern.

## Projektgedächtnis

Wichtige Hosting- und Wiederaufbau-Infos stehen in `PROJECT_MEMORY.md`.

Full-stack private dashboard with React, Tailwind CSS, Express, Prisma and SQLite.

## Features

- Dashboard overview for tasks, finances, trips, weekly weather and A1 traffic notes
- Finance tracker with income, expenses, categories, monthly summary and simple charts
- To-do list with categories, priority, due dates and completion state
- Gift ideas
- Movies and music search/favorites
- News page with categories
- Travel planner with hotels and attractions
- Simple login
- Local storage fallback in the frontend when the backend is unavailable

## Setup

```bash
npm run install:all
copy backend\.env.example backend\.env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api/health

For production-style local use:

```bash
npm run build
npm run start
```

Then open http://localhost:4000. Express serves the built React web app and the API from the same server.

Default login after seeding:

- Benutzer: `admin`
- Password: `dashboard123`

## API Keys

Edit `backend/.env`:

- `TMDB_API_KEY` for movie search
- `NEWS_API_KEY` for NewsAPI fallback
- `TRAFFIC_RSS_URL` for an RSS feed with A1 Upper Austria traffic reports

Without keys, the app still runs and uses local/manual fallback data where possible.
