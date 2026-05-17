# MyWEB Projektgedächtnis

Diese Datei dokumentiert die wichtigsten Entscheidungen und den Wiederaufbau der privaten Life-Dashboard-Webseite. Sensible API-Keys werden bewusst nicht im Klartext dokumentiert, weil diese Datei ins Repository gelangen kann. Die echten Werte liegen lokal in `backend/.env` und in Railway als Environment Variables.

## Hosting

- Aktuelles Zielhosting: Railway
- Railway-Projekt: `MyWEB`
- Railway-Service: `myweb-dashboard`
- Öffentliche URL: `https://myweb-dashboard-production.up.railway.app`
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

Diese Variablen müssen für den vollen Funktionsumfang gesetzt sein:

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
- `VITE_INVOICE_API_URL` (Frontend-URL des Cloudflare Receipt Worker)

## Chronik

- Render/alte Umgebung verlor Daten, weil persistenter Speicher nicht verlässlich aktiv war.
- Railway-Projekt wurde erstellt.
- Railway-Service `myweb-dashboard` wurde angelegt.
- Railway-Volume wurde auf `/data` gemountet.
- Healthcheck `/api/health` wurde erfolgreich getestet.
- Login wurde erfolgreich getestet.
- Das neue Life-Dashboard wird modular aufgebaut mit `components/`, `widgets/`, `services/`, `hooks/`, `pages/` und `styles/`.
- Wichtige Produktregel: Bestehende Bereiche und Funktionen der alten Webseite dürfen nicht gelöscht oder ersetzt werden, ohne Philipp vorher klar zu fragen. Neue Funktionen werden bevorzugt ergänzt oder behutsam in bestehende Bereiche integriert.
- Nach dem Life-Dashboard-Umbau wurde die alte Webseite wiederhergestellt und der neue Bereich als eigener Navigationspunkt `Life` integriert.
- Der Rechnungsbereich wurde bewusst ersetzt: neue Rechnungen laufen über Browser-OCR mit Tesseract.js und einen Cloudflare Worker in `cloudflare-worker/`. Die Rechnung enthält `id`, `date`, `total`, `rawText`, `createdAt` sowie das Foto als `imageData`, damit es in der Webseite wieder geöffnet werden kann.
- Receipt Worker URL: `https://myweb-receipt-scanner.philipp-myweb.workers.dev`. Railway Variable: `VITE_INVOICE_API_URL`.
- Navigation `Buchhaltung`: enthält Rechnungen und Angebote. Rechnungen können automatisch per OCR oder manuell erfasst werden. Angebote können mit Datei und Kategorie abgelegt werden. Der Offline-HTML-Export erzeugt eine eigenständige HTML-Datei mit eingebetteten Dateien/Bildern.
- Es gibt einen Navigationspunkt `Bücher`. Das echte Scalping-Masterbuch liegt als statische HTML-Seite unter `frontend/public/books/scalping-masterbuch.html`, inklusive PDF und Screenshot-Assets aus `C:\Users\User\Desktop\projects\privat\Traiding\Scalping_Masterbuch`.
- Admin-Regel: `Philipp` ist Admin. Nur der Admin darf Benutzer und Login-Ereignisse verwalten; die Prüfung liegt serverseitig in `adminOnly`. Nicht-Admins sehen den Einstellungen-Tab nicht.
- Zitat und Joke stehen jetzt auf dem Haupt-Dashboard statt im `Life`-Bereich. Das globale UI wurde dunkler, glasiger und moderner gestaltet.
- Buchhaltung nutzt fest den Worker-Fallback `https://myweb-receipt-scanner.philipp-myweb.workers.dev`, damit die technische Endpoint-Box im normalen Betrieb nicht sichtbar ist.
- Die Webseite ist als PWA vorbereitet: `manifest.webmanifest`, App-Icons, `sw.js` Service Worker und mobile Standalone-Meta-Tags. Am Handy kann sie über "Zum Home-Bildschirm" wie eine App geöffnet werden.
- Joke-Widget zeigt unter dem englischen Witz eine deutsche Übersetzung. Backend nutzt OpenAI, falls verfügbar, sonst lokalen Fallback.
- Buchhaltung löscht nicht sofort endgültig: Einträge gehen zuerst in den Papierkorb und können wiederhergestellt werden.

## Wiederaufbau

1. Repository klonen.
2. `npm install`, `npm install --prefix backend`, `npm install --prefix frontend` ausführen.
3. `backend/.env` aus sicherer Quelle wiederherstellen.
4. Lokal starten: `npm run dev`.
5. Produktion: Dockerfile oder Railway Deployment nutzen.
6. Bei Railway ein Volume auf `/data` anhängen und `DATABASE_URL=file:/data/prod.db` setzen.
