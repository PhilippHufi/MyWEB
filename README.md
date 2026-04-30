# Personal Dashboard

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
