FROM node:24-slim AS build

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

RUN npm ci
RUN npm ci --prefix backend
RUN npm ci --prefix frontend

COPY backend backend
COPY frontend frontend

RUN npm run prisma:generate --prefix backend
RUN npm run build --prefix frontend

FROM node:24-slim AS production

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/data/prod.db

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY backend/package*.json backend/
RUN npm ci --omit=dev --prefix backend

COPY --from=build /app/backend backend
COPY --from=build /app/frontend/dist frontend/dist

EXPOSE 4000

CMD ["npm", "run", "start:prod", "--prefix", "backend"]
