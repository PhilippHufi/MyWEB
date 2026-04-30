# Online stellen mit Render

Diese App ist fuer Render als einzelner Docker Web Service vorbereitet. Express liefert in Produktion das gebaute React-Frontend und die REST-API gemeinsam aus.

## Warum Render Starter

Fuer 24/7-Betrieb brauchst du einen bezahlten Web Service. Kostenlose Render Web Services koennen nach Inaktivitaet schlafen. Der `starter` Plan plus persistente Disk ist fuer diese private Dashboard-App die einfache Variante.

Render erstellt eine kostenlose HTTPS-Adresse wie:

```text
https://myweb-dashboard.onrender.com
```

Eine eigene Domain kann spaeter hinzugefuegt werden.

## Vorbereitung

1. Erstelle ein GitHub-Konto, falls du noch keins hast.
2. Erstelle ein neues Repository, zum Beispiel `MyWEB`.
3. Lade dieses Projekt in das Repository hoch.
4. Erstelle ein Render-Konto und verbinde Render mit GitHub.

## Render einrichten

1. In Render: `New` -> `Blueprint`.
2. Dein GitHub-Repository `MyWEB` auswaehlen.
3. Render erkennt die Datei `render.yaml`.
4. Bei den abgefragten Environment-Variablen Werte eintragen.
5. Blueprint erstellen und den ersten Deploy abwarten.

Die wichtigsten Werte:

```text
JWT_SECRET=<langes-zufaelliges-passwort>
DEFAULT_USER_EMAIL=<deine-login-email>
DEFAULT_USER_PASSWORD=<dein-sicheres-login-passwort>
```

Optionale Werte:

```text
TMDB_API_KEY=<key-fuer-filmsuche>
NEWS_API_KEY=<key-fuer-news>
TRAFFIC_RSS_URL=<rss-feed-fuer-verkehr>
```

Die App laeuft auch ohne diese optionalen Keys, nutzt dann aber Fallback-Daten oder zeigt leere externe Inhalte.

## Datenbank

Die App nutzt SQLite unter:

```text
/data/prod.db
```

In `render.yaml` ist dafuer eine persistente Render Disk mit 1 GB konfiguriert. Daten bleiben dadurch bei Neustarts und Deployments erhalten.

Beim Start fuehrt die App automatisch aus:

```bash
prisma migrate deploy
node prisma/seed.js
node src/server.js
```

Dadurch wird die Datenbank aktualisiert und dein Login-Benutzer angelegt.

## Lokal testen wie Produktion

```bash
docker compose up --build
```

Dann oeffnen:

```text
http://localhost:4000
```

## Spaeter mit eigener Domain

In Render beim Web Service:

1. `Settings` -> `Custom Domains`.
2. Domain eintragen.
3. DNS-Eintraege beim Domainanbieter setzen.

Render stellt HTTPS-Zertifikate automatisch bereit.
