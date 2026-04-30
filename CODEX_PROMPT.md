# Codex Prompt fuer weitere Ausbauschritte

Erweitere die bestehende Full-Stack-App in diesem Repository.

Tech-Stack:
- Frontend: React mit Vite und Tailwind CSS
- Backend: Node.js mit Express
- Datenbank: SQLite mit Prisma ORM

Wichtige Regeln:
- Bestehende Struktur und UI-Stil beibehalten.
- Backend-Endpunkte unter `backend/src/server.js` erweitern.
- Prisma-Modelle in `backend/prisma/schema.prisma` sauber migrieren.
- Frontend-Komponenten in `frontend/src/main.jsx` schrittweise aufteilen, wenn eine Datei zu gross wird.
- Bestehende lokale Fallback-Logik erhalten.
- Nach Aenderungen `npm run build` ausfuehren.

Naechste sinnvolle Features:
1. Wiederkehrende Einnahmen und Ausgaben fuer Miete, Gehalt, Versicherungen und Abos.
2. Budgetlimits pro Kategorie mit Warnung im Dashboard.
3. Kalenderansicht fuer Aufgaben, Urlaub und Geburtstage.
4. Erweiterte Urlaubskostenplanung mit Flug, Hotel, Mietwagen, Eintrittspreisen und Gesamtbudget.
5. Spotify-Integration fuer Musiksuche und gespeicherte Alben/Tracks.
6. Echte RSS-Feeds fuer bevorzugte Nachrichtenquellen.
7. Detailseiten fuer Filme, Reisen und Finanzmonate.
8. Export als CSV/PDF fuer Finanzen und Reiseplaene.
9. Bessere Authentifizierung mit Registrierung und Passwortaenderung.
10. UI-Aufteilung in kleinere React-Komponenten und Routen.

Beispielauftrag:

```text
Bitte erweitere diese App um wiederkehrende Einnahmen/Ausgaben. Fuege Prisma-Modelle, REST-Endpunkte und eine UI ein. Wiederholungen sollen monatlich, woechentlich oder jaehrlich moeglich sein. Das Dashboard soll die erwarteten Monatswerte anzeigen. Bitte danach Migration und Build ausfuehren.
```
