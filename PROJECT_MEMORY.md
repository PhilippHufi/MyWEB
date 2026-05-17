# MyWEB Projektgedaechtnis

Diese Datei dokumentiert die wichtigsten Entscheidungen und den Wiederaufbau der privaten Life-Dashboard-Webseite. Sensible API-Keys werden bewusst nicht im Klartext dokumentiert, weil diese Datei ins Repository gelangen kann. Die echten Werte liegen lokal in `backend/.env` und in Railway als Environment Variables.

## Hosting

- Aktuelles Zielhosting: Railway
- Railway-Projekt: `MyWEB`
- Railway-Service: `myweb-dashboard`
- Oeffentliche URL: `https://myweb-dashboard-production.up.railway.app`
- Persistentes Volume: `/data`
- Produktionsdatenbank: `file:/data/prod.db`

## Tech Stack

- Frontend: React + Vite
- Styling: TailwindCSS
- Animationen: Framer Motion
- Drag & Drop: dnd-kit
- Backend: Node.js + Express
- Datenbank: Prisma + SQLite
- Secrets: lokal in `backend/.env`, online in Railway Variables

## Wichtige Environment Variables

Diese Variablen muessen fuer den vollen Funktionsumfang gesetzt sein:

- `DATABASE_URL`
- `JWT_SECRET`
- `DEFAULT_USERNAME`
- `DEFAULT_USER_PASSWORD`
- `TMDB_API_KEY`
- `NEWS_API_KEY`
- `ALPHAVANTAGE_API_KEY`
- `TRAFFIC_RSS_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `OPENWEATHER_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`
- `JAMENDO_CLIENT_ID`
- `APP_BASE_URL`

## Chronik

- Render/alte Umgebung verlor Daten, weil persistenter Speicher nicht verlaesslich aktiv war.
- Railway-Projekt wurde erstellt.
- Railway-Service `myweb-dashboard` wurde angelegt.
- Railway-Volume wurde auf `/data` gemountet.
- Healthcheck `/api/health` wurde erfolgreich getestet.
- Login wurde erfolgreich getestet.
- Das neue Life-Dashboard wird modular aufgebaut mit `components/`, `widgets/`, `services/`, `hooks/`, `pages/` und `styles/`.
- Wichtige Produktregel: Bestehende Bereiche und Funktionen der alten Webseite duerfen nicht geloescht oder ersetzt werden, ohne Philipp vorher klar zu fragen. Neue Funktionen werden bevorzugt ergaenzt oder behutsam in bestehende Bereiche integriert.
- Nach dem Life-Dashboard-Umbau wurde die alte Webseite wiederhergestellt und der neue Bereich als eigener Navigationspunkt `Life` integriert.

## Wiederaufbau

1. Repository klonen.
2. `npm install`, `npm install --prefix backend`, `npm install --prefix frontend` ausfuehren.
3. `backend/.env` aus sicherer Quelle wiederherstellen.
4. Lokal starten: `npm run dev`.
5. Produktion: Dockerfile oder Railway Deployment nutzen.
6. Bei Railway ein Volume auf `/data` anhaengen und `DATABASE_URL=file:/data/prod.db` setzen.
