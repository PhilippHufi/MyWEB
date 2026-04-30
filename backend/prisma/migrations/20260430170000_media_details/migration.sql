ALTER TABLE "FavoriteMedia" ADD COLUMN "releaseYear" TEXT;
ALTER TABLE "FavoriteMedia" ADD COLUMN "genres" TEXT;
ALTER TABLE "FavoriteMedia" ADD COLUMN "actors" TEXT;
ALTER TABLE "FavoriteMedia" ADD COLUMN "trailerUrl" TEXT;
ALTER TABLE "FavoriteMedia" ADD COLUMN "watched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FavoriteMedia" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'Fuer mich';
